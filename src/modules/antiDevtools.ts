import { uid, now } from '../core/utils'
import { HydeSecurityEvent } from '../core/config'
import devtoolsDetector from 'devtools-detector'

let intervalId: ReturnType<typeof setInterval> | null = null
let enabled = false
let onThreat: ((ev: HydeSecurityEvent) => void) | undefined

function report(type: string, details?: Record<string, any>) {
  const ev: HydeSecurityEvent = { id: uid(), type, severity: 'warning', details, timestamp: now() }
  onThreat?.(ev)
  return ev
}

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

let detectorListener: ((isOpen: boolean) => void) | null = null
let detectorOpen = false

export interface AntiDevtoolsOptions {
  onThreat?: (ev: HydeSecurityEvent) => void
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
    onThreat = cfg?.onThreat
    detachKeyBlocker = attachKeyBlocker()

    // One listener per enable(); removed again in disable()
    detectorListener = (isOpen: boolean) => {
      detectorOpen = isOpen
      if (!isOpen || !enabled) return
      report('devtools_detected', { method: 'devtools-detector' })
      if (cfg?.autoLock) showOverlay('⚠️ Developer Tools Detected — Access Denied')
    }
    devtoolsDetector.addListener(detectorListener)
    devtoolsDetector.launch()

    if (cfg?.debuggerTrap) {
      intervalId = setInterval(() => {
        if (trapDebugger()) {
          report('devtools_detected', { method: 'debugger_trap', signals: ['debugger_trap'] })
          if (cfg?.autoLock) showOverlay('⚠️ Developer Tools Detected — Access Denied')
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

    if (detectorListener) devtoolsDetector.removeListener(detectorListener)
    detectorListener = null
    devtoolsDetector.stop()
    detectorOpen = false
    enabled = false
  },
  /** Whether the module is currently running */
  isEnabled() {
    return enabled
  },
  /**
   * One-shot check based on the last result from devtools-detector.
   */
  detect(): { open: boolean; signals: string[] } {
    return { open: detectorOpen, signals: detectorOpen ? ['devtools-detector'] : [] }
  },
  lockScreen(reason?: string) {
    showOverlay(reason || 'Security locked')
  },
  unlockScreen() {
    hideOverlay()
  }
}
