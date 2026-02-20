import { encryption } from './encryption'
import localforage from 'localforage'

export const storage = {
  set(key: string, value: any, opts?: { encrypt?: boolean; key?: string }) {
    const payload = typeof value === 'string' ? value : JSON.stringify(value)
    const store = opts?.encrypt ? encryption.encrypt(payload, opts.key) : payload
    try {
      localStorage.setItem(key, store)
    } catch (e) {
      // fallback to localforage
      localforage.setItem(key, store)
    }
  },
  get(key: string, opts?: { decrypt?: boolean; key?: string }) {
    const raw = localStorage.getItem(key)
    const value = raw ?? null
    if (!value) return null
    if (opts?.decrypt) return encryption.decrypt(value, opts.key)
    try {
      return JSON.parse(value)
    } catch (e) {
      return value
    }
  },
  remove(key: string) {
    localStorage.removeItem(key)
    localforage.removeItem(key)
  },
  clear() {
    localStorage.clear()
    localforage.clear()
  }
}
