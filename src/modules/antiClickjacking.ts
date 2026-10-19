/**
 * Anti-Clickjacking Module
 * Uses IntersectionObserver v2 to detect if a sensitive element is occluded
 * or transformed, which are common techniques in UI redressing/clickjacking attacks.
 */

export const antiClickjacking = {
  /**
   * Protects an element from being clickjacked.
   * Uses IntersectionObserver v2 (trackVisibility: true).
   * @param selector The CSS selector of the element to protect
   * @param onOccluded Callback triggered when occlusion is detected
   */
  protect(selector: string, onOccluded: () => void) {
    if (typeof window === 'undefined') return () => {};

    const el = document.querySelector(selector);
    if (!el) return () => {};

    // Check for IntersectionObserver v2 support
    const isV2Supported = typeof IntersectionObserver !== 'undefined' && 
      'isVisible' in IntersectionObserverEntry.prototype;

    if (!isV2Supported) {
      console.warn('[HydeSecurity] IntersectionObserver v2 is not supported in this browser. Fallback to basic framebusting.');
      // Basic framebusting fallback
      if (window.top !== window.self) {
        document.dispatchEvent(new CustomEvent('hyde:threat', { 
          detail: { source: 'antiClickjacking', type: 'framed' } 
        }));
        onOccluded();
      }
      return () => {};
    }

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        // In IntersectionObserver v2, `isVisible` is false if the element is:
        // - Covered by another element
        // - Has a CSS filter applied
        // - Has opacity < 1
        // - Is transformed
        if (!(entry as any).isVisible && entry.isIntersecting) {
          document.dispatchEvent(new CustomEvent('hyde:threat', { 
            detail: { source: 'antiClickjacking', selector, type: 'occluded' } 
          }));
          onOccluded();
        }
      }
    }, {
      trackVisibility: true,
      delay: 100 // Required for trackVisibility
    } as any); // Type cast to any because standard lib might not have v2 types fully implemented

    observer.observe(el);

    // Also run standard framebusting check
    if (window.top !== window.self) {
      document.dispatchEvent(new CustomEvent('hyde:threat', { 
        detail: { source: 'antiClickjacking', type: 'framed' } 
      }));
      onOccluded();
    }

    return () => observer.disconnect();
  }
};
