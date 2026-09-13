import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  olaylariAyikla, adresleriOzetle, zamanOku, saatDagilimi, sureyiYaz,
} from '../assets/js/log-analiz.js';
import { ORNEK_LOG } from '../assets/js/ornek-log.js';

const satir = (metin) => olaylariAyikla(metin).olaylar[0];

test('başarısız parola denemesi okunuyor', () => {
  const olay = satir('Sep 13 18:22:01 sunucu sshd[1]: Failed password for root from 203.0.113.9 port 1 ssh2');
  assert.equal(olay.tur, 'basarisiz');
  assert.equal(olay.kullanici, 'root');
  assert.equal(olay.ip, '203.0.113.9');
});

test('geçersiz kullanıcı satırı okunuyor', () => {
  const olay = satir('Sep 13 18:22:01 sunucu sshd[1]: Invalid user admin from 198.51.100.7');
  assert.equal(olay.tur, 'gecersiz-kullanici');
  assert.equal(olay.kullanici, 'admin');
});

test('"invalid user" ekli başarısız satırda kullanıcı adı doğru alınıyor', () => {
  const olay = satir('Sep 13 18:22:01 sunucu sshd[1]: Failed password for invalid user oracle from 203.0.113.9 port 1 ssh2');
  assert.equal(olay.kullanici, 'oracle', '"invalid" kelimesini kullanıcı adı sanmamalı');
  assert.equal(olay.tur, 'basarisiz');
});

test('başarılı giriş hem parola hem anahtar için okunuyor', () => {
  assert.equal(satir('Sep 13 18:22:01 s sshd[1]: Accepted password for arda from 192.0.2.1 port 1 ssh2').tur, 'basarili');
  assert.equal(satir('Sep 13 18:22:01 s sshd[1]: Accepted publickey for arda from 192.0.2.1 port 1 ssh2').tur, 'basarili');
});

test('ilgisiz satırlar atlanıyor', () => {
  const metin = [
    'Sep 13 18:00:00 sunucu CRON[99]: pam_unix(cron:session): session opened for user root',
    'rastgele bir metin',
    '',
    'Sep 13 18:22:01 sunucu sshd[1]: Failed password for root from 203.0.113.9 port 1 ssh2',
  ].join('\n');

  const { olaylar, satirSayisi } = olaylariAyikla(metin);
  assert.equal(olaylar.length, 1);
  assert.equal(satirSayisi, 3, 'boş satırlar sayılmamalı');
  assert.equal(olaylar[0].satirNo, 4, 'satır numarası kaynaktaki yeri göstermeli');
});

test('iki zaman biçimi de okunuyor', () => {
  const syslog = zamanOku('Sep 13 18:22:01 sunucu sshd[1]: ...', 2026);
  assert.equal(syslog.getMonth(), 8);
  assert.equal(syslog.getDate(), 13);
  assert.equal(syslog.getHours(), 18);
  assert.equal(syslog.getFullYear(), 2026, 'syslog biçiminde yıl dışarıdan gelmeli');

  const iso = zamanOku('2026-09-13T18:22:01+03:00 sunucu sshd[1]: ...');
  assert.ok(iso instanceof Date && !Number.isNaN(iso.getTime()));

  assert.equal(zamanOku('zamansız satır'), null);
});

test('IPv6 adresleri de yakalanıyor', () => {
  const olay = satir('Sep 13 18:22:01 s sshd[1]: Failed password for root from 2001:db8::1 port 1 ssh2');
  assert.equal(olay.ip, '2001:db8::1');
});

test('eşiği aşan adres şüpheli işaretleniyor', () => {
  const metin = Array.from({ length: 12 }, (_, i) =>
    `Sep 13 05:02:${String(i).padStart(2, '0')} s sshd[1]: Failed password for root from 203.0.113.9 port 1 ssh2`).join('\n');

  const [ozet] = adresleriOzetle(olaylariAyikla(metin).olaylar, 10);
  assert.equal(ozet.seviye, 'supheli');
  assert.equal(ozet.basarisiz, 12);
  assert.ok(ozet.gerekceler.some((g) => g.includes('başarısız')));
});

test('eşiğin altındaki adres normal kalıyor', () => {
  const metin = [
    'Sep 13 04:22:14 s sshd[1]: Failed password for arda from 192.0.2.44 port 1 ssh2',
    'Sep 13 04:22:31 s sshd[1]: Accepted password for arda from 192.0.2.44 port 1 ssh2',
  ].join('\n');

  const [ozet] = adresleriOzetle(olaylariAyikla(metin).olaylar, 10);
  assert.equal(ozet.seviye, 'normal', 'parolasını bir kez yanlış yazan kullanıcı işaretlenmemeli');
});

test('başarısız yığından sonra gelen başarılı giriş kritik sayılıyor', () => {
  const ozetler = adresleriOzetle(olaylariAyikla(ORNEK_LOG).olaylar, 10);
  const saldirgan = ozetler.find((o) => o.ip === '198.51.100.7');

  assert.equal(saldirgan.seviye, 'kritik');
  assert.equal(saldirgan.basarili, 1);
  assert.ok(saldirgan.basarisiz >= 10);
  assert.ok(saldirgan.gerekceler.some((g) => g.includes('başarılı')));
});

test('çok sayıda kullanıcı adı denemesi şüpheli sayılıyor', () => {
  const ozetler = adresleriOzetle(olaylariAyikla(ORNEK_LOG).olaylar, 10);
  const tarayici = ozetler.find((o) => o.ip === '203.0.113.9');

  assert.equal(tarayici.seviye, 'supheli');
  assert.ok(tarayici.kullanicilar.length >= 5);
  assert.ok(tarayici.gerekceler.some((g) => g.includes('kullanıcı adı')));
});

