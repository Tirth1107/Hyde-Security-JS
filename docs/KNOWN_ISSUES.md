# Known Issues

Last updated: 2026-11-04 (v2.0.0 release).

## Open

- **scriptGuard limits:** scripts present in the HTML before HydeSecurity loads can only be
  reported, not blocked. An inline script inserted *empty* and filled in afterwards is reported
  after it runs. Load HydeSecurity first and pair it with CSP.
- **skimmerGuard attribution** depends on stack traces. Code running from `eval`/`new Function`
  has no script URL and counts as first-party. Use CSP without `'unsafe-eval'`.
- **clipboardGuard** inspects script clipboard writes only. It can't see what the user copies
  from another site or app.
- **agentShield** is pattern-based. Rewording can evade it. Treat it as a filter, not a guarantee.
- **phishingGuard clone detection** only fires if the phishing kit copies your JavaScript.
- **DevTools detection** is a deterrent. Automation (Puppeteer, Playwright, WebDriver BiDi)
  attaches a DevTools client, so it counts as "open". The optional window-size check
  (`windowSizeChecker` in `core/devtoolsDetect`) is off by default because sidebars and zoom
  cause false hits.
- **Old package name:** `@tirth1107/hyde-security-js` (1.1.0) still needs
  `npm deprecate` once 2.0 is published as `hyde-security-js`. It needs the owner's npm login.

## Fixed in 2.0.0

- UMD bundle + strict CSP: Firefox reported a blocked eval from `devtools-detector` → replaced
  with built-in, eval-free detection (`core/devtoolsDetect.ts`); the dependency is gone.
- Website shipped one ~1.5 MB chunk → the playground is lazy-loaded.
- Website lint (`oxlint`) couldn't run on Linux → Linux binary added next to the Windows one.
- antiBot reported nothing → paste, headless and fast-submit checks report through the bus.
- Emoji in library UI text (lock overlays, tab-guard shield) → plain text and an SVG icon.

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
