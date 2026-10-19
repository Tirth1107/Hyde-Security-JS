import { randomBytes, toBase64 } from '../core/encoding'
import { createReporter } from '../core/events'

export interface CSPDirectives {
  defaultSrc?: string[]
  scriptSrc?: string[]
  scriptSrcElem?: string[]
  scriptSrcAttr?: string[]
  styleSrc?: string[]
  imgSrc?: string[]
  connectSrc?: string[]
  fontSrc?: string[]
  objectSrc?: string[]
  mediaSrc?: string[]
  frameSrc?: string[]
  workerSrc?: string[]
  manifestSrc?: string[]
  childSrc?: string[]
  frameAncestors?: string[]
  formAction?: string[]
  baseUri?: string[]
  requireTrustedTypesFor?: string[]
  trustedTypes?: string[]
  upgradeInsecureRequests?: boolean
  reportUri?: string
  reportTo?: string
}

const MAP: Record<keyof CSPDirectives, string> = {
  defaultSrc: 'default-src',
  scriptSrc: 'script-src',
  scriptSrcElem: 'script-src-elem',
  scriptSrcAttr: 'script-src-attr',
  styleSrc: 'style-src',
  imgSrc: 'img-src',
  connectSrc: 'connect-src',
  fontSrc: 'font-src',
  objectSrc: 'object-src',
  mediaSrc: 'media-src',
  frameSrc: 'frame-src',
  workerSrc: 'worker-src',
  manifestSrc: 'manifest-src',
  childSrc: 'child-src',
  frameAncestors: 'frame-ancestors',
  formAction: 'form-action',
  baseUri: 'base-uri',
  requireTrustedTypesFor: 'require-trusted-types-for',
  trustedTypes: 'trusted-types',
  upgradeInsecureRequests: 'upgrade-insecure-requests',
  reportUri: 'report-uri',
  reportTo: 'report-to'
}

// Not allowed in <meta> CSP (header only)
const HEADER_ONLY = new Set(['frame-ancestors', 'report-uri', 'report-to', 'sandbox'])

const reporter = createReporter('contentSecurityPolicy', 'warning')

export const contentSecurityPolicy = {
  build(directives: CSPDirectives): string {
    const parts: string[] = []
    for (const [key, prop] of Object.entries(MAP)) {
      const val = directives[key as keyof CSPDirectives]
      if (val === true) parts.push(prop)
      else if (Array.isArray(val) && val.length > 0) parts.push(`${prop} ${val.join(' ')}`)
      else if (typeof val === 'string' && val) parts.push(`${prop} ${val}`)
    }
    return parts.join('; ')
  },

  /** A fresh random nonce for 'nonce-...' sources (generate one per page load / response) */
  generateNonce(bytes = 16): string {
    return toBase64(randomBytes(bytes))
  },

  /**
   * Google's recommended "strict CSP": nonce + 'strict-dynamic', no host allowlists,
   * plus Trusted Types. Send it as a response header from your server.
   */
  strict(nonce: string, opts: { trustedTypes?: boolean; reportUri?: string } = {}): CSPDirectives {
    return {
      scriptSrc: [`'nonce-${nonce}'`, "'strict-dynamic'", 'https:', "'unsafe-inline'"], // fallbacks ignored by modern browsers
      objectSrc: ["'none'"],
      baseUri: ["'none'"],
      frameAncestors: ["'self'"],
      ...(opts.trustedTypes !== false ? { requireTrustedTypesFor: ["'script'"] } : {}),
      ...(opts.reportUri ? { reportUri: opts.reportUri } : {})
    }
  },

  /**
   * Add a <meta> CSP. Header-only directives (frame-ancestors, report-uri...)
   * are dropped because browsers ignore them in meta tags.
   */
  inject(directives: CSPDirectives): () => void {
    if (typeof document === 'undefined') return () => {}
    const csp = this.build(directives)
      .split('; ')
      .filter(p => !HEADER_ONLY.has(p.split(' ')[0]))
      .join('; ')
    const meta = document.createElement('meta')
    meta.httpEquiv = 'Content-Security-Policy'
    meta.content = csp
    document.head.appendChild(meta)
    return () => meta.remove()
  },

  /** Listen for CSP violations; they are also reported as threats */
  onViolation(callback?: (event: SecurityPolicyViolationEvent) => void): () => void {
    if (typeof document === 'undefined') return () => {}
    const handler = (e: SecurityPolicyViolationEvent) => {
      reporter.report('csp_violation', {
        directive: e.effectiveDirective || e.violatedDirective,
        blockedURI: e.blockedURI,
        sourceFile: e.sourceFile,
        line: e.lineNumber,
        disposition: e.disposition
      })
      callback?.(e)
    }
    document.addEventListener('securitypolicyviolation', handler)
    return () => document.removeEventListener('securitypolicyviolation', handler)
  },

  getDefaults(): CSPDirectives {
    return {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: true
    }
  },

  /** Parse a CSP string into a map of directive -> sources */
  parse(policy: string): Record<string, string[]> {
    const out: Record<string, string[]> = {}
    for (const part of policy.split(';')) {
      const [name, ...values] = part.trim().split(/\s+/)
      if (name) out[name.toLowerCase()] = values
    }
    return out
  }
}
