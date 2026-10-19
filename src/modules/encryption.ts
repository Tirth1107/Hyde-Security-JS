/**
 * Encryption v2 — Web Crypto AES-256-GCM.
 *
 * Payload format:  hyde2.<salt>.<iv>.<ciphertext>   (each part base64url)
 *   - passphrase keys are stretched with PBKDF2-SHA256 (600,000 iterations,
 *     the OWASP recommendation), cached per passphrase+salt
 *   - CryptoKey inputs are used directly (salt part is empty)
 *
 * There is no built-in key: pass one, or set one with setDefaultKey().
 */
import { Bytes, fromBase64Url, getSubtle, randomBytes, toBase64Url, toBytes, utf8 } from '../core/encoding'

export type KeyInput = string | CryptoKey

const PREFIX = 'hyde2'
const DEFAULT_ITERATIONS = 600_000
const SALT_BYTES = 16
const IV_BYTES = 12

let defaultKey: KeyInput | null = null
let iterations = DEFAULT_ITERATIONS

// passphrase -> salt used for new encryptions this session (so PBKDF2 runs once)
const sessionSalts = new Map<string, Bytes>()
// `${iterations}:${salt}:${passphrase}` -> derived key
const derivedCache = new Map<string, Promise<CryptoKey>>()

function isCryptoKey(k: unknown): k is CryptoKey {
  return typeof CryptoKey !== 'undefined' ? k instanceof CryptoKey : !!k && typeof k === 'object' && 'algorithm' in (k as any)
}

function requireKey(key?: KeyInput): KeyInput {
  const k = key ?? defaultKey
  if (!k) {
    throw new Error('[HydeSecurity] encryption needs a key. Pass one or call encryption.setDefaultKey() / set `encryptionKey` in config.')
  }
  return k
}

async function pbkdf2(passphrase: string, salt: Bytes, iters: number): Promise<CryptoKey> {
  const subtle = getSubtle()
  const base = await subtle.importKey('raw', utf8.encode(passphrase), 'PBKDF2', false, ['deriveKey'])
  return subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iters },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

function cachedDerive(passphrase: string, salt: Bytes): Promise<CryptoKey> {
  const id = `${iterations}:${toBase64Url(salt)}:${passphrase}`
  let p = derivedCache.get(id)
  if (!p) {
    p = pbkdf2(passphrase, salt, iterations)
    derivedCache.set(id, p)
    // Bound memory: keep the cache small
    if (derivedCache.size > 64) derivedCache.delete(derivedCache.keys().next().value as string)
  }
  return p
}

export const encryption = {
  /** Key used when none is passed. Accepts a passphrase or a CryptoKey. */
  setDefaultKey(key: KeyInput | null) {
    if (typeof key === 'string' && key.length < 12) {
      console.warn('[HydeSecurity] encryption passphrase is shorter than 12 characters')
    }
    defaultKey = key
  },

  hasDefaultKey() {
    return defaultKey !== null
  },

  /** PBKDF2 iterations for passphrase keys (default 600,000; minimum 100,000) */
  setIterations(n: number) {
    iterations = Math.max(100_000, Math.floor(n))
    derivedCache.clear()
    sessionSalts.clear()
  },

  /** A random 256-bit AES-GCM key (extractable so you can store it with exportKey) */
  async generateKey(): Promise<CryptoKey> {
    return getSubtle().generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
  },

  /** Export a CryptoKey to base64url (store it somewhere safe) */
  async exportKey(key: CryptoKey): Promise<string> {
    return toBase64Url(await getSubtle().exportKey('raw', key))
  },

  /** Import a base64url key made by exportKey() */
  async importKey(raw: string): Promise<CryptoKey> {
    return getSubtle().importKey('raw', fromBase64Url(raw), { name: 'AES-GCM' }, true, ['encrypt', 'decrypt'])
  },

  /** Derive an AES key from a passphrase + salt (PBKDF2-SHA256) */
  async deriveKey(passphrase: string, salt: string | Uint8Array, iters = iterations): Promise<CryptoKey> {
    const s = typeof salt === 'string' ? utf8.encode(salt) : toBytes(salt)
    return pbkdf2(passphrase, s, iters)
  },

  async encrypt(text: string, key?: KeyInput): Promise<string> {
    const k = requireKey(key)
    const iv = randomBytes(IV_BYTES)
    let cryptoKey: CryptoKey
    let saltPart = ''
    if (isCryptoKey(k)) {
      cryptoKey = k
    } else {
      let salt = sessionSalts.get(k)
      if (!salt) {
        salt = randomBytes(SALT_BYTES)
        sessionSalts.set(k, salt)
      }
      cryptoKey = await cachedDerive(k, salt)
      saltPart = toBase64Url(salt)
    }
    const ct = await getSubtle().encrypt({ name: 'AES-GCM', iv }, cryptoKey, utf8.encode(text))
    return `${PREFIX}.${saltPart}.${toBase64Url(iv)}.${toBase64Url(ct)}`
  },

  /** Returns null if the key is wrong or the data was tampered with (GCM is authenticated) */
  async decrypt(payload: string, key?: KeyInput): Promise<string | null> {
    const k = requireKey(key)
    const parts = typeof payload === 'string' ? payload.split('.') : []
    if (parts.length !== 4 || parts[0] !== PREFIX) return null
    try {
      const [, saltPart, ivPart, ctPart] = parts
      let cryptoKey: CryptoKey
      if (isCryptoKey(k)) {
        cryptoKey = k
      } else {
        if (!saltPart) return null
        cryptoKey = await cachedDerive(k, fromBase64Url(saltPart))
      }
      const pt = await getSubtle().decrypt({ name: 'AES-GCM', iv: fromBase64Url(ivPart) }, cryptoKey, fromBase64Url(ctPart))
      return utf8.decode(pt)
    } catch (e) {
      return null
    }
  },

  async encryptObject(obj: unknown, key?: KeyInput): Promise<string> {
    return this.encrypt(JSON.stringify(obj), key)
  },

  async decryptObject<T = any>(payload: string, key?: KeyInput): Promise<T | null> {
    const s = await this.decrypt(payload, key)
    if (s === null) return null
    try {
      return JSON.parse(s) as T
    } catch (e) {
      return null
    }
  },

  /** True if a string looks like a v2 payload */
  isEncrypted(s: string) {
    return typeof s === 'string' && s.startsWith(`${PREFIX}.`) && s.split('.').length === 4
  },

  /**
   * Read data made by v1 (CryptoJS AES, "U2FsdGVkX1..."). Use it once to migrate:
   * `const text = await encryption.decryptLegacy(old, oldKey); await encryption.encrypt(text, newKey)`.
   * crypto-js is loaded on demand.
   */
  async decryptLegacy(cipherText: string, key: string): Promise<string | null> {
    try {
      const mod: any = await import('crypto-js')
      const CryptoJS = mod.default ?? mod
      const out = CryptoJS.AES.decrypt(cipherText, key).toString(CryptoJS.enc.Utf8)
      return out === '' && cipherText !== '' ? null : out
    } catch (e) {
      return null
    }
  },

  /** @internal clear state (tests) */
  _reset() {
    defaultKey = null
    iterations = DEFAULT_ITERATIONS
    sessionSalts.clear()
    derivedCache.clear()
  }
}
