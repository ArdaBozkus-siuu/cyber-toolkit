// Parça parça (streaming) SHA-256.
// Web Crypto'nun digest() fonksiyonu dosyanın tamamını belleğe almayı gerektirir.
// Büyük dosyalarda ilerleme gösterebilmek ve belleği şişirmemek için
// veriyi 64 baytlık bloklar halinde işleyen kendi uygulamamızı kullanıyoruz.

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const rotr = (x, n) => (x >>> n) | (x << (32 - n));

export class Sha256 {
  constructor() {
    this.h = new Uint32Array([
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
      0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
    ]);
    this.block = new Uint8Array(64);
    this.blockLen = 0;
    this.totalLen = 0;
    this.w = new Uint32Array(64);
    this.done = false;
  }

  update(bytes) {
    if (this.done) throw new Error('Hash tamamlandı, tekrar veri eklenemez.');
    this.totalLen += bytes.length;
    let offset = 0;

    if (this.blockLen > 0) {
      const need = Math.min(64 - this.blockLen, bytes.length);
      this.block.set(bytes.subarray(0, need), this.blockLen);
      this.blockLen += need;
      offset = need;
      if (this.blockLen === 64) {
        this.#compress(this.block, 0);
        this.blockLen = 0;
      }
    }

    while (offset + 64 <= bytes.length) {
      this.#compress(bytes, offset);
      offset += 64;
    }

    if (offset < bytes.length) {
      this.block.set(bytes.subarray(offset), 0);
      this.blockLen = bytes.length - offset;
    }
    return this;
  }

  digest() {
    if (this.done) throw new Error('Hash zaten hesaplandı.');
    const bitLen = this.totalLen * 8;
    const tail = new Uint8Array(this.blockLen < 56 ? 64 : 128);
    tail.set(this.block.subarray(0, this.blockLen), 0);
    tail[this.blockLen] = 0x80;

    // Uzunluk 64 bit big-endian olarak sona yazılır.
    const view = new DataView(tail.buffer);
    view.setUint32(tail.length - 8, Math.floor(bitLen / 0x100000000), false);
    view.setUint32(tail.length - 4, bitLen >>> 0, false);

    for (let i = 0; i < tail.length; i += 64) this.#compress(tail, i);
    this.done = true;

    let out = '';
    for (let i = 0; i < 8; i++) out += this.h[i].toString(16).padStart(8, '0');
    return out;
  }

  #compress(bytes, offset) {
    const w = this.w;
    for (let i = 0; i < 16; i++) {
      const j = offset + i * 4;
      w[i] = (bytes[j] << 24) | (bytes[j + 1] << 16) | (bytes[j + 2] << 8) | bytes[j + 3];
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }

    let [a, b, c, d, e, f, g, h] = this.h;

    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[i] + w[i]) | 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;

      h = g; g = f; f = e;
      e = (d + t1) | 0;
      d = c; c = b; b = a;
      a = (t1 + t2) | 0;
    }

    const st = this.h;
    st[0] = (st[0] + a) | 0; st[1] = (st[1] + b) | 0;
    st[2] = (st[2] + c) | 0; st[3] = (st[3] + d) | 0;
    st[4] = (st[4] + e) | 0; st[5] = (st[5] + f) | 0;
    st[6] = (st[6] + g) | 0; st[7] = (st[7] + h) | 0;
  }
}

// Bir File/Blob nesnesini parça parça okuyup SHA-256 özetini döndürür.
// onProgress(0..1) her parça sonunda çağrılır.
export async function hashBlob(blob, onProgress, chunkSize = 4 * 1024 * 1024) {
  const hasher = new Sha256();
  let read = 0;
  while (read < blob.size) {
    const slice = blob.slice(read, Math.min(read + chunkSize, blob.size));
    const buffer = await slice.arrayBuffer();
    hasher.update(new Uint8Array(buffer));
    read += buffer.byteLength;
    if (onProgress) onProgress(blob.size === 0 ? 1 : read / blob.size);
    // Arayüzün donmaması için tarayıcıya nefes aldırıyoruz.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  if (blob.size === 0 && onProgress) onProgress(1);
  return hasher.digest();
}
