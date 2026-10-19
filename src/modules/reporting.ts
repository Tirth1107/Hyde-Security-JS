/**
 * reporting — ship threat events to your backend.
 *
 * Batches events, de-duplicates bursts, samples, redacts, and flushes with
 * sendBeacon when the page is hidden so nothing is lost on tab close. It also
 * collects browser-generated reports (CSP violations, deprecations,
 * interventions) via ReportingObserver.
 *
 * Uses the *original* fetch/sendBeacon captured at load, so the network
 * firewall never blocks your own telemetry (and can't loop).
 */
import { events, HydeSecurityEvent, Severity } from '../core/events'

export interface ReportingOptions {
  /** Where to POST batches (JSON array) */
  endpoint: string
  /** Events per request (default 20) */
  batchSize?: number
  /** Max ms between flushes (default 5000) */
  flushInterval?: number
  /** 0..1 — fraction of events to send (default 1) */
  sampleRate?: number
  /** Lowest severity to send (default 'warning') */
  minSeverity?: Severity
  /** Drop repeats of the same source+type within this window (ms, default 10000) */
  dedupeWindow?: number
  /** Modify or drop (return null) events before sending */
  redact?: (ev: HydeSecurityEvent) => HydeSecurityEvent | null
  /** Extra headers (fetch transport only) */
  headers?: Record<string, string>
  /** Collect browser reports with ReportingObserver (default true) */
  browserReports?: boolean
  /** Static context added to every batch (app version, release...) */
  context?: Record<string, any>
  /** Custom sender (e.g. your own logger). Replaces fetch/sendBeacon. */
  transport?: (body: string, viaBeacon: boolean) => void
}

const pristineFetch: typeof fetch | null = typeof fetch !== 'undefined' ? fetch.bind(globalThis) : null
const pristineBeacon: ((url: string, data?: BodyInit | null) => boolean) | null =
  typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function' ? navigator.sendBeacon.bind(navigator) : null

const RANK: Record<Severity, number> = { info: 0, warning: 1, critical: 2 }

let cfg: ReportingOptions | null = null
let queue: HydeSecurityEvent[] = []
let timer: ReturnType<typeof setInterval> | null = null
let off: (() => void) | null = null
let observer: any = null
let onHide: (() => void) | null = null
const lastSeen = new Map<string, number>()
let sent = 0
let dropped = 0

function payload(batch: HydeSecurityEvent[]) {
  return JSON.stringify({
    events: batch,
    context: {
      ...cfg?.context,
      url: typeof location !== 'undefined' ? location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      sentAt: Date.now()
    }
  })
}

function send(batch: HydeSecurityEvent[], useBeacon: boolean) {
  if (!cfg || !batch.length) return
  const body = payload(batch)
  sent += batch.length
  if (cfg.transport) {
    cfg.transport(body, useBeacon)
    return
  }
  if (useBeacon && pristineBeacon) {
    const blob = typeof Blob !== 'undefined' ? new Blob([body], { type: 'application/json' }) : body
    if (pristineBeacon(cfg.endpoint, blob as any)) return
  }
  pristineFetch?.(cfg.endpoint, {
    method: 'POST',
    body,
    keepalive: true,
    headers: { 'content-type': 'application/json', ...cfg.headers }
  }).catch(() => {})
}

function accept(ev: HydeSecurityEvent) {
  if (!cfg) return
  if (RANK[ev.severity] < RANK[cfg.minSeverity ?? 'warning']) return
  if ((cfg.sampleRate ?? 1) < 1 && Math.random() > (cfg.sampleRate ?? 1)) {
    dropped++
    return
  }
  const key = `${ev.source}:${ev.type}:${JSON.stringify(ev.details?.url ?? ev.details?.src ?? '')}`
  const now = Date.now()
  if (now - (lastSeen.get(key) ?? 0) < (cfg.dedupeWindow ?? 10000)) {
    dropped++
    return
  }
  lastSeen.set(key, now)
  if (lastSeen.size > 500) lastSeen.clear()
  const out = cfg.redact ? cfg.redact(ev) : ev
  if (!out) return
  queue.push(out)
  if (queue.length >= (cfg.batchSize ?? 20)) reporting.flush()
}

export const reporting = {
  enable(options: ReportingOptions) {
    this.disable()
    cfg = options
    lastSeen.clear()
    sent = 0
    dropped = 0
    off = events.on('*', accept)
    timer = setInterval(() => this.flush(), options.flushInterval ?? 5000)

    if (typeof document !== 'undefined') {
      onHide = () => {
        if (document.visibilityState === 'hidden') this.flush(true)
      }
      document.addEventListener('visibilitychange', onHide)
    }

    const RO = typeof window !== 'undefined' ? (window as any).ReportingObserver : undefined
    if (options.browserReports !== false && RO) {
      try {
        observer = new RO((reports: any[]) => {
          for (const r of reports) {
            events.emit({
              type: `browser_${r.type}`.replace(/-/g, '_'),
              severity: r.type === 'csp-violation' ? 'warning' : 'info',
              source: 'browser',
              details: { url: r.url, body: typeof r.body?.toJSON === 'function' ? r.body.toJSON() : r.body }
            })
          }
        }, { buffered: true })
        observer.observe()
      } catch (e) { }
    }
    return () => this.disable()
  },

  /** Send queued events now. `beacon` uses sendBeacon (survives page unload). */
  flush(beacon = false) {
    if (!queue.length) return
    const size = cfg?.batchSize ?? 20
    while (queue.length) send(queue.splice(0, size), beacon)
  },

  disable() {
    this.flush(true)
    off?.()
    off = null
    if (timer) clearInterval(timer)
    timer = null
    if (onHide) document.removeEventListener('visibilitychange', onHide)
    onHide = null
    observer?.disconnect?.()
    observer = null
    cfg = null
    queue = []
  },

  stats() {
    return { queued: queue.length, sent, dropped }
  }
}
