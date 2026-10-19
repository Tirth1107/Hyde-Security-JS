import { describe, it, expect, beforeEach } from 'vitest'
import { securityAudit } from '../../modules/securityAudit'

const GOOD_HEADERS = {
  'Content-Security-Policy': "script-src 'nonce-abc' 'strict-dynamic'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'; require-trusted-types-for 'script'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=()',
  'Cross-Origin-Opener-Policy': 'same-origin'
}

describe('securityAudit', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    document.body.innerHTML = ''
    localStorage.clear()
    document.cookie.split(';').forEach(c => { document.cookie = c.split('=')[0] + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT' })
  })

  it('a hardened page scores high', async () => {
    const r = await securityAudit.run({ headers: GOOD_HEADERS })
    expect(r.grade).toMatch(/^A/)
    expect(r.findings.filter(f => f.severity !== 'info')).toEqual([])
  })

  it('finds common problems and sorts by severity', async () => {
    document.body.innerHTML = `
      <script src="https://cdn.other.com/lib.js"></script>
      <button onclick="go()">x</button>
      <a href="https://x.com" target="_blank">x</a>
      <form action="https://evil.io/login"><input type="password"></form>`
    document.cookie = 'session_id=abc123'
    localStorage.setItem('access_token', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig')
    const r = await securityAudit.run({ headers: {} , fetchHeaders: false })
    const ids = r.findings.map(f => f.id)
    expect(ids).toEqual(expect.arrayContaining(['csp-present', 'framing', 'sri', 'inline-handlers', 'credential-form-origin', 'httponly-cookies', 'tokens-in-storage', 'tabnabbing']))
    expect(r.score).toBeLessThan(60)
    const order = ['critical', 'high', 'medium', 'low', 'info']
    const sev = r.findings.map(f => order.indexOf(f.severity))
    expect([...sev].sort((a, b) => a - b)).toEqual(sev)
  })

  it('flags weak CSP', async () => {
    const r = await securityAudit.run({ headers: { 'content-security-policy': "script-src 'self' 'unsafe-inline' 'unsafe-eval' *" } })
    expect(r.findings.map(f => f.id)).toEqual(expect.arrayContaining(['csp-unsafe-inline', 'csp-unsafe-eval', 'csp-wildcard', 'csp-object-src', 'csp-base-uri']))
  })

  it('can skip checks', async () => {
    const r = await securityAudit.run({ headers: {}, skip: ['csp-present', 'framing'] })
    expect(r.findings.map(f => f.id)).not.toContain('csp-present')
  })
})

// DOM clobbering detection needs real named access (jsdom has none); covered by the browser smoke test.
