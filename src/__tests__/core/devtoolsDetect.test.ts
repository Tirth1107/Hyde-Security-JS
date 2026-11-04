import { describe, it, expect, vi, afterEach } from 'vitest'
import { createDevtoolsDetector, type DevtoolsChecker } from '../../core/devtoolsDetect'

const fake = (name: string, open: () => boolean, enabled = true): DevtoolsChecker => ({ name, enabled: () => enabled, isOpen: open })

describe('core/devtoolsDetect', () => {
  afterEach(() => { vi.useRealTimers() })

  it('reports the first checker that sees DevTools open', () => {
    const d = createDevtoolsDetector([fake('off', () => true, false), fake('a', () => false), fake('b', () => true)])
    expect(d.check()).toEqual({ open: true, method: 'b' })
  })

  it('a throwing checker counts as closed', () => {
    const d = createDevtoolsDetector([fake('bad', () => { throw new Error('x') })])
    expect(d.check().open).toBe(false)
  })

  it('notifies listeners only when the state changes', () => {
    vi.useFakeTimers()
    let open = false
    const d = createDevtoolsDetector([fake('t', () => open)])
    const fn = vi.fn()
    d.addListener(fn)
    d.launch(100)
    vi.advanceTimersByTime(300)
    expect(fn).not.toHaveBeenCalled()
    open = true
    vi.advanceTimersByTime(300)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith(true, 't')
    open = false
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenLastCalledWith(false, '')
    d.stop()
    open = true
    vi.advanceTimersByTime(500)
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('removed listeners stop receiving events', () => {
    vi.useFakeTimers()
    const d = createDevtoolsDetector([fake('t', () => true)])
    const fn = vi.fn()
    d.addListener(fn)
    d.removeListener(fn)
    d.launch(100)
    vi.advanceTimersByTime(200)
    expect(fn).not.toHaveBeenCalled()
    d.stop()
  })

  it('default checkers never use eval or Function', async () => {
    const fs = await import('node:fs')
    const src = fs.readFileSync(`${process.cwd()}/src/core/devtoolsDetect.ts`, 'utf8')
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    expect(code).not.toMatch(/\beval\s*\(|new Function|\.constructor\(/)
  })
})
