// Sızıntı derlemelerinde en sık görülen parolalardan kısa bir liste.
// Amaç eksiksiz olmak değil; "listede mi" kontrolünün nasıl çalıştığını
// çevrimdışı da gösterebilmek. Asıl geniş kontrol HIBP sorgusuyla yapılıyor.
export const YAYGIN_PAROLALAR = new Set([
  '123456', '123456789', '12345678', '1234567', '12345', '1234567890', '1234',
  'qwerty', 'qwerty123', 'qwertyuiop', 'asdasd', 'asdf1234', '1q2w3e4r', 'zxcvbnm',
  'password', 'password1', 'password123', 'passw0rd', 'p@ssw0rd', 'letmein',
  'admin', 'admin123', 'root', 'toor', 'user', 'guest', 'test123', 'welcome',
  'iloveyou', 'monkey', 'dragon', 'sunshine', 'princess', 'football', 'baseball',
  'abc123', 'a1b2c3', 'aa123456', '111111', '000000', '123123', '654321', '666666',
  'superman', 'batman', 'pokemon', 'starwars', 'master', 'shadow', 'michael',
  'ashley', 'jennifer', 'jordan', 'hunter', 'trustno1', 'whatever', 'freedom',
  // Türkiye'de sık rastlananlar
  'sifre', 'sifre123', 'parola', 'parola123', 'deneme', 'deneme123', 'merhaba',
  'galatasaray', 'fenerbahce', 'besiktas', 'trabzonspor', 'cimbom', 'fener',
  'istanbul', 'ankara', 'izmir', 'turkiye', 'turkey', 'ataturk', 'mustafa',
  'mehmet', 'ahmet', 'ayse', 'fatma', 'huseyin', 'hasan', 'emre', 'burak',
  'seninle', 'askim', 'canim', 'hayat', 'melek', 'kartal', 'aslan', 'bozkurt',
  'bilgisayar', 'anneannem', 'okul123', 'ogrenci', 'universite',
]);
