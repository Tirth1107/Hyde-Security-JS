import { uid, now } from '../core/utils'
import { HydeSecurityEvent } from '../core/config'

let enabled = false
let onThreat: ((ev: HydeSecurityEvent) => void) | undefined

function report(type: string, details?: Record<string, any>) {
  const ev: HydeSecurityEvent = { id: uid(), type, severity: 'critical', details, timestamp: now() }
  onThreat?.(ev)
  return ev
}

export const antiIframe = {
  enable(opts?: { onThreat?: (ev: HydeSecurityEvent) => void; allowedOrigins?: string[] }) {
    if (enabled) return
    enabled = true
    onThreat = opts?.onThreat
    try {
      if (window.self !== window.top) {
        const origin = document.referrer || 'unknown'
        if (!opts?.allowedOrigins?.includes(origin)) {
          report('iframe_detected', { origin })
          if (window.top) window.top.location.href = 'about:blank'
        }
      }
    } catch (e) {
      report('iframe_detection_blocked')
    }
  },
  disable() {
    enabled = false
  }
}
