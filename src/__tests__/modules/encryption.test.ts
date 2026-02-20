import { describe, it, expect } from 'vitest'
import { encryption } from '../../modules/encryption'

describe('Encryption Module', () => {
  const testKey = 'test-secret-key-12345'

  it('should encrypt and decrypt text', () => {
    const plaintext = 'Hello World'
    const encrypted = encryption.encrypt(plaintext, testKey)
    expect(encrypted).not.toBe(plaintext)
    const decrypted = encryption.decrypt(encrypted, testKey)
    expect(decrypted).toBe(plaintext)
  })

  it('should handle special characters', () => {
    const text = 'Test@123!#$%^&*()_+{}'
    const encrypted = encryption.encrypt(text, testKey)
    const decrypted = encryption.decrypt(encrypted, testKey)
    expect(decrypted).toBe(text)
  })

  it('should encrypt and decrypt JSON objects', () => {
    const obj = { userId: 123, email: 'test@example.com', role: 'admin' }
    const encrypted = encryption.encryptObject(obj, testKey)
    expect(encrypted).not.toContain('userId')
    const decrypted = encryption.decryptObject(encrypted, testKey)
    expect(decrypted).toEqual(obj)
  })

  it('should fail gracefully with wrong key', () => {
    const text = 'Secret'
    const encrypted = encryption.encrypt(text, testKey)
    const wrongDecrypt = encryption.decrypt(encrypted, 'wrong-key')
    expect(wrongDecrypt).toBe('')
  })

  it('should handle empty strings', () => {
    const encrypted = encryption.encrypt('', testKey)
    const decrypted = encryption.decrypt(encrypted, testKey)
    expect(decrypted).toBe('')
  })

  it('should encrypt/decrypt large text', () => {
    const largeText = 'x'.repeat(10000)
    const encrypted = encryption.encrypt(largeText, testKey)
    const decrypted = encryption.decrypt(encrypted, testKey)
    expect(decrypted).toBe(largeText)
  })
})
