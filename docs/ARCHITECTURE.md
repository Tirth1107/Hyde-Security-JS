# Architecture

## Entry point: `src/index.ts`

Exports `HydeSecurity` (default + named), `HydeSecurityProvider`, `useHydeSecurity`,
and the types `HydeSecurityConfig` / `HydeSecurityEvent`. Also sets `window.HydeSecurity`.

The API object keeps a single global `state = { config, enabled }`.

| Method | What it does |
|---|---|
| `init(cfg)` | If already initialized, `disableAll()` first; merge config, start logger, set `encryptionKey`, call `enableAll()` |
| `setMode(mode)` | `disableAll()` then `enableAll()` with the new mode |
| `enableAll()` | Turn on modules based on `mode` and the `enable*` flags (table below) |
| `disableAll()` | Turn off every toggleable module and remove the watermark |
| `destroy()` | `disableAll()` + `session.destroy()` + `networkFirewall.disable()` |
| `getVersion()` | Version from `package.json`, injected at build time (`__HYDE_VERSION__`) |
| `toast`, `lockScreen`, `unlockScreen` | UI helpers (overlay comes from antiDevtools) |
| `encryptText`, `decryptText`, `safeHTML`, `checkPassword`, `detectBot` | Shortcuts to modules |
| `protectElement(sel)`, `protectInput(sel)` | DOM guard / block paste on an input |
| `modules` | Every module, for direct use |

### What each mode turns on (`enableAll`)

| Module | dev | balanced | strict |
|---|---|---|---|
| antiDevtools | – | ✓ (no lock, no debugger trap) | ✓ (auto-lock + debugger trap) |
| antiIframe | – | ✓* | ✓* |
| antiDebug | – | – | ✓ |
| antiCopy, antiPrint, antiContextMenu, tabGuard, antiScreenCapture | opt-in | opt-in | ✓* |
| watermark | if `enableWatermark` | same | same |

`✓*` = on unless that flag is set to `false`. "opt-in" = only if that flag is `true`.
Every other module is never started automatically; the app calls it through `modules`.

## Config (`src/core/config.ts`)

`HydeSecurityConfig`: `appName`, `mode` (`dev|balanced|strict`, default `balanced`),
`enableLogs`, `onThreatDetected`, `enableWatermark`, `allowedIframes`, `encryptionKey`,
`enableDebuggerTrap`, plus the `enableAntiCopy|Print|ContextMenu|TabGuard|ScreenCapture|Iframe` overrides.

`HydeSecurityEvent`: `{ id, type, severity: 'info'|'warning'|'critical', details?, timestamp }`.

## Core helpers

- `logger.ts` — `log`/`warn` only when `enableLogs`; `error` always logs. Prefix `[HydeSecurity]`.
- `utils.ts` — `uid()` (uuid v4), `now()`, `hashString()` (SHA-256), `safeJSONParse`, `clamp`.

## Modules (`src/modules/`)

**Toggleable deterrents** (`enable(opts)` / `disable()`):

| Module | Notes |
|---|---|
| `antiDevtools` | `devtools-detector` lib (one listener, removed on disable) + optional `debuggerTrap` every 1.5s; blocks F12, Ctrl+Shift+I/J/C, Ctrl+U; `detect()`, `isEnabled()`, `lockScreen()`, `unlockScreen()` |
| `antiDebug` | Debugger-based checks |
| `antiCopy` | Blocks copy/cut/drag, optional `disableSelection` |
| `antiContextMenu` | Blocks right-click |
| `antiPrint` | Blocks Ctrl+P, blurs on print |
| `antiIframe` | Detects being framed; `allowedOrigins` |
| `tabGuard` | Blur overlay when tab hidden |
| `antiScreenCapture` | Screenshot deterrence |
| `routerGuard` | `enable(onThreat)`; hooks `pushState`/`replaceState`/`popstate` |

**Helpers / utilities:**

