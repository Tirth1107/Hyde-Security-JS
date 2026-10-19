import { createReporter, ThreatListener } from '../core/events'

const reporter = createReporter('antiCopy', 'warning')

let enabled = false

const report = (type: string, details?: Record<string, any>) => reporter.report(type, details)

function handleCopy(e: ClipboardEvent) {
  e.preventDefault()
  report('copy_blocked')
}

function handleCut(e: ClipboardEvent) {
  e.preventDefault()
  report('cut_blocked')
}

function handleDragStart(e: DragEvent) {
  e.preventDefault()
  report('drag_blocked')
}

export const antiCopy = {
  enable(opts?: { onThreat?: ThreatListener; disableSelection?: boolean }) {
    if (enabled) return
    enabled = true
    reporter.setCallback(opts?.onThreat)
    document.addEventListener('copy', handleCopy, true)
    document.addEventListener('cut', handleCut, true)
    document.addEventListener('dragstart', handleDragStart, true)
    if (opts?.disableSelection) document.documentElement.style.userSelect = 'none'
  },
  disable() {
    if (!enabled) return
    enabled = false
    document.removeEventListener('copy', handleCopy, true)
    document.removeEventListener('cut', handleCut, true)
    document.removeEventListener('dragstart', handleDragStart, true)
    document.documentElement.style.userSelect = ''
  }
}
