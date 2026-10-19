# Migrating from v1 to v2

Most apps need only the changes in **1–4**.

## 1. Encryption is async and needs a key

v1 used CryptoJS with a public built-in key. v2 uses Web Crypto AES-256-GCM, and there is no default key.

```diff
- const c = HydeSecurity.encryptText('secret')
- const p = HydeSecurity.decryptText(c)
+ HydeSecurity.init({ encryptionKey: 'a-long-app-passphrase' })   // or pass a key per call
+ const c = await HydeSecurity.encryptText('secret')
+ const p = await HydeSecurity.decryptText(c)                      // null if wrong key / tampered
```

- `encrypt`, `decrypt`, `encryptObject` and `decryptObject` return Promises.
- `decrypt` returns `null` (not `''`) on failure.
- `deriveKey(passphrase, salt, iterations?)` now returns a `CryptoKey`.
- The payload format changed (`hyde2.…`). **Migrate stored v1 data once:**

```js
const plain = await encryption.decryptLegacy(oldCipher, oldKey)   // reads CryptoJS "U2FsdGVk…"
const fresh = await encryption.encrypt(plain, newKey)
```

v1 data encrypted without a key used `'hyde_default_key'`. Pass that as `oldKey`.

## 2. Encrypted storage has its own methods

```diff
- storage.set('k', value, { encrypt: true })
- storage.get('k', { decrypt: true })
+ await storage.setEncrypted('k', value, { ttl: 3600 })
+ await storage.getEncrypted('k')
```

`storage.set/get` (plain JSON, TTL) are unchanged. Passing `{ encrypt: true }` now throws a helpful error.

## 3. React imports come from `/react`

```diff
- import { HydeSecurityProvider, useHydeSecurity } from '@tirth1107/hyde-security-js'
+ import { HydeSecurityProvider, useHydeSecurity } from '@tirth1107/hyde-security-js/react'
```

The main entry no longer imports React, so vanilla apps don't need it installed. New hooks: `useThreats()` and `useSecurityAudit()`.

## 4. Threat events

All modules report through one bus with one shape:

```ts
{ id, type, severity: 'info' | 'warning' | 'critical', source, details, timestamp }
```

- Subscribe with `HydeSecurity.on(type | 'source:<module>' | '*', fn)`.
- `onThreatDetected` still works. It now receives events from every module, including ones you call directly through `HydeSecurity.modules`.
- Some event types were renamed:

| v1 | v2 |
|---|---|
| `print` | `print_attempt` (`details.method`) |
| `iframe` | `framed_by_unknown_origin` |
| `navigation` ids `router_push` etc. | `navigation` with `details.method` |
| domGuard `childList` / `attributes` | `tampered` (`details.mutation`), `node_removed` |
| `anti_screen_capture_enabled` | removed (it wasn't a threat) |

The `hyde:threat` DOM event is still dispatched on `document`. Its `detail` contains the event plus its `details` fields spread at the top level.

## 5. Mode changes

- **Anti-devtools is strict-only.** In v1 balanced mode turned it on. Opt back in with `enableAntiDevtools: true`.
- **balanced** now enables real security guards: clipboardGuard, phishingGuard, prototypeGuard (monitor), and messageGuard (report-only, same-origin).
- **strict** also enables scriptGuard, skimmerGuard and agentShield, all in report mode. Switch any of them to `mode: 'enforce'` once the reports look clean.
- To keep v1 behavior exactly: `{ mode: 'balanced', enableAntiDevtools: true, clipboardGuard: false, phishingGuard: false, prototypeGuard: false, messageGuard: false }`.

## 6. Smaller changes

- **Request signing:** `network.createClient({ sign: true, signingKey })`. A key is required (`deriveKey` is still accepted as an alias). The signature now covers a SHA-256 of the body: `METHOD:url:timestamp:sha256(body)`. Update your server's verification.
- **`sanitize.html()` on the server** now HTML-escapes instead of running a regex strip.
- **`networkFirewall.enable(['host'], onBlocked)`** still works. The options form adds `mode`, `resources`, and more channels.
- **`antiIframe`** uses `location.ancestorOrigins` when available. Turn off the top-window redirect with `breakOut: false`.
- **`protectElement(selector, selfHealing?)`** has a second argument.
- **Removed dependencies:** `jose`, `nanoid`, `toastify-js`, `uuid`. DOMPurify upgraded 2 → 3.4.
- **ESM file renamed** to `dist/*.esm.mjs`. Package imports are unaffected.
