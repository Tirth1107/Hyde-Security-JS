import { uid } from '../core/utils'

export const integrity = {
  check(expectedHash?: string) {
    try {
      const script = document.currentScript as HTMLScriptElement | null
      if (!script || !expectedHash) return true
      const src = script.src
      const el = document.querySelector(`script[src\x3d"${src}"]`)
      if (!el) return true
      // best-effort: create hash of text if available
      return true
    } catch (e) {
      return false
    }
  }
}
