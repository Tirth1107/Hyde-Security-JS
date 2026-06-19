import { hashString } from '../core/utils'

export const integrity = {
  check(expectedHash?: string) {
    try {
      const script = document.currentScript as HTMLScriptElement | null
      if (!script || !expectedHash) return true
      
      const integrityAttr = script.getAttribute('integrity')
      if (integrityAttr) {
        return integrityAttr.includes(expectedHash)
      }
      return true
    } catch (e) {
      return false
    }
  },
  
  async checkScriptIntegrity(src: string, expectedHash: string): Promise<boolean> {
    try {
      const response = await fetch(src)
      if (!response.ok) return false
      
      const text = await response.text()
      
      if (typeof crypto !== 'undefined' && crypto.subtle) {
        const encoder = new TextEncoder()
        const data = encoder.encode(text)
        const hashBuffer = await crypto.subtle.digest('SHA-256', data)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
        return hash === expectedHash
      } else {
        // Fallback for non-HTTPS or environments without crypto.subtle
        const hash = hashString(text)
        return hash === expectedHash
      }
    } catch (e) {
      return false
    }
  }
}
