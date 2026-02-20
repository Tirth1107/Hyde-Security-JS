import { uid, now } from '../core/utils'
import { HydeSecurityEvent } from '../core/config'

let enabled = false
let onThreat: ((ev: HydeSecurityEvent) => void) | undefined

function report(type: string, details?: Record<string, any>) {
  const ev: HydeSecurityEvent = { id: uid(), type, severity: 'warning', details, timestamp: now() }
  onThreat?.(ev)
  return ev
}

function beforePrint() {
  document.body.style.filter = 'blur(6px)'
  report('print_detected')
}
function afterPrint() {
  document.body.style.filter = ''
}

export const antiPrint = {
  enable(opts?: { onThreat?: (ev: HydeSecurityEvent) => void }) {
    if (enabled) return
    enabled = true
    onThreat = opts?.onThreat
    window.addEventListener('beforeprint', beforePrint)
    window.addEventListener('afterprint', afterPrint)
  },
  disable() {
    if (!enabled) return
    enabled = false
    window.removeEventListener('beforeprint', beforePrint)
    window.removeEventListener('afterprint', afterPrint)
  }
}
