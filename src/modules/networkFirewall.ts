/**
 * Zero-Trust Network Firewall
 * Intercepts `window.fetch` and `XMLHttpRequest` to strictly allowlist domains,
 * blocking unauthorized data exfiltration attempts (e.g. from XSS payloads).
 */

let activeDisable: (() => void) | null = null

export const networkFirewall = {
  /** True while the firewall is wrapping fetch/XHR */
  isEnabled() {
    return activeDisable !== null
  },

  /** Restore the original fetch and XMLHttpRequest. Safe to call when not enabled. */
  disable() {
    if (activeDisable) activeDisable()
  },

  /**
   * Initialize the firewall with a list of allowed domains.
   * @param allowedDomains Array of domain strings (e.g., ['api.my-app.com', 'google-analytics.com'])
   * @param onBlocked Callback when a request is blocked
   */
  enable(allowedDomains: string[], onBlocked?: (url: string) => void) {
    if (typeof window === 'undefined') return () => {};

    // Calling enable() again replaces the old allowlist instead of wrapping twice
    if (activeDisable) activeDisable();

    // Ensure current origin is always allowed
    const currentOrigin = window.location.origin;
    const whitelist = new Set([...allowedDomains, currentOrigin]);

    const isAllowed = (urlStr: string) => {
      try {
        // Handle relative URLs
        const url = new URL(urlStr, currentOrigin);
        
        // Exact match or subdomain match
        return Array.from(whitelist).some(allowed => 
          url.origin === allowed || url.hostname === allowed || url.hostname.endsWith(`.${allowed}`)
        );
      } catch (e) {
        return false; // Block malformed URLs
      }
    };

    // 1. Intercept Fetch
    const originalFetch = window.fetch;
    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
      const urlString = typeof input === 'string' ? input : (input instanceof Request ? input.url : input.toString());
      
      if (!isAllowed(urlString)) {
        document.dispatchEvent(new CustomEvent('hyde:threat', { 
          detail: { source: 'networkFirewall', type: 'fetch_blocked', url: urlString } 
        }));
        if (onBlocked) onBlocked(urlString);
        return Promise.reject(new Error(`[HydeSecurity] Fetch blocked by network firewall: ${urlString}`));
      }
      return originalFetch.apply(this, [input, init]);
    };

    // 2. Intercept XMLHttpRequest
    const originalXhrOpen = window.XMLHttpRequest.prototype.open;
    window.XMLHttpRequest.prototype.open = function(
      method: string, 
      url: string | URL,
      async: boolean = true, 
      username?: string | null, 
      password?: string | null
    ) {
      const urlString = url.toString();
      
      if (!isAllowed(urlString)) {
        document.dispatchEvent(new CustomEvent('hyde:threat', { 
          detail: { source: 'networkFirewall', type: 'xhr_blocked', url: urlString } 
        }));
        if (onBlocked) onBlocked(urlString);
        throw new Error(`[HydeSecurity] XHR blocked by network firewall: ${urlString}`);
      }
      return originalXhrOpen.call(this, method, url, async, username, password);
    };

    // Return a disable function to restore original APIs
    const disable = () => {
      if (activeDisable !== disable) return; // already replaced or disabled
      window.fetch = originalFetch;
      window.XMLHttpRequest.prototype.open = originalXhrOpen;
      activeDisable = null;
    };
    activeDisable = disable;
    return disable;
  }
};
