import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { networkFirewall } from '../../modules/networkFirewall'

describe('networkFirewall', () => {
  const realFetch = vi.fn(async () => new Response('ok'))
  const realOpen = XMLHttpRequest.prototype.open

  beforeEach(() => {
    window.fetch = realFetch as any
  })
  afterEach(() => {
    networkFirewall.disable()
    XMLHttpRequest.prototype.open = realOpen
  })

  it('allows same-origin, allowlisted and subdomain requests', async () => {
    networkFirewall.enable(['api.example.com'])
    await expect(window.fetch('/local')).resolves.toBeDefined()
    await expect(window.fetch('https://api.example.com/x')).resolves.toBeDefined()
    await expect(window.fetch('https://v2.api.example.com/x')).resolves.toBeDefined()
    expect(realFetch).toHaveBeenCalledTimes(3)
  })

  it('blocks other domains for fetch and XHR', async () => {
    const onBlocked = vi.fn()
    networkFirewall.enable(['api.example.com'], onBlocked)
    await expect(window.fetch('https://evil.com/steal')).rejects.toThrow(/blocked/)
    await expect(window.fetch('https://api.example.com.evil.com/')).rejects.toThrow(/blocked/)
    const xhr = new XMLHttpRequest()
    expect(() => xhr.open('GET', '//evil.com/x')).toThrow(/blocked/)
    expect(onBlocked).toHaveBeenCalledTimes(3)
  })

  it('enabling twice replaces the allowlist instead of wrapping twice', async () => {
    const disableFirst = networkFirewall.enable(['a.com'])
    networkFirewall.enable(['b.com'])
    await expect(window.fetch('https://a.com/')).rejects.toThrow()
    await expect(window.fetch('https://b.com/')).resolves.toBeDefined()

    // The stale disable function from the first call must not break anything
    disableFirst()
    expect(networkFirewall.isEnabled()).toBe(true)

    networkFirewall.disable()
    expect(window.fetch).toBe(realFetch)
    expect(XMLHttpRequest.prototype.open).toBe(realOpen)
    expect(networkFirewall.isEnabled()).toBe(false)
  })
})
