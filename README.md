# Cyber Toolkit

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
| Log Analizi | Flags repeated failed logins from the same address in SSH logs | planned |
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

## How it is built

Plain HTML, CSS and JavaScript. No framework and no dependencies, so the same files can
later be wrapped with [Tauri](https://tauri.app/) into a desktop build without rewriting
anything.

- `assets/js/sha256.js` — streaming SHA-256, verified against Node's `crypto` module,
  including block-boundary cases and chunked input. Files are read in 4 MB slices so large
  files neither exhaust memory nor freeze the page.
- `assets/js/entropy.js` — password scoring. Character-set entropy alone overrates
  dictionary passwords, so a word found in the wordlist is counted as a single guess unit
  rather than a random string. `Galatasaray1907` scores as weak, which is what an attacker
  running a wordlist would actually find.
- `tools.json` — the tool index. Adding a tool means creating a folder and appending one
  entry here.

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
