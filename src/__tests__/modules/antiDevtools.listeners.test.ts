import { describe, it, expect, vi, beforeEach } from 'vitest'

const listeners = new Set<(open: boolean) => void>()
vi.mock('devtools-detector', () => ({
  default: {
    addListener: (fn: (open: boolean) => void) => listeners.add(fn),
    removeListener: (fn: (open: boolean) => void) => listeners.delete(fn),
    launch: vi.fn(),
    stop: vi.fn(),
  },
}))

import { antiDevtools } from '../../modules/antiDevtools'

describe('antiDevtools listener lifecycle', () => {
  beforeEach(() => {
    antiDevtools.disable()
    listeners.clear()
  })

  it('does not pile up detector listeners across enable/disable cycles', () => {
    for (let i = 0; i < 5; i++) {
      antiDevtools.enable({})
      antiDevtools.disable()
    }
    antiDevtools.enable({})
    expect(listeners.size).toBe(1)
    antiDevtools.disable()
    expect(listeners.size).toBe(0)
  })

  it('reports once per detection and updates detect()', () => {
    const onThreat = vi.fn()
    antiDevtools.enable({ onThreat })
    listeners.forEach(fn => fn(true))
    expect(onThreat).toHaveBeenCalledTimes(1)
    expect(onThreat.mock.calls[0][0].type).toBe('devtools_detected')
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

  it('auto-lock shows an overlay on detection', () => {
    antiDevtools.enable({ autoLock: true })
    listeners.forEach(fn => fn(true))
    expect(document.body.textContent).toContain('Developer Tools Detected')
    antiDevtools.disable()
    expect(document.body.textContent).not.toContain('Developer Tools Detected')
  })
})
