import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { prototypeGuard } from '../../modules/prototypeGuard'
import { events } from '../../core/events'

describe('prototypeGuard', () => {
  beforeEach(() => events.reset())
  afterEach(() => {
    prototypeGuard.disable()
    delete (Object.prototype as any).polluted
    delete (Array.prototype as any).evil
  })

  it('safeParse drops __proto__ and constructor', () => {
    const o = prototypeGuard.safeParse<any>('{"a":1,"__proto__":{"isAdmin":true},"b":{"constructor":{"prototype":{"x":1}}}}')
    expect(o.a).toBe(1)
    expect(({} as any).isAdmin).toBeUndefined()
    expect(Object.prototype.hasOwnProperty.call(o.b, 'constructor')).toBe(false)
  })

  it('safeMerge never pollutes', () => {
    const payload = JSON.parse('{"__proto__":{"polluted":"yes"},"nested":{"__proto__":{"polluted":"yes"},"ok":1}}')
    const out = prototypeGuard.safeMerge({ nested: { keep: true } } as any, payload)
    expect(({} as any).polluted).toBeUndefined()
    expect(out.nested).toEqual({ keep: true, ok: 1 })
  })

  it('safeGet only reads own properties', () => {
    expect(prototypeGuard.safeGet({ a: { b: 2 } }, 'a.b')).toBe(2)
    expect(prototypeGuard.safeGet({}, 'constructor.prototype')).toBeUndefined()
    expect(prototypeGuard.safeGet({}, 'toString')).toBeUndefined()
  })

  it('monitor mode reports new keys on built-in prototypes', () => {
    const seen = vi.fn()
    events.on('prototype_polluted', seen)
    prototypeGuard.enable({ interval: 60_000, scanDom: false })
    ;(Object.prototype as any).polluted = 1
    ;(Array.prototype as any).evil = () => 1
    const changes = prototypeGuard.check()
    expect(changes).toEqual(expect.arrayContaining([
      { target: 'Object.prototype', keys: ['polluted'] },
      { target: 'Array.prototype', keys: ['evil'] }
    ]))
    expect(prototypeGuard.isPolluted()).toBe(true)
    expect(seen).toHaveBeenCalledTimes(2)
    expect(prototypeGuard.check()).toEqual([]) // reported once
  })

  it('finds DOM clobbering', () => {
    document.body.innerHTML = '<form name="cookie"></form><a id="config" href="https://evil.io"></a><div id="harmless"></div>'
    const found = prototypeGuard.scanClobbering()
    expect(found.map(f => f.name).sort()).toEqual(['config', 'cookie'])
  })
})
