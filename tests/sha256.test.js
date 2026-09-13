import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { Sha256, hashBlob } from '../assets/js/sha256.js';

const referans = (veri) => crypto.createHash('sha256').update(veri).digest('hex');
const ozet = (metin) => new Sha256().update(new Uint8Array(Buffer.from(metin, 'utf8'))).digest();

test('boş girdi', () => {
  assert.equal(ozet(''), referans(Buffer.alloc(0)));
});

test('bilinen değer: "abc"', () => {
  assert.equal(ozet('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('blok sınırları (55, 56, 63, 64, 65 bayt)', () => {
  // 56 bayt ve üstünde dolgu ikinci bloğa taşar; bu noktalar en sık hata yapılan yerdir.
  for (const uzunluk of [55, 56, 63, 64, 65, 119, 120, 128]) {
    const veri = 'a'.repeat(uzunluk);
    assert.equal(ozet(veri), referans(Buffer.from(veri)), `${uzunluk} baytta uyuşmuyor`);
  }
});

test('çok baytlı Türkçe karakterler', () => {
  const veri = 'çğıöşü ĞÜŞİÖÇ merhaba dünya';
  assert.equal(ozet(veri), referans(Buffer.from(veri, 'utf8')));
});

test('1 MB veri', () => {
  const veri = 'x'.repeat(1_000_000);
  assert.equal(ozet(veri), referans(Buffer.from(veri)));
});

test('parça parça beslemek sonucu değiştirmez', () => {
  const veri = crypto.randomBytes(300_000);
  const hasher = new Sha256();
  // Blok boyutuna bölünmeyen bir adımla besliyoruz ki tampon mantığı gerçekten sınansın.
  for (let i = 0; i < veri.length; i += 7777) {
    hasher.update(new Uint8Array(veri.subarray(i, i + 7777)));
  }
  assert.equal(hasher.digest(), referans(veri));
});

test('tamamlanmış hash tekrar kullanılamaz', () => {
  const hasher = new Sha256();
  hasher.update(new Uint8Array([1, 2, 3]));
  hasher.digest();
  assert.throws(() => hasher.digest());
  assert.throws(() => hasher.update(new Uint8Array([4])));
});

test('hashBlob: parça sınırını aşan dosya ve ilerleme bildirimi', async () => {
  const veri = crypto.randomBytes(9_500_000); // 4 MB'lık parça boyutundan büyük
  const adimlar = [];
  const sonuc = await hashBlob(new Blob([veri]), (oran) => adimlar.push(oran));

  assert.equal(sonuc, referans(veri));
  assert.ok(adimlar.length >= 3, 'ilerleme birden çok kez bildirilmeli');
  assert.equal(adimlar.at(-1), 1, 'son bildirim %100 olmalı');
  assert.ok(adimlar.every((o, i) => i === 0 || o > adimlar[i - 1]), 'ilerleme geri gitmemeli');
});

test('hashBlob: boş dosya', async () => {
  assert.equal(await hashBlob(new Blob([])), referans(Buffer.alloc(0)));
});