test('sonuçlar önem sırasına göre diziliyor', () => {
  const ozetler = adresleriOzetle(olaylariAyikla(ORNEK_LOG).olaylar, 10);
  assert.equal(ozetler[0].seviye, 'kritik', 'en tehlikeli adres başta olmalı');

  const sira = { kritik: 0, supheli: 1, normal: 2 };
  for (let i = 1; i < ozetler.length; i++) {
    assert.ok(sira[ozetler[i - 1].seviye] <= sira[ozetler[i].seviye], 'sıralama bozulmuş');
  }
});

test('normal kullanıcı örnek logda temiz çıkıyor', () => {
  const ozetler = adresleriOzetle(olaylariAyikla(ORNEK_LOG).olaylar, 10);
  const normal = ozetler.find((o) => o.ip === '192.0.2.10');
  assert.equal(normal.seviye, 'normal');
  assert.equal(normal.basarisiz, 0);
});

test('deneme hızı hesaplanıyor', () => {
  const metin = Array.from({ length: 10 }, (_, i) =>
    `Sep 13 05:0${Math.floor(i / 6)}:${String(i % 6 * 10).padStart(2, '0')} s sshd[1]: Failed password for root from 203.0.113.9 port 1 ssh2`).join('\n');

  const [ozet] = adresleriOzetle(olaylariAyikla(metin).olaylar, 10);
  assert.ok(ozet.dakikadaDeneme > 0);
  assert.ok(Number.isFinite(ozet.dakikadaDeneme), 'sıfıra bölme olmamalı');
});

test('tek anlık yığın denemede hız sonsuza gitmiyor', () => {
  const metin = Array.from({ length: 20 }, () =>
    'Sep 13 05:02:00 s sshd[1]: Failed password for root from 203.0.113.9 port 1 ssh2').join('\n');

  const [ozet] = adresleriOzetle(olaylariAyikla(metin).olaylar, 10);
  assert.ok(Number.isFinite(ozet.dakikadaDeneme));
  assert.equal(ozet.sureSaniye, 0);
});

test('saat dağılımı sadece başarısız denemeleri sayıyor', () => {
  const kovalar = saatDagilimi(olaylariAyikla(ORNEK_LOG).olaylar);
  assert.equal(kovalar.length, 24);
  assert.ok(kovalar[5] >= 12, '05:00 civarındaki tarama görünmeli');
  assert.ok(kovalar[22] >= 8, '22:00 civarındaki deneme dizisi görünmeli');
  assert.equal(kovalar[3], 0, 'başarılı giriş saatinde sayaç artmamalı');
});

test('boş girdi çökmüyor', () => {
  assert.deepEqual(olaylariAyikla('').olaylar, []);
  assert.deepEqual(adresleriOzetle([], 10), []);
  assert.deepEqual(saatDagilimi([]), Array(24).fill(0));
});

test('süre okunabilir yazılıyor', () => {
  assert.equal(sureyiYaz(0), '—');
  assert.match(sureyiYaz(45), /sn/);
  assert.match(sureyiYaz(300), /dk/);
  assert.match(sureyiYaz(7200), /saat/);
  assert.match(sureyiYaz(172800), /gün/);
});

test('örnek log tutarlı: üç adres, beklenen olay sayısı', () => {
  const { olaylar } = olaylariAyikla(ORNEK_LOG);
  const ozetler = adresleriOzetle(olaylar, 10);

  assert.equal(ozetler.length, 4, 'örnek logda dört farklı adres var');
  assert.equal(ozetler.filter((o) => o.seviye === 'kritik').length, 1);
  assert.equal(ozetler.filter((o) => o.seviye === 'supheli').length, 1);
});

test('aynı deneme iki satıra yazıldığında bir kez sayılıyor', () => {
  // sshd önce "Invalid user", hemen ardından "Failed password for invalid user" yazar.
  const metin = [
    'Sep 13 05:02:08 s sshd[1]: Invalid user admin from 203.0.113.9',
    'Sep 13 05:02:08 s sshd[1]: Failed password for invalid user admin from 203.0.113.9 port 1 ssh2',
  ].join('\n');

  const [ozet] = adresleriOzetle(olaylariAyikla(metin).olaylar, 10);
  assert.equal(ozet.basarisiz, 1, 'iki satır tek deneme sayılmalı');
  assert.deepEqual(ozet.kullanicilar, ['admin']);
});

test('farklı saniyelerdeki denemeler ayrı sayılıyor', () => {
  const metin = [
    'Sep 13 05:02:08 s sshd[1]: Failed password for root from 203.0.113.9 port 1 ssh2',
    'Sep 13 05:02:09 s sshd[1]: Failed password for root from 203.0.113.9 port 1 ssh2',
  ].join('\n');

  const [ozet] = adresleriOzetle(olaylariAyikla(metin).olaylar, 10);
  assert.equal(ozet.basarisiz, 2);
});

test('örnek logdaki tarama gerçek deneme sayısını gösteriyor', () => {
  const ozetler = adresleriOzetle(olaylariAyikla(ORNEK_LOG).olaylar, 10);
  const tarayici = ozetler.find((o) => o.ip === '203.0.113.9');
  assert.equal(tarayici.basarisiz, 12, 'çift kayıt yüzünden şişmemeli');
  assert.equal(tarayici.kullanicilar.length, 12);
});
