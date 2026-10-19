/**
 * phishingGuard
 *
 *  - Clone detection: phishing kits copy your site, scripts included. If your
 *    code runs on a host you didn't list, it reports (and can beacon home), so
 *    you hear about the phishing site before your users do.
 *  - Lookalike check: is a hostname a typo/homoglyph of your domain?
 *  - Credential forms: password/card forms that submit to another origin
 *    (injected login overlays) are reported and, in enforce mode, blocked.
 *  - Browser-in-the-Browser: fixed overlays that mimic a popup window with a
 *    fake address bar and a login form.
 *  - Reverse tabnabbing: adds rel="noopener noreferrer" to target=_blank links.
 */
import { createReporter, ThreatListener } from '../core/events'
import { isAllowedUrl, hostMatches } from '../core/callsite'

export interface PhishingGuardOptions {
  /** Hosts this site legitimately runs on (e.g. ['myapp.com', '*.myapp.com', 'localhost']) */
  expectedHosts?: string[]
  /** Absolute URL to send a beacon to when a clone is detected */
  cloneBeaconUrl?: string
  /** Hosts credential forms may submit to. Same-origin always allowed. */
  allowedFormActions?: string[]
  /** 'report' (default) or 'enforce' (block foreign credential submits) */
  mode?: 'report' | 'enforce'
  /** Add rel=noopener to target=_blank links (default true) */
  fixTabnabbing?: boolean
  /** Watch for fake browser-window overlays (default true) */
  detectBitB?: boolean
  onThreat?: ThreatListener
}

const reporter = createReporter('phishingGuard', 'critical')
let observer: MutationObserver | null = null
let cleanups: Array<() => void> = []
const CREDENTIAL = 'input[type="password"], input[autocomplete^="cc-"], input[autocomplete="current-password"], input[autocomplete="one-time-code"]'
const IDP_HOSTS = /\b(accounts\.google\.com|login\.microsoftonline\.com|login\.live\.com|appleid\.apple\.com|www\.facebook\.com|github\.com\/login|login\.okta\.com|auth0\.com|signin\.aws\.amazon\.com)\b/i

// Common homoglyphs mapped to the ASCII letter they imitate
const CONFUSABLES: Record<string, string> = {
  'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'х': 'x', 'у': 'y', 'і': 'i', 'ј': 'j', 'ԁ': 'd', 'ɡ': 'g', 'ո': 'n', 'ս': 'u',
  '0': 'o', '1': 'l', '3': 'e', '5': 's', '7': 't', '@': 'a', 'ı': 'i', 'ǀ': 'l', 'ⅼ': 'l', 'ｍ': 'm', 'ʀ': 'r'
}

function skeleton(host: string): string {
  return host.toLowerCase().normalize('NFKC').split('').map(ch => CONFUSABLES[ch] ?? ch).join('')
    .replace(/rn/g, 'm').replace(/vv/g, 'w').replace(/cl/g, 'd')
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j]
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = tmp
    }
  }
  return dp[b.length]
}

/** Registrable-ish label: 'login.my-app.co.uk' -> 'my-app' */
function mainLabel(host: string): string {
  const parts = host.toLowerCase().replace(/^www\./, '').split('.')
  if (parts.length >= 3 && parts[parts.length - 2].length <= 3) return parts[parts.length - 3]
  return parts.length >= 2 ? parts[parts.length - 2] : parts[0]
}

export interface LookalikeResult {
  lookalike: boolean
  target: string | null
  reasons: string[]
}

export function checkLookalike(host: string, brands: string[]): LookalikeResult {
  const h = host.toLowerCase()
  for (const brand of brands) {
    const b = brand.toLowerCase().replace(/^\*\./, '')
    if (h === b || h.endsWith(`.${b}`)) return { lookalike: false, target: null, reasons: [] }
  }
  const reasons: string[] = []
  for (const brand of brands) {
    const b = brand.toLowerCase().replace(/^\*\./, '')
    const bl = mainLabel(b)
    const hl = mainLabel(h)
    if (h.startsWith('xn--') || h.includes('.xn--')) reasons.push('punycode')
    if (skeleton(hl) === skeleton(bl) && hl !== bl) reasons.push('homoglyph')
    const d = levenshtein(hl, bl)
    if (d > 0 && d <= (bl.length > 6 ? 2 : 1)) reasons.push(`edit-distance-${d}`)
    if (hl !== bl && (hl.includes(bl) || h.split('.').includes(bl))) reasons.push('contains-brand')
    // 'paypa1-secure' -> check each part: 'paypa1' vs 'paypal'
    for (const part of hl.split(/[-_]/)) {
      if (part === hl || part.length < 3) continue
      if (part !== bl && skeleton(part) === skeleton(bl)) reasons.push('homoglyph-in-part')
      else if (part !== bl && levenshtein(part, bl) <= (bl.length > 6 ? 2 : 1)) reasons.push('typo-in-part')
      else if (part === bl) reasons.push('contains-brand')
    }
    if (hl !== bl && skeleton(hl).includes(skeleton(bl)) && !reasons.length) reasons.push('homoglyph-in-part')
    if (reasons.length) return { lookalike: true, target: b, reasons: Array.from(new Set(reasons)) }
  }
  return { lookalike: false, target: null, reasons: [] }
}

