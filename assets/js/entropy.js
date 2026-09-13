// Parola gücü hesabı. Burada arayüz kodu yok; sadece girdi alıp sonuç döndüren
// fonksiyonlar var, böylece ayrı ayrı test edilebiliyor.

const KUMELER = [
  { ad: 'küçük harf', boyut: 26, test: /[a-zçğıöşü]/ },
  { ad: 'büyük harf', boyut: 26, test: /[A-ZÇĞİÖŞÜ]/ },
  { ad: 'rakam', boyut: 10, test: /[0-9]/ },
  { ad: 'sembol', boyut: 33, test: /[^a-zA-ZçğıöşüÇĞİÖŞÜ0-9]/ },
];

export function kumeAnalizi(parola) {
  const bulunan = KUMELER.filter((k) => k.test.test(parola));
  const alfabe = bulunan.reduce((t, k) => t + k.boyut, 0);
  return { bulunan: bulunan.map((k) => k.ad), alfabe };
}

// Klavye ve alfabe sıraları: "qwerty", "1234", "abcd" gibi diziler.
const DIZILER = ['abcdefghijklmnopqrstuvwxyz', '0123456789', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

function diziUzunlugu(parola) {
  const p = parola.toLowerCase();
  let enUzun = 0;
  for (const dizi of DIZILER) {
    const ters = [...dizi].reverse().join('');
    for (const kaynak of [dizi, ters]) {
      for (let i = 0; i < p.length; i++) {
        for (let uzunluk = p.length - i; uzunluk >= 3; uzunluk--) {
          const parca = p.slice(i, i + uzunluk);
          if (kaynak.includes(parca)) {
            enUzun = Math.max(enUzun, uzunluk);
            break;
          }
        }
      }
    }
  }
  return enUzun;
}

function tekrarSayisi(parola) {
  let enUzun = 1;
  let sayac = 1;
  for (let i = 1; i < parola.length; i++) {
    sayac = parola[i] === parola[i - 1] ? sayac + 1 : 1;
    enUzun = Math.max(enUzun, sayac);
  }
  return enUzun;
}

/**
 * Ham entropi: log2(alfabe^uzunluk).
 * Bu üst sınırdır — parola rastgele seçilmiş gibi davranır.
 * Tahmin edilebilir desenler için ceza düşülür.
 */
export function entropiHesapla(parola, yayginListe = new Set()) {
  if (!parola) {
    return { bit: 0, hamBit: 0, alfabe: 0, kumeler: [], uyarilar: [], yaygin: false };
  }

  const { bulunan, alfabe } = kumeAnalizi(parola);
  const hamBit = parola.length * Math.log2(alfabe || 1);

  const uyarilar = [];
  let ceza = 0;

  const yaygin = yayginListe.has(parola.toLowerCase());
  if (yaygin) {
    uyarilar.push('Bu parola en çok kullanılan parolalar listesinde. Saldırgan ilk denemelerinde bulur.');
  }

  const dizi = diziUzunlugu(parola);
  if (dizi >= 3) {
    ceza += dizi * 2;
    uyarilar.push(`İçinde ${dizi} karakterlik tahmin edilebilir bir sıra var (örn. "abc", "123", "qwe").`);
  }

  const tekrar = tekrarSayisi(parola);
  if (tekrar >= 3) {
    ceza += tekrar * 2;
    uyarilar.push(`Aynı karakter ${tekrar} kez arka arkaya tekrar ediyor.`);
  }

  if (/^[A-ZÇĞİÖŞÜ][a-zçğıöşü]+[0-9]{1,4}[!.?]?$/.test(parola)) {
    ceza += 8;
    uyarilar.push('Klasik kalıp: büyük harfle başlayan bir kelime, sonunda birkaç rakam. Kırma araçları bu kalıbı önce dener.');
  }

  // Sözlük kelimesi + ek kalıbı ("Galatasaray1907", "Merhaba123!").
  // Alfabe boyutuna dayalı hesap bu tür parolaları çok güçlü sanır; oysa saldırgan
  // tek tek karakterleri değil, kelime listesini dener. Kelimeyi tek bir tahmin
  // biriminden ibaret sayarak gerçekçi bir üst sınır buluyoruz.
  const sozluk = sozlukTahmini(parola, yayginListe);
  if (sozluk) {
    uyarilar.push(`"${sozluk.kelime}" yaygın bir kelime. Sonuna rakam veya işaret eklemek onu kırma listelerinden kurtarmıyor.`);
  }

  if (parola.length < 12) {
    uyarilar.push('12 karakterin altındaki parolalar, karışık görünseler de modern donanımda hızlı kırılır.');
  }

  let bit = yaygin ? Math.min(hamBit, 10) : Math.max(0, hamBit - ceza);
  if (sozluk) bit = Math.min(bit, sozluk.bit);
  return { bit, hamBit, alfabe, kumeler: bulunan, uyarilar, yaygin, sozluk };
}

/**
 * Parolanın harf kısmı bilinen bir kelimeyse, saldırganın kaç deneme yapacağını
 * tahmin eder: kelime listesi + büyük/küçük harf varyasyonu + ekteki karakterler.
 */
function sozlukTahmini(parola, yayginListe) {
  const harfler = parola.replace(/[^a-zA-ZçğıöşüÇĞİÖŞÜ]/g, '');
  if (harfler.length < 4) return null;
  const kelime = harfler.toLowerCase();
  if (!yayginListe.has(kelime)) return null;

  const listeBit = Math.log2(Math.max(yayginListe.size, 2));
  const buyukKucukBit = Math.min(harfler.length, 8); // her harf için büyük/küçük seçeneği
  const ek = parola.length - harfler.length;
  const ekAlfabe = kumeAnalizi(parola.replace(/[a-zA-ZçğıöşüÇĞİÖŞÜ]/g, '')).alfabe || 1;
  const ekBit = ek * Math.log2(ekAlfabe);

  return { kelime, bit: listeBit + buyukKucukBit + ekBit };
}

// Saldırganın saniyede deneme sayısı. Kaçırılmış bir veritabanı üzerinde,
// ekran kartlarıyla yapılan çevrimdışı saldırı varsayımı.
export const DENEME_HIZI = {
  cevrimici: 100,
  cevrimdisi: 1e10,
};

export function kirilmaSuresi(bit, hiz = DENEME_HIZI.cevrimdisi) {
  // Ortalama olarak olasılıkların yarısı denenir.
  const saniye = Math.pow(2, bit - 1) / hiz;
  return saniye;
}

export function sureyiYaz(saniye) {
  if (!isFinite(saniye)) return 'hesaplanamayacak kadar uzun';
  if (saniye < 1) return 'anında';
  const birimler = [
    { ad: 'saniye', deger: 60 },
    { ad: 'dakika', deger: 60 },
    { ad: 'saat', deger: 24 },
    { ad: 'gün', deger: 365 },
  ];
  let deger = saniye;
  for (const birim of birimler) {
    if (deger < birim.deger) return `${Math.round(deger)} ${birim.ad}`;
    deger /= birim.deger;
  }
  if (deger < 1000) return `${Math.round(deger)} yıl`;
  if (deger < 1e6) return `${Math.round(deger / 1000)} bin yıl`;
  if (deger < 1e9) return `${Math.round(deger / 1e6)} milyon yıl`;
  return 'milyarlarca yıl';
}

export const SEVIYELER = [
  { adi: 'çok zayıf', enAz: 0 },
  { adi: 'zayıf', enAz: 36 },
  { adi: 'orta', enAz: 60 },
  { adi: 'güçlü', enAz: 80 },
  { adi: 'çok güçlü', enAz: 100 },
];

export function seviye(bit) {
  let sonuc = 0;
  SEVIYELER.forEach((s, i) => {
    if (bit >= s.enAz) sonuc = i;
  });
  return sonuc;
}

const PAROLA_ALFABE = {
  kucuk: 'abcdefghijkmnopqrstuvwxyz',
  buyuk: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
  rakam: '23456789',
  sembol: '!#$%&*+-=?@^_',
};

/** Kriptografik olarak güvenli rastgele parola üretir. Math.random() kullanılmaz. */
export function parolaUret(uzunluk = 16, secenekler = {}) {
  const { kucuk = true, buyuk = true, rakam = true, sembol = true } = secenekler;
  const secilen = [
    kucuk && PAROLA_ALFABE.kucuk,
    buyuk && PAROLA_ALFABE.buyuk,
    rakam && PAROLA_ALFABE.rakam,
    sembol && PAROLA_ALFABE.sembol,
  ].filter(Boolean);

  if (secilen.length === 0) return '';
  const havuz = secilen.join('');

  // Her karakter kümesinden en az bir tane bulunsun.
  const zorunlu = secilen.map((kume) => kume[rastgeleIndeks(kume.length)]);
  const kalan = Math.max(0, uzunluk - zorunlu.length);
  const geri = Array.from({ length: kalan }, () => havuz[rastgeleIndeks(havuz.length)]);
  return karistir([...zorunlu, ...geri]).join('').slice(0, uzunluk);
}

function rastgeleIndeks(sinir) {
  // Modulo sapmasını önlemek için aralık dışına düşen değerler atılır.
  const ustSinir = Math.floor(0xffffffff / sinir) * sinir;
  const buf = new Uint32Array(1);
  let deger;
  do {
    crypto.getRandomValues(buf);
    deger = buf[0];
  } while (deger >= ustSinir);
  return deger % sinir;
}

function karistir(dizi) {
  for (let i = dizi.length - 1; i > 0; i--) {
    const j = rastgeleIndeks(i + 1);
    [dizi[i], dizi[j]] = [dizi[j], dizi[i]];
  }
  return dizi;
}
