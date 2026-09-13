import { hashBlob } from '../../assets/js/sha256.js';

const $ = (id) => document.getElementById(id);

const birakma = $('birakma');
const dosyaGirdi = $('dosya-girdi');
const goruntuGirdi = $('goruntu-girdi');
const ilerleme = $('ilerleme');
const ilerlemeCubuk = ilerleme.querySelector('i');
const durumYazi = $('durum-yazi');
const tablo = $('tablo');
const tabloGovde = $('tablo-govde');
const kaydetBtn = $('kaydet-btn');
const karsilastirBtn = $('karsilastir-btn');
const temizleBtn = $('temizle-btn');
const beklenen = $('beklenen');
const eslemeSonuc = $('esleme-sonuc');

/** ad -> { ozet, boyut } */
let ozetler = new Map();
/** Karşılaştırma için yüklenen önceki görüntü; yoksa null. */
let oncekiGoruntu = null;

const DURUM_ETIKET = {
  ayni: { yazi: 'değişmemiş', sinif: 'sonuc-ayni' },
  degisti: { yazi: 'DEĞİŞMİŞ', sinif: 'sonuc-degisti' },
  yeni: { yazi: 'yeni', sinif: 'sonuc-yeni' },
  silindi: { yazi: 'silinmiş', sinif: 'sonuc-silindi' },
  yok: { yazi: '—', sinif: '' },
};

/* --- Dosya seçme ---------------------------------------------------------- */

birakma.addEventListener('click', () => dosyaGirdi.click());
birakma.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dosyaGirdi.click(); }
});

['dragenter', 'dragover'].forEach((olay) => {
  birakma.addEventListener(olay, (e) => {
    e.preventDefault();
    birakma.classList.add('uzerinde');
  });
});

['dragleave', 'drop'].forEach((olay) => {
  birakma.addEventListener(olay, (e) => {
    e.preventDefault();
    birakma.classList.remove('uzerinde');
  });
});

birakma.addEventListener('drop', (e) => {
  const dosyalar = [...(e.dataTransfer?.files ?? [])];
  if (dosyalar.length) isle(dosyalar);
});

dosyaGirdi.addEventListener('change', () => {
  const dosyalar = [...dosyaGirdi.files];
  if (dosyalar.length) isle(dosyalar);
  dosyaGirdi.value = '';
});

/* --- Hash hesaplama ------------------------------------------------------- */

async function isle(dosyalar) {
  ilerleme.classList.remove('gizli');
  durumYazi.classList.remove('gizli');

  for (let i = 0; i < dosyalar.length; i++) {
    const dosya = dosyalar[i];
    durumYazi.textContent = `${dosya.name} hesaplanıyor (${i + 1}/${dosyalar.length})`;

    const ozet = await hashBlob(dosya, (oran) => {
      ilerlemeCubuk.style.width = `${Math.round(oran * 100)}%`;
    });

    ozetler.set(dosya.name, { ozet, boyut: dosya.size });
  }

  durumYazi.textContent = `${ozetler.size} dosyanın özeti hazır.`;
  ilerlemeCubuk.style.width = '0%';
  ilerleme.classList.add('gizli');
  ciz();
  esle();
}

/* --- Tablo ---------------------------------------------------------------- */

function satirDurumu(ad, ozet) {
  if (!oncekiGoruntu) return 'yok';
  const eski = oncekiGoruntu[ad];
  if (!eski) return 'yeni';
  return eski === ozet ? 'ayni' : 'degisti';
}

function satir(ad, ozetYazi, durum) {
  const tr = document.createElement('tr');

  const adHucre = document.createElement('td');
  adHucre.textContent = ad;

  const ozetHucre = document.createElement('td');
  ozetHucre.className = 'ozet';
  ozetHucre.textContent = ozetYazi;

  const durumHucre = document.createElement('td');
  const etiket = DURUM_ETIKET[durum];
  durumHucre.className = `sonuc ${etiket.sinif}`;
  durumHucre.textContent = etiket.yazi;

  tr.append(adHucre, ozetHucre, durumHucre);
  return tr;
}

