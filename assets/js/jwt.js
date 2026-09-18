// JWT çözümleyici. Token'ı parçalarına ayırır, başlık ve veri bölümlerini okur,
// zaman alanlarını değerlendirir ve riskli seçimleri işaretler.
//
// ÖNEMLİ: Burada imza DOĞRULANMAZ. Doğrulama gizli anahtar ya da açık anahtar
// gerektirir; anahtarı bir web sayfasına yapıştırmak zaten kötü bir fikirdir.
// Bu araç token'ın içinde ne yazdığını gösterir — ki bu zaten herkesin
// yapabileceği bir şeydir, JWT'nin veri bölümü şifreli değil sadece kodlanmıştır.

/** base64url çözer ve UTF-8 metne döndürür. */
export function base64urlCoz(parca) {
  const taban = parca.replace(/-/g, '+').replace(/_/g, '/');
  const dolgu = taban + '='.repeat((4 - (taban.length % 4)) % 4);

  const ikili = atob(dolgu);
  const baytlar = Uint8Array.from(ikili, (karakter) => karakter.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: true }).decode(baytlar);
}

/**
 * Token'ı çözer. Biçim hatalarında { gecerli: false, hata } döner —
 * istisna fırlatmaz, çünkü kullanıcı yazarken yarım token normaldir.
 */
export function jwtCoz(token) {
  const temiz = (token ?? '').trim().replace(/^Bearer\s+/i, '');

  if (!temiz) return { gecerli: false, hata: 'Token girilmedi.' };

  const parcalar = temiz.split('.');
  if (parcalar.length !== 3) {
    return {
      gecerli: false,
      hata: `JWT üç bölümden oluşur (başlık.veri.imza), burada ${parcalar.length} bölüm var.` +
        (parcalar.length === 5 ? ' Beş bölümlü değer bir JWE, yani şifrelenmiş token — içeriği anahtarsız okunamaz.' : ''),
    };
  }

  const [baslikHam, veriHam, imza] = parcalar;
  let baslik;
  let veri;

  try {
    baslik = JSON.parse(base64urlCoz(baslikHam));
  } catch {
    return { gecerli: false, hata: 'Başlık bölümü çözülemedi: geçerli base64url JSON değil.' };
  }

  try {
    veri = JSON.parse(base64urlCoz(veriHam));
  } catch {
    return { gecerli: false, hata: 'Veri bölümü çözülemedi: geçerli base64url JSON değil.' };
  }

  if (!imza) {
    return { gecerli: false, hata: 'İmza bölümü boş.' };
  }

  return { gecerli: true, baslik, veri, imza, uzunluklar: parcalar.map((p) => p.length) };
}

const ZAMAN_ALANLARI = {
  iat: 'Düzenlenme (iat)',
  nbf: 'Geçerlilik başlangıcı (nbf)',
  exp: 'Son kullanma (exp)',
};

/** Saniye cinsinden unix zamanlarını okunur hale getirir. */
export function zamanlariCoz(veri, simdi = Date.now()) {
  const sonuc = [];

  for (const [alan, etiket] of Object.entries(ZAMAN_ALANLARI)) {
    if (typeof veri[alan] !== 'number') continue;

    const tarih = new Date(veri[alan] * 1000);
    const farkSaniye = (tarih.getTime() - simdi) / 1000;

    sonuc.push({
      alan,
      etiket,
      tarih,
      gecmis: farkSaniye < 0,
      goreli: goreliZaman(farkSaniye),
    });
  }

  return sonuc;
}

export function goreliZaman(farkSaniye) {
  const gecmis = farkSaniye < 0;
  let deger = Math.abs(farkSaniye);

  const birimler = [
    { ad: 'saniye', bol: 60 },
    { ad: 'dakika', bol: 60 },
    { ad: 'saat', bol: 24 },
    { ad: 'gün', bol: 365 },
  ];

  for (const birim of birimler) {
    if (deger < birim.bol) {
      return `${Math.round(deger)} ${birim.ad} ${gecmis ? 'önce' : 'sonra'}`;
    }
    deger /= birim.bol;
  }
  return `${deger.toFixed(1)} yıl ${gecmis ? 'önce' : 'sonra'}`;
}

/** Token süresi dolmuş mu? exp yoksa null (bilinmiyor). */
export function suresiDolduMu(veri, simdi = Date.now()) {
  if (typeof veri.exp !== 'number') return null;
  return veri.exp * 1000 < simdi;
}

