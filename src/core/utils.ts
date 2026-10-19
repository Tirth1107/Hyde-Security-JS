/** Utility helpers used across modules */

/** Random UUID v4 (uses crypto.randomUUID when available) */
export function uid(): string {
  const c = (globalThis as any).crypto as Crypto | undefined
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  const b = new Uint8Array(16)
  if (c && c.getRandomValues) c.getRandomValues(b)
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256)
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = Array.from(b, x => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

export function now() {
  return Date.now()
}

export function safeJSONParse<T = any>(s: string | null, fallback: T): T {
  if (!s) return fallback
  try {
    return JSON.parse(s) as T
  } catch (e) {
    return fallback
  }
}

export function clamp(n: number, a = 0, b = 1) {
  return Math.max(a, Math.min(b, n))
}

export const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined'

/** Normalize `true | options | undefined` config values */
export function optionsOf<T extends object>(v: boolean | T | undefined, defaults: T): T | null {
  if (v === false) return null
  if (v === true || v === undefined) return { ...defaults }
  return { ...defaults, ...v }
}

/** Short preview of a value for event details (never log full secrets) */
export function preview(s: string, max = 120): string {
  return s.length > max ? `${s.slice(0, max)}…` : s
}
