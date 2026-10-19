import { uid, now } from '../core/utils'
import { HydeSecurityEvent } from '../core/config'
import devtoolsDetector from 'devtools-detector'

let intervalId: any = null
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
  overlayEl.innerText = message
  document.body.appendChild(overlayEl)
}

function hideOverlay() {
  if (!overlayEl) return
  overlayEl.remove()
  overlayEl = null
}

const handleDevToolsOpen = (isOpen: boolean) => {
  if (isOpen && enabled) {
    report('devtools_detected', { method: 'devtools-detector library' })
    // We don't auto-lock here because we rely on the interval to check cfg.autoLock,
    // or we can lock it directly. 
  }
}

export const antiDevtools = {
  enable(cfg?: { onThreat?: (ev: HydeSecurityEvent) => void; mode?: string; autoLock?: boolean }) {
    if (enabled) return
    enabled = true
    onThreat = cfg?.onThreat
    detachKeyBlocker = attachKeyBlocker()
    
    // Add third-party detector
    devtoolsDetector.addListener((isOpen) => {
      if (isOpen) {
        report('devtools_detected', { method: 'devtools-detector library' })
        if (cfg?.autoLock) showOverlay('⚠️ Developer Tools Detected — Access Denied')
      }
    })
    devtoolsDetector.launch()

    intervalId = setInterval(() => {
      const signals: string[] = []
      
      // Aggressive V1 trap: manually halt with debugger
      if (trapDebugger()) signals.push('debugger_trap')

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
    
    // Stop third-party detector
    devtoolsDetector.stop()
    // It doesn't have a removeAllListeners, but stop() halts the loop.
    
    enabled = false
  },
  /**
   * One-shot detection: returns all active devtools signals right now.
   */
  detect(): { open: boolean; signals: string[] } {
    const open = (devtoolsDetector as any).isOpen || false
    return { open, signals: open ? ['devtools-detector'] : [] }
  },
  lockScreen(reason?: string) {
    showOverlay(reason || 'Security locked')
  },
  unlockScreen() {
    hideOverlay()
  }
}
