import { uid, now } from '../core/utils'
import { HydeSecurityEvent } from '../core/config'

let enabled = false
let onThreat: ((ev: HydeSecurityEvent) => void) | undefined
let blurOverlay: HTMLElement | null = null
let warningOverlay: HTMLElement | null = null

function report(type: string, details?: Record<string, any>) {
    const ev: HydeSecurityEvent = { id: uid(), type, severity: 'warning', details, timestamp: now() }
    onThreat?.(ev)
    return ev
}

function createBlurOverlay() {
    if (blurOverlay) return
    blurOverlay = document.createElement('div')
    blurOverlay.id = 'hyde-tab-blur'
    blurOverlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
    background: rgba(0,0,0,0.6);
    z-index: 999998; display: flex; align-items: center; justify-content: center;
    transition: opacity 0.3s;
  `
    // Privacy shield message
    warningOverlay = document.createElement('div')
    warningOverlay.style.cssText = `
    text-align: center; color: #fff; font-family: system-ui, sans-serif;
  `
    warningOverlay.innerHTML = `
    <div style="font-size: 48px; margin-bottom: 12px;">🛡️</div>
    <div style="font-size: 18px; font-weight: 600; margin-bottom: 6px;">Privacy Shield Active</div>
    <div style="font-size: 13px; color: rgba(255,255,255,0.6);">Content hidden — return to this tab to continue</div>
  `
    blurOverlay.appendChild(warningOverlay)
    document.body.appendChild(blurOverlay)
}

function removeBlurOverlay() {
    if (blurOverlay) {
        blurOverlay.remove()
        blurOverlay = null
        warningOverlay = null
    }
}

function handleVisibilityChange() {
    if (!enabled) return
    if (document.hidden) {
        createBlurOverlay()
        report('tab_hidden', { timestamp: Date.now() })
    } else {
        removeBlurOverlay()
        report('tab_visible', { timestamp: Date.now() })
    }
}

function handleWindowBlur() {
    if (!enabled) return
    createBlurOverlay()
    report('window_blur', { timestamp: Date.now() })
}

function handleWindowFocus() {
    if (!enabled) return
    removeBlurOverlay()
}

export const tabGuard = {
    /**
     * Enable tab/window visibility monitoring.
     * When the user switches tabs or windows, the page content is blurred
     * with a privacy shield overlay for confidentiality.
     */
    enable(opts?: { onThreat?: (ev: HydeSecurityEvent) => void; blurOnWindowBlur?: boolean }) {
        if (enabled) return
        enabled = true
        onThreat = opts?.onThreat
        document.addEventListener('visibilitychange', handleVisibilityChange)
        if (opts?.blurOnWindowBlur !== false) {
            window.addEventListener('blur', handleWindowBlur)
            window.addEventListener('focus', handleWindowFocus)
        }
    },

    /**
     * Disable tab visibility monitoring and remove any active overlays.
     */
    disable() {
        if (!enabled) return
        enabled = false
        removeBlurOverlay()
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        window.removeEventListener('blur', handleWindowBlur)
        window.removeEventListener('focus', handleWindowFocus)
    },

    /**
     * Check if the tab is currently hidden.
     */
    isHidden(): boolean {
        return document.hidden
    },

    /**
     * Get total time the tab has been hidden (tracked from enable).
     */
    getStatus(): { enabled: boolean; hidden: boolean } {
        return { enabled, hidden: document.hidden }
    }
}
