import { createReporter, ThreatListener } from '../core/events'
import { createDevtoolsDetector } from '../core/devtoolsDetect'

const reporter = createReporter('antiDevtools', 'warning')

// One shared detector; it only runs while the module is enabled
const detector = createDevtoolsDetector()

let intervalId: ReturnType<typeof setInterval> | null = null
let enabled = false

const report = (type: string, details?: Record<string, any>) => reporter.report(type, details)

function trapDebugger() {
  const start = performance.now()
  // eslint-disable-next-line no-debugger
  debugger
  const delta = performance.now() - start
  return delta > 200
}

function attachKeyBlocker() {
  function handler(e: KeyboardEvent) {
    const blocked = (
      (e.key === 'F12') ||
      (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) ||
      (e.ctrlKey && e.key.toUpperCase() === 'U')
    )
    if (blocked) {
      e.preventDefault()
      report('shortcut_blocked', { key: e.key })
    }
  }
  window.addEventListener('keydown', handler, true)
  return () => window.removeEventListener('keydown', handler, true)
}

let detachKeyBlocker: (() => void) | null = null
let overlayEl: HTMLElement | null = null

function showOverlay(message = 'Security triggered') {
  if (overlayEl) return
  overlayEl = document.createElement('div')
  overlayEl.style.position = 'fixed'
  overlayEl.style.left = '0'
  overlayEl.style.top = '0'
  overlayEl.style.width = '100%'
  overlayEl.style.height = '100%'
  overlayEl.style.background = 'rgba(0,0,0,0.85)'
  overlayEl.style.color = '#fff'
  overlayEl.style.zIndex = '999999'
  overlayEl.style.display = 'flex'
  overlayEl.style.alignItems = 'center'
  overlayEl.style.justifyContent = 'center'
  overlayEl.style.fontSize = '20px'
  overlayEl.textContent = message
  document.body.appendChild(overlayEl)
}

function hideOverlay() {
  if (!overlayEl) return
  overlayEl.remove()
  overlayEl = null
}

let detectorListener: ((isOpen: boolean, method: string) => void) | null = null
let detectorOpen = false
let detectorMethod = ''

export interface AntiDevtoolsOptions {
  onThreat?: ThreatListener
  /** Show a lock overlay when DevTools are detected */
  autoLock?: boolean
  /**
   * Run a `debugger` statement on an interval. It pauses the page for anyone
   * with DevTools open, so it is off by default (on in strict mode).
   */
  debuggerTrap?: boolean
  /** @deprecated Not used */
  mode?: string
}

export const antiDevtools = {
  enable(cfg?: AntiDevtoolsOptions) {
    if (enabled) return
    enabled = true
    reporter.setCallback(cfg?.onThreat)
    detachKeyBlocker = attachKeyBlocker()

    // One listener per enable(); removed again in disable()
    detectorListener = (isOpen: boolean, method: string) => {
      detectorOpen = isOpen
      detectorMethod = method
      if (!isOpen || !enabled) return
      report('devtools_detected', { method, signals: [method] })
      if (cfg?.autoLock) showOverlay('Developer Tools Detected. Access Denied.')
    }
    detector.addListener(detectorListener)
    detector.launch()

    if (cfg?.debuggerTrap) {
      intervalId = setInterval(() => {
        if (trapDebugger()) {
          report('devtools_detected', { method: 'debugger_trap', signals: ['debugger_trap'] })
          if (cfg?.autoLock) showOverlay('Developer Tools Detected. Access Denied.')
        }
      }, 1500)
    }
  },
  disable() {
    if (!enabled) return
    if (intervalId) clearInterval(intervalId)
    intervalId = null
    if (detachKeyBlocker) detachKeyBlocker()
    detachKeyBlocker = null
    hideOverlay()

    if (detectorListener) {
      detector.removeListener(detectorListener)
      detector.stop()
    }
    detectorListener = null
    detectorOpen = false
    enabled = false
  },
  /** Kept for v2.0 compatibility. Detection is built in now, so this resolves at once. */
  ready(): Promise<boolean> {
    return Promise.resolve(true)
  },
  /** Whether the module is currently running */
  isEnabled() {
    return enabled
  },
  /**
   * One-shot check. Runs the detectors now (even when the module is off).
   */
  detect(): { open: boolean; signals: string[] } {
    if (enabled && detectorOpen) return { open: true, signals: [detectorMethod] }
    const r = detector.check()
    return { open: r.open, signals: r.open ? [r.method] : [] }
  },
  lockScreen(reason?: string) {
    showOverlay(reason || 'Security locked')
  },
  unlockScreen() {
    hideOverlay()
  }
}
