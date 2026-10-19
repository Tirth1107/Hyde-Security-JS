import { createReporter, ThreatListener } from '../core/events'

const reporter = createReporter('antiDebug', 'critical')

let enabled = false

const report = (type: string, details?: Record<string, any>) => reporter.report(type, details)

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
  enable(opts?: { onThreat?: ThreatListener }) {
    if (enabled) return
    enabled = true
    reporter.setCallback(opts?.onThreat)
    timerId = startTimingTrap()
  },
  disable() {
    if (!enabled) return
    clearInterval(timerId)
    enabled = false
  }
}
