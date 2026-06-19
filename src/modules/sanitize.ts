import DOMPurify from 'dompurify'

export const sanitize = {
  html(input: string): string {
    if (typeof window === 'undefined') {
      // Basic SSR fallback
      return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    }
    return DOMPurify.sanitize(input)
  },

  safeSetHTML(el: HTMLElement, input: string) {
    if (typeof window === 'undefined') return
    el.innerHTML = DOMPurify.sanitize(input)
  },

  url(input: string): string {
    try {
      const parsed = new URL(input, 'http://localhost')
      const protocol = parsed.protocol.toLowerCase()
      if (['http:', 'https:', 'mailto:'].includes(protocol)) {
        return input
      }
      return ''
    } catch (e) {
      // Invalid URL
      return ''
    }
  },

  text(input: string): string {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }
}
