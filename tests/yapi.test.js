// Sayfalarla kod arasındaki bağların kopmadığını denetler.
// Bir id'yi HTML'de yeniden adlandırıp JS'te unutmak, tarayıcıda sessizce
// çalışmayan bir düğmeye dönüşür; burada test olarak patlar.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const kok = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const oku = (göreli) => fs.readFileSync(path.join(kok, göreli), 'utf8');

const SAYFALAR = [
  { html: 'index.html', js: 'assets/js/home.js' },
  { html: 'tools/parola-sagligi/index.html', js: 'tools/parola-sagligi/app.js' },
  { html: 'tools/dosya-butunlugu/index.html', js: 'tools/dosya-butunlugu/app.js' },
  { html: 'tools/log-analizi/index.html', js: 'tools/log-analizi/app.js' },
];

const idleriTopla = (html) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const arananIdler = (js) =>
  new Set([...js.matchAll(/(?:\$|getElementById)\(\s*'([^']+)'\s*\)/g)].map((m) => m[1]));

for (const sayfa of SAYFALAR) {
  test(`${sayfa.html}: id'ler benzersiz`, () => {
    const hepsi = [...oku(sayfa.html).matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(new Set(hepsi).size, hepsi.length, 'aynı id iki kez kullanılmış');
  });

  test(`${sayfa.html}: bağlantı verilen dosyalar mevcut`, () => {
    const html = oku(sayfa.html);
    const klasor = path.dirname(path.join(kok, sayfa.html));

    for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const ref = m[1];
      if (ref.startsWith('http') || ref.startsWith('#')) continue;
      const hedef = path.resolve(klasor, ref);
      const bulundu = fs.existsSync(hedef) || fs.existsSync(path.join(hedef, 'index.html'));
      assert.ok(bulundu, `kırık yol: ${ref}`);
    }
  });

  test(`${sayfa.js}: aradığı her id sayfada var`, () => {
    const idler = idleriTopla(oku(sayfa.html));
    const aranan = arananIdler(oku(sayfa.js));
    assert.ok(aranan.size > 0, 'hiç id referansı bulunamadı, testin kendisi bozulmuş olabilir');

    for (const id of aranan) {
      assert.ok(idler.has(id), `${sayfa.js} '${id}' arıyor ama ${sayfa.html} içinde yok`);
    }
  });

  test(`${sayfa.js}: import ettiği modüller mevcut`, () => {
    const klasor = path.dirname(path.join(kok, sayfa.js));
    for (const m of oku(sayfa.js).matchAll(/from\s+'([^']+)'/g)) {
      assert.ok(fs.existsSync(path.resolve(klasor, m[1])), `bulunamayan import: ${m[1]}`);
    }
  });
}

test('tools.json geçerli ve hazır araçların sayfası var', () => {
  const araclar = JSON.parse(oku('tools.json'));
  assert.ok(Array.isArray(araclar) && araclar.length > 0);

  for (const arac of araclar) {
    assert.ok(arac.ad && arac.ozet && arac.yol, 'eksik alan: ' + JSON.stringify(arac));
    assert.ok(['hazir', 'yakinda'].includes(arac.durum), `bilinmeyen durum: ${arac.durum}`);
    assert.ok(arac.yol.endsWith('/'), `yol / ile bitmeli: ${arac.yol}`);

    if (arac.durum === 'hazir') {
      assert.ok(
        fs.existsSync(path.join(kok, arac.yol, 'index.html')),
        `${arac.ad} hazır görünüyor ama sayfası yok`,
      );
    }
  }
});

test('araç sayfaları ana sayfaya dönüş bağlantısı içeriyor', () => {
  for (const sayfa of SAYFALAR.slice(1)) {
    assert.match(oku(sayfa.html), /href="\.\.\/\.\.\/"/, `${sayfa.html} içinde dönüş linki yok`);
  }
});

test('sayfalar Türkçe dil etiketiyle ve utf-8 ile işaretli', () => {
  for (const sayfa of SAYFALAR) {
    const html = oku(sayfa.html);
    assert.match(html, /<html lang="tr">/);
    assert.match(html, /<meta charset="utf-8">/);
    assert.match(html, /name="viewport"/, 'mobil görünüm için viewport etiketi gerekli');
  }
});

test('her sayfada favicon, marka ve tema düğmesi var', () => {
  for (const sayfa of SAYFALAR) {
    const html = oku(sayfa.html);
    assert.match(html, /rel="icon"/, `${sayfa.html} içinde favicon bağlantısı yok`);
    assert.match(html, /class="marka"/, `${sayfa.html} içinde marka bağlantısı yok`);
    assert.match(html, /id="tema-btn"/, `${sayfa.html} içinde tema düğmesi yok`);
  }
});

test('tema betiği ilk boyamadan önce çalışacak şekilde head içinde', () => {
  for (const sayfa of SAYFALAR) {
    const html = oku(sayfa.html);
    const headSonu = html.indexOf('</head>');
    const betik = html.indexOf("localStorage.getItem('tema')");
    assert.ok(betik > 0, `${sayfa.html} içinde tema betiği yok`);
    assert.ok(betik < headSonu, `${sayfa.html} içinde tema betiği head dışında — sayfa bir an yanlış temada yanıp söner`);
  }
});

test('araç sayfalarında diğer araçlara geçiş bölümü var', () => {
  for (const sayfa of SAYFALAR.slice(1)) {
    const html = oku(sayfa.html);
    assert.match(html, /id="diger-araclar"/, `${sayfa.html} içinde geçiş bölümü yok`);
    assert.match(html, /arac-gezinme\.js/, `${sayfa.html} geçiş betiğini yüklemiyor`);
  }
});

test('her araç kaydında tanımlı bir ikon var', async () => {
  const { IKONLAR } = await import('../assets/js/ikonlar.js');
  for (const arac of JSON.parse(oku('tools.json'))) {
    assert.ok(arac.ikon, `${arac.ad} için ikon alanı yok`);
    assert.ok(arac.ikon in IKONLAR, `${arac.ad} tanımsız ikon kullanıyor: ${arac.ikon}`);
  }
});

test('favicon ve 404 sayfası yerinde', () => {
  assert.ok(fs.existsSync(path.join(kok, 'favicon.svg')));
  const html = oku('404.html');
  assert.match(html, /<html lang="tr">/);
  // GitHub Pages alt dizinde yayınladığı için 404 mutlak yol kullanmak zorunda.
  assert.match(html, /href="\/cyber-toolkit\//, '404 sayfası mutlak yol kullanmalı');
});
