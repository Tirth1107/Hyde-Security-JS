# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-10-19

A rebuild around current browser threats. See [docs/MIGRATION-v2.md](docs/MIGRATION-v2.md).

### Added — new guards
- **scriptGuard** — script inventory, allowlist, SRI requirement, change detection between visits, and pre-execution blocking of unauthorized dynamic scripts. JSON audit export for PCI DSS 4.0 req. 6.4.3 / 11.6.1.
- **skimmerGuard** — Magecart/formjacking defense: attributes reads of card/password/OTP fields and key listeners to the calling script; blanks or blocks third-party access; reverts form `action` hijacks.
- **clipboardGuard** — blocks ClickFix payloads (PowerShell, mshta, LOLBins, `curl | sh`, encoded commands, fake-CAPTCHA text) written by scripts; detects crypto-address swaps.
- **agentShield** — finds prompt-injection text hidden from people but visible to AI browser agents (hidden/1px/same-color/off-screen text, comments, attributes, templates); can neutralize it; `detectAgent()` spots AI agents and automated browsers.
- **phishingGuard** — site-clone detection with beacon, lookalike-domain checks, blocking credential forms that post to foreign origins, Browser-in-the-Browser overlay detection, automatic `rel=noopener`.
- **messageGuard** — exact-origin `listen()`, `send()` that refuses `'*'`, page-wide message firewall, audit of wildcard sends.
- **prototypeGuard** — monitor/lock/freeze built-in prototypes, `safeParse`/`safeMerge`/`safeGet`, DOM clobbering scan.
- **trustedTypes** — named and default policies (sanitize HTML, allowlist script URLs, block string-to-code), enforcement detection.
- **passkeys** — WebAuthn JSON helpers, capabilities, autofill sign-in, and PRF passkey-derived AES-256 keys.
- **securityAudit** — `HydeSecurity.audit()` grades headers, CSP, Trusted Types, SRI, mixed content, cookies, token storage, clobbering, and more, with fixes.
- **reporting** — batched, de-duplicated, sampled, redactable telemetry with `sendBeacon` flush and ReportingObserver collection. Bypasses the firewall by design.
- **lockdown** — manual or automatic emergency mode.
- **networkFirewall v2** — adds `sendBeacon`, `WebSocket`, `EventSource`, and `<img>/<script>/<iframe>/<link>` beacons; report mode; stats.
- **contentSecurityPolicy** — `generateNonce()`, `strict()` preset (nonce + strict-dynamic + Trusted Types), more directives, `parse()`. CSP violations are reported as threats.
- **Core** — central event bus (`HydeSecurity.on`, `history`), safe layered API patching, call-site attribution, clobbering-proof DOM access, sync SHA-256.
- **React** — `useThreats()` and `useSecurityAudit()` hooks.
- Named exports for every module (tree-shaking).

### Changed (breaking)
- Encryption is Web Crypto AES-256-GCM with PBKDF2-SHA256 (600k). It's async, needs a key, and `decryptLegacy()` migrates v1 data.
- Encrypted storage uses `storage.setEncrypted()` / `getEncrypted()`.
- React is exported only from `/react`; the main entry no longer imports React.
- One threat event shape with `source`; several event types renamed.
- Anti-devtools is strict-only by default; `devtools-detector` is lazy-loaded.
- Request signing requires `signingKey` (Web Crypto HMAC) and signs a hash of the body.
- `sanitize.html()` escapes on the server instead of a regex strip.
- DOMPurify 2 → 3.4 (`preventClobbering` option added).
- Removed unused dependencies: `jose`, `nanoid`, `toastify-js`, `uuid`.

### Fixed
- antiScreenCapture never restored `getDisplayMedia`.
- antiPrint wasn't idempotent.
- routerGuard and other patches couldn't be undone safely out of order.
- Library threats never reached the demo site's live logger (it listened on `window`; events go to `document`).
- The demo site loaded two React copies (`useState` of null). Fixed with Vite `dedupe`.

### Tests
- 143 unit tests (jsdom) and a real-browser smoke suite (Chrome + Firefox) covering cross-origin skimmer attribution, pre-execution script blocking, firewall channels, Trusted Types, and postMessage.

