import { createReporter, ThreatListener } from '../core/events'

const reporter = createReporter('antiContextMenu', 'info')

let enabled = false

const report = (type: string, details?: Record<string, any>) => reporter.report(type, details)

function handler(e: MouseEvent) {
  e.preventDefault()
  report('contextmenu_blocked')
}

export const antiContextMenu = {
  enable(opts?: { onThreat?: ThreatListener }) {
    if (enabled) return
    enabled = true
    reporter.setCallback(opts?.onThreat)
    document.addEventListener('contextmenu', handler, true)
  },
  disable() {
    if (!enabled) return
    enabled = false
    document.removeEventListener('contextmenu', handler, true)
  }
}
