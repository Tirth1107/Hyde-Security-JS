import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { messageGuard } from '../../modules/messageGuard'
import { events } from '../../core/events'

const msg = (origin: string, data: any = { ok: 1 }) => new MessageEvent('message', { origin, data })

describe('messageGuard', () => {
  beforeEach(() => events.reset())
  afterEach(() => messageGuard.disable())

  it('listen() only delivers exact origins (no substring tricks)', () => {
    const handler = vi.fn()
    const off = messageGuard.listen({ origins: ['https://pay.example.com'], handler })
    window.dispatchEvent(msg('https://pay.example.com'))
    window.dispatchEvent(msg('https://pay.example.com.evil.io'))
    window.dispatchEvent(msg('https://evil.io'))
    expect(handler).toHaveBeenCalledTimes(1)
    off()
  })

  it('listen() validates shape and rate limits', () => {
    const handler = vi.fn()
    const off = messageGuard.listen({
      origins: ['https://a.com'], handler, maxPerSecond: 3,
      validate: (d: any) => typeof d?.ok === 'number'
    })
    // The invalid message is dropped but still counts toward the rate (flood protection)
    window.dispatchEvent(msg('https://a.com', 'string'))
    for (let i = 0; i < 5; i++) window.dispatchEvent(msg('https://a.com'))
    expect(handler).toHaveBeenCalledTimes(2)
    off()
  })

  it('refuses wildcard origins', () => {
    expect(() => messageGuard.listen({ origins: ['*'], handler: () => {} })).toThrow()
    expect(() => messageGuard.send(window, 1, '*')).toThrow()
  })

  it('enable() firewalls all message listeners, including ones added before', () => {
    const early = vi.fn()
    messageGuard.enable({ allowedOrigins: ['https://trusted.com'] })
    window.addEventListener('message', early)
    // (window.onmessage is wrapped too, but jsdom never fires onmessage handlers, so it's not tested here)
    window.dispatchEvent(msg('https://evil.io'))
    window.dispatchEvent(msg('https://trusted.com'))
    expect(early).toHaveBeenCalledTimes(1)
    window.removeEventListener('message', early)
    window.dispatchEvent(msg('https://trusted.com'))
    expect(early).toHaveBeenCalledTimes(1)
  })

  it('reports wildcard sends', () => {
    const seen = vi.fn()
    events.on('postmessage_wildcard_target', seen)
    messageGuard.enable({ allowedOrigins: ['self'] })
    window.postMessage({ secret: 1 }, '*')
    expect(seen).toHaveBeenCalledTimes(1)
  })
})
