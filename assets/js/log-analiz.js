// SSH kimlik doğrulama kayıtlarını ayrıştırıp aynı adresten gelen
// arka arkaya başarısız girişleri çıkarır. Arayüz kodu içermez.

/**
 * Desteklenen satır biçimleri:
 *   Sep 13 18:22:01 sunucu sshd[1234]: Failed password for root from 203.0.113.9 port 52344 ssh2
 *   2026-09-13T18:22:01+03:00 sunucu sshd[1234]: Invalid user admin from 203.0.113.9
 */

const AYLAR = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

const IP = String.raw`(\d{1,3}(?:\.\d{1,3}){3}|[0-9a-fA-F:]{3,45})`;

const OLAYLAR = [
  {
    tur: 'basarisiz',
    // "Failed password for root from ..." / "Failed password for invalid user admin from ..."
    kalip: new RegExp(String.raw`Failed password for (?:invalid user )?(\S+) from ${IP}`),
  },
  {
    tur: 'gecersiz-kullanici',
    kalip: new RegExp(String.raw`Invalid user (\S+) from ${IP}`),
  },
  {
    tur: 'basarili',
    kalip: new RegExp(String.raw`Accepted (?:password|publickey) for (\S+) from ${IP}`),
  },
];

/** Satır başındaki zaman damgasını okur; okuyamazsa null döner. */
export function zamanOku(satir, yil = new Date().getFullYear()) {
  const iso = satir.match(/^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)/);
  if (iso) {
    const tarih = new Date(iso[1].replace(' ', 'T'));
    return Number.isNaN(tarih.getTime()) ? null : tarih;
  }

  // Klasik syslog biçiminde yıl yazmaz; dışarıdan verilen yıl kullanılır.
  const syslog = satir.match(/^([A-Z][a-z]{2})\s+(\d{1,2})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (syslog && syslog[1] in AYLAR) {
    const [, ay, gun, saat, dakika, saniye] = syslog;
    return new Date(yil, AYLAR[ay], +gun, +saat, +dakika, +saniye);
  }

  return null;
}

/** Metni satır satır okuyup tanınan olayları döndürür. */
export function olaylariAyikla(metin, yil) {
  const olaylar = [];
  const satirlar = metin.split(/\r?\n/);

  satirlar.forEach((satir, sira) => {
    if (!satir.trim()) return;

    for (const olay of OLAYLAR) {
      const eslesme = satir.match(olay.kalip);
      if (!eslesme) continue;

      olaylar.push({
        tur: olay.tur,
        kullanici: eslesme[1],
        ip: eslesme[2],
        zaman: zamanOku(satir, yil),
        satirNo: sira + 1,
      });
      break; // Bir satır tek olaya karşılık gelir.
    }
  });

  return { olaylar, satirSayisi: satirlar.filter((s) => s.trim()).length };
}

/**
 * Olayları IP'ye göre toplar ve her adres için bir değerlendirme çıkarır.
 * esik: kaç başarısız denemeden sonra "şüpheli" sayılacağı.
 */
export function adresleriOzetle(olaylar, esik = 10) {
  const harita = new Map();
  // sshd tek bir denemeyi iki satıra yazar: önce "Invalid user", sonra
  // "Failed password for invalid user". Aynı saniyede aynı adres ve kullanıcı
  // için gelen ikinci kayıt aynı denemedir; iki kez saymıyoruz.
  const gorulen = new Set();

  for (const olay of olaylar) {
    if (olay.tur !== 'basarili') {
      const anahtar = `${olay.ip}|${olay.kullanici}|${olay.zaman ? olay.zaman.getTime() : `s${olay.satirNo}`}`;
      if (gorulen.has(anahtar)) continue;
      gorulen.add(anahtar);
    }

    if (!harita.has(olay.ip)) {
      harita.set(olay.ip, {
        ip: olay.ip,
        basarisiz: 0,
        basarili: 0,
        kullanicilar: new Set(),
        ilk: null,
        son: null,
        basariliZaman: null,
      });
    }

    const kayit = harita.get(olay.ip);
    kayit.kullanicilar.add(olay.kullanici);

    if (olay.tur === 'basarili') {
      kayit.basarili += 1;
      if (olay.zaman) kayit.basariliZaman = olay.zaman;
    } else {
      kayit.basarisiz += 1;
    }

    if (olay.zaman) {
      if (!kayit.ilk || olay.zaman < kayit.ilk) kayit.ilk = olay.zaman;
      if (!kayit.son || olay.zaman > kayit.son) kayit.son = olay.zaman;
    }
  }

  return [...harita.values()]
    .map((kayit) => degerlendir(kayit, esik))
    .sort((a, b) => {
      const sira = { kritik: 0, supheli: 1, normal: 2 };
      if (sira[a.seviye] !== sira[b.seviye]) return sira[a.seviye] - sira[b.seviye];
      return b.basarisiz - a.basarisiz;
    });
}

function degerlendir(kayit, esik) {
  const sureSaniye = kayit.ilk && kayit.son ? (kayit.son - kayit.ilk) / 1000 : 0;
  // Süre sıfırsa (tek saniye içinde yığın deneme) bölme yapmadan hızı yüksek sayıyoruz.
  const hiz = sureSaniye > 0 ? (kayit.basarisiz / sureSaniye) * 60 : kayit.basarisiz * 60;

  let seviye = 'normal';
  const gerekceler = [];

  if (kayit.basarisiz >= esik) {
    seviye = 'supheli';
    gerekceler.push(`${kayit.basarisiz} başarısız deneme (eşik: ${esik})`);
  }

  if (kayit.kullanicilar.size >= 5 && kayit.basarisiz > 0) {
    seviye = seviye === 'normal' ? 'supheli' : seviye;
    gerekceler.push(`${kayit.kullanicilar.size} farklı kullanıcı adı denenmiş`);
  }

  // En kritik durum: uzun bir deneme dizisinin ardından giriş tutmuş.
  if (kayit.basarili > 0 && kayit.basarisiz >= esik) {
    seviye = 'kritik';
    gerekceler.push('başarısız denemelerin ardından giriş başarılı olmuş');
  }

  return {
    ...kayit,
    kullanicilar: [...kayit.kullanicilar],
    sureSaniye,
    dakikadaDeneme: hiz,
    seviye,
    gerekceler,
  };
}

/** Başarısız denemelerin saatlere göre dağılımı (0-23). */
export function saatDagilimi(olaylar) {
  const kovalar = Array(24).fill(0);
  for (const olay of olaylar) {
    if (olay.tur !== 'basarili' && olay.zaman) kovalar[olay.zaman.getHours()] += 1;
  }
  return kovalar;
}

export function sureyiYaz(saniye) {
  if (!saniye) return '—';
  if (saniye < 60) return `${Math.round(saniye)} sn`;
  if (saniye < 3600) return `${Math.round(saniye / 60)} dk`;
  if (saniye < 86400) return `${(saniye / 3600).toFixed(1)} saat`;
  return `${(saniye / 86400).toFixed(1)} gün`;
}
