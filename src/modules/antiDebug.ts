import { uid, now } from '../core/utils'
import { HydeSecurityEvent } from '../core/config'

let enabled = false
let onThreat: ((ev: HydeSecurityEvent) => void) | undefined

function report(type: string, details?: Record<string, any>) {
  const ev: HydeSecurityEvent = { id: uid(), type, severity: 'critical', details, timestamp: now() }
  onThreat?.(ev)
  return ev
}

function startTimingTrap() {
  let last = performance.now()
  return setInterval(() => {
    const delta = performance.now() - last
    last = performance.now()
    if (delta > 500) {
      report('debugger_timing_trap', { delta })
    }
  }, 400)
}

let timerId: any = null

export const antiDebug = {
  enable(opts?: { onThreat?: (ev: HydeSecurityEvent) => void }) {
    if (enabled) return
    enabled = true
    onThreat = opts?.onThreat
    timerId = startTimingTrap()
  },
  disable() {
    if (!enabled) return
    clearInterval(timerId)
    enabled = false
  }
}
