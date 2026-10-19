import { describe, it, expect, vi, beforeEach } from 'vitest'
import { domGuard } from '../../modules/domGuard'

const flush = () => new Promise(r => setTimeout(r, 0))

describe('domGuard', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="wrap"><p id="target" class="a">Original</p><span id="after"></span></div>'
  })

  it('returns a no-op when the element does not exist', () => {
    const stop = domGuard.protect('#missing', () => {})
    expect(typeof stop).toBe('function')
    stop()
  })

  it('reports attribute and text changes', async () => {
    const onTamper = vi.fn()
    const events: any[] = []
    const listener = (e: Event) => events.push((e as CustomEvent).detail)
    document.addEventListener('hyde:threat', listener)
    const stop = domGuard.protect('#target', onTamper)

    document.getElementById('target')!.setAttribute('class', 'b')
    await flush()
    expect(onTamper).toHaveBeenCalledTimes(1)
    expect(events[0]).toMatchObject({ source: 'domGuard', selector: '#target', type: 'attributes' })

    stop()
    document.removeEventListener('hyde:threat', listener)
  })

  it('self-heals a modified element', async () => {
    const stop = domGuard.protect('#target', () => {}, true)
    document.getElementById('target')!.textContent = 'Hacked'
    await flush()
    expect(document.getElementById('target')!.textContent).toBe('Original')
    stop()
  })

  it('self-heals a removed element in its original position, reporting once', async () => {
    const onTamper = vi.fn()
    const stop = domGuard.protect('#target', onTamper, true)
    document.getElementById('target')!.remove()
    await flush()
    const healed = document.getElementById('target')
    expect(healed).not.toBeNull()
    expect(healed!.nextElementSibling!.id).toBe('after')
    expect(onTamper).toHaveBeenCalledTimes(1)

    // Still protected after healing
    healed!.remove()
    await flush()
    expect(document.getElementById('target')).not.toBeNull()
    expect(onTamper).toHaveBeenCalledTimes(2)
    stop()
  })

  it('reports removal without self-healing and does not restore', async () => {
    const onTamper = vi.fn()
    domGuard.protect('#target', onTamper)
    document.getElementById('target')!.remove()
    await flush()
    expect(onTamper).toHaveBeenCalledTimes(1)
    expect(document.getElementById('target')).toBeNull()
  })

  it('reports healed:false when the parent is removed too', async () => {
    const events: any[] = []
    const listener = (e: Event) => events.push((e as CustomEvent).detail)
    document.addEventListener('hyde:threat', listener)
    domGuard.protect('#target', () => {}, true)
    document.getElementById('wrap')!.remove()
    await flush()
    expect(events.at(-1)).toMatchObject({ type: 'node_removed', healed: false })
    document.removeEventListener('hyde:threat', listener)
  })

  it('stops reporting after cleanup', async () => {
    const onTamper = vi.fn()
    const stop = domGuard.protect('#target', onTamper, true)
    stop()
    document.getElementById('target')!.textContent = 'Changed'
    await flush()
    expect(onTamper).not.toHaveBeenCalled()
  })
})
