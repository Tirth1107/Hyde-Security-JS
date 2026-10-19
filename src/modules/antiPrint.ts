import { createReporter, ThreatListener } from '../core/events'

const reporter = createReporter('antiPrint', 'warning')

let enabled = false
let styleEl: HTMLStyleElement | null = null

function beforePrint() {
  document.body.style.filter = 'blur(10px)'
  reporter.report('print_attempt', { method: 'beforeprint' })
}

function afterPrint() {
  document.body.style.filter = ''
}

function keydownHandler(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
    e.preventDefault()
    reporter.report('print_attempt', { method: 'shortcut' })
  }
}

export const antiPrint = {
  enable(opts?: { onThreat?: ThreatListener }) {
    if (typeof window === 'undefined' || enabled) return
    enabled = true
    reporter.setCallback(opts?.onThreat)

    // Hide all content when printing
    styleEl = document.createElement('style')
    styleEl.textContent = '@media print { body { display: none !important; } }'
    document.head.appendChild(styleEl)

    window.addEventListener('beforeprint', beforePrint)
    window.addEventListener('afterprint', afterPrint)
    window.addEventListener('keydown', keydownHandler, true)
  },

  disable() {
    if (typeof window === 'undefined' || !enabled) return
    enabled = false
    styleEl?.remove()
    styleEl = null
    window.removeEventListener('beforeprint', beforePrint)
    window.removeEventListener('afterprint', afterPrint)
    window.removeEventListener('keydown', keydownHandler, true)
  }
}
