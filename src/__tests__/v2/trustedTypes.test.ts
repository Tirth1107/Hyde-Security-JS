import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { trustedTypes } from '../../modules/trustedTypes'
import { contentSecurityPolicy } from '../../modules/contentSecurityPolicy'
import { events } from '../../core/events'

describe('trustedTypes', () => {
  let created: Record<string, any> = {}
  beforeEach(() => {
    events.reset()
    created = {}
    ;(window as any).trustedTypes = {
      createPolicy: (name: string, rules: any) => (created[name] = rules),
      get defaultPolicy() { return created.default ?? null }
    }
  })
  afterEach(() => {
    delete (window as any).trustedTypes
  })

  it('policy sanitizes HTML, checks script URLs and refuses string code', () => {
    const p = trustedTypes.createPolicy({ name: 'test-policy', scriptHosts: ['cdn.ok.com'] })
    expect(p.createHTML('<img src=x onerror=alert(1)><b>hi</b>')).toBe('<img src="x"><b>hi</b>')
    expect(p.createScriptURL('https://cdn.ok.com/a.js')).toBe('https://cdn.ok.com/a.js')
    expect(() => p.createScriptURL('https://evil.io/a.js')).toThrow()
    expect(() => p.createScript('alert(1)')).toThrow()
  })

  it('installs a default policy once', () => {
    expect(trustedTypes.enableDefaultPolicy()).toBe(true)
    expect(created.default).toBeDefined()
    expect(trustedTypes.enableDefaultPolicy()).toBe(true)
  })

  it('is safe where Trusted Types is unsupported', () => {
    delete (window as any).trustedTypes
    expect(trustedTypes.isSupported()).toBe(false)
    expect(trustedTypes.enableDefaultPolicy()).toBe(false)
    const p = trustedTypes.createPolicy({ name: 'fallback-policy' })
    expect(p.createHTML('<script>x</script>ok')).toBe('ok')
  })

  it('builds CSP with Trusted Types and a strict nonce policy', () => {
    const nonce = contentSecurityPolicy.generateNonce()
    expect(nonce).toMatch(/^[A-Za-z0-9+/]{22}==$/)
    const csp = contentSecurityPolicy.build({ ...contentSecurityPolicy.strict(nonce), ...trustedTypes.cspDirectives() })
    expect(csp).toContain(`script-src 'nonce-${nonce}' 'strict-dynamic'`)
    expect(csp).toContain("require-trusted-types-for 'script'")
    expect(csp).toContain("trusted-types hyde default 'allow-duplicates'")
    expect(contentSecurityPolicy.parse(csp)['object-src']).toEqual(["'none'"])
  })

  it('meta injection drops header-only directives', () => {
    const remove = contentSecurityPolicy.inject({ defaultSrc: ["'self'"], frameAncestors: ["'none'"], upgradeInsecureRequests: true })
    const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]')!
    expect(meta.getAttribute('content')).toBe("default-src 'self'; upgrade-insecure-requests")
    remove()
  })

  it('reports CSP violations as threats', () => {
    const seen = vi.fn()
    events.on('csp_violation', seen)
    const off = contentSecurityPolicy.onViolation()
    const ev: any = new Event('securitypolicyviolation')
    Object.assign(ev, { effectiveDirective: 'script-src', blockedURI: 'https://evil.io/x.js' })
    document.dispatchEvent(ev)
    expect(seen.mock.calls[0][0].details).toMatchObject({ directive: 'script-src', blockedURI: 'https://evil.io/x.js' })
    off()
  })
})
