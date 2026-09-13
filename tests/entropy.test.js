import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  entropiHesapla, kirilmaSuresi, sureyiYaz, seviye, SEVIYELER, parolaUret, kumeAnalizi, DENEME_HIZI,
} from '../assets/js/entropy.js';
import { YAYGIN_PAROLALAR } from '../assets/js/yaygin-parolalar.js';

const olc = (parola) => entropiHesapla(parola, YAYGIN_PAROLALAR);
const seviyeAdi = (parola) => SEVIYELER[seviye(olc(parola).bit)].adi;

test('boş parola sıfır bit', () => {
  const sonuc = olc('');
  assert.equal(sonuc.bit, 0);
  assert.deepEqual(sonuc.uyarilar, []);
});

test('karakter kümeleri doğru sayılıyor', () => {
  assert.equal(kumeAnalizi('abc').alfabe, 26);
  assert.equal(kumeAnalizi('abcABC').alfabe, 52);
  assert.equal(kumeAnalizi('abcABC123').alfabe, 62);
  assert.equal(kumeAnalizi('abcABC123!').alfabe, 95);
});

test('uzunluk arttıkça entropi artar', () => {
  const kisa = olc('kX7#pL').bit;
  const uzun = olc('kX7#pLmQ9vZr').bit;
  assert.ok(uzun > kisa, 'daha uzun parola daha yüksek entropi vermeli');
});

test('yaygın parolalar çok zayıf sayılır', () => {
  for (const parola of ['123456', 'password', 'galatasaray', 'sifre123']) {
    assert.equal(seviyeAdi(parola), 'çok zayıf', `${parola} çok zayıf çıkmalı`);
    assert.ok(olc(parola).uyarilar.length > 0);
  }
});

test('sözlük kelimesi + rakam kalıbı yüksek puan almaz', () => {
  // Asıl mesele bu: karakter çeşitliliğine bakan hesap bunu "güçlü" sanır.
  const sonuc = olc('Galatasaray1907');
  assert.ok(sonuc.hamBit > 80, 'ham hesap yüksek çıkar');
  assert.ok(sonuc.bit < 40, `düzeltilmiş puan düşük olmalı, ${sonuc.bit.toFixed(1)} bit çıktı`);
  assert.ok(sonuc.sozluk, 'sözlük eşleşmesi raporlanmalı');
  assert.equal(sonuc.sozluk.kelime, 'galatasaray');
});

test('sıralı diziler ve tekrarlar cezalandırılır', () => {
  assert.ok(olc('abcdefgh').uyarilar.some((u) => u.includes('sıra')));
  assert.ok(olc('qwerty12').uyarilar.some((u) => u.includes('sıra')));
  assert.ok(olc('paaaarola').uyarilar.some((u) => u.includes('tekrar')));
  assert.ok(olc('abcdefgh').bit < olc('kqxmveth').bit, 'sıralı dizi daha düşük puan almalı');
});

test('rastgele uzun parola güçlü sayılır', () => {
  assert.ok(['güçlü', 'çok güçlü'].includes(seviyeAdi('kX7#pL2m!Qv9Zr')));
  assert.ok(['güçlü', 'çok güçlü'].includes(seviyeAdi('correct horse battery staple')));
});

test('kırılma süresi entropiyle üstel büyür', () => {
  const a = kirilmaSuresi(40);
  const b = kirilmaSuresi(41);
  assert.ok(Math.abs(b / a - 2) < 1e-9, 'her bit süreyi ikiye katlamalı');
  assert.ok(kirilmaSuresi(40, DENEME_HIZI.cevrimici) > kirilmaSuresi(40, DENEME_HIZI.cevrimdisi));
});

test('süre okunabilir biçimde yazılıyor', () => {
  assert.equal(sureyiYaz(0.0001), 'anında');
  assert.match(sureyiYaz(30), /saniye/);
  assert.match(sureyiYaz(3600 * 5), /saat/);
  assert.match(sureyiYaz(86400 * 400), /yıl/);
  assert.equal(sureyiYaz(Infinity), 'hesaplanamayacak kadar uzun');
});

test('üretilen parola istenen uzunluk ve kümelerde', () => {
  for (const uzunluk of [8, 16, 32, 48]) {
    const parola = parolaUret(uzunluk);
    assert.equal(parola.length, uzunluk);
  }

  const sadeceHarf = parolaUret(20, { buyuk: false, rakam: false, sembol: false });
  assert.match(sadeceHarf, /^[a-z]+$/);

  const rakamsiz = parolaUret(20, { rakam: false });
  assert.ok(!/[0-9]/.test(rakamsiz));

  assert.equal(parolaUret(16, { kucuk: false, buyuk: false, rakam: false, sembol: false }), '');
});

test('üretilen parolalar tekrar etmiyor ve güçlü çıkıyor', () => {
  const uretilenler = new Set(Array.from({ length: 200 }, () => parolaUret(20)));
  assert.equal(uretilenler.size, 200, 'aynı parola iki kez üretilmemeli');

  for (const parola of [...uretilenler].slice(0, 20)) {
    assert.ok(olc(parola).bit > 80, `${parola} yeterince güçlü değil`);
  }
});
