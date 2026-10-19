import { createReporter, ThreatListener } from '../core/events'

const reporter = createReporter('antiIframe', 'critical')

export interface AntiIframeOptions {
  onThreat?: ThreatListener
  /** Origins allowed to frame this page */
  allowedOrigins?: string[]
  /** Navigate the top window to this page when framed by an unknown origin (default true) */
  breakOut?: boolean
}

function framerOrigin(): string | null {
  // ancestorOrigins (Chromium/Safari) is reliable; referrer is the fallback
  const ao = (location as any).ancestorOrigins as DOMStringList | undefined
  if (ao && ao.length) return ao[0]
  try {
    return document.referrer ? new URL(document.referrer).origin : null
  } catch (e) {
    return null
  }
}

export const antiIframe = {
  /** Is this page inside a frame? */
  isFramed(): boolean {
    if (typeof window === 'undefined') return false
    try {
      return window.self !== window.top
    } catch (e) {
      return true // cross-origin access to top throws, which means we are framed
    }
  },

  enable(opts: AntiIframeOptions = {}) {
    if (typeof window === 'undefined' || !this.isFramed()) return
    reporter.setCallback(opts.onThreat)
    const origin = framerOrigin()
    if (origin && opts.allowedOrigins?.includes(origin)) return

    reporter.report('framed_by_unknown_origin', { framer: origin })
    if (opts.breakOut !== false) {
      try {
        if (window.top) window.top.location.href = window.self.location.href
      } catch (e) {
        // Sandboxed iframes can block this; CSP frame-ancestors is the real fix
      }
    }
  },

  /** Nothing to undo; kept for a consistent interface */
  disable() {}
}
