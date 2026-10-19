# Architecture (v2)

## Entry points

| Import | File | Contains |
|---|---|---|
| `@tirth1107/hyde-security-js` | `src/index.ts` | `HydeSecurity` API, named exports for every module, all types. **No React.** |
| `@tirth1107/hyde-security-js/react` | `src/react.ts` | `HydeSecurityProvider`, `useHydeSecurity`, `useThreats`, `useSecurityAudit`, re-exports `HydeSecurity` |
| UMD (`unpkg`) | `dist/hyde-security-js.umd.js` | Everything bundled, sets `window.HydeSecurity` |

## Core (`src/core/`)

| File | Purpose |
|---|---|
| `events.ts` | Threat bus. `events.emit/on/once/history/reset`, `createReporter(source)` used by every module. Delivers to type listeners, `source:<module>` listeners, `*`, and a `hyde:threat` DOM event on `document`. A throwing listener never breaks others. |
| `hooks.ts` | Safe monkey-patching: `patchMethod`, `patchSetter`, `patchGetter`, `ownerOf`, `PatchGroup`. Wrappers carry an `active` flag, so restoring out of order leaves a pass-through instead of breaking the chain. **Every module that wraps a browser API must use these.** |
| `callsite.ts` | `urlsFromStack` (Chrome + Firefox formats), `stackInspector.current()` (replaceable in tests), `hostMatches` / `isAllowedUrl` (origin, host, `*.wildcard`; no substring matching), extension-URL detection. |
| `dom.ts` | `safeDom`: clobbering-proof `cookie()`, `all(selector)`, `isClobbered(name)`. Use in security-critical reads of `document.*`. |
| `encoding.ts` | base64/base64url/hex/UTF-8, `randomBytes`, `getSubtle`, async `sha256Hex/Sri`, `timingSafeEqual`, the `Bytes` type. |
| `sha256.ts` | Synchronous SHA-256 (verified against Node crypto). scriptGuard needs a sync hash to decide before a script executes. |
| `config.ts` | `HydeSecurityConfig`, `LockdownOptions`, `defaultConfig`. |
| `logger.ts`, `utils.ts` | Logging; `uid` (crypto.randomUUID), `optionsOf`, `preview`. |

## `HydeSecurity` (`src/index.ts`)

- `init(cfg)` disables everything if already initialized, merges config, sets the encryption key, subscribes `onThreatDetected` to `*`, starts reporting and lockdown triggers, then calls `enableAll()`.
- `enableAll()` turns modules on per mode (table below). Each guard key accepts `true`, an options object, or `false`.
- `disableAll()` turns every toggleable module off. `destroy()` also removes subscriptions, reporting, session and lockdown.
- `on`, `history`, `audit`, `lockdown`, `releaseLockdown`, `isLockedDown`, `getConfig`, plus v1 helpers (`encryptText` is async now).

| Mode | Enables |
|---|---|
| dev | nothing automatic |
| balanced | antiIframe, prototypeGuard (monitor), clipboardGuard, phishingGuard, messageGuard (`['self']`, report) |
| strict | balanced + antiDevtools (lock + debugger trap), antiDebug, copy/print/context-menu/tab/screenshot deterrents, scriptGuard / skimmerGuard / agentShield (report) |
| any | networkFirewall, trustedTypes, reporting, lockdown only when configured |

## Modules (`src/modules/`)

**v2 guards** (`enable(opts)` / `disable()` / usually `isEnabled()`):

