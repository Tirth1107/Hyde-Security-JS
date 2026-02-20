import { uid, now } from '../core/utils'
import { HydeSecurityEvent } from '../core/config'

let intervalId: any = null
let enabled = false
let onThreat: ((ev: HydeSecurityEvent) => void) | undefined

function report(type: string, details?: Record<string, any>) {
  const ev: HydeSecurityEvent = { id: uid(), type, severity: 'warning', details, timestamp: now() }
  onThreat?.(ev)
  return ev
}

function checkBySize() {
  try {
    const threshold = 160
    const opened = window.outerWidth - window.innerWidth > threshold || window.outerHeight - window.innerHeight > threshold
    return opened
  } catch (e) {
    return false
  }
}

function trapDebugger() {
  const start = performance.now()
  // eslint-disable-next-line no-debugger
  debugger
  const delta = performance.now() - start
  return delta > 200
}

/**
 * Console timing trap: console.log is significantly slower when devtools is open
 * because the console panel has to render the output.
 */
function checkConsoleLatency(): boolean {
  try {
    const before = performance.now()
    // console.log with a complex object triggers rendering in devtools
    console.log('%c', 'font-size:0;')
    console.clear()
    const delta = performance.now() - before
    return delta > 20 // devtools adds 20ms+ overhead
  } catch (e) {
    return false
  }
}

/**
 * Object toString trap: When devtools inspects an object,
 * it calls toString/valueOf — we can detect this.
 */
function checkToStringTrap(): boolean {
  let devtoolsOpen = false
  const el = new Image()
  Object.defineProperty(el, 'id', {
    get: () => {
      devtoolsOpen = true
      return ''
    }
  })
  // console.log triggers the id getter ONLY when devtools is open
  console.log(el)
  console.clear()
  return devtoolsOpen
}

/**
 * Regex toString trap: Regular expressions' toString is called
 * when logged to the console with devtools open.
 */
function checkRegexTrap(): boolean {
  let devtoolsOpen = false
  const r = /./
  r.toString = () => {
    devtoolsOpen = true
    return ''
  }
  console.log(r)
  console.clear()
  return devtoolsOpen
}

/**
 * Firebug detection: checks for Firebug's global objects.
 */
function checkFirebug(): boolean {
  try {
    return !!(window as any).Firebug || !!(window as any).console?.firebug ||
      (typeof (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ !== 'undefined')
  } catch (e) {
    return false
  }
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
  overlayEl.innerText = message
  document.body.appendChild(overlayEl)
}

function hideOverlay() {
  if (!overlayEl) return
  overlayEl.remove()
  overlayEl = null
}

export const antiDevtools = {
  enable(cfg?: { onThreat?: (ev: HydeSecurityEvent) => void; mode?: string; autoLock?: boolean }) {
    if (enabled) return
    enabled = true
    onThreat = cfg?.onThreat
    detachKeyBlocker = attachKeyBlocker()
    intervalId = setInterval(() => {
      const signals: string[] = []
      if (checkBySize()) signals.push('size_delta')
      if (trapDebugger()) signals.push('debugger_trap')
      if (checkConsoleLatency()) signals.push('console_latency')
      if (checkToStringTrap()) signals.push('toString_trap')
      if (checkRegexTrap()) signals.push('regex_trap')
      if (checkFirebug()) signals.push('firebug')

      if (signals.length > 0) {
        report('devtools_detected', { method: signals.join(', '), signals })
        if (cfg?.autoLock) showOverlay('⚠️ Developer Tools Detected — Access Denied')
      }
    }, 1500)
  },
  disable() {
    if (!enabled) return
    clearInterval(intervalId)
    detachKeyBlocker && detachKeyBlocker()
    hideOverlay()
    enabled = false
  },
  /**
   * One-shot detection: returns all active devtools signals right now.
   */
  detect(): { open: boolean; signals: string[] } {
    const signals: string[] = []
    if (checkBySize()) signals.push('size_delta')
    if (checkFirebug()) signals.push('firebug')
    // Note: debugger trap is not included in one-shot because it pauses execution
    return { open: signals.length > 0, signals }
  },
  lockScreen(reason?: string) {
    showOverlay(reason || 'Security locked')
  },
  unlockScreen() {
    hideOverlay()
  }
}
