import { describe, it, expect, vi, afterEach } from 'vitest'
import { session } from '../../modules/session'

describe('session', () => {
  afterEach(() => {
    session.destroy()
    vi.useRealTimers()
  })

  it('is active after init and inactive after destroy', () => {
    session.init({ timeoutMinutes: 1 })
    expect(session.isActive()).toBe(true)
    session.destroy()
    expect(session.isActive()).toBe(false)
  })

  it('expires after the idle timeout', () => {
    vi.useFakeTimers()
    const onExpire = vi.fn()
    session.init({ timeoutMinutes: 1, onExpire })
    vi.advanceTimersByTime(59_000)
    expect(onExpire).not.toHaveBeenCalled()
    vi.advanceTimersByTime(2_000)
    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  it('activity resets the idle timer', () => {
    vi.useFakeTimers()
    const onExpire = vi.fn()
    session.init({ timeoutMinutes: 1, onExpire })
    vi.advanceTimersByTime(50_000)
    window.dispatchEvent(new Event('click'))
    vi.advanceTimersByTime(50_000)
    expect(onExpire).not.toHaveBeenCalled()
  })

  it('broadcast works before and after init without throwing', () => {
    expect(() => session.broadcast('hello')).not.toThrow()
    session.init()
    expect(() => session.broadcast('hello')).not.toThrow()
    expect(() => session.end()).not.toThrow()
  })
})
