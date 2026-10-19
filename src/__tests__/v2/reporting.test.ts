import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { reporting } from '../../modules/reporting'
import { events } from '../../core/events'

describe('reporting', () => {
  let batches: any[] = []
  const transport = (body: string) => batches.push(JSON.parse(body))
  beforeEach(() => {
    batches = []
    events.reset()
  })
  afterEach(() => reporting.disable())

  it('batches, filters by severity, and adds context', () => {
    reporting.enable({ endpoint: '/r', transport, batchSize: 2, context: { release: '2.0.0' }, browserReports: false })
    events.emit({ type: 'a', severity: 'info', source: 's' })
    events.emit({ type: 'b', severity: 'warning', source: 's' })
    events.emit({ type: 'c', severity: 'critical', source: 's' })
    expect(batches).toHaveLength(1)
    expect(batches[0].events.map((e: any) => e.type)).toEqual(['b', 'c'])
    expect(batches[0].context.release).toBe('2.0.0')
  })

  it('dedupes bursts and redacts', () => {
    reporting.enable({
      endpoint: '/r', transport, browserReports: false,
      redact: ev => (ev.type === 'drop' ? null : { ...ev, details: { ...ev.details, secret: '[redacted]' } })
    })
    for (let i = 0; i < 5; i++) events.emit({ type: 'x', severity: 'warning', source: 's', details: { secret: 'p@ss' } })
    events.emit({ type: 'drop', severity: 'critical', source: 's' })
    reporting.flush()
    expect(batches[0].events).toHaveLength(1)
    expect(batches[0].events[0].details.secret).toBe('[redacted]')
    expect(reporting.stats().dropped).toBe(4)
  })

  it('flushes on interval and when the page is hidden', () => {
    vi.useFakeTimers()
    reporting.enable({ endpoint: '/r', transport, flushInterval: 1000, browserReports: false })
    events.emit({ type: 'x', severity: 'critical', source: 's' })
    vi.advanceTimersByTime(1001)
    expect(batches).toHaveLength(1)
    events.emit({ type: 'y', severity: 'critical', source: 's' })
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(batches).toHaveLength(2)
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
    vi.useRealTimers()
  })
})
