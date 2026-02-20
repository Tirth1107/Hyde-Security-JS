import { uid, now } from '../core/utils'
import { HydeSecurityEvent } from '../core/config'

let enabled = false
let onThreat: ((ev: HydeSecurityEvent) => void) | undefined

function report(type: string, details?: Record<string, any>) {
  const ev: HydeSecurityEvent = { id: uid(), type, severity: 'info', details, timestamp: now() }
  onThreat?.(ev)
  return ev
}

function handler(e: MouseEvent) {
  e.preventDefault()
  report('contextmenu_blocked')
}

export const antiContextMenu = {
  enable(opts?: { onThreat?: (ev: HydeSecurityEvent) => void }) {
    if (enabled) return
    enabled = true
    onThreat = opts?.onThreat
    document.addEventListener('contextmenu', handler, true)
  },
  disable() {
    if (!enabled) return
    enabled = false
    document.removeEventListener('contextmenu', handler, true)
  }
}
