# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
