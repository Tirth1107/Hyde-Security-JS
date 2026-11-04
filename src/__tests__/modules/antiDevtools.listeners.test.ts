import { describe, it, expect, vi, beforeEach } from 'vitest'

const listeners = new Set<(open: boolean, method: string) => void>()
vi.mock('../../core/devtoolsDetect', () => ({
  createDevtoolsDetector: () => ({
    addListener: (fn: (open: boolean, method: string) => void) => listeners.add(fn),
    removeListener: (fn: (open: boolean, method: string) => void) => listeners.delete(fn),
    launch: vi.fn(),
    stop: vi.fn(),
    check: () => ({ open: false, method: '' }),
    isOpen: false,
  }),
}))

import { antiDevtools } from '../../modules/antiDevtools'

describe('antiDevtools listener lifecycle', () => {
  beforeEach(() => {
    antiDevtools.disable()
    listeners.clear()
  })

  it('does not pile up detector listeners across enable/disable cycles', async () => {
    for (let i = 0; i < 5; i++) {
      antiDevtools.enable({})
      await antiDevtools.ready()
      antiDevtools.disable()
    }
    antiDevtools.enable({})
    await antiDevtools.ready()
    expect(listeners.size).toBe(1)
    antiDevtools.disable()
    expect(listeners.size).toBe(0)
  })

  it('reports once per detection and updates detect()', async () => {
    const onThreat = vi.fn()
    antiDevtools.enable({ onThreat })
    await antiDevtools.ready()
    listeners.forEach(fn => fn(true, 'test'))
    expect(onThreat).toHaveBeenCalledTimes(1)
    expect(onThreat.mock.calls[0][0].type).toBe('devtools_detected')
    expect(onThreat.mock.calls[0][0].details.method).toBe('test')
    expect(antiDevtools.detect().open).toBe(true)
    antiDevtools.disable()
    expect(antiDevtools.detect().open).toBe(false)
  })

  it('does not start the debugger trap unless asked', () => {
    const spy = vi.spyOn(globalThis, 'setInterval')
    antiDevtools.enable({})
    expect(spy).not.toHaveBeenCalled()
    antiDevtools.disable()
    antiDevtools.enable({ debuggerTrap: true })
    expect(spy).toHaveBeenCalledTimes(1)
    antiDevtools.disable()
    spy.mockRestore()
  })

  it('a disable() before the detector loads leaves no listener behind', async () => {
    antiDevtools.enable({})
    antiDevtools.disable()
    await antiDevtools.ready()
    await new Promise(r => setTimeout(r, 0))
    expect(listeners.size).toBe(0)
  })

  it('auto-lock shows an overlay on detection', async () => {
    antiDevtools.enable({ autoLock: true })
    await antiDevtools.ready()
    listeners.forEach(fn => fn(true, 'test'))
    expect(document.body.textContent).toContain('Developer Tools Detected')
    antiDevtools.disable()
    expect(document.body.textContent).not.toContain('Developer Tools Detected')
  })
})
