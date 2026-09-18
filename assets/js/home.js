// Ana sayfadaki araç listesini tools.json dosyasından üretir.
// Yeni araç eklemek için: klasörü aç, tools.json'a bir kayıt ekle. Başka yer değişmez.

import { ikonAl } from './ikonlar.js';

const liste = document.getElementById('arac-listesi');

const DURUM_YAZI = {
  hazir: { yazi: 'hazır', sinif: 'durum-hazir' },
  yakinda: { yazi: 'yakında', sinif: 'durum-yakinda' },
};

function satirOlustur(arac) {
  const li = document.createElement('li');
  const hazir = arac.durum === 'hazir';
  li.className = hazir ? 'satir' : 'satir satir-pasif';

  const ikon = document.createElement('div');
  ikon.className = 'satir-ikon';
  ikon.innerHTML = ikonAl(arac.ikon);

  const sol = document.createElement('div');
  const baslik = document.createElement('h2');

  if (hazir) {
    const link = document.createElement('a');
    link.href = arac.yol;
    link.textContent = arac.ad;
    baslik.append(link);
  } else {
    baslik.textContent = arac.ad;
  }

  const ozet = document.createElement('p');
  ozet.textContent = arac.ozet;
  sol.append(baslik, ozet);

  const durum = DURUM_YAZI[arac.durum] ?? DURUM_YAZI.yakinda;
  const etiket = document.createElement('span');
  etiket.className = `durum ${durum.sinif}`;
  etiket.textContent = durum.yazi;

  li.append(ikon, sol, etiket);
  return li;
}

async function yukle() {
  try {
    const yanit = await fetch('tools.json');
    if (!yanit.ok) throw new Error(`tools.json okunamadı (${yanit.status})`);
    const araclar = await yanit.json();

    liste.replaceChildren(...araclar.map(satirOlustur));
  } catch (hata) {
    liste.replaceChildren();
    const li = document.createElement('li');
    li.className = 'satir';
    li.innerHTML = `
      <div class="satir-ikon"></div>
      <div>
        <h2>Araç listesi yüklenemedi</h2>
        <p>Sayfayı dosyaya çift tıklayarak açtıysan tarayıcı <code>tools.json</code> dosyasını
        okumayı engeller. Klasörde <code>python -m http.server</code> çalıştırıp
        <code>http://localhost:8000</code> adresinden aç.</p>
      </div>`;
    liste.append(li);
    console.error(hata);
  }
}

yukle();
