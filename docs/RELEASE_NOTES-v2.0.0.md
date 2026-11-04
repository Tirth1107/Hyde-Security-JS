# HydeSecurity 2.0.0 release notes

Release date: 2026-11-04
Package: `hyde-security-js` (new name, previously `@tirth1107/hyde-security-js`)

HydeSecurity 2.0 is a rebuild. Version 1 was mostly a set of deterrents (anti-devtools,
anti-copy, anti-print). Version 2 turns it into a client-side security layer that maps to
the browser attacks web apps actually face in 2025 and 2026: compromised third-party
scripts, card skimmers, ClickFix clipboard lures, prompt injection against AI browser
agents, phishing clones, insecure `postMessage` and prototype pollution.

The v1 helpers and deterrents are still included, and several were fixed or rewritten.

---

## 1. New package name

The package is now published as **`hyde-security-js`**.

```bash
npm uninstall @tirth1107/hyde-security-js
npm install hyde-security-js
```

| Before | Now |
|---|---|
| `import { HydeSecurity } from '@tirth1107/hyde-security-js'` | `import { HydeSecurity } from 'hyde-security-js'` |
| `@tirth1107/hyde-security-js/react` | `hyde-security-js/react` |
| `unpkg.com/@tirth1107/hyde-security-js` | `unpkg.com/hyde-security-js@2` |

The old scoped package stays on npm at 1.1.0 and will be marked deprecated with a pointer
to the new name.

---

## 2. New security guards

| Guard | Attack it targets | What it does |
|---|---|---|
| **scriptGuard** | Compromised third-party scripts (supply chain) | Inventories every script with origin, SRI and a SHA-256 of inline code. Allowlists hosts and inline hashes, can require SRI, and in enforce mode neutralizes unauthorized scripts before the browser runs them. Compares the inventory with earlier visits and reports `script_inventory_changed`. `exportReport()` gives a JSON report for PCI DSS 4.0 requirements 6.4.3 and 11.6.1, which became mandatory on 31 March 2025. |
| **skimmerGuard** | Magecart card skimmers (formjacking) | Traces every read of a card, password or OTP field, and every key listener on one, to the script on the call stack. Third-party callers are reported, and in enforce mode get an empty value or no listener. Reverts a hijacked form `action`. |
| **networkFirewall v2** | Data sent to unapproved servers | One allowlist across `fetch`, XHR, `sendBeacon`, `WebSocket`, `EventSource`, and `src`/`href` beacons on images, scripts, iframes and links. Report or enforce mode, `getStats()`, safe reconfiguration. |
| **clipboardGuard** | ClickFix fake-CAPTCHA lures | Blocks script clipboard writes that contain PowerShell, `mshta`, other LOLBins, `curl \| sh`, encoded commands or fake-CAPTCHA text. Catches crypto-wallet address swaps. Microsoft rated ClickFix the most common initial-access method of 2025. |
| **agentShield** | Prompt injection against AI browser agents | Finds instruction-like text hidden from people but visible to AI agents (display:none, 1px fonts, same-color text, off-screen positioning, comments, attributes, templates), especially in user content. Reports it or neutralizes it. `detectAgent()` spots AI agents and automated browsers. |
| **phishingGuard** | Site clones, fake login pop-ups | Clone detection with an optional beacon to your server, lookalike-domain checks (homoglyphs, typos, punycode, hyphenated parts), blocks credential forms that post to other origins, detects Browser-in-the-Browser overlays, adds `rel="noopener noreferrer"` to `target=_blank` links. |
| **messageGuard** | Insecure `postMessage` | `listen()` accepts exact origins only (no substring checks). `send()` refuses `'*'`. A page-wide firewall drops messages from unlisted origins before any handler sees them, and wildcard sends are audited. |
| **prototypeGuard** | Prototype pollution, DOM clobbering | Monitors, locks or freezes built-in prototypes. `safeParse`, `safeMerge` and `safeGet` helpers. Scans for DOM clobbering such as `<form name="cookie">`. |
| **trustedTypes** | DOM XSS | Named and default Trusted Types policies that sanitize HTML, allowlist script URLs and block string-to-code. Trusted Types became Baseline in February 2026. |
| **passkeys** | Password theft, key exposure | WebAuthn JSON helpers, capability detection, autofill sign-in, and the PRF extension: derive an AES-256 key from the user's passkey (PRF, then HKDF, then AES-GCM), so data can be encrypted with a key that never leaves the device. |
| **securityAudit** | Weak page configuration | `HydeSecurity.audit()` grades the page from A+ to F and lists fixes: HTTPS and HSTS, CSP quality (`unsafe-inline`, wildcards, `object-src`, `base-uri`), Trusted Types, framing, security headers, mixed content, third-party scripts without SRI, JavaScript-readable session cookies, tokens in `localStorage`, DOM clobbering and more. |
| **reporting** | Attacks nobody hears about | Batches, de-duplicates, samples and redacts threat events and sends them with `sendBeacon`. Also collects the browser's CSP and deprecation reports. Uses the original `fetch` and `sendBeacon`, so the firewall can't block it. |
| **lockdown** | An attack in progress | Manual (`HydeSecurity.lockdown()`) or automatic on chosen event types. Cuts the network to same-origin, wipes sensitive fields, blocks form submits and covers the page. |