function fixLink(a: HTMLAnchorElement) {
  if (a.target !== '_blank') return
  const rel = new Set((a.getAttribute('rel') || '').split(/\s+/).filter(Boolean))
  if (rel.has('noopener') && rel.has('noreferrer')) return
  // Only same-origin links keep opener access if they explicitly ask for it
  if (rel.has('opener')) return
  rel.add('noopener')
  rel.add('noreferrer')
  a.setAttribute('rel', Array.from(rel).join(' '))
}

function looksLikeBitB(el: Element): string[] {
  if (!(el instanceof HTMLElement)) return []
  const st = getComputedStyle(el)
  const signals: string[] = []
  if (st.position !== 'fixed' && st.position !== 'absolute') return []
  if ((parseInt(st.zIndex) || 0) >= 1000) signals.push('high-z-index')
  const text = el.textContent || ''
  if (/https:\/\/[a-z0-9.-]+\.[a-z]{2,}/i.test(text)) signals.push('fake-address-bar')
  if (IDP_HOSTS.test(text)) signals.push('identity-provider-url')
  if (/\b(sign in with|log ?in with|continue with)\s+(google|microsoft|apple|facebook|github)\b/i.test(text)) signals.push('sso-wording')
  if (el.querySelector(CREDENTIAL)) signals.push('credential-field')
  const frame = el.querySelector('iframe')
  if (frame) {
    signals.push('iframe')
    const src = frame.getAttribute('src') || ''
    const shown = text.match(/https:\/\/([a-z0-9.-]+)/i)?.[1]
    try {
      if (shown && src && new URL(src, location.href).hostname !== shown) signals.push('url-mismatch')
    } catch (e) { }
  }
  // Need the address-bar look plus a way to collect credentials
  const strong = signals.includes('fake-address-bar') || signals.includes('identity-provider-url')
  const collects = signals.includes('credential-field') || signals.includes('iframe')
  return strong && collects ? signals : []
}

export const phishingGuard = {
  checkLookalike,

  /** Is this page running on a host you didn't expect? */
  checkClone(expectedHosts: string[], host = typeof location !== 'undefined' ? location.hostname : ''): boolean {
    if (!host || !expectedHosts.length) return false
    const fake = new URL(`https://${host}`)
    return !expectedHosts.some(e => hostMatches(fake, e))
  },

  enable(options: PhishingGuardOptions = {}) {
    if (typeof document === 'undefined') return () => {}
    this.disable()
    reporter.setCallback(options.onThreat)
    const enforce = options.mode === 'enforce'
    const allowActions = options.allowedFormActions ?? []

    // 1. Clone detection
    if (options.expectedHosts?.length && this.checkClone(options.expectedHosts)) {
      const look = checkLookalike(location.hostname, options.expectedHosts)
      reporter.report('site_clone_detected', { host: location.hostname, href: location.href, lookalike: look })
      if (options.cloneBeaconUrl) {
        const body = JSON.stringify({ type: 'site_clone_detected', host: location.hostname, href: location.href, referrer: document.referrer, at: Date.now() })
        try {
          if (!navigator.sendBeacon?.(options.cloneBeaconUrl, body)) {
            fetch(options.cloneBeaconUrl, { method: 'POST', body, keepalive: true, mode: 'no-cors' }).catch(() => {})
          }
        } catch (e) { }
      }
    }

    // 2. Credential forms submitting elsewhere
    const foreignAction = (form: HTMLFormElement) => {
      if (!form.querySelector(CREDENTIAL)) return false
      const action = form.getAttribute('action')
      return !!action && !isAllowedUrl(action, allowActions)
    }
    const onSubmit = (e: Event) => {
      const form = e.target as HTMLFormElement
      if (!(form instanceof HTMLFormElement) || !foreignAction(form)) return
      reporter.report('credential_form_foreign_submit', { action: form.getAttribute('action'), blocked: enforce })
      if (enforce) {
        e.preventDefault()
        e.stopImmediatePropagation()
      }
    }
    document.addEventListener('submit', onSubmit, true)
    cleanups.push(() => document.removeEventListener('submit', onSubmit, true))

    // 3. Reverse tabnabbing
    if (options.fixTabnabbing !== false) document.querySelectorAll('a[target="_blank"]').forEach(a => fixLink(a as HTMLAnchorElement))

    // 4. Watch new content
    const inspect = (el: Element) => {
      if (options.fixTabnabbing !== false) {
        if (el instanceof HTMLAnchorElement) fixLink(el)
        el.querySelectorAll?.('a[target="_blank"]').forEach(a => fixLink(a as HTMLAnchorElement))
      }
      const forms = el instanceof HTMLFormElement ? [el] : Array.from(el.querySelectorAll?.('form') ?? [])
      forms.forEach(f => {
        if (foreignAction(f as HTMLFormElement)) reporter.report('credential_form_injected', { action: (f as HTMLFormElement).getAttribute('action') }, 'warning')
      })
      if (options.detectBitB !== false) {
        const signals = looksLikeBitB(el)
        if (signals.length) reporter.report('browser_in_browser_overlay', { signals, text: (el.textContent || '').slice(0, 120) })
      }
    }
    observer = new MutationObserver(muts => {
      for (const m of muts) m.addedNodes.forEach(n => { if (n instanceof Element) inspect(n) })
    })
    observer.observe(document.documentElement, { childList: true, subtree: true })

    return () => this.disable()
  },

  disable() {
    observer?.disconnect()
    observer = null
    cleanups.forEach(fn => fn())
    cleanups = []
  }
}
