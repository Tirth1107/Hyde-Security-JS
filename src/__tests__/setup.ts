import '@testing-library/jest-dom'
import { afterEach, vi } from 'vitest'
import { webcrypto } from 'node:crypto'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    get length() {
      return Object.keys(store).length
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })
Object.defineProperty(window, 'sessionStorage', { value: localStorageMock })

// Real Web Crypto (subtle included) from Node
Object.defineProperty(window, 'crypto', { value: webcrypto, configurable: true })
Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true })
if (typeof (globalThis as any).CryptoKey === 'undefined') (globalThis as any).CryptoKey = (webcrypto as any).CryptoKey

afterEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  sessionStorage.clear()
})
