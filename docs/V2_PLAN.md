# HydeSecurityJS v2.0 — Design

> Status: implemented on `feature/v2.0` (2026-10-19). See ARCHITECTURE.md for the final structure.

Goal: move from "deterrence toys" to a modern client-side security layer that maps
to real 2025–2026 attacks and standards. Everything stays honest about limits:
client-side code can be bypassed by a determined attacker with full control of the
browser; v2 targets the attacks where a client-side layer *does* help (third-party
script compromise, XSS payloads, injected skimmers, ClickFix lures, AI-agent prompt
injection, phishing overlays, insecure messaging).

## Research summary (Oct 2026)

| Topic | Status | How v2 uses it |
|---|---|---|
| Sanitizer API `setHTML()` | Firefox 148 (Feb 2026) on by default; Chromium rolling out; Safari not yet | `sanitize` uses native `setHTML` when present, DOMPurify 3 otherwise |
| Trusted Types | Baseline Feb 2026 (Chrome 83+, Safari 26, Firefox 148) | `trustedTypes` module: default policy + CSP enforcement helper |
| PCI DSS 4.0 req 6.4.3 / 11.6.1 | Mandatory since 2025-03-31: payment-page script inventory, authorization, tamper alerts | `scriptGuard`: script inventory, hashes, allowlist, change alerts, audit export |
| Magecart / formjacking | Compromised allowlisted vendors bypass CSP | `skimmerGuard`: watches who reads/listens to sensitive fields; firewall blocks exfiltration |
| ClickFix | Top initial-access method of 2025 (Microsoft DDR: 47%) — fake CAPTCHA writes commands to clipboard | `clipboardGuard`: blocks clipboard writes containing shell/PowerShell payloads; detects address swaps |
| AI browser agents | Hidden-text prompt injection (BrowseSafe, Brave/Tabstack disclosure Jun 2026) | `agentShield`: scans your page/UGC for hidden instructions, neutralizes them, detects agent visitors |
| Web Bot Auth | IETF draft (RFC 9421 signatures) — server-side | Documented; client `agentShield` only does client signals |
| DBSC | Chrome 146 Windows (Apr 2026) — server-side protocol | Detection helper + docs; not reimplemented |
| Passkeys + PRF | Chromium/Android solid, Safari platform authenticators OK | `passkeys`: WebAuthn helpers + PRF → AES key for end-to-end encryption |
| postMessage bugs | Substring origin checks, `*` targets (Intigriti 2026 guide) | `messageGuard`: exact-origin listener + audit of `postMessage(..., '*')` |
| Prototype pollution | DOMPurify CVE-2026-41238 (3.0.1–3.3.3) via polluted prototype | `prototypeGuard` monitor/lock + safe merge/parse; DOMPurify pinned ≥ 3.4 |

## Breaking changes

1. React exports only from `@tirth1107/hyde-security-js/react`.
2. Encryption is async Web Crypto (AES-256-GCM, PBKDF2-SHA256 600k). No built-in key —
   a key is required. CryptoJS ciphertexts can still be read with `encryption.decryptLegacy()`.
3. `storage.set(..., { encrypt })` → `storage.setEncrypted()` / `getEncrypted()` (async).
4. Request signing needs `signingKey` (Web Crypto HMAC); no built-in key.
5. Threat events have one shape and one channel (`HydeSecurity.on()`), with `source`.
6. `sanitize.html()` on the server escapes instead of a regex strip.
7. Dropped deps: `jose`, `nanoid`, `toastify-js`, `uuid`. DOMPurify 2 → 3.

## Architecture

- `core/events.ts` — threat bus: `emit()`, `on(type | '*', fn)`, dispatches `hyde:threat`.
- `core/hooks.ts` — `patch(obj, key, wrap)` with stack-safe restore. Every module that
  wraps a browser API uses it, so modules can layer and unwind in any order.
- `core/callsite.ts` — finds which script URLs are on the call stack (attribution).
- `core/encoding.ts` — base64url, hex, UTF-8, SHA-256 helpers on Web Crypto.

## Modes

| | dev | balanced | strict |
|---|---|---|---|
| v1 deterrents (copy/print/context-menu/tab/screenshot) | opt-in | opt-in | ✓ |
| clipboardGuard, phishingGuard, messageGuard (audit), prototypeGuard (monitor) | – | ✓ | ✓ |
| antiDevtools (deterrent, lazy-loaded) | – | – | ✓ |
| scriptGuard (report), skimmerGuard, agentShield (scan) | – | – | ✓ |
| networkFirewall, trustedTypes, reporting | only when configured | same | same |

Each guard can also be turned on or off with its own config key.

## Sources

- Mozilla Hacks, "Goodbye innerHTML, Hello setHTML" (Firefox 148, Feb 2026)
- web.dev / MDN, Trusted Types; Baseline Feb 2026
- PCI DSS v4.0.1 requirements 6.4.3 and 11.6.1 (mandatory 2025-03-31)
- Microsoft Digital Defense Report 2025 (ClickFix share of initial access); Opera Paste Protect (Jul 2026)
- Perplexity BrowseSafe research; Brave disclosure on Tabstack / Cotypist (Jun 2026)
- IETF draft-ietf-webbotauth-httpsig-protocol (Web Bot Auth)
- Google, Device Bound Session Credentials (Chrome 146, Apr 2026)
- Corbado, WebAuthn PRF support (2026)
- Intigriti, "Exploiting postMessage vulnerabilities" (Jan 2026)
- DOMPurify CVE-2026-41238 (prototype-pollution bypass, fixed in 3.4.0)