Most new guards start in **report-only** mode. Switch a guard to `mode: 'enforce'` once its
reports look clean.

---

## 3. New core

- **One event bus.** Every module reports through `createReporter()`. Subscribe with
  `HydeSecurity.on(type | 'source:<module>' | '*', fn)` and read recent events with
  `HydeSecurity.history()`. The `hyde:threat` DOM event is still dispatched on `document`.
  Event shape: `{ id, type, severity, source, details, timestamp }`.
- **Safe API patching.** Modules that wrap browser APIs (`fetch`, `appendChild`,
  `addEventListener` and so on) use shared `patchMethod` / `patchSetter` helpers. Patches can
  be layered and removed in any order without breaking each other.
- **Call-site attribution.** Finds which script URLs are on the call stack (Chrome and
  Firefox formats). This is what lets skimmerGuard tell first-party code from a skimmer.
- **Clobbering-proof DOM reads.** `safeDom` reads `document.cookie` and runs queries
  through the original prototypes, so an injected `<form name="cookie">` can't fool
  security checks.
- **Synchronous SHA-256**, so scriptGuard can hash and decide before a script runs.
- **Built-in DevTools detection** with no `eval` or `Function()`. It replaces the
  `devtools-detector` dependency, so the library now loads under a strict CSP with no
  reports in any browser.

---

## 4. New API

| API | What it does |
|---|---|
| `HydeSecurity.on(filter, fn)` | Subscribe to threat events. Returns an unsubscribe function. |
| `HydeSecurity.history()` | Recent events (last 200 by default). |
| `HydeSecurity.audit()` | Run the security audit. |
| `HydeSecurity.lockdown(message?)`, `releaseLockdown()`, `isLockedDown()` | Emergency mode. |
| `HydeSecurity.detectAgent()` | AI agent and automation signals. |
| `HydeSecurity.modules.*` | Every module, also available as named exports for tree-shaking. |
| `useThreats(filter, limit)` | React hook: live list of threat events. |
| `useSecurityAudit()` | React hook: audit result, loading state, rerun. |
| `contentSecurityPolicy.strict(nonce)`, `generateNonce()`, `parse()` | Nonce + `strict-dynamic` + Trusted Types CSP preset. |
| `encryption.generateKey()`, `decryptLegacy()` | New key helper, and a reader for v1 ciphertexts. |
| `storage.setEncrypted()`, `getEncrypted()` | Async encrypted storage. |
| `sanitize.safeSetHTML()` | Native Sanitizer API (`setHTML`) when available, DOMPurify 3 otherwise. |
| `antiDevtools.detect()` | Runs the detectors now and returns `{ open, signals }`. |

---

## 5. Breaking changes

Full guide: [MIGRATION-v2.md](MIGRATION-v2.md).

1. **Package name** changed to `hyde-security-js`.
2. **Encryption** is Web Crypto AES-256-GCM with PBKDF2-SHA256 at 600,000 iterations (was
   CryptoJS with 1,000). It is async, there is no built-in key, and `decrypt` returns `null`
   on failure. Convert stored v1 data once with `encryption.decryptLegacy()`.
3. **Encrypted storage** moved to `storage.setEncrypted()` / `getEncrypted()`.
4. **React** is exported only from `hyde-security-js/react`. The main entry no longer
   imports React, so vanilla apps don't need it.
5. **Threat events** have one shape with a `source`. Some types were renamed (`print` is
   now `print_attempt`, `iframe` is now `framed_by_unknown_origin`, and so on).
