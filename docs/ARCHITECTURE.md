# Architecture

## Entry point: `src/index.ts`

Exports `HydeSecurity` (default + named), `HydeSecurityProvider`, `useHydeSecurity`,
and the types `HydeSecurityConfig` / `HydeSecurityEvent`. Also sets `window.HydeSecurity`.

The API object keeps a single global `state = { config, enabled }`.

| Method | What it does |
|---|---|
| `init(cfg)` | Merge config into state, start logger, call `enableAll()` |
| `setMode(mode)` | `disableAll()` then `enableAll()` with the new mode |
| `enableAll()` | Turn on modules based on `mode` and the `enable*` flags (table below) |
| `disableAll()` | Turn off every toggleable module and remove the watermark |
| `destroy()` | `disableAll()` + `session.destroy()` |
| `getVersion()` | Hardcoded `'1.5.0'` |
| `toast`, `lockScreen`, `unlockScreen` | UI helpers (overlay comes from antiDevtools) |
| `encryptText`, `decryptText`, `safeHTML`, `checkPassword`, `detectBot` | Shortcuts to modules |
| `protectElement(sel)`, `protectInput(sel)` | DOM guard / block paste on an input |
| `modules` | Every module, for direct use |

### What each mode turns on (`enableAll`)

| Module | dev | balanced | strict |
|---|---|---|---|
| antiDevtools | – | ✓ (no lock) | ✓ (auto-lock) |
| antiIframe | – | ✓* | ✓* |
| antiDebug | – | – | ✓ |
| antiCopy, antiPrint, antiContextMenu, tabGuard, antiScreenCapture | opt-in | opt-in | ✓* |
| watermark | if `enableWatermark` | same | same |

`✓*` = on unless that flag is set to `false`. "opt-in" = only if that flag is `true`.
Every other module is never started automatically; the app calls it through `modules`.

## Config (`src/core/config.ts`)

`HydeSecurityConfig`: `appName`, `mode` (`dev|balanced|strict`, default `balanced`),
`enableLogs`, `onThreatDetected`, `enableWatermark`, `allowedIframes`, plus the
`enableAntiCopy|Print|ContextMenu|TabGuard|ScreenCapture|Iframe` overrides.

`HydeSecurityEvent`: `{ id, type, severity: 'info'|'warning'|'critical', details?, timestamp }`.

## Core helpers

- `logger.ts` — `log`/`warn` only when `enableLogs`; `error` always logs. Prefix `[HydeSecurity]`.
- `utils.ts` — `uid()` (uuid v4), `now()`, `hashString()` (SHA-256), `safeJSONParse`, `clamp`.

## Modules (`src/modules/`)

**Toggleable deterrents** (`enable(opts)` / `disable()`):

| Module | Notes |
|---|---|
| `antiDevtools` | `devtools-detector` lib + a `debugger` timing trap every 1.5s; blocks F12, Ctrl+Shift+I/J/C, Ctrl+U; `detect()`, `lockScreen()`, `unlockScreen()` |
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
| `encryption` | `encrypt`, `decrypt`, `encryptObject`, `decryptObject`, `deriveKey` (CryptoJS AES) |
| `storage` | `set(k, v, {encrypt, key, ttl})`, `get`, `remove`, `clear` — keys prefixed `__hyde_`, localforage fallback |
| `cookie` | `set`, `setSecure`, `get`, `remove` (js-cookie) |
| `session` | `init({timeoutMinutes, onExpire})`, `end`, `destroy`, `isActive` — idle timeout, BroadcastChannel |
| `rateLimiter` | `makeRateLimited(fn, wait)` (lodash.throttle) |
| `forms` | `attachSanitize(form, onBot)`, `addHoneypot(form)` |
| `honeypot` | `createHoneypot(prefix)`, `isTriggered(form)` |
| `antiBot` | `detectFastTyping`, `detectPaste`, `detectHeadless`, `challengeMouseMovement`, `timingChallenge` |
| `biometrics` | `startTracking(el)` — mouse/keystroke bot score |
| `passwordStrength` | `check`, `validate(pw, rules)`, `generateSuggestions` (zxcvbn) |
| `inputValidation` | `isEmail`, `isURL`, `isAlphanumeric`, `isSQLInjection`, `isXSSAttempt`, `sanitizeInput`, `validateField` |
| `csrfProtection` | `getToken`, `getTokenFromCookie`, `attachToAxios`, `attachToForm` |
| `contentSecurityPolicy` | `build`, `inject`, `onViolation`, `getDefaults` |
| `network` | `createClient({apiKey, sign, deriveKey, baseURL})` — axios, HMAC signing, retries on 5xx |
| `headers` | `setupAxios(client, {appName})` |
| `integrity` | `check(hash)`, `checkScriptIntegrity(src, hash)` |
| `domGuard` | `protect(selector, onTamper, selfHealing)` → cleanup fn |
| `antiClickjacking` | `protect(selector, onOccluded)` — IntersectionObserver v2 |
| `networkFirewall` | `enable(allowedDomains, onBlocked)` → restore fn; wraps `fetch` and `XHR.open` |
| `obfuscator` | Text/code obfuscation helpers |
| `watermark` | `addWatermark(text)` → remove fn (tiled canvas) |
| `fingerprint` | `getFingerprint()` (FingerprintJS) |
| `device` | `detectDevice()` (Bowser) |

## React (`src/modules/react/`)

- `HydeSecurityProvider({ config, children })` — calls `HydeSecurity.init(config)` in
  `useEffect`, `destroy()` on unmount. Context: `{ config, isInitialized, security }`.
- `useHydeSecurity()` — context plus bound `init`, `destroy`, `setMode`, `toast`,
  `lockScreen`, `unlockScreen`, `modules`.
- `package.json` export `./react` points at the same bundle as `.`.

## Build

- `vite.config.ts` — library mode, entry `src/index.ts`, outputs
  `dist/hyde-security-js.{esm,umd,cjs}.js` with sourcemaps; React is external.
  Types via `tsc --emitDeclarationOnly`.
- `vitest.config.ts` — jsdom, globals, setup `src/__tests__/setup.ts`, alias `@` → `src`.
- `vite.website.config.ts` — builds `website/` from the root (older static site setup).

## Website (`website/`)

Separate Vite 8 + React 19 + TypeScript app with its own `package.json`.
Its `vite.config.ts` aliases `hyde-security-js` → `../src/index.ts`, so it always
uses the local source. `App.tsx` is a dashboard of ~30 demo components in
`src/components/demos/` plus `LiveLogger` and `FeatureCard`. The old static
`website/script.js` and `styles.css` were deleted in favor of this app.