| Module | API |
|---|---|
| `sanitize` | `html`, `safeSetHTML`, `url`, `text` (DOMPurify) |
| `encryption` | `setDefaultKey`, `hasCustomKey`, `encrypt`, `decrypt`, `encryptObject`, `decryptObject`, `deriveKey(seed, salt?, iterations?)` (CryptoJS AES; warns once if the public built-in key is used) |
| `storage` | `set(k, v, {encrypt, key, ttl})`, `get`, `remove`, `clear` — keys prefixed `__hyde_`, localforage fallback |
| `cookie` | `set`, `setSecure`, `get`, `remove` (js-cookie) |
| `session` | `init({timeoutMinutes, onExpire})`, `broadcast`, `end`, `destroy`, `isActive` — idle timeout, BroadcastChannel (storage-event fallback) |
| `rateLimiter` | `makeRateLimited(fn, wait)` (lodash.throttle) |
| `forms` | `attachSanitize(form, onBot)`, `addHoneypot(form)` |
| `honeypot` | `createHoneypot(prefix)`, `isTriggered(form)` |
| `antiBot` | `detectFastTyping`, `detectPaste`, `detectHeadless`, `challengeMouseMovement`, `timingChallenge` |
| `biometrics` | `startTracking(el)` — mouse/keystroke bot score |
| `passwordStrength` | `check`, `validate(pw, rules)`, `generateSuggestions` (zxcvbn) |
| `inputValidation` | `isEmail`, `isURL`, `isAlphanumeric`, `isSQLInjection`, `isXSSAttempt`, `sanitizeInput`, `validateField` |
| `csrfProtection` | `getToken`, `getTokenFromCookie`, `attachToAxios`, `attachToForm` |
| `contentSecurityPolicy` | `build`, `inject`, `onViolation`, `getDefaults` |
| `network` | `createClient({apiKey, sign, deriveKey, baseURL, retries, retryNonIdempotent})` — axios, HMAC signing, retries safe methods on 5xx/network errors |
| `headers` | `setupAxios(client, {appName})` |
| `integrity` | `check(hash)`, `checkScriptIntegrity(src, hash)` |
| `domGuard` | `protect(selector, onTamper, selfHealing)` → cleanup fn. Restores from a snapshot; a document-wide observer catches removal; emits `healed: false` if it can't restore |
| `antiClickjacking` | `protect(selector, onOccluded)` — IntersectionObserver v2 |
| `networkFirewall` | `enable(allowedDomains, onBlocked)` → restore fn, `disable`, `isEnabled`; wraps `fetch` and `XHR.open`; re-enable replaces the allowlist |
| `obfuscator` | Text/code obfuscation helpers |
| `watermark` | `addWatermark(text)` → remove fn (tiled canvas) |
| `fingerprint` | `getFingerprint()` (FingerprintJS) |
| `device` | `detectDevice()` (Bowser) |

## React (`src/modules/react/`)

- `HydeSecurityProvider({ config, children })` — calls `HydeSecurity.init(config)` in
  `useEffect`, `destroy()` on unmount. Re-inits only when a non-function config value
  changes (JSON key); `onThreatDetected` is read from a ref so the latest one is called.
  Context: `{ config, isInitialized, security }`.
- `useHydeSecurity()` — context plus bound `init`, `destroy`, `setMode`, `toast`,
  `lockScreen`, `unlockScreen`, `modules`.
- `src/react.ts` is the `./react` package entry (`dist/react.esm.mjs` / `dist/react.cjs.js`).
  The main entry still exports the Provider and hook too, for backward compatibility.

## Build

- `vite.config.ts` — library mode, two passes:
  - `vite build`: entries `src/index.ts` + `src/react.ts` → `dist/{hyde-security-js,react}.esm.mjs`
    and `.cjs.js`, plus a shared `index-*.{mjs,js}` chunk. React and all `dependencies` are external.
  - `vite build --mode umd`: `dist/hyde-security-js.umd.js`, everything bundled except React.
  - Types via `tsc --emitDeclarationOnly`. `__HYDE_VERSION__` is defined from `package.json`.
- `vitest.config.ts` — jsdom, globals, setup `src/__tests__/setup.ts`, alias `@` → `src`.
- `eslint.config.mjs` — ESLint 9 flat config with typescript-eslint (ignores `website/`, which uses oxlint).

## Website (`website/`)

Separate Vite 8 + React 19 + TypeScript app with its own `package.json`.
Its `vite.config.ts` aliases `hyde-security-js` → `../src/index.ts`, so it always
uses the local source. `App.tsx` is a dashboard of ~30 demo components in
`src/components/demos/` plus `LiveLogger` and `FeatureCard`. The old static
`website/script.js` and `styles.css` were deleted in favor of this app.
