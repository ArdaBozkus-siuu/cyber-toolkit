import {
  jwtCoz, denetle, zamanlariCoz, ALAN_ACIKLAMALARI,
} from '../../assets/js/jwt.js';

const $ = (id) => document.getElementById(id);

const tokenGirdi = $('token');
const durumYazi = $('durum-yazi');
const sonucPanel = $('sonuc-panel');
const bulgularListe = $('bulgular');
const zamanlarListe = $('zamanlar');
const alanSozlugu = $('alan-sozlugu');

const SEVIYE_SINIF = { kritik: 'riskli', uyari: '', bilgi: 'guvenli' };

function bildir(yazi) {
  durumYazi.textContent = yazi;
  durumYazi.classList.remove('gizli');
}

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

function coz() {
  const ham = tokenGirdi.value.trim();

  if (!ham) {
    durumYazi.classList.add('gizli');
    sonucPanel.classList.add('gizli');
    return;
  }

  const sonuc = jwtCoz(ham);

  if (!sonuc.gecerli) {
    bildir(sonuc.hata);
    sonucPanel.classList.add('gizli');
    return;
  }

  const bulgular = denetle(sonuc.baslik, sonuc.veri);
  const kritikSayisi = bulgular.filter((b) => b.seviye === 'kritik').length;

  bulgularListe.replaceChildren(...bulgular.map((bulgu) => {
    const li = document.createElement('li');
    li.className = SEVIYE_SINIF[bulgu.seviye];
    li.textContent = bulgu.mesaj;
    return li;
  }));

  const zamanlar = zamanlariCoz(sonuc.veri);
  zamanlarListe.replaceChildren(
    ...(zamanlar.length
      ? zamanlar.map((z) => veriSatiri(z.etiket, `${z.tarih.toLocaleString('tr-TR')} — ${z.goreli}`))
      : [veriSatiri('Zaman alanı', 'token\'da iat, nbf veya exp yok')]),
  );

  $('baslik-json').textContent = JSON.stringify(sonuc.baslik, null, 2);
  $('veri-json').textContent = JSON.stringify(sonuc.veri, null, 2);

  // Token'da geçen standart alanların ne anlama geldiğini yazıyoruz;
  // kısaltmalar (iss, aud, jti) ilk bakışta okunmuyor.
  const tanimli = [...Object.keys(sonuc.baslik), ...Object.keys(sonuc.veri)]
    .filter((alan) => alan in ALAN_ACIKLAMALARI);

  alanSozlugu.replaceChildren(
    ...[...new Set(tanimli)].map((alan) => veriSatiri(alan, ALAN_ACIKLAMALARI[alan])),
  );

  sonucPanel.classList.remove('gizli');
  bildir(
    kritikSayisi > 0
      ? `Token çözüldü. ${kritikSayisi} kritik bulgu var, aşağıda kırmızı işaretli.`
      : `Token çözüldü. İmza doğrulanmadı — bu araç yalnızca içeriği okur.`,
  );
}

tokenGirdi.addEventListener('input', coz);

/* --- Örnek token'lar ------------------------------------------------------- */

const b64url = (nesne) => {
  const metin = JSON.stringify(nesne);
  // Türkçe karakterler için önce UTF-8 baytlarına çeviriyoruz; btoa yalnızca
  // Latin-1 kabul eder ve "Şükrü" gibi bir değerde hata verir.
  const baytlar = new TextEncoder().encode(metin);
  const ikili = Array.from(baytlar, (b) => String.fromCharCode(b)).join('');
  return btoa(ikili).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const tokenYap = (baslik, veri, imza) => `${b64url(baslik)}.${b64url(veri)}.${imza}`;
const simdi = () => Math.floor(Date.now() / 1000);

$('ornek-btn').addEventListener('click', () => {
  tokenGirdi.value = tokenYap(
    { alg: 'HS256', typ: 'JWT' },
    {
      iss: 'https://ornek-servis.test',
      sub: 'kullanici-4821',
      aud: 'ornek-istemci',
      name: 'Arda Bozkuş',
      role: 'editor',
      iat: simdi() - 300,
      exp: simdi() + 900,
      jti: 'a3f1c9e2',
    },
    'RkFLRV9TSUdOQVRVUkVfT05MWV9GT1JfREVNTw',
  );
  coz();
});

$('riskli-btn').addEventListener('click', () => {
  tokenGirdi.value = tokenYap(
    { alg: 'none', typ: 'JWT' },
    {
      sub: 'admin',
      user_password: 'yaz2026',
      role: 'superadmin',
      iat: simdi() - 86400 * 400,
      exp: simdi() + 86400 * 365,
    },
    'a',
  );
  coz();
});

$('temizle-btn').addEventListener('click', () => {
  tokenGirdi.value = '';
  durumYazi.classList.add('gizli');
  sonucPanel.classList.add('gizli');
});
