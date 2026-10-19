import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { skimmerGuard } from '../../modules/skimmerGuard'
import { events } from '../../core/events'
import { stackInspector } from '../../core/callsite'

const flush = () => new Promise(r => setTimeout(r, 0))

describe('skimmerGuard', () => {
  beforeEach(() => {
    events.reset()
    document.body.innerHTML = `
      <form id="pay" action="/checkout">
        <input id="cc" name="cardnumber" autocomplete="cc-number" value="4111111111111111">
        <input id="note" name="note" value="hello">
      </form>`
  })
  afterEach(() => {
    skimmerGuard.disable()
    vi.restoreAllMocks()
  })

  const cc = () => document.getElementById('cc') as HTMLInputElement
  const asThirdParty = () => vi.spyOn(stackInspector, 'current').mockReturnValue(['https://evil-cdn.io/analytics.js'])

  it('lets first-party code read sensitive fields', () => {
    const seen = vi.fn()
    events.on('*', seen)
    skimmerGuard.enable({ mode: 'enforce' })
    expect(cc().value).toBe('4111111111111111')
    expect(seen).not.toHaveBeenCalled()
  })

  it('reports third-party reads, and blanks them in enforce mode', () => {
    const seen = vi.fn()
    events.on('sensitive_field_read', seen)
    skimmerGuard.enable({ mode: 'enforce' })
    asThirdParty()
    expect(cc().value).toBe('')
    expect((document.getElementById('note') as HTMLInputElement).value).toBe('hello') // not sensitive
    expect(seen).toHaveBeenCalledTimes(1)
    expect(seen.mock.calls[0][0].details.callers).toEqual(['https://evil-cdn.io/analytics.js'])
    void cc().value // repeated reads are not re-reported
    expect(seen).toHaveBeenCalledTimes(1)
  })

  it('trusted payment providers may read fields', () => {
    skimmerGuard.enable({ mode: 'enforce', trusted: ['*.evil-cdn.io', 'evil-cdn.io'] })
    asThirdParty()
    expect(cc().value).toBe('4111111111111111')
  })

  it('blocks third-party key listeners on sensitive fields and reports document keyloggers', () => {
    const seen = vi.fn()
    events.on('sensitive_listener_added', seen)
    skimmerGuard.enable({ mode: 'enforce' })
    const spy = asThirdParty()
    const handler = vi.fn()
    cc().addEventListener('input', handler)
    document.addEventListener('keydown', () => {})
    spy.mockRestore()
    cc().dispatchEvent(new Event('input'))
    expect(handler).not.toHaveBeenCalled()
    expect(seen.mock.calls.map(c => c[0].details.target)).toEqual([expect.objectContaining({ id: 'cc' }), 'document'])
  })

  it('reports and reverts a form action hijack', async () => {
    const seen = vi.fn()
    events.on('form_action_hijack', seen)
    skimmerGuard.enable({ mode: 'enforce' })
    document.getElementById('pay')!.setAttribute('action', 'https://evil.io/collect')
    await flush()
    expect(seen).toHaveBeenCalled()
    expect(document.getElementById('pay')!.getAttribute('action')).toBe('/checkout')
  })

  it('restores the value property on disable', () => {
    const before = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.get
    skimmerGuard.enable()
    skimmerGuard.disable()
    expect(Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.get).toBe(before)
  })
})
