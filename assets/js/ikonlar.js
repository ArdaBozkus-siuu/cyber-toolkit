// Araç ikonları. Hazır bir ikon kütüphanesi yerine elle çizildi: her biri
// aracın yaptığı işi anlatıyor ve hepsi aynı çizgi kalınlığını paylaşıyor.
// Renk currentColor üzerinden gelir, böylece tema değişince ikon da değişir.

const sarmala = (icerik) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${icerik}</svg>`;

export const IKONLAR = {
  // Yükselen ölçü çubukları — parolanın gücünü ölçmek.
  parola: sarmala(`
    <rect x="2.5" y="14" width="3.5" height="6" rx="0.5"/>
    <rect x="7.5" y="11" width="3.5" height="9" rx="0.5"/>
    <rect x="12.5" y="8" width="3.5" height="12" rx="0.5"/>
    <rect x="17.5" y="4" width="3.5" height="16" rx="0.5"/>`),

  // Belge ve üzerindeki parmak izi kıvrımları — dosyanın kimliği.
  dosya: sarmala(`
    <path d="M5.5 2.75h8.25L18.5 7.5v13.75H5.5z"/>
    <path d="M13.5 2.75V7.5h5"/>
    <path d="M9 17.5c0-2.5 1.3-3.75 3-3.75s3 1.25 3 3.75"/>
    <path d="M10.75 18.5c0-1.1.5-1.75 1.25-1.75s1.25.65 1.25 1.75"/>`),

  // Kayıt satırları; biri işaretli — logda göze çarpması gereken tek satır.
  log: sarmala(`
    <path d="M3.5 5.5h17M3.5 9.75h11M3.5 18.5h8"/>
    <path d="M3.5 14h6"/>
    <circle cx="17" cy="14" r="3.25"/>
    <path d="M19.4 16.4 21.5 18.5"/>`),

  // Üç parçalı bir jeton: başlık, veri, imza.
  jwt: sarmala(`
    <rect x="2.5" y="7" width="19" height="10" rx="1.5"/>
    <path d="M9 7v10M15 7v10"/>
    <path d="M5.25 12h1.5M11.25 12h1.5M17.25 12h1.5"/>`),

  varsayilan: sarmala(`<circle cx="12" cy="12" r="8.5"/><path d="M12 8v8M8 12h8"/>`),
};

export const ikonAl = (ad) => IKONLAR[ad] ?? IKONLAR.varsayilan;

/** Sitenin işareti: beş bölmeli bir ölçek, dördü dolu. */
export const MARKA = `<svg viewBox="0 0 28 20" aria-hidden="true" focusable="false" class="marka-isaret">
  <rect x="0.5" y="6" width="4" height="8" rx="1" fill="currentColor"/>
  <rect x="6" y="4" width="4" height="12" rx="1" fill="currentColor"/>
  <rect x="11.5" y="2" width="4" height="16" rx="1" fill="currentColor"/>
  <rect x="17" y="4" width="4" height="12" rx="1" fill="currentColor" opacity="0.45"/>
  <rect x="22.5" y="6" width="4" height="8" rx="1" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.5"/>
</svg>`;
