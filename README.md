# 🛡️ HydeSecurityJS v2

![npm](https://img.shields.io/npm/v/@tirth1107/hyde-security-js)
![license](https://img.shields.io/npm/l/@tirth1107/hyde-security-js)
![bundle size](https://img.shields.io/bundlephobia/minzip/@tirth1107/hyde-security-js)

**A client-side security layer for modern web apps.** v2 targets the browser attacks of 2025–2026: compromised third-party scripts, Magecart skimmers, ClickFix clipboard lures, prompt injection against AI browser agents, phishing clones, insecure `postMessage`, and prototype pollution. It also adds Trusted Types, passkeys, Web Crypto encryption, and a one-call security audit.

> ⚠️ **What client-side security can and can't do.** Code in the page can be bypassed by anyone who controls the browser. HydeSecurity defends the *page and its users* against code that shouldn't be there (injected scripts, compromised vendors, XSS payloads, phishing overlays). It doesn't replace server-side validation, HTTP security headers, or a real CSP. Use it as defense in depth.

## Install

```bash
npm install @tirth1107/hyde-security-js
```

## Quick start

```js
import { HydeSecurity } from '@tirth1107/hyde-security-js'

HydeSecurity.init({
  mode: 'balanced',                      // 'dev' | 'balanced' | 'strict'
  encryptionKey: 'a-long-app-passphrase',
  scriptGuard: { allow: ['js.stripe.com', '*.googletagmanager.com'] },
  networkFirewall: { allow: ['api.myapp.com', 'js.stripe.com'] },
  phishingGuard: { expectedHosts: ['myapp.com', '*.myapp.com'], cloneBeaconUrl: 'https://myapp.com/api/clone-alert' },
  reporting: { endpoint: '/api/security-events' },
  lockdown: { on: ['sensitive_field_read', 'script_blocked'] },
  onThreatDetected: (ev) => console.warn(ev.source, ev.type, ev.details)
})

// What does my page look like from a security point of view?
const { grade, score, findings } = await HydeSecurity.audit()
```

### React / Next.js

```tsx
'use client'
import { HydeSecurityProvider, useThreats, useSecurityAudit } from '@tirth1107/hyde-security-js/react'

export default function RootLayout({ children }) {
  return (
    <HydeSecurityProvider config={{ mode: 'balanced', skimmerGuard: true }}>
      {children}
    </HydeSecurityProvider>
  )
}

function SecurityPanel() {
  const threats = useThreats('*', 20)          // live list of threat events
  const { result } = useSecurityAudit()        // grade + findings
  return <p>Grade {result?.grade} · {threats.length} recent threats</p>
}
```

## Modes

| | `dev` | `balanced` (default) | `strict` |
|---|---|---|---|
| clipboardGuard, phishingGuard, prototypeGuard (monitor), messageGuard (report, same-origin) | – | ✓ | ✓ |
| antiIframe | – | ✓ | ✓ |
| scriptGuard, skimmerGuard, agentShield (all report-only) | – | – | ✓ |
| Deterrents: anti-devtools, anti-debug, anti-copy/print/context-menu, tab guard, screenshot deterrence | – | – | ✓ |
| networkFirewall, trustedTypes, reporting, lockdown | when configured | when configured | when configured |

Any guard can be switched on or off in any mode: `skimmerGuard: true`, `clipboardGuard: false`, or pass an options object.

## The v2 guards

### 🧾 scriptGuard — supply-chain protection (PCI DSS 6.4.3 / 11.6.1)
Since March 2025, payment pages must inventory and authorize every script and alert on unauthorized changes. scriptGuard does that in the browser:

```js
scriptGuard.enable({
  mode: 'enforce',                       // 'report' (default) or 'enforce'
  allow: ['js.stripe.com'],              // same-origin is always allowed
  allowInlineHashes: ['sha256-…'],       // scriptGuard.hashInline(code)
  requireIntegrity: true                 // third-party scripts need SRI
})
scriptGuard.exportReport()               // JSON inventory for your assessor
```
- Inventories every script (origin, SRI, SHA-256 of inline code).
- In `enforce` mode, unauthorized scripts added after load are neutralized **before the browser runs them**.
- Compares against earlier visits and reports `script_inventory_changed`.

### 💳 skimmerGuard — Magecart / formjacking defense
Watches card, password and OTP fields. Every read of `.value` and every key listener is attributed to the scripts on the call stack. Third-party callers are reported, and in `enforce` mode they get an empty string or no listener. It also catches a skimmer swapping a form's `action` and reverts it.

```js
skimmerGuard.enable({ mode: 'enforce', trusted: ['js.stripe.com'] })
```

### 🌐 networkFirewall v2 — exfiltration allowlist
Covers `fetch`, XHR, `sendBeacon`, `WebSocket`, `EventSource`, and pixel beacons through `<img>`/`<script>`/`<iframe>` `src` or `<link>` `href`. Supports `mode: 'report'`, `getStats()`, and safe re-configuration.

```js
networkFirewall.enable({ allow: ['api.myapp.com', '*.stripe.com'], mode: 'enforce' })
```

### 📋 clipboardGuard — ClickFix protection
ClickFix (fake CAPTCHA → "press Win+R, paste") was the most common initial-access technique of 2025. If a lure gets injected into your site, clipboardGuard blocks script clipboard writes that contain PowerShell, `mshta`, `curl | sh`, encoded commands and similar. It also catches crypto-address swaps.

```js
clipboardGuard.analyze(text)  // { malicious, score, reasons }
```

### 🤖 agentShield — prompt injection vs. AI browser agents
AI agents read the whole DOM, including text people can't see. agentShield finds instruction-like text hidden with `display:none`, 1px fonts, same-color text, off-screen positioning, comments or attributes, especially in user content. It reports and can neutralize it, and `detectAgent()` spots AI agents and automated browsers.

```js
agentShield.enable({ ugcSelectors: ['.comments', '.reviews'], action: 'neutralize' })
```

### 🎣 phishingGuard
- **Clone detection:** if your code runs on a host you didn't list, it reports and can beacon home, so you hear about the phishing site first.
- Lookalike-domain checks (homoglyphs, typos, punycode).
- Blocks credential forms that submit to other origins.
- Detects Browser-in-the-Browser fake-popup overlays.
- Adds `rel="noopener noreferrer"` to `target=_blank` links.

### ✉️ messageGuard — postMessage
`listen({ origins, handler, validate })` accepts exact origins only (no `includes('trusted.com')` bugs). `send()` refuses `'*'`. `enable({ allowedOrigins })` drops messages from other origins before *any* handler sees them.

### 🧬 prototypeGuard
Monitors, locks or freezes built-in prototypes, provides `safeParse`, `safeMerge` and `safeGet`, and finds DOM clobbering (`<form name="cookie">`).

### 🔏 Trusted Types + CSP
Trusted Types became Baseline in February 2026.

```js
trustedTypes.enableDefaultPolicy({ scriptHosts: ['js.stripe.com'] })   // sanitizes legacy innerHTML
const nonce = contentSecurityPolicy.generateNonce()
contentSecurityPolicy.build(contentSecurityPolicy.strict(nonce))      // nonce + strict-dynamic + TT
```

### 🔑 passkeys — WebAuthn + passkey-derived encryption
JSON helpers, capability detection, autofill sign-in, and the **PRF extension**: derive an AES-256 key from the user's passkey, so data can be encrypted end-to-end with a key that never leaves the device.

```js
const { key } = await passkeys.deriveEncryptionKey({ options: serverRequestOptions, salt: 'notes-v1' })
const secret = await encryption.encrypt('my notes', key)
```

### 📊 securityAudit
`await HydeSecurity.audit()` returns a score, a grade and concrete fixes covering: HTTPS/HSTS, CSP quality (`unsafe-inline`, wildcards, `object-src`, `base-uri`), Trusted Types, framing, security headers, mixed content, third-party scripts without SRI, JS-readable session cookies, tokens in `localStorage`, DOM clobbering, and more.

### 📡 reporting + 🚨 lockdown
`reporting` batches, de-duplicates, samples and redacts threat events, then sends them with `sendBeacon`. It also collects browser CSP/deprecation reports. `lockdown` (manual or automatic) cuts the network to same-origin, wipes sensitive fields, blocks form submits and covers the page.

## Data protection

```js
// AES-256-GCM, PBKDF2-SHA256 (600k iterations) — async, key required
const c = await encryption.encrypt('secret', 'passphrase')
await encryption.decrypt(c, 'passphrase')                // null if wrong key / tampered
const key = await encryption.generateKey()               // or passkey-derived

await storage.setEncrypted('profile', data, { ttl: 3600 }) // uses the default key
await storage.getEncrypted('profile')

sanitize.safeSetHTML(el, userHtml)   // native Sanitizer API (setHTML) when available, else DOMPurify 3
```

## Events

Every module reports through one bus:

```js
const off = HydeSecurity.on('script_blocked', ev => …)   // a type
HydeSecurity.on('source:skimmerGuard', ev => …)            // a module
HydeSecurity.on('*', ev => …)                              // everything
document.addEventListener('hyde:threat', e => e.detail)    // DOM event
```

Event shape: `{ id, type, severity: 'info'|'warning'|'critical', source, details, timestamp }`.

## Also included (from v1)

DOM guard with self-healing, anti-clickjacking (IntersectionObserver v2), CSRF helpers, input validation, password strength (zxcvbn), honeypots, bot heuristics, behavioral biometrics, fingerprinting, secure cookies, session timeout with cross-tab logout, and deterrents (anti-devtools/copy/print/screenshot, watermark).

## Upgrading from v1

See **[docs/MIGRATION-v2.md](docs/MIGRATION-v2.md)**. The big changes: encryption is async and needs a key, React moved to `/react`, and threat events have one shape.

## Browser support

Modern evergreen browsers. Guards feature-detect and degrade gracefully: Trusted Types, the Sanitizer API, IntersectionObserver v2 and passkey PRF are used where available.

The UMD bundle includes `devtools-detector`. Under a strict CSP without `'unsafe-eval'`, Firefox logs one caught, harmless eval report when the bundle loads. The ESM/CJS builds load it only if anti-devtools is enabled.

## License

MIT © [Tirth1107](https://github.com/Tirth1107)
