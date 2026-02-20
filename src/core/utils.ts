import CryptoJS from 'crypto-js'
import { v4 as uuidv4 } from 'uuid'

/** Utility helpers used across modules */
export function uid() {
  return uuidv4()
}

export function now() {
  return Date.now()
}

export function hashString(input: string) {
  return CryptoJS.SHA256(input).toString()
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
