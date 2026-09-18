// Açık/koyu tema. Kullanıcı bir seçim yapmadıysa işletim sisteminin tercihi geçerli;
// düğmeye basıldığında seçim localStorage'a yazılır ve sistem tercihini geçersiz kılar.
// Sayfa açılırken temanın bir an yanlış görünmemesi için <head> içinde küçük bir
// betik çalışır; buradaki kod sadece düğmeyi yönetir.

const ANAHTAR = 'tema';

const GUNES = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
  stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.25"/>
  <path d="M12 2.5v2.25M12 19.25v2.25M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.25M19.25 12h2.25M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6"/></svg>`;

const AY = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/></svg>`;

const kok = document.documentElement;
const dugme = document.getElementById('tema-btn');

// matchMedia her ortamda bulunmayabilir (eski tarayıcılar, test ortamları).
// Yoksa açık tema varsayılır ve düğme yine de çalışır.
const sorgu = typeof window.matchMedia === 'function'
  ? window.matchMedia('(prefers-color-scheme: dark)')
  : null;

function suankiTema() {
  if (kok.dataset.tema) return kok.dataset.tema;
  return sorgu?.matches ? 'koyu' : 'acik';
}

function dugmeyiGuncelle() {
  if (!dugme) return;
  const koyuMu = suankiTema() === 'koyu';
  dugme.innerHTML = koyuMu ? GUNES : AY;
  dugme.setAttribute('aria-label', koyuMu ? 'Açık temaya geç' : 'Koyu temaya geç');
  dugme.setAttribute('title', koyuMu ? 'Açık tema' : 'Koyu tema');
}

if (dugme) {
  dugme.addEventListener('click', () => {
    const yeni = suankiTema() === 'koyu' ? 'acik' : 'koyu';
    kok.dataset.tema = yeni;
    try { localStorage.setItem(ANAHTAR, yeni); } catch { /* gizli sekmede yazılamaz, sorun değil */ }
    dugmeyiGuncelle();
  });

  // Kullanıcı henüz seçim yapmadıysa sistem tercihindeki değişimi takip et.
  // addEventListener eski Safari'de yok; orada addListener'a düşüyoruz.
  const sistemDegisti = () => { if (!kok.dataset.tema) dugmeyiGuncelle(); };
  if (sorgu?.addEventListener) sorgu.addEventListener('change', sistemDegisti);
  else if (sorgu?.addListener) sorgu.addListener(sistemDegisti);

  dugmeyiGuncelle();
}