6. **Modes.** Anti-devtools now runs in strict mode only. Balanced mode turns on real
   guards (clipboard, phishing, prototype monitor, same-origin message firewall).
7. **Request signing** needs a `signingKey` (Web Crypto HMAC) and signs
   `METHOD:url:timestamp:sha256(body)`. Update your server's check.
8. **`sanitize.html()` on the server** escapes HTML instead of a regex strip.
9. **Dependencies removed:** `jose`, `nanoid`, `toastify-js`, `uuid`, `devtools-detector`.
   DOMPurify upgraded from 2 to 3.4 (fixes CVE-2026-41238).
10. **ESM file** renamed to `dist/*.esm.mjs`. Package imports are unaffected.

---

## 6. Fixes

- antiDevtools added a new listener on every `enable()` and never removed it, so one
  detection fired many times.
- antiDevtools ran its `debugger` trap every 1.5 seconds in balanced mode.
- antiDevtools `detect()` always returned `false`.
- `HydeSecurityProvider` re-initialized on every render when given an inline config.
- `init()` called a second time was ignored by modules that were already running.
- domGuard self-healing could fire twice for one removal.
- networkFirewall wrapped `fetch` twice when enabled twice.
- `session.broadcast()` did nothing before `init()`.
- `deriveKey()` without a salt never gave the same key twice.
- The network client retried POST and PATCH on server errors, which could create duplicates.
- antiScreenCapture never restored `getDisplayMedia`. antiPrint wasn't idempotent.
- routerGuard and other patches couldn't be undone safely out of order.
- The security audit crashed when an attacker's element took over `document.cookie`
  (found in a real browser, not in jsdom).
- ESM/CJS builds bundled every dependency (1.25 MB). They are now external (about 35 to 50 KB).
- The ESM file was treated as CommonJS by Node. It is now `.mjs`.
- `getVersion()` was hardcoded. It now comes from `package.json`.
- antiBot paste, headless and fast-submit checks now report through the event bus.
- Library UI text (lock overlays, the tab-guard shield) no longer uses emoji.

---

## 7. Demo website

The site in `website/` was rebuilt:

- New **overview page** with a live security audit of the site itself, the guard list,
  setup examples for JavaScript, React and CDN, and the three modes.
- New **docs page**: install, quick start, modes, configuration, events, guards, data
  protection, React, upgrading, and known limits.
- New **What's new** page for 2.0.
- The **playground** keeps every live demo, including the ten v2 guard demos, and is
  loaded on demand, so the first page load is much smaller.
- Works on phones (collapsible menus), no emoji, shield favicon.

---

## 8. Tests

- 151 unit tests (Vitest + jsdom).
- A real-browser smoke suite (`npm run test:browser`, Chrome and Firefox) with two local
  origins. It covers cross-origin skimmer attribution, blocking an inline script before it
  runs, firewall coverage of fetch, image, beacon and WebSocket, ClickFix blocking,
  Trusted Types, the postMessage firewall, DOM clobbering detection, the audit, encryption,
  built-in DevTools detection under a strict CSP, and that `destroy()` restores native APIs.

---

## 9. Known limits

- Scripts already in the HTML before HydeSecurity loads can only be reported, not blocked.
  Load it first and pair it with a CSP.
- skimmerGuard attribution depends on stack traces. Code run from `eval` has no script URL
  and counts as first-party. Use a CSP without `'unsafe-eval'`.
- clipboardGuard sees script clipboard writes only.
- agentShield is pattern-based. Treat it as a filter, not a guarantee.
- Phishing clone detection only fires if the phishing kit copies your JavaScript.
- DevTools detection is a deterrent. Automation tools (Puppeteer, Playwright) count as
  DevTools, and anyone who controls the browser can hide DevTools from it.

---

## 10. Research behind 2.0

- Mozilla Hacks: setHTML and the Sanitizer API in Firefox 148 (Feb 2026)
- web.dev and MDN: Trusted Types, Baseline in Feb 2026
- PCI DSS v4.0.1 requirements 6.4.3 and 11.6.1
- Microsoft Digital Defense Report 2025 (ClickFix), Opera Paste Protect
- Perplexity BrowseSafe research, Brave disclosure on AI-agent prompt injection
- IETF Web Bot Auth draft (draft-ietf-webbotauth-httpsig-protocol)
- Google: Device Bound Session Credentials
- Corbado: WebAuthn PRF support
- Intigriti: exploiting postMessage vulnerabilities
- DOMPurify CVE-2026-41238