// Veri bölümünde görülmemesi gereken alan adları. JWT'nin veri bölümü
// şifrelenmez; base64 sadece kodlamadır, token'ı eline geçiren herkes okur.
const HASSAS_ALANLAR = [
  'password', 'passwd', 'pass', 'parola', 'sifre', 'secret', 'api_key', 'apikey',
  'private_key', 'card', 'credit_card', 'cvv', 'iban', 'tckn', 'ssn', 'pin',
];

const UZUN_OMUR_GUN = 30;

/**
 * Token'daki riskli seçimleri listeler.
 * seviye: 'kritik' | 'uyari' | 'bilgi'
 */
export function denetle(baslik, veri, simdi = Date.now()) {
  const bulgular = [];
  const alg = baslik.alg;

  if (!alg) {
    bulgular.push({ seviye: 'kritik', mesaj: 'Başlıkta alg alanı yok. İmzanın hangi algoritmayla üretildiği belirsiz.' });
  } else if (String(alg).toLowerCase() === 'none') {
    bulgular.push({
      seviye: 'kritik',
      mesaj: 'alg "none" — bu token imzasız. Sunucu bunu kabul ediyorsa isteyen istediği veriyi yazıp geçerli token üretebilir.',
    });
  }

  if (typeof veri.exp !== 'number') {
    bulgular.push({
      seviye: 'uyari',
      mesaj: 'exp alanı yok. Süresiz token demektir; çalınırsa iptal edilene kadar geçerli kalır.',
    });
  } else {
    const dolmus = veri.exp * 1000 < simdi;
    bulgular.push(
      dolmus
        ? { seviye: 'bilgi', mesaj: 'Token süresi dolmuş. Sunucu doğru yapılandırılmışsa reddedecektir.' }
        : { seviye: 'bilgi', mesaj: 'Token hâlâ geçerlilik süresi içinde.' },
    );

    if (typeof veri.iat === 'number') {
      const omurGun = (veri.exp - veri.iat) / 86400;
      if (omurGun > UZUN_OMUR_GUN) {
        bulgular.push({
          seviye: 'uyari',
          mesaj: `Token ömrü ${Math.round(omurGun)} gün. Erişim token'ları genellikle dakikalar sürer; uzun ömür, çalınan token'ın kullanım penceresini büyütür.`,
        });
      }
    }
  }

  if (typeof veri.nbf === 'number' && veri.nbf * 1000 > simdi) {
    bulgular.push({ seviye: 'uyari', mesaj: 'nbf alanı gelecekte: token henüz geçerli değil.' });
  }

  if (typeof veri.iat === 'number' && veri.iat * 1000 > simdi + 60_000) {
    bulgular.push({ seviye: 'uyari', mesaj: 'iat alanı gelecekte. Sunucu saati kaymış ya da token elle üretilmiş olabilir.' });
  }

  const hassas = Object.keys(veri).filter((anahtar) =>
    HASSAS_ALANLAR.some((kalip) => anahtar.toLowerCase().includes(kalip)));

  if (hassas.length > 0) {
    bulgular.push({
      seviye: 'kritik',
      mesaj: `Veri bölümünde hassas görünen alan var: ${hassas.join(', ')}. Bu bölüm şifreli değil, sadece kodlanmış — token'ı gören herkes okur.`,
    });
  }

  if (!veri.iss && !veri.aud) {
    bulgular.push({
      seviye: 'bilgi',
      mesaj: 'iss ve aud alanları yok. Bunlar token\'ın kim tarafından, kim için üretildiğini belirtir; yokluğu token\'ın başka bir servise karşı yeniden kullanılmasını kolaylaştırır.',
    });
  }

  // Kritik olan üstte dursun: listeye bakan kişi önce en önemli satırı görmeli.
  const oncelik = { kritik: 0, uyari: 1, bilgi: 2 };
  return bulgular.sort((a, b) => oncelik[a.seviye] - oncelik[b.seviye]);
}

/** Bilinen alan adlarının ne anlama geldiği. */
export const ALAN_ACIKLAMALARI = {
  iss: 'token\'ı üreten taraf',
  sub: 'token\'ın konusu, genellikle kullanıcı kimliği',
  aud: 'token\'ın hedef aldığı alıcı',
  exp: 'son kullanma zamanı',
  nbf: 'bu andan önce geçerli değil',
  iat: 'düzenlenme zamanı',
  jti: 'token\'a özel kimlik, tekrar kullanımı engellemek için',
  alg: 'imza algoritması',
  typ: 'token türü',
  kid: 'imzada kullanılan anahtarın kimliği',
};
