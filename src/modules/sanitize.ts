import DOMPurify from 'dompurify'

export interface SanitizeOptions {
  /** Extra tags to allow (DOMPurify path) */
  allowTags?: string[]
  /** Extra attributes to allow (DOMPurify path) */
  allowAttributes?: string[]
  /** Prefix id/name values with 'user-content-' so user HTML can't clobber globals (default false) */
  preventClobbering?: boolean
}

function escapeText(input: string): string {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/** Native Sanitizer API (Element.setHTML) — Firefox 148+, Chromium rolling out */
function hasNativeSetHTML(): boolean {
  return typeof Element !== 'undefined' && typeof (Element.prototype as any).setHTML === 'function'
}

function purify(input: string, opts?: SanitizeOptions): string {
  return DOMPurify.sanitize(input, {
    ADD_TAGS: opts?.allowTags,
    ADD_ATTR: opts?.allowAttributes,
    SANITIZE_NAMED_PROPS: !!opts?.preventClobbering
  }) as unknown as string
}

export const sanitize = {
  /**
   * Sanitize an HTML string. In the browser uses DOMPurify 3.
   * On the server (no DOM) the input is HTML-escaped — never unsafe-stripped.
   */
  html(input: string, opts?: SanitizeOptions): string {
    if (!input) return ''
    if (typeof window === 'undefined') return escapeText(input)
    return purify(input, opts)
  },

  /**
   * Safely set HTML on an element. Uses the browser's built-in Sanitizer API
   * (`el.setHTML`) when available, otherwise DOMPurify.
   */
  safeSetHTML(el: Element, input: string, opts?: SanitizeOptions) {
    if (typeof window === 'undefined') return
    if (hasNativeSetHTML() && !opts) {
      ;(el as any).setHTML(input)
      return
    }
    el.innerHTML = purify(input, opts)
  },

  /** Is the native Sanitizer API available here? */
  hasNativeSanitizer: hasNativeSetHTML,

  /** Keep only http(s), mailto and relative URLs. Returns '' for anything else (javascript:, data:, ...). */
  url(input: string): string {
    try {
      const trimmed = String(input).trim()
      const parsed = new URL(trimmed, 'http://localhost')
      return ['http:', 'https:', 'mailto:'].includes(parsed.protocol.toLowerCase()) ? trimmed : ''
    } catch (e) {
      return ''
    }
  },

  /** Escape HTML special characters */
  text: escapeText
}
