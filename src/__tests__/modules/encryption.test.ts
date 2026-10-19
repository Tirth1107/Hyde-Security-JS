import { describe, it, expect, beforeEach } from 'vitest'
import CryptoJS from 'crypto-js'
import { encryption } from '../../modules/encryption'

const KEY = 'test-secret-key-12345'

describe('encryption v2 (AES-256-GCM)', () => {
  beforeEach(() => {
    encryption._reset()
    // Fewer PBKDF2 rounds keep tests fast; production default is 600k
    encryption.setIterations(100_000)
  })

  it('round-trips text, unicode, empty and large strings', async () => {
    for (const text of ['Hello World', 'Test@123!#$%^&*()_+{} é 😀', '', 'x'.repeat(50_000)]) {
      const c = await encryption.encrypt(text, KEY)
      expect(c.startsWith('hyde2.')).toBe(true)
      expect(c).not.toContain(text || 'never')
      expect(await encryption.decrypt(c, KEY)).toBe(text)
    }
  })

  it('uses a fresh IV every time', async () => {
    const a = await encryption.encrypt('same', KEY)
    const b = await encryption.encrypt('same', KEY)
    expect(a).not.toBe(b)
  })

  it('returns null for a wrong key or tampered data', async () => {
    const c = await encryption.encrypt('secret', KEY)
    expect(await encryption.decrypt(c, 'wrong-key-123456')).toBeNull()
    const parts = c.split('.')
    const ct = parts[3]
    parts[3] = (ct[0] === 'A' ? 'B' : 'A') + ct.slice(1)
    expect(await encryption.decrypt(parts.join('.'), KEY)).toBeNull()
    expect(await encryption.decrypt('not-a-payload', KEY)).toBeNull()
  })

  it('requires a key — there is no built-in default', async () => {
    await expect(encryption.encrypt('x')).rejects.toThrow(/needs a key/)
    encryption.setDefaultKey('app-wide-passphrase')
    const c = await encryption.encrypt('x')
    expect(await encryption.decrypt(c, 'app-wide-passphrase')).toBe('x')
  })

  it('works with CryptoKey objects and export/import', async () => {
    const key = await encryption.generateKey()
    const c = await encryption.encrypt('with key', key)
    expect(c.split('.')[1]).toBe('') // no salt for raw keys
    const restored = await encryption.importKey(await encryption.exportKey(key))
    expect(await encryption.decrypt(c, restored)).toBe('with key')
  })

  it('encrypts objects', async () => {
    const obj = { userId: 123, email: 'test@example.com', role: 'admin' }
    const c = await encryption.encryptObject(obj, KEY)
    expect(await encryption.decryptObject(c, KEY)).toEqual(obj)
  })

  it('deriveKey is deterministic', async () => {
    const k1 = await encryption.deriveKey('seed', 'salt', 100_000)
    const k2 = await encryption.deriveKey('seed', 'salt', 100_000)
    const c = await encryption.encrypt('d', k1)
    expect(await encryption.decrypt(c, k2)).toBe('d')
  })

  it('reads v1 (CryptoJS) data for migration', async () => {
    const legacy = CryptoJS.AES.encrypt('old data', 'old-key').toString()
    expect(await encryption.decryptLegacy(legacy, 'old-key')).toBe('old data')
    expect(await encryption.decryptLegacy(legacy, 'nope')).toBeNull()
  })

  it('isEncrypted detects v2 payloads', async () => {
    expect(encryption.isEncrypted(await encryption.encrypt('a', KEY))).toBe(true)
    expect(encryption.isEncrypted('U2FsdGVkX1abc')).toBe(false)
  })
})
