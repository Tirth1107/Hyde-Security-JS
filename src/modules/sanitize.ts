import DOMPurify from 'dompurify'

/** Sanitize user-generated HTML and provide safe-set helpers */
export const sanitize = {
  html(input: string) {
    return DOMPurify.sanitize(input, { ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^\w:]|$))/i })
  },
  safeSetHTML(el: Element, html: string) {
    if (!el) return
    el.innerHTML = sanitize.html(html)
  }
}
