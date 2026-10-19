# Known Issues

Last updated: 2026-10-19 (v2.0.0, branch `feature/v2.0`).

## Open

- **UMD bundle + strict CSP (Firefox):** the bundled `devtools-detector` runs a caught
  `Function('return this')` shim at load, which Firefox reports as a blocked eval under a CSP
  without `'unsafe-eval'`. Harmless. ESM/CJS builds lazy-load it only when anti-devtools is
  enabled. A full fix would mean replacing `devtools-detector` with in-house detection.
- **scriptGuard limits:** scripts present in the HTML before HydeSecurity loads can only be
  reported, not blocked. An inline script inserted *empty* and filled in afterwards is reported
  after it runs. Load HydeSecurity first and pair it with CSP.
- **skimmerGuard attribution** depends on stack traces. Code running from `eval`/`new Function`
  has no script URL and counts as first-party. Use CSP without `'unsafe-eval'`.
- **clipboardGuard** inspects script clipboard writes only. It can't see what the user copies
  from another site or app.
- **agentShield** is pattern-based. Rewording can evade it. Treat it as a filter, not a guarantee.
- **phishingGuard clone detection** only fires if the phishing kit copies your JavaScript.
- **Website bundle is ~1.5 MB** (single chunk). Code-splitting the demos would help.
- **Website lint (`oxlint`)** can't run on Linux right now (its native binary is Windows-only).
- **`v1` deterrent modules** (obfuscator, watermark, biometrics, fingerprint) weren't redesigned
  for v2. They still work, but report through the old local callbacks where applicable.

## Fixed in 2.0.0

- React imported by the main entry → main entry is React-free; React only in `/react`.
- Built-in fallback encryption/signing keys → removed; a key is required.
- PBKDF2 1000 iterations → 600,000 (configurable, minimum 100,000).
- Out-of-order unpatching of browser APIs → `core/hooks` safe patches everywhere.
- Security code trusting clobberable `document.*` → `core/dom` pristine accessors.
- Demo site loaded two React copies → Vite `dedupe`.
- Library threats never reached the demo site's logger → subscribes via `HydeSecurity.on`.
- antiScreenCapture didn't restore `getDisplayMedia`; antiPrint wasn't idempotent.

## Fixed in 1.5.1 (branch `fix/known-issues`)

See CHANGELOG `[1.5.1]`: tooling (Linux binaries, ESLint), devtools listener leak, Provider
re-init loop, domGuard self-healing, firewall double-wrap, session broadcast, safe retries,
external dependencies in ESM/CJS, `.mjs` ESM, version injection.
