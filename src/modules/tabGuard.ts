import { createReporter, ThreatListener } from '../core/events'

const reporter = createReporter('tabGuard', 'info')

let enabled = false
let blurOverlay: HTMLElement | null = null
let warningOverlay: HTMLElement | null = null

const report = (type: string, details?: Record<string, any>) => reporter.report(type, details)

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
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 12px;" aria-hidden="true"><path d="M12 2l8 3v6c0 5-3.5 9.5-8 11-4.5-1.5-8-6-8-11V5l8-3z"/></svg>
    <div style="font-size: 18px; font-weight: 600; margin-bottom: 6px;">Privacy Shield Active</div>
    <div style="font-size: 13px; color: rgba(255,255,255,0.6);">Content hidden. Return to this tab to continue</div>
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
    enable(opts?: { onThreat?: ThreatListener; blurOnWindowBlur?: boolean }) {
        if (enabled) return
        enabled = true
        reporter.setCallback(opts?.onThreat)
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
