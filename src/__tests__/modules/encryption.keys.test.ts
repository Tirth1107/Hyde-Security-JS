import { describe, it, expect, vi, afterEach } from 'vitest'
import { encryption } from '../../modules/encryption'

describe('encryption default key', () => {
  afterEach(() => encryption.setDefaultKey(null))

  it('uses the key set with setDefaultKey', () => {
    encryption.setDefaultKey('my-app-secret-key')
    expect(encryption.hasCustomKey()).toBe(true)
    const c = encryption.encrypt('hello')
    expect(encryption.decrypt(c, 'my-app-secret-key')).toBe('hello')
    expect(encryption.decrypt(c, 'hyde_default_key')).not.toBe('hello')
  })

  it('still decrypts data made with the old built-in key (backward compatible)', () => {
    const c = encryption.encrypt('legacy', 'hyde_default_key')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(encryption.decrypt(c)).toBe('legacy')
    warn.mockRestore()
  })

  it('deriveKey is deterministic for the same seed and salt', () => {
    expect(encryption.deriveKey('seed')).toBe(encryption.deriveKey('seed'))
    expect(encryption.deriveKey('seed', 'a')).not.toBe(encryption.deriveKey('seed', 'b'))
    expect(encryption.deriveKey('seed')).toHaveLength(64)
  })
})
