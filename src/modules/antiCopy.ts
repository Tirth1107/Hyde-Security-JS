import { uid, now } from '../core/utils'
import { HydeSecurityEvent } from '../core/config'

let enabled = false
let onThreat: ((ev: HydeSecurityEvent) => void) | undefined

function report(type: string, details?: Record<string, any>) {
  const ev: HydeSecurityEvent = { id: uid(), type, severity: 'warning', details, timestamp: now() }
  onThreat?.(ev)
  return ev
}

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
  enable(opts?: { onThreat?: (ev: HydeSecurityEvent) => void; disableSelection?: boolean }) {
    if (enabled) return
    enabled = true
    onThreat = opts?.onThreat
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
