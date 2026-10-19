import { encryption, KeyInput } from './encryption'
import localforage from 'localforage'

interface StorageItem {
  __hyde_v: any
  __hyde_exp?: number
}

const PREFIX = '__hyde_'
const fullKey = (key: string) => (key.startsWith(PREFIX) ? key : `${PREFIX}${key}`)

function wrap(value: any, ttl?: number): string {
  const item: StorageItem = { __hyde_v: value }
  if (ttl) item.__hyde_exp = Date.now() + ttl * 1000
  return JSON.stringify(item)
}

/** Returns [found, value]. Expired entries count as not found. */
function unwrap(raw: string, onExpired: () => void): [boolean, any] {
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch (e) {
    return [true, raw] // plain string written by something else
  }
  if (parsed && typeof parsed === 'object' && '__hyde_v' in parsed) {
    const item = parsed as StorageItem
    if (item.__hyde_exp && Date.now() > item.__hyde_exp) {
      onExpired()
      return [false, null]
    }
    return [true, item.__hyde_v]
  }
  return [true, parsed]
}

function write(k: string, v: string) {
  try {
    localStorage.setItem(k, v)
  } catch (e) {
    // Quota exceeded / private mode: fall back to IndexedDB
    localforage.setItem(k, v)
  }
}

export const storage = {
  /** Store a value (JSON) with optional TTL in seconds. Keys are prefixed with `__hyde_`. */
  set(key: string, value: any, opts?: { ttl?: number }) {
    if ((opts as any)?.encrypt) {
      throw new Error('[HydeSecurity] v2: use storage.setEncrypted() for encrypted values')
    }
    write(fullKey(key), wrap(value, opts?.ttl))
  },

  get(key: string) {
    const raw = localStorage.getItem(fullKey(key))
    if (raw === null) return null
    const [found, value] = unwrap(raw, () => this.remove(key))
    return found ? value : null
  },

  /** Encrypt (AES-GCM) and store. Uses the default key if none is passed. */
  async setEncrypted(key: string, value: any, opts?: { key?: KeyInput; ttl?: number }) {
    const payload = await encryption.encrypt(wrap(value, opts?.ttl), opts?.key)
    write(fullKey(key), payload)
  },

  /** Read a value stored with setEncrypted(). Null if missing, expired, or the key is wrong. */
  async getEncrypted<T = any>(key: string, opts?: { key?: KeyInput }): Promise<T | null> {
    const k = fullKey(key)
    const raw = localStorage.getItem(k) ?? ((await localforage.getItem<string>(k)) || null)
    if (raw === null) return null
    const plain = await encryption.decrypt(raw, opts?.key)
    if (plain === null) return null
    const [found, value] = unwrap(plain, () => this.remove(key))
    return found ? value : null
  },

  remove(key: string) {
    const k = fullKey(key)
    localStorage.removeItem(k)
    localforage.removeItem(k).catch(() => {})
  },

  /** Remove only HydeSecurity entries */
  clear() {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(PREFIX)) keys.push(k)
    }
    keys.forEach(k => localStorage.removeItem(k))
    localforage.keys()
      .then(all => all.filter(k => k.startsWith(PREFIX)).forEach(k => localforage.removeItem(k)))
      .catch(() => {})
  }
}
