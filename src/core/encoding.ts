/** Byte/string helpers built on standard Web APIs (no dependencies). */

/** Bytes backed by a plain ArrayBuffer (what Web Crypto accepts) */
export type Bytes = Uint8Array<ArrayBuffer>

export const utf8 = {
  encode: (s: string): Bytes => new TextEncoder().encode(s) as Bytes,
  decode: (b: ArrayBuffer | Uint8Array) => new TextDecoder().decode(b)
}

export function toBytes(b: ArrayBuffer | Uint8Array): Bytes {
  if (b instanceof Uint8Array) return (b.buffer instanceof ArrayBuffer ? b : new Uint8Array(b)) as Bytes
  return new Uint8Array(b)
}

export function toBase64(b: ArrayBuffer | Uint8Array): string {
  const bytes = toBytes(b)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

export function fromBase64(s: string): Bytes {
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export function toBase64Url(b: ArrayBuffer | Uint8Array): string {
  return toBase64(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function fromBase64Url(s: string): Bytes {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  return fromBase64(s.replace(/-/g, '+').replace(/_/g, '/') + pad)
}

export function toHex(b: ArrayBuffer | Uint8Array): string {
  return Array.from(toBytes(b), x => x.toString(16).padStart(2, '0')).join('')
}

export function randomBytes(n: number): Bytes {
  const out = new Uint8Array(n)
  getCrypto().getRandomValues(out)
  return out
}

export function getCrypto(): Crypto {
  const c = (globalThis as any).crypto as Crypto | undefined
  if (!c || !c.getRandomValues) throw new Error('[HydeSecurity] Web Crypto is not available in this environment')
  return c
}

export function getSubtle(): SubtleCrypto {
  const s = getCrypto().subtle
  if (!s) throw new Error('[HydeSecurity] crypto.subtle needs a secure context (HTTPS or localhost)')
  return s
}

/** SHA-256 of a string or bytes, as hex */
export async function sha256Hex(data: string | ArrayBuffer | Uint8Array): Promise<string> {
  const bytes = typeof data === 'string' ? utf8.encode(data) : toBytes(data)
  return toHex(await getSubtle().digest('SHA-256', bytes))
}

/** SHA-256 in SRI format: 'sha256-<base64>' */
export async function sha256Sri(data: string | ArrayBuffer | Uint8Array): Promise<string> {
  const bytes = typeof data === 'string' ? utf8.encode(data) : toBytes(data)
  return `sha256-${toBase64(await getSubtle().digest('SHA-256', bytes))}`
}

/** Constant-time comparison for equal-length strings */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
