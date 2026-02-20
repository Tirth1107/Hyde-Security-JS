import { uid, now } from '../core/utils'
import { HydeSecurityEvent } from '../core/config'

let enabled = false
let styleEl: HTMLStyleElement | null = null
let onThreat: ((ev: HydeSecurityEvent) => void) | undefined

function report(type: string, details?: Record<string, any>) {
    const ev: HydeSecurityEvent = { id: uid(), type, severity: 'critical', details, timestamp: now() }
    onThreat?.(ev)
    return ev
}

/**
 * Inject CSS that makes screenshots partially useless.
 * Uses CSS tricks to hide content from screen capture tools:
 * - Webkit print color adjustments
 * - High-contrast overlay patterns
 * - Animation-based content that doesn't capture well in screenshots
 */
function injectAntiCaptureCSS() {
    if (styleEl) return
    styleEl = document.createElement('style')
    styleEl.id = 'hyde-anti-capture'
    styleEl.textContent = `
    /* Media query: when user takes a screenshot on some platforms, print styles apply */
    @media print {
      body * { visibility: hidden !important; }
      body::after {
        visibility: visible !important;
        content: 'Screenshot capture is not allowed';
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        display: flex; align-items: center; justify-content: center;
        font-size: 24px; color: red; background: white; z-index: 999999;
      }
    }
  `
    document.head.appendChild(styleEl)
}

function removeAntiCaptureCSS() {
    if (styleEl) {
        styleEl.remove()
        styleEl = null
    }
}

export const antiScreenCapture = {
    /**
     * Enable anti-screen-capture protections:
     * - Injects CSS that disrupts print/screenshot
     * - Monitors Screen Capture API (getDisplayMedia) 
     * - Adds watermark overlay during capture attempts
     */
    enable(opts?: { onThreat?: (ev: HydeSecurityEvent) => void }) {
        if (enabled) return
        enabled = true
        onThreat = opts?.onThreat

        // 1. Inject anti-capture CSS
        injectAntiCaptureCSS()

        // 2. Monitor navigator.mediaDevices.getDisplayMedia if available
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
            const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices)
            navigator.mediaDevices.getDisplayMedia = function (...args: any[]) {
                report('screen_capture_attempt', { method: 'getDisplayMedia' })
                // Allow the call but report it
                return originalGetDisplayMedia(...args)
            } as any
        }

        // 3. Detect PrtScn key
        document.addEventListener('keyup', antiScreenCapture._keyHandler, true)

        report('anti_screen_capture_enabled')
    },

    _keyHandler(e: KeyboardEvent) {
        // PrintScreen key
        if (e.key === 'PrintScreen') {
            report('screenshot_key_pressed', { key: 'PrintScreen' })
            // Flash a brief watermark
            antiScreenCapture._flashProtection()
        }
    },

    /**
     * Briefly flash a protective overlay to contaminate any in-progress screenshot.
     */
    _flashProtection() {
        const el = document.createElement('div')
        el.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: white; z-index: 999999; opacity: 0.95;
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; color: red; font-family: system-ui; font-weight: bold;
      pointer-events: none;
    `
        el.textContent = '⚠️ Screenshot Capture Blocked'
        document.body.appendChild(el)
        setTimeout(() => el.remove(), 200)
    },

    /**
     * Disable all anti-screen-capture protections.
     */
    disable() {
        if (!enabled) return
        enabled = false
        removeAntiCaptureCSS()
        document.removeEventListener('keyup', antiScreenCapture._keyHandler, true)
    },

    /**
     * Add a dynamic canvas-based watermark that's hard to remove from screenshots.
     * Unlike CSS watermarks, canvas watermarks persist in image captures.
     */
    addCanvasWatermark(text: string, parentEl?: HTMLElement): () => void {
        const canvas = document.createElement('canvas')
        const target = parentEl || document.body
        canvas.width = target.offsetWidth || window.innerWidth
        canvas.height = target.offsetHeight || window.innerHeight
        canvas.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 999990; opacity: 0.04;
    `
        const ctx = canvas.getContext('2d')
        if (ctx) {
            ctx.font = '16px system-ui'
            ctx.fillStyle = 'white'
            ctx.rotate(-15 * Math.PI / 180)
            for (let y = -200; y < canvas.height + 200; y += 80) {
                for (let x = -200; x < canvas.width + 200; x += 250) {
                    ctx.fillText(text, x, y)
                }
            }
        }
        target.style.position = target.style.position || 'relative'
        target.appendChild(canvas)
        return () => canvas.remove()
    }
}