## [1.5.1] - not released separately (included in 2.0.0)

### Added
- `encryptionKey` config option and `encryption.setDefaultKey()` / `hasCustomKey()` — set one key for the whole app.
- `enableDebuggerTrap` config option and `antiDevtools.enable({ debuggerTrap })`.
- `antiDevtools.isEnabled()`, `networkFirewall.disable()` / `isEnabled()`.
- `network.createClient()` options `retries` and `retryNonIdempotent`.
- Separate `@tirth1107/hyde-security-js/react` build entry (`dist/react.*`).
- ESLint 9 setup (`npm run lint`), `.gitattributes` for LF line endings.
- 37 new tests: domGuard, networkFirewall, session, encryption keys, antiDevtools listeners, Provider re-renders, API, and helper modules.

### Fixed
- **antiDevtools** — added a new detector listener on every `enable()` and never removed it, so detections fired many times after `setMode()` or remounts.
- **antiDevtools** — the `debugger` trap paused the page every 1.5s in balanced mode. It now runs only in strict mode (or when enabled).
- **antiDevtools** — `detect()` always returned `false`; it now reflects the last detector result.
- **HydeSecurityProvider** — an inline `config={{...}}` re-initialized on every render. It now re-inits only when a setting changes and always calls the latest `onThreatDetected`.
- **init()** — calling it again was ignored by already-running modules; it now applies the new config.
- **domGuard** — self-healing could fire twice for one removal and failed silently if the parent changed. Rewritten; reports `healed: false` when it can't restore.
- **networkFirewall** — calling `enable()` twice wrapped `fetch` twice and broke `disable`. `destroy()` now also turns it off.
- **session** — `broadcast()` did nothing before `init()`; the storage-event fallback could miss repeated messages.
- **encryption** — `deriveKey()` without a salt used a random salt, so it never gave the same key twice.
- **network** — retried POST/PATCH on 5xx, which could create duplicate records on the server. Only safe methods retry by default.
- **Build** — every dependency was bundled into the ESM/CJS files (1.25 MB). They are now left to the app's bundler (~35–50 KB). UMD still bundles everything.
- **Build** — the ESM file used `.js` in a non-`"type": "module"` package, so Node's `import` treated it as CommonJS. Renamed to `.esm.mjs`.
- `getVersion()` was hardcoded; it now comes from `package.json` at build time.
- Lock overlay and toast use `textContent` instead of `innerText`.
- Demo website called `init()` twice and passed an empty inline config.

### Changed
- Using the built-in encryption key or signing key now logs a one-time console warning.
- Removed `vite.website.config.ts`; `npm run build:website` now runs the website's own build.

## [1.5.0] - 2026-06-29

### Added (Pro Features)
- **Self-Healing DOM** (`domGuard`) — When `selfHealing: true` is passed, tampered or deleted elements are instantly reconstructed from memory.
- **Behavioral Biometrics** (`biometrics`) — New module to analyze mouse trajectories, velocity, and keystroke flight times for advanced bot vs human probability scoring.
- **Advanced Anti-Clickjacking** (`antiClickjacking`) — New module utilizing `IntersectionObserver v2` to detect visibility, occlusion, and CSS transforms on sensitive UI components.
- **Zero-Trust Network Firewall** (`networkFirewall`) — API interceptor for `fetch` and `XMLHttpRequest` to strictly allowlist domains, stopping data exfiltration attacks.

## [1.1.0] - 2026-06-19

