/**
 * securityAudit — grade the page's security posture from inside the browser.
 *
 * `await securityAudit.run()` returns a 0–100 score, a letter grade and a list
 * of findings with fixes. It fetches the page's own response headers
 * (same-origin HEAD request) and inspects the live DOM, cookies and storage.
 * Great in dev/CI; in production run it on demand.
 */
import { contentSecurityPolicy } from './contentSecurityPolicy'
import { safeDom } from '../core/dom'

export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info'

export interface AuditFinding {
  id: string
  severity: FindingSeverity
  title: string
  detail?: string
  fix: string
}

export interface AuditResult {
  score: number
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
  findings: AuditFinding[]
  passed: string[]
  headers: Record<string, string>
  url: string
  timestamp: number
}

export interface AuditOptions {
  /** Fetch response headers of the current page (default true) */
  fetchHeaders?: boolean
  /** Supply headers yourself (e.g. from a server test) */
  headers?: Record<string, string>
  /** Skip checks by id */
  skip?: string[]
}

const WEIGHT: Record<FindingSeverity, number> = { critical: 25, high: 12, medium: 6, low: 2, info: 0 }
const SESSIONISH = /(sess|sid|token|auth|jwt|login|remember|access|refresh)/i
const JWT = /^eyJ[A-Za-z0-9_-]{5,}\.eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]*$/

async function getHeaders(): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  try {
    const res = await fetch(location.href, { method: 'HEAD', cache: 'no-store', credentials: 'same-origin' })
    res.headers.forEach((v, k) => (out[k.toLowerCase()] = v))
  } catch (e) { }
  return out
}

function gradeFor(score: number): AuditResult['grade'] {
  if (score >= 95) return 'A+'
  if (score >= 85) return 'A'
  if (score >= 75) return 'B'
  if (score >= 65) return 'C'
  if (score >= 55) return 'D'
  if (score >= 45) return 'E'
  return 'F'
}

