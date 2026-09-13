import {
  olaylariAyikla, adresleriOzetle, saatDagilimi, sureyiYaz,
} from '../../assets/js/log-analiz.js';
import { ORNEK_LOG } from '../../assets/js/ornek-log.js';

const $ = (id) => document.getElementById(id);

const birakma = $('birakma');
const dosyaGirdi = $('dosya-girdi');
const metin = $('metin');
const esikGirdi = $('esik');
const durumYazi = $('durum-yazi');
const sonucPanel = $('sonuc-panel');
const ozet = $('ozet');
const histogram = $('histogram');
const tabloGovde = $('tablo-govde');

const SEVIYE = {
  kritik: { yazi: 'kritik', sinif: 'sonuc-degisti' },
  supheli: { yazi: 'şüpheli', sinif: 'sonuc-yeni' },
  normal: { yazi: 'normal', sinif: 'sonuc-ayni' },
};

/* --- Girdi ---------------------------------------------------------------- */

birakma.addEventListener('click', () => dosyaGirdi.click());
birakma.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dosyaGirdi.click(); }
});

['dragenter', 'dragover'].forEach((olay) =>
  birakma.addEventListener(olay, (e) => { e.preventDefault(); birakma.classList.add('uzerinde'); }));

['dragleave', 'drop'].forEach((olay) =>
  birakma.addEventListener(olay, (e) => { e.preventDefault(); birakma.classList.remove('uzerinde'); }));

birakma.addEventListener('drop', (e) => {
  const dosya = e.dataTransfer?.files?.[0];
  if (dosya) dosyaOku(dosya);
});

dosyaGirdi.addEventListener('change', () => {
  const dosya = dosyaGirdi.files[0];
  if (dosya) dosyaOku(dosya);
  dosyaGirdi.value = '';
});

async function dosyaOku(dosya) {
  const SINIR = 20 * 1024 * 1024;
  if (dosya.size > SINIR) {
    bildir(`Dosya ${(dosya.size / 1048576).toFixed(0)} MB. Tarayıcıda çözümlemek için fazla büyük — ilgilendiğin tarih aralığını ayırıp yeniden dene.`);
    return;
  }

  metin.value = await dosya.text();
  bildir(`${dosya.name} okundu (${(dosya.size / 1024).toFixed(0)} KB).`);
  analiz();
}

function bildir(yazi) {
  durumYazi.textContent = yazi;
  durumYazi.classList.remove('gizli');
}

/* --- Çözümleme ------------------------------------------------------------ */

function analiz() {
  const kaynak = metin.value.trim();
  if (!kaynak) {
    bildir('Çözümlenecek kayıt yok. Dosya seç, metin yapıştır ya da örnek logu yükle.');
    sonucPanel.classList.add('gizli');
    return;
  }

  const esik = Math.max(2, Number(esikGirdi.value) || 10);
  const { olaylar, satirSayisi } = olaylariAyikla(kaynak);

  if (olaylar.length === 0) {
    bildir(`${satirSayisi} satır okundu ama tanınan SSH kaydı bulunamadı. Dosya sshd kayıtları içeriyor mu kontrol et.`);
    sonucPanel.classList.add('gizli');
    return;
  }

  const adresler = adresleriOzetle(olaylar, esik);
  const kritik = adresler.filter((a) => a.seviye === 'kritik').length;
  const supheli = adresler.filter((a) => a.seviye === 'supheli').length;
  // Çift kaydı ayıklanmış gerçek deneme sayısı; ham satır sayısıyla karışmasın.
  const basarisizToplam = adresler.reduce((t, a) => t + a.basarisiz, 0);

  ozet.replaceChildren(
    satirYaz('Okunan satır', satirSayisi.toLocaleString('tr-TR')),
    satirYaz('Tanınan olay', olaylar.length.toLocaleString('tr-TR')),
    satirYaz('Farklı adres', String(adresler.length)),
    satirYaz('Başarısız deneme', basarisizToplam.toLocaleString('tr-TR')),
    satirYaz('Kritik / şüpheli', `${kritik} / ${supheli}`),
  );

  histogramCiz(saatDagilimi(olaylar));
  tabloCiz(adresler);

  sonucPanel.classList.remove('gizli');
  bildir(
    kritik > 0
      ? `${kritik} adreste başarısız denemelerin ardından giriş başarılı olmuş. Bu adresleri öncelikle incele.`
      : `Çözümleme tamam: ${adresler.length} adres, ${supheli} tanesi eşiği aşıyor.`,
  );
}

