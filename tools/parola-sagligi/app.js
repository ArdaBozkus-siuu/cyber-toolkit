import {
  entropiHesapla, kirilmaSuresi, sureyiYaz, seviye, SEVIYELER, parolaUret, DENEME_HIZI,
} from '../../assets/js/entropy.js';
import { YAYGIN_PAROLALAR } from '../../assets/js/yaygin-parolalar.js';

const $ = (id) => document.getElementById(id);

const parolaGirdi = $('parola');
const olcer = $('olcer');
const seviyeAdi = $('seviye-adi');
const bitYazi = $('bit-yazi');
const detay = $('detay');
const notlar = $('notlar');
const sizintiBtn = $('sizinti-btn');
const sizintiSonuc = $('sizinti-sonuc');
const uretilen = $('uretilen');
const kopyalaBtn = $('kopyala-btn');

/* --- Ölçüm ---------------------------------------------------------------- */

function veriSatiri(baslik, deger) {
  const div = document.createElement('div');
  div.className = 'veri-satiri';
  const dt = document.createElement('dt');
  dt.textContent = baslik;
  const dd = document.createElement('dd');
  dd.textContent = deger;
  div.append(dt, dd);
  return div;
}

function notSatiri(metin, sinif = '') {
  const li = document.createElement('li');
  if (sinif) li.className = sinif;
  li.textContent = metin;
  return li;
}

function olc() {
  const parola = parolaGirdi.value;
  sizintiSonuc.classList.add('gizli');
  sizintiSonuc.replaceChildren();
  sizintiBtn.disabled = parola.length === 0;

  if (!parola) {
    olcer.dataset.seviye = '-1';
    seviyeAdi.textContent = 'parola bekleniyor';
    bitYazi.textContent = '';
    detay.replaceChildren();
    notlar.replaceChildren();
    return;
  }

  const sonuc = entropiHesapla(parola, YAYGIN_PAROLALAR);
  const s = seviye(sonuc.bit);

  olcer.dataset.seviye = String(s);
  seviyeAdi.textContent = SEVIYELER[s].adi;
  bitYazi.textContent = `${sonuc.bit.toFixed(0)} bit entropi`;

  detay.replaceChildren(
    veriSatiri('Uzunluk', `${parola.length} karakter`),
    veriSatiri('Karakter kümeleri', sonuc.kumeler.join(', ') || '—'),
    veriSatiri('Alfabe boyutu', `${sonuc.alfabe} karakter`),
    veriSatiri('Çevrimdışı saldırı (10 milyar deneme/sn)', sureyiYaz(kirilmaSuresi(sonuc.bit))),
    veriSatiri('Çevrimiçi saldırı (100 deneme/sn)', sureyiYaz(kirilmaSuresi(sonuc.bit, DENEME_HIZI.cevrimici))),
  );

  if (sonuc.uyarilar.length === 0) {
    notlar.replaceChildren(notSatiri('Tahmin edilebilir bir kalıp bulunamadı.', 'guvenli'));
  } else {
    notlar.replaceChildren(
      ...sonuc.uyarilar.map((u) => notSatiri(u, sonuc.yaygin ? 'riskli' : '')),
    );
  }
}

parolaGirdi.addEventListener('input', olc);

$('goster').addEventListener('change', (e) => {
  parolaGirdi.type = e.target.checked ? 'text' : 'password';
});

/* --- Sızıntı kontrolü (HIBP k-anonimlik) ---------------------------------- */

async function sha1Hex(metin) {
  const veri = new TextEncoder().encode(metin);
  const ozet = await crypto.subtle.digest('SHA-1', veri);
  return [...new Uint8Array(ozet)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

async function sizintiAra() {
  const parola = parolaGirdi.value;
  if (!parola) return;

  sizintiSonuc.classList.remove('gizli');
  sizintiSonuc.replaceChildren(notSatiri('Sorgulanıyor…'));
  sizintiBtn.disabled = true;

  try {
    const ozet = await sha1Hex(parola);
    const onEk = ozet.slice(0, 5);
    const kalan = ozet.slice(5);

    // Add-Padding başlığı, yanıtın uzunluğundan bilgi sızmasını engeller.
    const yanit = await fetch(`https://api.pwnedpasswords.com/range/${onEk}`, {
      headers: { 'Add-Padding': 'true' },
    });
    if (!yanit.ok) throw new Error(`Servis ${yanit.status} döndü`);

    const govde = await yanit.text();
    let sayi = 0;
    for (const satir of govde.split('\n')) {
      const [son, adet] = satir.trim().split(':');
      if (son === kalan) { sayi = Number(adet); break; }
    }

    if (sayi > 0) {
      sizintiSonuc.replaceChildren(
        notSatiri(
          `Bu parola bilinen sızıntılarda ${sayi.toLocaleString('tr-TR')} kez görülmüş. ` +
          'Kırma listelerinde hazır duruyor demektir; kullandığın her yerde değiştir.',
          'riskli',
        ),
        notSatiri(`Gönderilen veri: SHA-1 özetinin ilk 5 hanesi (${onEk}). Parola gönderilmedi.`),
      );
    } else {
      sizintiSonuc.replaceChildren(
        notSatiri('Bu parola sızıntı veritabanında bulunamadı. Bu, güçlü olduğu anlamına gelmez; sadece henüz listelere düşmemiş.', 'guvenli'),
        notSatiri(`Gönderilen veri: SHA-1 özetinin ilk 5 hanesi (${onEk}). Parola gönderilmedi.`),
      );
    }
  } catch (hata) {
    sizintiSonuc.replaceChildren(
      notSatiri('Sızıntı servisine ulaşılamadı. İnternet bağlantını kontrol edip tekrar dene — aracın diğer ölçümleri çalışmaya devam ediyor.'),
    );
    console.error(hata);
  } finally {
    sizintiBtn.disabled = parolaGirdi.value.length === 0;
  }
}

sizintiBtn.addEventListener('click', sizintiAra);

/* --- Parola üretici -------------------------------------------------------- */

const uzunlukGirdi = $('uzunluk');
uzunlukGirdi.addEventListener('input', () => {
  $('uzunluk-yazi').textContent = uzunlukGirdi.value;
});

$('uret-btn').addEventListener('click', () => {
  const yeni = parolaUret(Number(uzunlukGirdi.value), {
    kucuk: true,
    buyuk: $('k-buyuk').checked,
    rakam: $('k-rakam').checked,
    sembol: $('k-sembol').checked,
  });

  if (!yeni) {
    uretilen.textContent = 'En az bir karakter kümesi seçili olmalı.';
  } else {
    uretilen.textContent = yeni;
    kopyalaBtn.disabled = false;
  }
  uretilen.classList.remove('gizli');
});

kopyalaBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(uretilen.textContent);
    kopyalaBtn.textContent = 'Kopyalandı';
    setTimeout(() => { kopyalaBtn.textContent = 'Kopyala'; }, 1500);
  } catch {
    kopyalaBtn.textContent = 'Kopyalanamadı, elle seç';
  }
});

olc();
