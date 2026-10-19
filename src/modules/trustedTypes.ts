/**
 * Trusted Types (Baseline since Feb 2026: Chrome/Edge 83+, Safari 26, Firefox 148).
 *
 * With CSP `require-trusted-types-for 'script'`, the browser refuses plain
 * strings at DOM XSS sinks (innerHTML, script.src, eval...). That kills DOM XSS
 * as a class — but breaks code that still assigns strings. The *default*
 * policy here fixes that: strings going into HTML sinks are sanitized,
 * script URLs are checked against an allowlist, and string-to-code is refused.
 */
import { createReporter, ThreatListener } from '../core/events'
import { isAllowedUrl } from '../core/callsite'
import { sanitize, SanitizeOptions } from './sanitize'

export interface TrustedTypesOptions {
  /** Hosts allowed for script URLs. Same-origin always allowed. */
  scriptHosts?: string[]
  /** Allow string-to-code sinks (eval, new Function, setTimeout(string)). Default false. */
  allowStringCode?: boolean
  /** Options for HTML sanitizing */
  sanitize?: SanitizeOptions
  /** Policy name for createPolicy() (default 'hyde') */
  name?: string
  onThreat?: ThreatListener
}

const reporter = createReporter('trustedTypes', 'critical')
const policies = new Map<string, any>()
// Set when the browser routes a string through our default policy (proves enforcement)
let probing = false
let probeHit = false

function tt(): any {
  return typeof window !== 'undefined' ? (window as any).trustedTypes : undefined
}

function rules(opts: TrustedTypesOptions) {
  return {
    createHTML: (input: string, sink?: string) => {
      if (probing) {
        probeHit = true
        return input
      }
      const clean = sanitize.html(input, opts.sanitize)
      if (clean !== input && input.length) {
        reporter.report('tt_html_sanitized', { sink, removedChars: input.length - clean.length }, 'warning')
      }
      return clean
    },
    createScriptURL: (input: string, sink?: string) => {
      if (isAllowedUrl(input, opts.scriptHosts ?? [])) return input
      reporter.report('tt_script_url_blocked', { url: input, sink })
      throw new TypeError(`[HydeSecurity] Trusted Types blocked script URL: ${input}`)
    },
    createScript: (input: string, sink?: string) => {
      if (opts.allowStringCode) return input
      reporter.report('tt_string_code_blocked', { sink, preview: input.slice(0, 80) })
      throw new TypeError('[HydeSecurity] Trusted Types blocked string-to-code')
    }
  }
}

export const trustedTypes = {
  isSupported(): boolean {
    return !!tt()?.createPolicy
  },

  /** Is CSP actually enforcing Trusted Types on this page? */
  isEnforced(): boolean {
    if (!this.isSupported() || typeof document === 'undefined') return false
    const el = document.createElement('div')
    probing = true
    probeHit = false
    try {
      el.innerHTML = '<b></b>'
      // Assignment worked: enforced only if it went through our default policy
      return probeHit
    } catch (e) {
      // Enforced and no default policy: string assignment throws
      return true
    } finally {
      probing = false
    }
  },

  /**
   * Create a named policy for your own code:
   * `const p = trustedTypes.createPolicy(); el.innerHTML = p.createHTML(userHtml)`
   * Falls back to plain functions where Trusted Types isn't supported.
   */
  createPolicy(opts: TrustedTypesOptions = {}) {
    const name = opts.name ?? 'hyde'
    reporter.setCallback(opts.onThreat)
    if (policies.has(name)) return policies.get(name)
    const r = rules(opts)
    const policy = this.isSupported() ? tt().createPolicy(name, r) : r
    policies.set(name, policy)
    return policy
  },

  /**
   * Install the 'default' policy. Browsers call it for any plain string that
   * reaches a sink once Trusted Types are enforced. Can only be created once per page.
   */
  enableDefaultPolicy(opts: TrustedTypesOptions = {}): boolean {
    reporter.setCallback(opts.onThreat)
    if (!this.isSupported()) return false
    if (policies.has('default') || tt().defaultPolicy) return true
    try {
      policies.set('default', tt().createPolicy('default', rules(opts)))
      return true
    } catch (e) {
      // Blocked by CSP `trusted-types` directive not listing 'default'
      reporter.report('tt_default_policy_failed', { error: String(e) }, 'warning')
      return false
    }
  },

  /** CSP directives to enforce Trusted Types with these policies */
  cspDirectives(policyNames: string[] = ['hyde', 'default']): { requireTrustedTypesFor: string[]; trustedTypes: string[] } {
    return { requireTrustedTypesFor: ["'script'"], trustedTypes: [...policyNames, "'allow-duplicates'"] }
  }
}