| Module | Hooks | Key API |
|---|---|---|
| `scriptGuard` | `Node.prototype.appendChild/insertBefore/replaceChild`, `Element.prototype.append/prepend/before/after/replaceWith`, MutationObserver | `getInventory`, `exportReport`, `authorize`, `hashInline`. Blocks by setting `type="text/hyde-blocked"` before insertion. Baseline in localStorage. |
| `skimmerGuard` | `HTMLInputElement.prototype.value` getter, `EventTarget.prototype.addEventListener`, MutationObserver on `action`, submit capture | `DEFAULT_SENSITIVE_SELECTOR`, `markSensitive` |
| `networkFirewall` | `fetch`, `XHR.open`, `sendBeacon`, `WebSocket`/`EventSource` (Proxy), `src`/`href` setters, `setAttribute` | `getStats`, `disable`, v1 array form still works |
| `clipboardGuard` | `clipboard.writeText/write`, `DataTransfer.setData`, `document.execCommand` | `analyze` (`analyzeClipboardText`), `addressType` |
| `agentShield` | MutationObserver (batched) | `scan`, `scoreInjection`, `hiddenReasons`, `detectAgent` |
| `phishingGuard` | submit capture, MutationObserver | `checkLookalike`, `checkClone` |
| `messageGuard` | `addEventListener`/`removeEventListener` on their real owner, `onmessage` setter, `window.postMessage` | `listen`, `send` |
| `prototypeGuard` | interval monitor or `preventExtensions`/`freeze` | `check`, `isPolluted`, `safeParse`, `safeMerge`, `safeGet`, `scanClobbering` |
| `trustedTypes` | `trustedTypes.createPolicy` | `createPolicy`, `enableDefaultPolicy`, `isEnforced`, `cspDirectives` |
| `passkeys` | — | `capabilities`, `prfSupported`, `register`, `authenticate`, `deriveEncryptionKey` (PRF → HKDF → AES-GCM; never serializes PRF output) |
| `securityAudit` | same-origin HEAD fetch | `run`, `print` |
| `reporting` | event bus, ReportingObserver, visibilitychange | `flush`, `stats`. Uses the *pristine* fetch/sendBeacon captured at load. |

**Helpers / v1 modules:** `encryption` (Web Crypto AES-GCM, `decryptLegacy`), `storage` (`setEncrypted`/`getEncrypted`), `sanitize` (native `setHTML` → DOMPurify 3), `contentSecurityPolicy` (`strict`, `generateNonce`, `parse`), `network` (Web Crypto HMAC signing), `integrity` (SRI), `domGuard`, `antiClickjacking`, `cookie`, `session`, `csrfProtection`, `inputValidation`, `passwordStrength`, `honeypot`, `forms`, `antiBot`, `biometrics`, `fingerprint`, `device`, `routerGuard`, `obfuscator`, `watermark`, deterrents (`antiDevtools` with a lazy-loaded `devtools-detector`, `antiDebug`, `antiCopy`, `antiPrint`, `antiContextMenu`, `antiIframe`, `tabGuard`, `antiScreenCapture`).

## Writing a module

1. `const reporter = createReporter('myGuard', 'warning')` and report through it only.
2. Wrap browser APIs with `patchMethod`/`patchSetter` in a `PatchGroup`. `disable()` calls `restoreAll()`.
3. `enable()` calls `this.disable()` first, so it's idempotent and reconfigurable.
4. Guard `typeof window/document === 'undefined'` for SSR.
5. Read security-relevant `document.*` through `safeDom`.
6. Register it in `src/index.ts` (`modules`, named export, mode defaults) and `core/config.ts`. Add tests in `src/__tests__/v2/`, and a browser check in `tests/browser/smoke.mjs` if it depends on real engine behavior.

## Build & tests

- `vite.config.ts` has two passes: ESM/CJS with `index` + `react` entries (dependencies external, ESM as `.mjs`), then `--mode umd` with everything bundled. `__HYDE_VERSION__` comes from `package.json`.
- `npx vitest run` runs 143 jsdom tests. The setup uses Node's real Web Crypto.
- `npm run test:browser [firefox]` runs a real-browser smoke test of the UMD bundle with two local origins.

### jsdom gaps (test in the browser suite instead)
- No `window.onmessage` dispatch.
- No named access on `document`/`window` (DOM clobbering).
- `isSecureContext` is false on localhost.
- Separate `Uint8Array` realm (use `ArrayBuffer.isView`).

## Website (`website/`)

Vite 8 + React 19. Aliases `hyde-security-js` → `../src/index.ts` and `hyde-security-js/react` → `../src/react.ts` (vite config + tsconfig paths). `dedupe: ['react','react-dom']` is required, or library source picks up the root's React 18. v2 demos live in `src/components/demos/GuardDemos.tsx`. The Live Logger subscribes with `HydeSecurity.on('*')`.
