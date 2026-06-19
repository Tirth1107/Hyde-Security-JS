import { encryption } from './encryption'
import localforage from 'localforage'

interface StorageItem {
  __hyde_v: any
  __hyde_exp?: number
}

export const storage = {
  set(key: string, value: any, opts?: { encrypt?: boolean; key?: string; ttl?: number }) {
    const prefixedKey = key.startsWith('__hyde_') ? key : `__hyde_${key}`
    const item: StorageItem = { __hyde_v: value }
    if (opts?.ttl) {
      item.__hyde_exp = Date.now() + opts.ttl * 1000
    }

    const payload = JSON.stringify(item)
    const store = opts?.encrypt ? encryption.encrypt(payload, opts.key) : payload
    try {
      localStorage.setItem(prefixedKey, store)
    } catch (e) {
      // fallback to localforage
      localforage.setItem(prefixedKey, store)
    }
  },

  get(key: string, opts?: { decrypt?: boolean; key?: string }) {
    const prefixedKey = key.startsWith('__hyde_') ? key : `__hyde_${key}`
    const raw = localStorage.getItem(prefixedKey)
    if (!raw) return null

    let parsed: any
    try {
      const data = opts?.decrypt ? encryption.decrypt(raw, opts.key) : raw
      parsed = JSON.parse(data)
    } catch (e) {
      // backward compatibility for unparsed values
      return raw
    }

    if (parsed && typeof parsed === 'object' && '__hyde_v' in parsed) {
      const item = parsed as StorageItem
      if (item.__hyde_exp && Date.now() > item.__hyde_exp) {
        this.remove(key)
        return null
      }
      return item.__hyde_v
    }

    // backward compatibility for old items without wrapper
    return parsed
  },

  remove(key: string) {
    const prefixedKey = key.startsWith('__hyde_') ? key : `__hyde_${key}`
    localStorage.removeItem(prefixedKey)
    localforage.removeItem(prefixedKey)
  },

  clear() {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith('__hyde_')) {
        localStorage.removeItem(k)
        i-- // adjust index after removal
      }
    }
    
    // clear localforage conditionally
    localforage.keys().then((keys) => {
      keys.forEach((k) => {
        if (k.startsWith('__hyde_')) {
          localforage.removeItem(k)
        }
      })
    })
  }
}
