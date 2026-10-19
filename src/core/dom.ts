/**
 * Clobbering-proof DOM access.
 *
 * `<form name="cookie">` makes `document.cookie` an element, `<img name="scripts">`
 * replaces `document.scripts`. Security code must not trust those properties, so
 * these helpers call the original prototype getters/methods directly.
 */
const hasDoc = typeof Document !== 'undefined'
const cookieGetter = hasDoc ? Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')?.get : undefined
const qsa = hasDoc ? Document.prototype.querySelectorAll : undefined

export const safeDom = {
  /** document.cookie, even if an element shadows it */
  cookie(): string {
    try {
      const v = cookieGetter ? cookieGetter.call(document) : document.cookie
      return typeof v === 'string' ? v : ''
    } catch (e) {
      return ''
    }
  },

  /** document.querySelectorAll, even if an element shadows it */
  all<E extends Element = Element>(selector: string): E[] {
    if (typeof document === 'undefined') return []
    const fn = qsa ?? document.querySelectorAll
    return Array.from(fn.call(document, selector) as NodeListOf<E>)
  },

  /**
   * True if `document[name]` no longer returns what the built-in property would
   * (an element with that id/name is shadowing it).
   */
  isClobbered(name: string): boolean {
    if (typeof document === 'undefined') return false
    let proto: object | null = Object.getPrototypeOf(document)
    while (proto) {
      const desc = Object.getOwnPropertyDescriptor(proto, name)
      if (desc) {
        try {
          const pristine = desc.get ? desc.get.call(document) : desc.value
          return (document as any)[name] !== pristine
        } catch (e) {
          return false
        }
      }
      proto = Object.getPrototypeOf(proto)
    }
    return false
  }
}