### Added
- **CSRF Protection** (`csrfProtection`) — Auto-read CSRF tokens from meta tags or cookies, attach to axios/forms
- **Content Security Policy** (`contentSecurityPolicy`) — Build CSP strings, inject meta tags, listen for violations
- **Input Validation** (`inputValidation`) — Email, URL, SQL injection, XSS detection using `validator` library
- **Storage TTL/Expiry** — `storage.set()` now accepts `ttl` option (in seconds) for auto-expiring entries
- **Request Signing** — `network.createClient({ sign: true })` now signs requests with HMAC-SHA256
- **Request Retry** — Automatic retry with exponential backoff for 5xx errors (max 3 retries)
- **Tiled Watermark** — Canvas-based watermark that tiles across the entire viewport
- **Script Integrity Check** — `integrity.checkScriptIntegrity()` with real SHA-256 hash verification
- **URL Sanitizer** — `sanitize.url()` validates and sanitizes URLs (http/https/mailto only)
- **Text Escaper** — `sanitize.text()` escapes HTML entities for safe text insertion
- **Session Destroy** — `session.destroy()` for full cleanup of listeners and timers
- **Session Active Check** — `session.isActive()` returns current session state
- **Honeypot Validation** — `honeypot.isTriggered()` checks if honeypot fields were filled by bots
- **Secure Cookie Helper** — `cookie.setSecure()` with all security flags enabled by default
- **Ctrl+P Blocking** — Anti-print now blocks the print shortcut in addition to the print event
- **Router ReplaceState** — Router guard now intercepts both `pushState` and `replaceState`
- **DOM Threat Events** — `domGuard.protect()` now dispatches `hyde:threat` CustomEvent on tamper
- **Granular Config** — New config options: `enableAntiCopy`, `enableAntiPrint`, `enableAntiContextMenu`, `enableTabGuard`, `enableAntiScreenCapture`, `enableAntiIframe`
- `HydeSecurity.getVersion()` returns the current library version
- `HydeSecurity.destroy()` for full cleanup of all features

### Fixed
- **network.ts** — `sign` option was accepted but completely ignored; now implements HMAC-SHA256 signing
- **session.ts** — Memory leak: event listeners for idle timer were never removed
- **forms.ts** — Honeypot was added to forms but never validated on submit
- **honeypot.ts** — Used `display:none` (easily detected by bots); now uses offscreen positioning
- **storage.ts** — `clear()` wiped ALL localStorage; now only clears Hyde-prefixed entries when appropriate
- **integrity.ts** — `check()` was a stub that always returned `true`
- **cookie.ts** — No `secure` flag default; cookies were sent over HTTP
- **routerGuard.ts** — Missing `replaceState` intercept; popstate listener never cleaned up
- **antiPrint.ts** — Only blurred on print event but didn't block Ctrl+P shortcut
- **sanitize.ts** — Missing URL sanitizer despite being documented in README
- **antiIframe.ts** — Compared full referrer string instead of parsed origin
- **index.ts** — `enableAll()` only set a flag without re-enabling features
- **index.ts** — `modules.forms` and `modules.network` exposed as namespace imports instead of objects
- **logger.ts** — `error()` was silenced when logging was disabled; now always logs
- **React Provider** — Missing SSR guard; no cleanup on unmount for all modules

### Changed
- **Watermark** — Changed from single corner text to full canvas-based tiled watermark
- **Config** — Expanded `HydeSecurityConfig` interface with granular feature flags
- **README** — Complete rewrite with professional badges, correct API docs, and framework guides
- **package.json** — Fixed repository URLs from `hydeSecurity` to `Tirth1107`

### Removed
- Removed development artifacts: `BUILD_SUMMARY.md`, `FINAL_SUMMARY.txt`, `IMPLEMENTATION_SUMMARY.md`, `TESTING.md`, `TESTING_COMPLETE.md`, `TEST_RESULTS.md`

## [1.0.0] - 2026-06-18

### Added
- Initial release with 60+ security features
- Anti-DevTools detection (size, debugger timing, console latency, toString trap)
- Anti-copy, anti-print, anti-context-menu protection
- DOM sanitization via DOMPurify
- AES encryption/decryption via CryptoJS
- Secure storage wrapper with encryption support
- Session management with idle timeout and multi-tab sync
- Bot detection (headless browser, fast typing, mouse movement)
- DOM tamper detection via MutationObserver
- Browser fingerprinting via FingerprintJS
- Device detection via Bowser
- Rate limiter with sliding window
- Router guard for SPA history changes
- Password strength checker via zxcvbn
- Tab visibility guard with blur overlay
- Anti-screen-capture with PrintScreen detection
- Network client with API key headers
- Anti-iframe / clickjacking protection
- React integration (HydeSecurityProvider, useHydeSecurity)
- UMD, ESM, and CJS build outputs
