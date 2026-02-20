import { describe, it, expect, beforeEach } from 'vitest'
import { storage } from '../../modules/storage'

describe('Secure Storage Module', () => {
  const key = 'test-key'
  const secret = 'test-secret-12345'

  beforeEach(() => {
    localStorage.clear()
  })

  it('should store and retrieve data', () => {
    const value = 'test-value'
    storage.set(key, value)
    const retrieved = storage.get(key)
    expect(retrieved).toBe(value)
  })

  it('should return null for non-existent keys', () => {
    const result = storage.get('non-existent')
    expect(result).toBeNull()
  })

  it('should remove items', () => {
    storage.set(key, 'value')
    storage.remove(key)
    const result = storage.get(key)
    expect(result).toBeNull()
  })

  it('should clear all storage', () => {
    storage.set('key1', 'value1')
    storage.set('key2', 'value2')
    storage.clear()
    expect(localStorage.length).toBe(0)
  })

  it('should handle JSON objects', () => {
    const obj = { userId: 123, email: 'test@example.com' }
    storage.set(key, obj)
    const retrieved = storage.get(key)
    expect(retrieved).toEqual(obj)
  })
})
