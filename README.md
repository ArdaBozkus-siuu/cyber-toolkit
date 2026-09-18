# Cyber Toolkit

[![tests](https://github.com/ardabozkus-siuu/cyber-toolkit/actions/workflows/tests.yml/badge.svg)](https://github.com/ardabozkus-siuu/cyber-toolkit/actions/workflows/tests.yml)

**Live:** https://ardabozkus-siuu.github.io/cyber-toolkit/

Small security tools that run entirely in the browser. No backend, no build step, no data
leaving the device. Each tool has its own page with an explanation of the method next to a
working demo.

**Türkçe:** Tarayıcıda çalışan küçük güvenlik araçları. Sunucu yok, derleme adımı yok, veri
cihazdan çıkmıyor. Her aracın sayfasında solda yöntemin anlatımı, sağda çalışan hâli var.

## Tools

| Tool | What it does | Status |
| --- | --- | --- |
| Parola Sağlığı | Entropy estimate, predictable-pattern detection, breach lookup, password generator | ready |
| Dosya Bütünlüğü | SHA-256 hashing with snapshot comparison to detect changed, added and deleted files | ready |
| Log Analizi | Groups SSH auth events by address, flags scanning behaviour and successful logins that follow a burst of failures | ready |
| JWT Çözümleyici | Decodes claims, checks expiry, warns on unsafe signature algorithms | planned |

## Running locally

The pages use ES modules and the Web Crypto API, both of which browsers disable on
`file://`. Serve the folder over HTTP instead of opening the HTML directly:

```bash
git clone https://github.com/<kullanici>/cyber-toolkit.git
cd cyber-toolkit
python -m http.server 8000
# open http://localhost:8000
```

## Publishing on GitHub Pages

Push to `main`, then in the repository: **Settings → Pages → Source: Deploy from a branch →
`main` / `root`**. The site is live at `https://<kullanici>.github.io/cyber-toolkit/` a
minute later. No workflow file needed — there is nothing to build.

## Privacy

Passwords, files and pasted text are processed in the page itself. The single outbound
request is the optional breach lookup, which uses the Have I Been Pwned k-anonymity API:
the password's SHA-1 digest is computed locally and only its **first five characters** are
sent. The service returns every digest sharing that prefix and the match is done in the
browser. Neither the password nor its full digest leaves the device.

## Interface

Light and dark themes follow the operating system by default; the toggle in the header
overrides that and the choice is remembered. The theme is applied by a small inline script
in `<head>` so the page never flashes the wrong colours before the stylesheet loads.

Colour carries meaning rather than decoration: the three status colours (safe, warning,
risk) are the same across every tool, so a red bar on the password meter and a red row in
the log table mean the same kind of thing. Tool icons are hand-drawn SVGs rather than an
icon library — each one depicts what its tool measures.

## How it is built

Plain HTML, CSS and JavaScript. No framework and no dependencies, so the same files can
later be wrapped with [Tauri](https://tauri.app/) into a desktop build without rewriting
anything.

- `assets/js/sha256.js` — streaming SHA-256, verified against Node's `crypto` module,
  including block-boundary cases and chunked input. Files are read in 4 MB slices so large
  files neither exhaust memory nor freeze the page.
- `assets/js/log-analiz.js` — log parsing and scoring. sshd writes one failed attempt as
  two lines (`Invalid user` then `Failed password for invalid user`), so attempts are
  deduplicated by address, username and second — otherwise every scan reads as twice its
  real size.
- `assets/js/entropy.js` — password scoring. Character-set entropy alone overrates
  dictionary passwords, so a word found in the wordlist is counted as a single guess unit
  rather than a random string. `Galatasaray1907` scores as weak, which is what an attacker
  running a wordlist would actually find.
- `tools.json` — the tool index. Adding a tool means creating a folder and appending one
  entry here.

## Tests

```bash
npm test
```

35 tests, no dependencies — the project has none and the test suite keeps it that way.
They run on every push via GitHub Actions.

- **`tests/sha256.test.js`** checks the hash implementation against Node's `crypto` module:
  empty input, the block-padding boundaries at 55/56/63/64/65 bytes, multi-byte UTF-8, 1 MB
  of data, chunked feeding at an offset that doesn't align to the block size, and a 9.5 MB
  Blob read through the 4 MB slicing path.
- **`tests/entropy.test.js`** pins the scoring behaviour: common passwords score as very
  weak, sequences and repeats are penalised, and `Galatasaray1907` stays under 40 bits even
  though naive character-set entropy puts it above 80. It also verifies the generator
  respects the requested length and character sets and never repeats across 200 runs.
- **`tests/log-analiz.test.js`** covers the parser and the detection rules: both timestamp
  formats, IPv6 addresses, the `invalid user` line whose username is easy to misparse, and
  the deduplication of an attempt that sshd writes across two lines. It also pins the
  severity rules — a burst followed by a successful login is critical, a user mistyping a
  password once is not.
- **`tests/yapi.test.js`** catches the failure that browsers hide: renaming an element `id`
  in the HTML without updating the JavaScript. It cross-checks every `getElementById` call
  against the markup, verifies every local link and import resolves, and validates
  `tools.json` against the folders on disk.

## Adding a tool

1. Create `tools/<name>/` with `index.html` and `app.js`.
2. Copy the two-column layout from an existing tool: explanation on the left, demo on the right.
3. Keep the computation in `assets/js/` as pure functions so it can be tested without a browser.
4. Add an entry to `tools.json`.

## Scope

These tools are for education and checking your own systems. They analyse and verify;
they do not attack anything.

## License

MIT
