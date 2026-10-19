import { describe, it, expect, vi, afterEach } from 'vitest'
import { events, createReporter } from '../../core/events'
import { patchMethod, patchSetter, PatchGroup } from '../../core/hooks'
import { urlsFromStack, hostMatches, isAllowedUrl } from '../../core/callsite'
import { toBase64Url, fromBase64Url, sha256Hex, timingSafeEqual } from '../../core/encoding'

afterEach(() => events.reset())

describe('events', () => {
  it('delivers by type, source and wildcard, plus a DOM event', () => {
    const byType = vi.fn(), bySource = vi.fn(), all = vi.fn(), dom = vi.fn()
    events.on('x_happened', byType)
    events.on('source:modA', bySource)
    events.on('*', all)
    document.addEventListener('hyde:threat', dom)
    const ev = createReporter('modA').report('x_happened', { selector: '#a' })
    expect(byType).toHaveBeenCalledWith(ev)
    expect(bySource).toHaveBeenCalledWith(ev)
    expect(all).toHaveBeenCalledWith(ev)
    expect((dom.mock.calls[0][0] as CustomEvent).detail).toMatchObject({ type: 'x_happened', source: 'modA', selector: '#a' })
    document.removeEventListener('hyde:threat', dom)
  })

  it('a throwing listener does not break others; once() fires once; history is kept', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const ok = vi.fn()
    events.on('*', () => { throw new Error('boom') })
    events.on('*', ok)
    const one = vi.fn()
    events.once('t', one)
    events.emit({ type: 't', severity: 'info' })
    events.emit({ type: 't', severity: 'info' })
    expect(ok).toHaveBeenCalledTimes(2)
    expect(one).toHaveBeenCalledTimes(1)
    expect(events.history()).toHaveLength(2)
    err.mockRestore()
  })
})

describe('hooks', () => {
  it('restores out of order without breaking the chain', () => {
    const obj = { f: (x: number) => x }
    const a = patchMethod(obj, 'f', orig => (x: number) => orig(x) + 1)
    const b = patchMethod(obj, 'f', orig => (x: number) => orig(x) * 10)
    expect(obj.f(1)).toBe(20)
    a.restore() // inner wrapper removed first
    expect(obj.f(1)).toBe(10)
    b.restore()
    expect(obj.f(1)).toBe(1)
  })

  it('patchSetter can block assignments and restores', () => {
    const proto = {}
    let stored = ''
    Object.defineProperty(proto, 'v', { configurable: true, get: () => stored, set: (x: string) => { stored = x } })
    const o: any = Object.create(proto)
    const p = patchSetter(proto, 'v', (_el, val) => val !== 'bad')
    o.v = 'good'
    o.v = 'bad'
    expect(stored).toBe('good')
    p.restore()
    o.v = 'bad'
    expect(stored).toBe('bad')
  })

  it('PatchGroup undoes everything', () => {
    const g = new PatchGroup()
    const fn = vi.fn()
    g.add(fn)
    g.add(() => fn())
    g.restoreAll()
    expect(fn).toHaveBeenCalledTimes(2)
    expect(g.size).toBe(0)
  })
})

describe('callsite', () => {
  it('extracts URLs from Chrome and Firefox stacks', () => {
    const chrome = 'Error\n    at a (https://cdn.evil.io/s.js:10:5)\n    at https://shop.com/app.js:1:2'
    const ff = 'a@https://cdn.evil.io/s.js:10:5\n@chrome-extension://abcdef/content.js:3:1'
    expect(urlsFromStack(chrome)).toEqual(['https://cdn.evil.io/s.js', 'https://shop.com/app.js'])
    expect(urlsFromStack(ff)).toEqual(['https://cdn.evil.io/s.js', 'chrome-extension://abcdef/content.js'])
  })

  it('matches hosts, origins and wildcards safely', () => {
    const u = new URL('https://js.stripe.com/v3')
    expect(hostMatches(u, 'js.stripe.com')).toBe(true)
    expect(hostMatches(u, '*.stripe.com')).toBe(true)
    expect(hostMatches(u, 'https://js.stripe.com')).toBe(true)
    expect(hostMatches(new URL('https://stripe.com.evil.io'), 'stripe.com')).toBe(false)
    expect(isAllowedUrl('/relative', [])).toBe(true)
  })
})

describe('encoding', () => {
  it('base64url round-trips and sha256 works', async () => {
    const b = new Uint8Array([0, 255, 62, 63, 1])
    expect(Array.from(fromBase64Url(toBase64Url(b)))).toEqual(Array.from(b))
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
    expect(timingSafeEqual('abc', 'abc')).toBe(true)
    expect(timingSafeEqual('abc', 'abd')).toBe(false)
  })
})
