import { describe, it, expect, vi } from 'vitest'
import { inputValidation } from '../../modules/inputValidation'
import { contentSecurityPolicy } from '../../modules/contentSecurityPolicy'
import { csrfProtection } from '../../modules/csrfProtection'
import { passwordStrength } from '../../modules/passwordStrength'
import { makeRateLimited } from '../../modules/rateLimiter'
import { createHoneypot, isTriggered } from '../../modules/honeypot'

describe('inputValidation', () => {
  it('detects common attacks', () => {
    expect(inputValidation.isSQLInjection("' OR 1=1; DROP TABLE users --")).toBe(true)
    expect(inputValidation.isSQLInjection('hello world')).toBe(false)
    expect(inputValidation.isXSSAttempt('<script>alert(1)</script>')).toBe(true)
    expect(inputValidation.isXSSAttempt('just text')).toBe(false)
  })

  it('validates fields against rules', () => {
    expect(inputValidation.validateField('a@b.co', [{ type: 'required' }, { type: 'email' }]).valid).toBe(true)
    const r = inputValidation.validateField('', [{ type: 'required' }, { type: 'minLength', value: 3 }])
    expect(r.valid).toBe(false)
    expect(r.errors).toHaveLength(2)
    expect(inputValidation.isURL('http://x.com', { requireHTTPS: true })).toBe(false)
    expect(inputValidation.sanitizeInput('  <b> ')).toBe('&lt;b&gt;')
  })
})

describe('contentSecurityPolicy', () => {
  it('builds a policy string', () => {
    expect(contentSecurityPolicy.build({ defaultSrc: ["'self'"], objectSrc: ["'none'"], reportUri: '/csp' }))
      .toBe("default-src 'self'; object-src 'none'; report-uri /csp")
  })

  it('injects and removes a meta tag', () => {
    const remove = contentSecurityPolicy.inject(contentSecurityPolicy.getDefaults())
    expect(document.querySelector('meta[http-equiv="Content-Security-Policy"]')).not.toBeNull()
    remove()
    expect(document.querySelector('meta[http-equiv="Content-Security-Policy"]')).toBeNull()
  })
})

describe('csrfProtection', () => {
  it('reads the meta token and attaches it only to unsafe methods', () => {
    document.head.innerHTML = '<meta name="csrf-token" content="tok123">'
    let interceptor: (c: any) => any = c => c
    const client = { interceptors: { request: { use: (fn: any) => { interceptor = fn } } } }
    csrfProtection.attachToAxios(client)
    expect(interceptor({ method: 'post', headers: {} }).headers['X-CSRF-Token']).toBe('tok123')
    expect(interceptor({ method: 'get', headers: {} }).headers['X-CSRF-Token']).toBeUndefined()

    const form = document.createElement('form')
    csrfProtection.attachToForm(form)
    expect((form.querySelector('input[name="csrfmiddlewaretoken"]') as HTMLInputElement).value).toBe('tok123')
    document.head.innerHTML = ''
  })
})

describe('passwordStrength', () => {
  it('scores weak and strong passwords', () => {
    expect(passwordStrength.check('').score).toBe(0)
    expect(passwordStrength.check('password').score).toBeLessThan(2)
    expect(passwordStrength.check('correct-Horse-battery-st4ple!').score).toBeGreaterThanOrEqual(3)
  })

  it('validates rules', () => {
    expect(passwordStrength.validate('Abcdefg1').valid).toBe(true)
    expect(passwordStrength.validate('abc').errors.length).toBeGreaterThan(1)
    expect(passwordStrength.validate('Abcdefg1', { requireSpecial: true }).valid).toBe(false)
  })
})

describe('rateLimiter', () => {
  it('calls at most once per window', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const limited = makeRateLimited(fn, 1000)
    limited(); limited(); limited()
    expect(fn).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(1001)
    limited()
    expect(fn).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })
})

describe('honeypot', () => {
  it('detects filled honeypot fields', () => {
    const form = document.createElement('form')
    const hp = createHoneypot()
    form.appendChild(hp)
    expect(isTriggered(form)).toBe(false)
    hp.value = 'bot'
    expect(isTriggered(form)).toBe(true)
  })
})