function ciz() {
  const satirlar = [];

  for (const [ad, bilgi] of ozetler) {
    satirlar.push(satir(ad, bilgi.ozet, satirDurumu(ad, bilgi.ozet)));
  }

  // Görüntüde olup şimdi seçilmeyen dosyalar: silinmiş ya da bu sefer eklenmemiş.
  if (oncekiGoruntu) {
    for (const ad of Object.keys(oncekiGoruntu)) {
      if (!ozetler.has(ad)) satirlar.push(satir(ad, oncekiGoruntu[ad], 'silindi'));
    }
  }

  tabloGovde.replaceChildren(...satirlar);
  tablo.classList.toggle('gizli', satirlar.length === 0);
  kaydetBtn.disabled = ozetler.size === 0;
  temizleBtn.disabled = ozetler.size === 0 && !oncekiGoruntu;
}

/* --- Anlık görüntü -------------------------------------------------------- */

kaydetBtn.addEventListener('click', () => {
  const govde = {
    olusturma: new Date().toISOString(),
    arac: 'cyber-toolkit/dosya-butunlugu',
    dosyalar: Object.fromEntries([...ozetler].map(([ad, b]) => [ad, b.ozet])),
  };

  const blob = new Blob([JSON.stringify(govde, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `butunluk-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

karsilastirBtn.addEventListener('click', () => goruntuGirdi.click());

goruntuGirdi.addEventListener('change', async () => {
  const dosya = goruntuGirdi.files[0];
  goruntuGirdi.value = '';
  if (!dosya) return;

  try {
    const veri = JSON.parse(await dosya.text());
    if (!veri.dosyalar || typeof veri.dosyalar !== 'object') {
      throw new Error('Beklenen "dosyalar" alanı yok');
    }
    oncekiGoruntu = veri.dosyalar;

    const tarih = veri.olusturma ? new Date(veri.olusturma).toLocaleString('tr-TR') : 'bilinmiyor';
    durumYazi.classList.remove('gizli');
    durumYazi.textContent = `Karşılaştırma açık. Yüklenen görüntü: ${tarih}`;
    ciz();
  } catch (hata) {
    durumYazi.classList.remove('gizli');
    durumYazi.textContent = 'Bu dosya bu araçla üretilmiş bir anlık görüntü değil. "Anlık görüntüyü indir" ile kaydedilmiş JSON dosyasını seç.';
    console.error(hata);
  }
});

temizleBtn.addEventListener('click', () => {
  ozetler = new Map();
  oncekiGoruntu = null;
  durumYazi.classList.add('gizli');
  eslemeSonuc.classList.add('gizli');
  ciz();
});

/* --- Tek özet eşleme ------------------------------------------------------ */

function esle() {
  const girilen = beklenen.value.trim().toLowerCase().replace(/[^a-f0-9]/g, '');
  eslemeSonuc.replaceChildren();

  if (!girilen) { eslemeSonuc.classList.add('gizli'); return; }
  eslemeSonuc.classList.remove('gizli');

  const li = document.createElement('li');

  if (girilen.length !== 64) {
    li.textContent = `SHA-256 özeti 64 haneli olur, girilen ${girilen.length} hane. Değerin tamamını yapıştırdığından emin ol.`;
    eslemeSonuc.append(li);
    return;
  }

  const eslesen = [...ozetler].find(([, bilgi]) => bilgi.ozet === girilen);

  if (eslesen) {
    li.className = 'guvenli';
    li.textContent = `Eşleşti: ${eslesen[0]} dosyasının özeti bu değerle birebir aynı.`;
  } else if (ozetler.size === 0) {
    li.textContent = 'Karşılaştırmak için önce yukarıdan en az bir dosya seç.';
  } else {
    li.className = 'riskli';
    li.textContent = 'Seçili dosyaların hiçbiri bu özetle eşleşmiyor. Dosya bozulmuş, eksik inmiş ya da beklediğin dosya olmayabilir.';
  }

  eslemeSonuc.append(li);
}

beklenen.addEventListener('input', esle);

ciz();