export const securityAudit = {
  async run(opts: AuditOptions = {}): Promise<AuditResult> {
    const findings: AuditFinding[] = []
    const passed: string[] = []
    const skip = new Set(opts.skip ?? [])
    const check = (id: string, ok: boolean, f: Omit<AuditFinding, 'id'>) => {
      if (skip.has(id)) return
      if (ok) passed.push(id)
      else findings.push({ id, ...f })
    }

    const headers = opts.headers
      ? Object.fromEntries(Object.entries(opts.headers).map(([k, v]) => [k.toLowerCase(), v]))
      : opts.fetchHeaders === false ? {} : await getHeaders()
    const https = location.protocol === 'https:'
    const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)

    // Transport
    check('https', https || local, {
      severity: 'critical', title: 'Page is not served over HTTPS',
      fix: 'Serve every page over HTTPS and redirect HTTP to HTTPS.'
    })
    const hsts = headers['strict-transport-security'] || ''
    const maxAge = Number(hsts.match(/max-age=(\d+)/i)?.[1] ?? 0)
    if (https) {
      check('hsts', maxAge >= 15552000, {
        severity: 'high', title: hsts ? 'HSTS max-age is under 180 days' : 'Missing Strict-Transport-Security',
        detail: hsts || undefined,
        fix: 'Send `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`.'
      })
    }

    // CSP
    const metaCsp = document.querySelector('meta[http-equiv="Content-Security-Policy" i]')?.getAttribute('content') || ''
    const cspStr = headers['content-security-policy'] || metaCsp
    const csp = contentSecurityPolicy.parse(cspStr)
    const scriptSrc = csp['script-src'] ?? csp['default-src'] ?? []
    check('csp-present', !!cspStr, {
      severity: 'high', title: 'No Content Security Policy',
      fix: 'Add a strict CSP header — `contentSecurityPolicy.strict(nonce)` builds one.'
    })
    if (cspStr) {
      const hasNonceOrHash = scriptSrc.some(s => /^'(nonce|sha(256|384|512))-/.test(s))
      check('csp-unsafe-inline', !scriptSrc.includes("'unsafe-inline'") || hasNonceOrHash, {
        severity: 'high', title: "CSP allows 'unsafe-inline' scripts", detail: `script-src ${scriptSrc.join(' ')}`,
        fix: "Use nonces or hashes instead of 'unsafe-inline'."
      })
      check('csp-unsafe-eval', !scriptSrc.includes("'unsafe-eval'"), {
        severity: 'medium', title: "CSP allows 'unsafe-eval'", fix: "Remove 'unsafe-eval'; avoid eval/new Function."
      })
      check('csp-wildcard', !scriptSrc.some(s => s === '*' || s === 'https:' || s === 'http:') || scriptSrc.includes("'strict-dynamic'"), {
        severity: 'high', title: 'CSP script-src allows any host', fix: "Use 'nonce-…' + 'strict-dynamic' instead of host wildcards."
      })
      check('csp-object-src', (csp['object-src'] ?? csp['default-src'] ?? []).includes("'none'"), {
        severity: 'medium', title: "CSP missing object-src 'none'", fix: "Add `object-src 'none'`."
      })
      check('csp-base-uri', !!csp['base-uri'], {
        severity: 'medium', title: 'CSP missing base-uri', fix: "Add `base-uri 'none'` (or 'self') to stop <base> injection."
      })
      check('trusted-types', !!csp['require-trusted-types-for'], {
        severity: 'low', title: 'Trusted Types not enforced',
        fix: "Add `require-trusted-types-for 'script'` and `trustedTypes.enableDefaultPolicy()`. Baseline in all browsers since 2026."
      })
    }

    // Framing
    const xfo = headers['x-frame-options']
    check('framing', !!xfo || !!csp['frame-ancestors'], {
      severity: 'medium', title: 'Page can be framed by any site (clickjacking)',
      fix: "Send `Content-Security-Policy: frame-ancestors 'self'` (or X-Frame-Options: DENY)."
    })

    // Other headers
    if (Object.keys(headers).length) {
      check('nosniff', (headers['x-content-type-options'] || '').toLowerCase() === 'nosniff', {
        severity: 'low', title: 'Missing X-Content-Type-Options: nosniff', fix: 'Send `X-Content-Type-Options: nosniff`.'
      })
      check('referrer-policy', !!headers['referrer-policy'] && !/unsafe-url|no-referrer-when-downgrade/i.test(headers['referrer-policy']), {
        severity: 'low', title: 'Weak or missing Referrer-Policy', fix: 'Send `Referrer-Policy: strict-origin-when-cross-origin`.'
      })
      check('permissions-policy', !!headers['permissions-policy'], {
        severity: 'low', title: 'No Permissions-Policy', fix: 'Send `Permissions-Policy: camera=(), microphone=(), geolocation=()` (allow only what you use).'
      })
      check('coop', !!headers['cross-origin-opener-policy'], {
        severity: 'low', title: 'No Cross-Origin-Opener-Policy',
        fix: 'Send `Cross-Origin-Opener-Policy: same-origin` (or same-origin-allow-popups for OAuth popups).'
      })
    }

    // Mixed content
    if (https) {
      const insecure = Array.from(document.querySelectorAll('script[src^="http:"], link[href^="http:"], iframe[src^="http:"], img[src^="http:"], form[action^="http:"]'))
      check('mixed-content', insecure.length === 0, {
        severity: 'high', title: `${insecure.length} resource(s) loaded over HTTP`,
        detail: insecure.slice(0, 5).map(e => e.getAttribute('src') || e.getAttribute('href') || e.getAttribute('action')).join(', '),
        fix: 'Load everything over HTTPS (or add `upgrade-insecure-requests` to CSP).'
      })
    }

    // Third-party scripts without SRI
    const noSri = Array.from(document.querySelectorAll('script[src]')).filter(s => {
      try {
        return new URL(s.getAttribute('src')!, location.href).origin !== location.origin && !s.hasAttribute('integrity')
      } catch (e) {
        return false
      }
    })
    check('sri', noSri.length === 0, {
      severity: 'medium', title: `${noSri.length} third-party script(s) without Subresource Integrity`,
      detail: noSri.slice(0, 5).map(s => s.getAttribute('src')).join(', '),
      fix: 'Add integrity="sha384-…" crossorigin="anonymous" to pinned third-party scripts, or monitor them with scriptGuard.'
    })

    // Inline handlers (block strict CSP adoption)
    const inlineHandlers = document.querySelectorAll('[onclick],[onload],[onerror],[onmouseover],[onsubmit],[onchange],[oninput],[onfocus]').length
    check('inline-handlers', inlineHandlers === 0, {
      severity: 'low', title: `${inlineHandlers} inline event handler attribute(s)`,
      fix: 'Move onclick=… handlers to addEventListener so a strict CSP can block inline script.'
    })

    // Credentials
    const pwOnHttp = !https && !local && document.querySelector('input[type="password"]')
    check('password-over-http', !pwOnHttp, {
      severity: 'critical', title: 'Password field on a non-HTTPS page', fix: 'Serve login pages over HTTPS only.'
    })
    const foreignCredForms = Array.from(document.querySelectorAll('form')).filter(f => {
      if (!f.querySelector('input[type="password"]')) return false
      const a = f.getAttribute('action')
      try {
        return !!a && new URL(a, location.href).origin !== location.origin
      } catch (e) {
        return false
      }
    })
    check('credential-form-origin', foreignCredForms.length === 0, {
      severity: 'medium', title: 'Password form submits to another origin',
      detail: foreignCredForms.map(f => f.getAttribute('action')).join(', '),
      fix: 'Make sure this is intended (SSO). Otherwise it may be an injected phishing form.'
    })
    const pwNoAutocomplete = document.querySelectorAll('input[type="password"]:not([autocomplete])').length
    check('password-autocomplete', pwNoAutocomplete === 0, {
      severity: 'info', title: 'Password inputs without autocomplete attribute',
      fix: 'Add autocomplete="current-password" / "new-password" so password managers work (and passkey autofill: "username webauthn").'
    })

    // JS-readable session cookies => missing HttpOnly
    const jsCookies = safeDom.cookie().split(';').map(c => c.trim().split('=')[0]).filter(Boolean)
    const readableSession = jsCookies.filter(n => SESSIONISH.test(n))
    check('httponly-cookies', readableSession.length === 0, {
      severity: 'high', title: 'Session-like cookies readable by JavaScript', detail: readableSession.join(', '),
      fix: 'Set HttpOnly; Secure; SameSite=Lax (or Strict) on session cookies so XSS cannot steal them.'
    })

    // Tokens in Web Storage
    const tokenKeys: string[] = []
    for (const store of [safeStorage('localStorage'), safeStorage('sessionStorage')]) {
      if (!store) continue
      for (let i = 0; i < store.length; i++) {
        const k = store.key(i)
        if (!k) continue
        const v = store.getItem(k) || ''
        if (JWT.test(v.replace(/^"|"$/g, '')) || (SESSIONISH.test(k) && v.length > 20 && !v.startsWith('hyde2.'))) tokenKeys.push(k)
      }
    }
    check('tokens-in-storage', tokenKeys.length === 0, {
      severity: 'medium', title: 'Auth tokens stored in Web Storage', detail: tokenKeys.join(', '),
      fix: 'Keep tokens in HttpOnly cookies, or encrypt them with storage.setEncrypted(). Any XSS can read localStorage.'
    })

    // Tabnabbing
    const unsafeBlank = document.querySelectorAll('a[target="_blank"]:not([rel~="noopener"]):not([rel~="noreferrer"])').length
    check('tabnabbing', unsafeBlank === 0, {
      severity: 'info', title: `${unsafeBlank} target=_blank link(s) without rel="noopener"`,
      fix: 'Add rel="noopener noreferrer" (phishingGuard does it automatically).'
    })

    // DOM clobbering of security-relevant document properties
    const clobbered = ['cookie', 'domain', 'scripts', 'forms', 'querySelector', 'querySelectorAll', 'getElementById', 'createElement', 'body', 'location']
      .filter(n => safeDom.isClobbered(n))
    check('dom-clobbering', clobbered.length === 0, {
      severity: 'high', title: 'Elements shadow document properties (DOM clobbering)', detail: clobbered.map(n => `document.${n}`).join(', '),
      fix: 'Rename the id/name attributes, and sanitize user HTML so it cannot set id/name (DOMPurify SANITIZE_NAMED_PROPS).'
    })

    // Framed right now?
    let framed = false
    try {
      framed = window.self !== window.top
    } catch (e) {
      framed = true
    }
    check('not-framed', !framed, {
      severity: 'info', title: 'Page is running inside a frame', fix: 'Expected only if you embed this page yourself.'
    })

    check('secure-context', window.isSecureContext || local, {
      severity: 'medium', title: 'Not a secure context', fix: 'Web Crypto, passkeys and more need HTTPS.'
    })

    const penalty = findings.reduce((n, f) => n + WEIGHT[f.severity], 0)
    const score = Math.max(0, 100 - penalty)
    const order: FindingSeverity[] = ['critical', 'high', 'medium', 'low', 'info']
    findings.sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity))
    return { score, grade: gradeFor(score), findings, passed, headers, url: location.href, timestamp: Date.now() }
  },

  /** Run and print a readable report to the console */
  async print(opts?: AuditOptions): Promise<AuditResult> {
    const r = await this.run(opts)
    console.groupCollapsed?.(`%c[HydeSecurity] Security grade ${r.grade} (${r.score}/100)`, 'font-weight:bold')
    if (r.findings.length) console.table?.(r.findings.map(f => ({ severity: f.severity, issue: f.title, fix: f.fix })))
    console.log(`Passed: ${r.passed.join(', ') || 'none'}`)
    console.groupEnd?.()
    return r
  }
}

function safeStorage(name: 'localStorage' | 'sessionStorage'): Storage | null {
  try {
    return (window as any)[name] ?? null
  } catch (e) {
    return null
  }
}
