import { sha256Hex, sha256Sri } from '../core/encoding'

export const integrity = {
  /** Does the current <script> carry an SRI hash containing `expectedHash`? */
  check(expectedHash?: string) {
    try {
      const script = document.currentScript as HTMLScriptElement | null
      if (!script || !expectedHash) return true
      const integrityAttr = script.getAttribute('integrity')
      return integrityAttr ? integrityAttr.includes(expectedHash) : true
    } catch (e) {
      return false
    }
  },

  /**
   * Download a script and compare its SHA-256. `expectedHash` can be hex
   * or SRI format ('sha256-<base64>').
   */
  async checkScriptIntegrity(src: string, expectedHash: string): Promise<boolean> {
    try {
      const response = await fetch(src)
      if (!response.ok) return false
      const text = await response.text()
      if (expectedHash.startsWith('sha256-')) return (await sha256Sri(text)) === expectedHash
      return (await sha256Hex(text)) === expectedHash.toLowerCase()
    } catch (e) {
      return false
    }
  },

  /** SRI string ('sha256-...') for some content — use it in integrity="" attributes */
  async sri(content: string): Promise<string> {
    return sha256Sri(content)
  }
}
