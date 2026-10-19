import CryptoJS from 'crypto-js'
import { warn } from '../core/logger'

/**
 * Built-in fallback key. It ships inside this library, so anything encrypted
 * with it is readable by anyone. Kept only for backward compatibility —
 * set your own key with `encryption.setDefaultKey()` or the `encryptionKey` config.
 */
const BUILTIN_KEY = 'hyde_default_key'
const DEFAULT_SALT = 'hyde_security_salt'

let defaultKey: string | null = null
let warnedBuiltinKey = false

function resolveKey(key?: string): string {
  if (key) return key
  if (defaultKey) return defaultKey
  if (!warnedBuiltinKey) {
    warnedBuiltinKey = true
    // Use console directly so the warning shows even with logging off
    console.warn(
      '[HydeSecurity] encryption is using the built-in default key, which is public. ' +
      'Pass a key or call encryption.setDefaultKey(yourKey).'
    )
  }
  return BUILTIN_KEY
}

export const encryption = {
  /** Set the key used when no key is passed to encrypt/decrypt. Pass null to unset. */
  setDefaultKey(key: string | null) {
    if (key !== null && key.length < 8) warn('encryption key is shorter than 8 characters')
    defaultKey = key
  },
  /** True when a custom default key has been set */
  hasCustomKey() {
    return defaultKey !== null
  },
  encrypt(text: string, key?: string) {
    return CryptoJS.AES.encrypt(text, resolveKey(key)).toString()
  },
  decrypt(cipherText: string, key?: string) {
    try {
      const bytes = CryptoJS.AES.decrypt(cipherText, resolveKey(key))
      return bytes.toString(CryptoJS.enc.Utf8)
    } catch (e) {
      return ''
    }
  },
  encryptObject(obj: any, key?: string) {
    return this.encrypt(JSON.stringify(obj), key)
  },
  decryptObject(cipher: string, key?: string) {
    const s = this.decrypt(cipher, key)
    try {
      return JSON.parse(s)
    } catch (e) {
      return null
    }
  },
  /**
   * Derive a 256-bit key from a seed with PBKDF2.
   * The same seed + salt always gives the same key. (In 1.5.0 and earlier a random
   * salt was used when none was passed, so the result could never be reproduced.)
   * `iterations` defaults to 1000 for compatibility; use a higher value for new data.
   */
  deriveKey(seed: string, salt = DEFAULT_SALT, iterations = 1000) {
    return CryptoJS.PBKDF2(seed, salt, { keySize: 256 / 32, iterations }).toString()
  }
}
