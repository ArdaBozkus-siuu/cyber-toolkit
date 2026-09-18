// Araç sayfalarının altında diğer araçlara geçiş. Liste tools.json'dan geldiği için
// yeni araç eklendiğinde her sayfanın altı kendiliğinden güncellenir.

import { ikonAl } from './ikonlar.js';

const kapsayici = document.getElementById('diger-araclar');

async function yukle() {
  if (!kapsayici) return;

  // Sayfa tools/<ad>/ altında olduğu için iki seviye yukarı çıkıyoruz.
  const buSayfa = window.location.pathname.replace(/index\.html$/, '');

  try {
    const yanit = await fetch('../../tools.json');
    if (!yanit.ok) throw new Error(String(yanit.status));
    const araclar = await yanit.json();

    const digerleri = araclar.filter(
      (arac) => arac.durum === 'hazir' && !buSayfa.endsWith(arac.yol),
    );
    if (digerleri.length === 0) return;

    const baslik = document.createElement('h2');
    baslik.textContent = 'Diğer araçlar';

    const liste = document.createElement('ul');
    liste.className = 'gecis-listesi';

    for (const arac of digerleri) {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = `../../${arac.yol}`;

      const ikon = document.createElement('span');
      ikon.className = 'gecis-ikon';
      ikon.innerHTML = ikonAl(arac.ikon);

      const yazi = document.createElement('span');
      const ad = document.createElement('strong');
      ad.textContent = arac.ad;
      const ozet = document.createElement('span');
      ozet.className = 'gecis-ozet';
      ozet.textContent = arac.ozet;
      yazi.append(ad, ozet);

      link.append(ikon, yazi);
      li.append(link);
      liste.append(li);
    }

    kapsayici.append(baslik, liste);
  } catch {
    // Liste yüklenemezse sayfanın kalanı çalışmaya devam etsin; üstteki
    // "Siber Araç Kutusu" bağlantısı zaten ana sayfaya dönüş sağlıyor.
  }
}

yukle();
