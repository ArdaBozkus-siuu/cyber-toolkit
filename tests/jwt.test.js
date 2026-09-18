import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  jwtCoz, base64urlCoz, denetle, zamanlariCoz, suresiDolduMu, goreliZaman,
} from '../assets/js/jwt.js';

const b64url = (nesne) =>
  Buffer.from(JSON.stringify(nesne)).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const tokenYap = (baslik, veri, imza = 'sahte-imza') =>
  `${b64url(baslik)}.${b64url(veri)}.${imza}`;

const SIMDI = Date.UTC(2026, 8, 18, 12, 0, 0);
const saniye = (ms) => Math.floor(ms / 1000);

test('geçerli token çözülüyor', () => {
  const token = tokenYap({ alg: 'HS256', typ: 'JWT' }, { sub: '1234', name: 'Arda' });
  const sonuc = jwtCoz(token);

  assert.equal(sonuc.gecerli, true);
  assert.equal(sonuc.baslik.alg, 'HS256');
  assert.equal(sonuc.veri.name, 'Arda');
  assert.equal(sonuc.imza, 'sahte-imza');
});

test('Bearer öneki temizleniyor', () => {
  const token = tokenYap({ alg: 'HS256' }, { sub: '1' });
  assert.equal(jwtCoz(`Bearer ${token}`).gecerli, true);
  assert.equal(jwtCoz(`  bearer  ${token}  `).gecerli, true);
});

test('Türkçe karakterler doğru çözülüyor', () => {
  const token = tokenYap({ alg: 'HS256' }, { ad: 'Şükrü Çağlayan', sehir: 'İstanbul' });
  const sonuc = jwtCoz(token);
  assert.equal(sonuc.veri.ad, 'Şükrü Çağlayan');
  assert.equal(sonuc.veri.sehir, 'İstanbul');
});

test('base64url dolgusuz değerleri çözüyor', () => {
  // Dolgu karakteri (=) base64url'de atılır; uzunluk 4'ün katı olmayabilir.
  assert.equal(base64urlCoz('YQ'), 'a');
  assert.equal(base64urlCoz('YWI'), 'ab');
  assert.equal(base64urlCoz('YWJj'), 'abc');
});

test('bozuk girdiler istisna fırlatmıyor, açıklama döndürüyor', () => {
  for (const girdi of ['', '   ', 'abc', 'a.b', 'bir.iki.üç.dört']) {
    const sonuc = jwtCoz(girdi);
    assert.equal(sonuc.gecerli, false);
    assert.ok(sonuc.hata.length > 0, `açıklama yok: ${girdi}`);
  }
});

test('beş bölümlü değer JWE olarak açıklanıyor', () => {
  const sonuc = jwtCoz('a.b.c.d.e');
  assert.equal(sonuc.gecerli, false);
  assert.match(sonuc.hata, /JWE|şifrelenmiş/);
});

test('geçersiz JSON içeren bölüm bildiriliyor', () => {
  const bozukBaslik = Buffer.from('bu json değil').toString('base64url');
  const sonuc = jwtCoz(`${bozukBaslik}.${b64url({ sub: '1' })}.imza`);
  assert.equal(sonuc.gecerli, false);
  assert.match(sonuc.hata, /Başlık/);
});

test('alg none kritik olarak işaretleniyor', () => {
  const bulgular = denetle({ alg: 'none' }, { sub: '1', exp: saniye(SIMDI) + 600 }, SIMDI);
  const kritik = bulgular.find((b) => b.seviye === 'kritik');
  assert.ok(kritik, 'alg none kritik sayılmalı');
  assert.match(kritik.mesaj, /imzasız/);
});

test('alg none büyük harfle yazılsa da yakalanıyor', () => {
  // Kütüphanelerin bir kısmı "None" ya da "NONE" değerini de kabul eder.
  for (const alg of ['None', 'NONE', 'nOnE']) {
    const bulgular = denetle({ alg }, { sub: '1' }, SIMDI);
    assert.ok(bulgular.some((b) => b.seviye === 'kritik' && /imzasız/.test(b.mesaj)), `${alg} yakalanmadı`);
  }
});

test('exp yokluğu uyarı veriyor', () => {
  const bulgular = denetle({ alg: 'HS256' }, { sub: '1' }, SIMDI);
  assert.ok(bulgular.some((b) => b.seviye === 'uyari' && /exp/.test(b.mesaj)));
});

test('süresi dolmuş token bildiriliyor', () => {
  const veri = { sub: '1', exp: saniye(SIMDI) - 3600 };
  assert.equal(suresiDolduMu(veri, SIMDI), true);
  assert.ok(denetle({ alg: 'HS256' }, veri, SIMDI).some((b) => /süresi dolmuş/.test(b.mesaj)));
});