function satirYaz(baslik, deger) {
  const div = document.createElement('div');
  div.className = 'veri-satiri';
  const dt = document.createElement('dt');
  dt.textContent = baslik;
  const dd = document.createElement('dd');
  dd.textContent = deger;
  div.append(dt, dd);
  return div;
}

function histogramCiz(kovalar) {
  const enYuksek = Math.max(...kovalar, 1);
  const sutunlar = kovalar.map((adet, saat) => {
    const sutun = document.createElement('div');
    sutun.className = 'histogram-sutun';
    sutun.style.setProperty('--oran', `${(adet / enYuksek) * 100}%`);
    sutun.title = `${String(saat).padStart(2, '0')}:00 — ${adet} başarısız deneme`;
    if (saat % 6 === 0) sutun.dataset.saat = String(saat).padStart(2, '0');
    return sutun;
  });
  histogram.replaceChildren(...sutunlar);
}

function tabloCiz(adresler) {
  tabloGovde.replaceChildren(...adresler.map((adres) => {
    const tr = document.createElement('tr');

    const ipHucre = document.createElement('td');
    ipHucre.className = 'ozet';
    ipHucre.textContent = adres.ip;

    const sayiHucre = document.createElement('td');
    const satirlar = [
      `${adres.basarisiz} başarısız, ${adres.basarili} başarılı`,
      `${adres.kullanicilar.length} kullanıcı adı: ${adres.kullanicilar.slice(0, 4).join(', ')}${adres.kullanicilar.length > 4 ? '…' : ''}`,
    ];
    if (adres.sureSaniye > 0) {
      satirlar.push(`${sureyiYaz(adres.sureSaniye)} boyunca, dakikada ~${adres.dakikadaDeneme.toFixed(1)} deneme`);
    }
    sayiHucre.append(...satirlar.map((s, i) => {
      const p = document.createElement('div');
      p.textContent = s;
      if (i > 0) p.style.color = 'var(--slate)';
      return p;
    }));

    const seviyeHucre = document.createElement('td');
    const seviye = SEVIYE[adres.seviye];
    const etiket = document.createElement('div');
    etiket.className = `sonuc ${seviye.sinif}`;
    etiket.textContent = seviye.yazi;
    seviyeHucre.append(etiket);

    for (const gerekce of adres.gerekceler) {
      const p = document.createElement('div');
      p.textContent = gerekce;
      p.style.cssText = 'color:var(--slate);font-weight:400;white-space:normal';
      seviyeHucre.append(p);
    }

    tr.append(ipHucre, sayiHucre, seviyeHucre);
    return tr;
  }));
}

/* --- Düğmeler -------------------------------------------------------------- */

$('analiz-btn').addEventListener('click', analiz);
esikGirdi.addEventListener('change', () => { if (metin.value.trim()) analiz(); });

$('ornek-btn').addEventListener('click', () => {
  metin.value = ORNEK_LOG;
  bildir('Örnek log yüklendi. Elle yazılmış bir senaryo: bir kullanıcı adı taraması, bir parola saldırısı ve sonunda tutan bir giriş.');
  analiz();
});

$('temizle-btn').addEventListener('click', () => {
  metin.value = '';
  durumYazi.classList.add('gizli');
  sonucPanel.classList.add('gizli');
});
