/**
 * Call-site attribution: which script URLs are on the current call stack.
 *
 * Used by skimmerGuard / scriptGuard to tell first-party code from a third-party
 * script reading a card field. Stack formats differ between engines; we only
 * pull out URLs, which every engine includes.
 */

const URL_IN_STACK = /((?:https?|blob|chrome-extension|moz-extension|safari-web-extension|webkit-masked-url):\/\/[^\s)'"]+?)(?::\d+){1,2}(?=\)|\s|$)/g

/** Extension schemes: code injected by browser extensions */
export const EXTENSION_SCHEMES = ['chrome-extension:', 'moz-extension:', 'safari-web-extension:', 'webkit-masked-url:']

/** Script URLs found in a stack string, in call order (innermost first) */
export function urlsFromStack(stack: string | undefined): string[] {
  if (!stack) return []
  const out: string[] = []
  let m: RegExpExecArray | null
  URL_IN_STACK.lastIndex = 0
  while ((m = URL_IN_STACK.exec(stack))) {
    if (out[out.length - 1] !== m[1]) out.push(m[1])
  }
  return out
}

/**
 * Reads script URLs on the current call stack. An object so tests (or apps with
 * unusual stack formats) can replace `current`.
 */
export const stackInspector = {
  current(): string[] {
    return urlsFromStack(new Error().stack)
  }
}

/** Script URLs on the current call stack */
export function currentStackUrls(): string[] {
  return stackInspector.current()
}

export function originOf(url: string): string | null {
  try {
    const u = new URL(url)
    if (EXTENSION_SCHEMES.includes(u.protocol)) return `${u.protocol}//${u.host}`
    return u.origin
  } catch (e) {
    return null
  }
}

export function isExtensionUrl(url: string) {
  return EXTENSION_SCHEMES.some(s => url.startsWith(s))
}

/**
 * Does a hostname match an allowlist entry?
 * Entries can be an origin ('https://cdn.x.com'), a host ('cdn.x.com'),
 * or a wildcard ('*.x.com', which also matches 'x.com').
 */
export function hostMatches(url: URL, entry: string): boolean {
  if (entry.includes('://')) {
    try {
      return new URL(entry).origin === url.origin
    } catch (e) {
      return false
    }
  }
  const host = url.hostname.toLowerCase()
  const e = entry.toLowerCase()
  if (e.startsWith('*.')) {
    const base = e.slice(2)
    return host === base || host.endsWith(`.${base}`)
  }
  return host === e || host.endsWith(`.${e}`)
}

export function isAllowedUrl(urlStr: string, allow: string[], base?: string): boolean {
  try {
    const url = new URL(urlStr, base ?? (typeof location !== 'undefined' ? location.href : undefined))
    if (typeof location !== 'undefined' && url.origin === location.origin) return true
    return allow.some(e => hostMatches(url, e))
  } catch (e) {
    return false
  }
}

/**
 * Third-party script URLs on the stack: anything not same-origin and not in `trusted`.
 */
export function foreignCallers(trusted: string[] = []): string[] {
  return currentStackUrls().filter(u => !isAllowedUrl(u, trusted))
}