test('geçerli token süresi içinde sayılıyor', () => {
  const veri = { sub: '1', exp: saniye(SIMDI) + 3600 };
  assert.equal(suresiDolduMu(veri, SIMDI), false);
  assert.equal(suresiDolduMu({ sub: '1' }, SIMDI), null, 'exp yoksa bilinmiyor olmalı');
});

test('uzun ömürlü token uyarı veriyor', () => {
  const veri = { sub: '1', iat: saniye(SIMDI), exp: saniye(SIMDI) + 86400 * 365 };
  const bulgular = denetle({ alg: 'HS256' }, veri, SIMDI);
  assert.ok(bulgular.some((b) => b.seviye === 'uyari' && /ömrü/.test(b.mesaj)));
});

test('kısa ömürlü token için ömür uyarısı çıkmıyor', () => {
  const veri = { sub: '1', iat: saniye(SIMDI), exp: saniye(SIMDI) + 900 };
  assert.ok(!denetle({ alg: 'HS256' }, veri, SIMDI).some((b) => /ömrü/.test(b.mesaj)));
});

test('gelecekteki nbf ve iat yakalanıyor', () => {
  const nbf = denetle({ alg: 'HS256' }, { nbf: saniye(SIMDI) + 600, exp: saniye(SIMDI) + 1200 }, SIMDI);
  assert.ok(nbf.some((b) => /henüz geçerli değil/.test(b.mesaj)));

  const iat = denetle({ alg: 'HS256' }, { iat: saniye(SIMDI) + 7200, exp: saniye(SIMDI) + 9000 }, SIMDI);
  assert.ok(iat.some((b) => /iat alanı gelecekte/.test(b.mesaj)));
});

test('veri bölümündeki hassas alanlar kritik sayılıyor', () => {
  const veri = { sub: '1', user_password: 'x', exp: saniye(SIMDI) + 600 };
  const bulgu = denetle({ alg: 'HS256' }, veri, SIMDI).find((b) => b.seviye === 'kritik');
  assert.ok(bulgu);
  assert.match(bulgu.mesaj, /user_password/);
  assert.match(bulgu.mesaj, /şifreli değil/);
});

test('hassas alan taraması Türkçe adları da yakalıyor', () => {
  for (const alan of ['sifre', 'parola', 'kart_iban', 'musteri_tckn']) {
    const bulgular = denetle({ alg: 'HS256' }, { [alan]: 'x' }, SIMDI);
    assert.ok(bulgular.some((b) => b.seviye === 'kritik'), `${alan} yakalanmadı`);
  }
});

test('sıradan alanlar hassas sayılmıyor', () => {
  const veri = { sub: '1', name: 'Arda', role: 'admin', exp: saniye(SIMDI) + 600, iss: 'a', aud: 'b' };
  assert.ok(!denetle({ alg: 'HS256' }, veri, SIMDI).some((b) => b.seviye === 'kritik'));
});

test('zaman alanları okunur hale getiriliyor', () => {
  const veri = { iat: saniye(SIMDI) - 3600, exp: saniye(SIMDI) + 1800 };
  const zamanlar = zamanlariCoz(veri, SIMDI);

  assert.equal(zamanlar.length, 2);
  const iat = zamanlar.find((z) => z.alan === 'iat');
  assert.equal(iat.gecmis, true);
  assert.match(iat.goreli, /önce/);

  const exp = zamanlar.find((z) => z.alan === 'exp');
  assert.equal(exp.gecmis, false);
  assert.match(exp.goreli, /sonra/);
});

test('zaman alanı olmayan token boş liste döndürüyor', () => {
  assert.deepEqual(zamanlariCoz({ sub: '1' }, SIMDI), []);
  // Sayı olmayan exp değerine güvenilmemeli.
  assert.deepEqual(zamanlariCoz({ exp: 'yarın' }, SIMDI), []);
});

test('göreli zaman birimleri doğru', () => {
  assert.match(goreliZaman(-30), /saniye önce/);
  assert.match(goreliZaman(300), /dakika sonra/);
  assert.match(goreliZaman(7200), /saat sonra/);
  assert.match(goreliZaman(-86400 * 3), /gün önce/);
  assert.match(goreliZaman(86400 * 800), /yıl sonra/);
});

test('bulgular önem sırasına göre diziliyor', () => {
  const veri = { sub: 'admin', user_password: 'x', iat: saniye(SIMDI) - 86400, exp: saniye(SIMDI) + 86400 * 400 };
  const bulgular = denetle({ alg: 'none' }, veri, SIMDI);

  assert.equal(bulgular[0].seviye, 'kritik', 'en önemli bulgu başta olmalı');
  const oncelik = { kritik: 0, uyari: 1, bilgi: 2 };
  for (let i = 1; i < bulgular.length; i++) {
    assert.ok(oncelik[bulgular[i - 1].seviye] <= oncelik[bulgular[i].seviye], 'sıralama bozulmuş');
  }
});
