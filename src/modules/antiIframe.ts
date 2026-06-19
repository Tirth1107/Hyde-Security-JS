export const antiIframe = {
  enable(opts?: { onThreat?: (ev: any) => void; allowedOrigins?: string[] }) {
    if (typeof window === 'undefined') return

    try {
      if (window.self !== window.top) {
        // We are in an iframe
        const referrer = document.referrer
        let isAllowed = false

        if (opts?.allowedOrigins && opts.allowedOrigins.length > 0 && referrer) {
          try {
            const refUrl = new URL(referrer)
            isAllowed = opts.allowedOrigins.includes(refUrl.origin)
          } catch (e) {
            // Invalid referrer URL
          }
        }

        if (!isAllowed) {
          opts?.onThreat?.({ id: 'iframe', type: 'iframe', severity: 'critical', timestamp: Date.now() })
          if (window.top) {
            window.top.location.href = window.self.location.href
          }
        }
      }
    } catch (e) {
      // Access to window.top might throw due to cross-origin policies
      opts?.onThreat?.({ id: 'iframe_cross_origin', type: 'iframe', severity: 'critical', timestamp: Date.now() })
      // Try to break out anyway
      try {
        if (window.top) window.top.location.href = window.self.location.href
      } catch (err) {}
    }
  },

  disable() {
    // Cannot really "disable" once we broke out of the iframe, 
    // but provided for interface compliance
  }
}
