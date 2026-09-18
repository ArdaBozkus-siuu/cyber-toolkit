# Siber Araç Kutusu — tasarım notu

Tarih: 2026-09-13

## Amaç

Küçük güvenlik araçlarını tek bir yerde toplayan, her aracın hem çalışan hâlini hem
yönteminin anlatımını gösteren bir site. İkincil amaç: depoyu iş başvurularında
gösterilebilecek bir çalışma hâline getirmek.

## Kararlar

| Konu | Karar | Gerekçe |
| --- | --- | --- |
| Dağıtım | Statik site, GitHub Pages | Demo linki tek tık; kurulum sürtünmesi yok |
| Teknoloji | Düz HTML/CSS/JS, bağımlılık yok | Derleme adımı yok; ileride Tauri ile masaüstüne taşınabilir |
| Hesaplama yeri | Tamamen tarayıcıda | Gizlilik iddiası ancak böyle doğrulanabilir olur |
| Araç dizini | `tools.json` | Yeni araç = klasör + tek kayıt |
| Mantık/arayüz ayrımı | Hesaplama `assets/js/`, arayüz araç klasöründe | Tarayıcısız test edilebilsin |

## Yapı

- `index.html` — araç listesi, `tools.json`dan üretilir
- `assets/css/app.css` — tek stil dosyası
- `assets/js/sha256.js` — parçalı SHA-256
- `assets/js/entropy.js` — parola gücü hesabı
- `assets/js/yaygin-parolalar.js` — gömülü kelime listesi
- `tools/<ad>/` — her aracın kendi sayfası ve arayüz kodu

## Araç sayfası düzeni

İki sütun: solda yöntem anlatımı (ne yapar, arkasında hangi hesap var, sınırları ne),
sağda çalışan demo. 860 pikselin altında alt alta iner.

## Görsel yön

Ölçüm aleti estetiği: soğuk gri zemin, lacivert mürekkep, üç durum rengi (güvenli /
dikkat / riskli). Klasik "siyah zemin + neon yeşil" hacker görünümü bilinçli olarak
tercih edilmedi. Renk yalnızca ölçüm sonucunu taşır, süs olarak kullanılmaz. Mono yazı
tipi sadece hash ve parola gibi teknik değerlerde.

## Gizlilik

Tek dış istek HIBP sızıntı sorgusu. Parolanın SHA-1 özeti yerelde hesaplanır, yalnızca
ilk beş hanesi gönderilir (k-anonimlik); eşleşme tarayıcıda aranır.

## Doğrulanan noktalar

- SHA-256 çıktısı Node `crypto` ile birebir aynı: boş girdi, 55/56/63/64/65 bayt sınır
  durumları, 1 MB metin, 300 KB rastgele veri parçalı beslemeyle
- 9,5 MB'lık Blob parçalı okumayla doğru özet, ilerleme %44 → %88 → %100
- Parola arayüzü jsdom altında: canlı ölçüm, sızıntı sorgusunun iki sonucu, üretici,
  boş girdi durumu
- HTML/JS tutarlılık denetimi: 30 id referansının tamamı karşılığını buluyor, kırık
  yol ve sözdizimi hatası yok

## Sonraki adımlar

1. Log analizi aracı
2. JWT çözümleyici
3. Güvenlik başlığı denetçisi (CORS nedeniyle küçük bir sunucu gerektirir)
4. Tauri ile masaüstü paketi

## Ek: test altyapısı (2026-09-13)

Testler `tests/` altında, Node'un yerleşik test aracıyla çalışıyor. Bağımlılık eklenmedi;
proje sıfır bağımlılık iddiasını test tarafında da koruyor. Her push'ta GitHub Actions
`npm test` çalıştırıyor.

Üç dosya: hash doğruluğu (Node crypto referansıyla), parola puanlama davranışı
(özellikle sözlük kelimesi düzeltmesinin geri gelmemesi için) ve sayfa-kod tutarlılığı
(HTML'deki id ile JS'teki referansın ayrışması tarayıcıda sessiz kalır, testte patlar).

Doğrulama: `sizinti-btn` id'si bilerek değiştirildiğinde yapı testi düşüyor ve eksik
id'yi dosya adıyla birlikte bildiriyor.

## Ek: log analizi aracı (2026-09-13)

Girdi üç yoldan gelir: dosya sürükleme, metin yapıştırma ve gömülü örnek log. Örnek log
elle yazıldı (gerçek sunucu kaydı değil) ve üç senaryo içeriyor: kullanıcı adı taraması,
parola saldırısı ve sonunda tutan bir giriş.

Seviyeler: eşiği aşan başarısız deneme veya beşten fazla farklı kullanıcı adı "şüpheli";
eşiği aşan denemelerin ardından başarılı giriş "kritik". Kritik olan asıl aranan şey,
çünkü logda tek bir satırdır ve yüzlerce hata satırının arasında kaybolur.

Geliştirme sırasında çıkan hata: sshd bir denemeyi iki satıra yazdığı için tarama
boyutları ikiye katlanıyordu (12 deneme 24 görünüyordu). Adres + kullanıcı + saniye
anahtarıyla tekilleştirildi, testle sabitlendi. Özet kutusundaki toplam da ham satır
sayısından değil tekilleştirilmiş kayıtlardan hesaplanıyor.

## Ek: görsel tur (2026-09-13)

Eklenenler: marka işareti (beş bölmeli ölçek — parola ölçerinin motifiyle aynı),
favicon, koyu tema, araçlara özel elle çizilmiş SVG ikonlar, araç sayfalarının altında
diğer araçlara geçiş, ana sayfada ölçek çizgisi ve kendi 404 sayfamız.

Koyu tema renkleri açık temadan otomatik türetilmedi; koyu zeminde aynı doygunluktaki
durum renkleri okunmadığı için ayrı ayrı seçildi. Tema `<head>` içindeki küçük bir
betikle ilk boyamadan önce uygulanıyor, yoksa koyu temada sayfa bir an beyaz yanıp
sönüyor. Bu davranış testle sabitlendi.

matchMedia guard'ı eklendi: eski Safari'de `addEventListener` yerine `addListener` var,
korumasız bırakılırsa tema düğmesi tamamen kırılıyordu.

Geçiş listesi tools.json'dan üretiliyor; bulunduğu sayfayı ve "yakında" durumundaki
araçları dışarıda bırakıyor.
