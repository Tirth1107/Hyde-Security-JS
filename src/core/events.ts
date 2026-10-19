/**
 * Central threat bus. Every module reports through here, so apps get one
 * consistent event shape and one place to subscribe.
 */
import { uid, now } from './utils'

export type Severity = 'info' | 'warning' | 'critical'

export interface HydeSecurityEvent {
  /** Unique event ID */
  id: string
  /** Event type, e.g. 'script_unauthorized', 'clipboard_payload_blocked' */
  type: string
  /** Severity level */
  severity: Severity
  /** Module that raised it, e.g. 'scriptGuard' */
  source?: string
  /** Extra details (module specific) */
  details?: Record<string, any>
  /** Unix timestamp (ms) */
  timestamp: number
}

export type ThreatListener = (ev: HydeSecurityEvent) => void

const listeners = new Map<string, Set<ThreatListener>>()
let history: HydeSecurityEvent[] = []
let historyLimit = 200

function deliver(set: Set<ThreatListener> | undefined, ev: HydeSecurityEvent) {
  if (!set) return
  for (const fn of Array.from(set)) {
    try {
      fn(ev)
    } catch (e) {
      // A broken listener must never stop other listeners or the module
      console.error('[HydeSecurity] threat listener failed:', e)
    }
  }
}

export const events = {
  /**
   * Subscribe to threats. `type` can be an event type, a source module name
   * prefixed with `source:` (e.g. 'source:scriptGuard'), or '*' for all.
   * Returns an unsubscribe function.
   */
  on(type: string, fn: ThreatListener): () => void {
    if (!listeners.has(type)) listeners.set(type, new Set())
    listeners.get(type)!.add(fn)
    return () => listeners.get(type)?.delete(fn)
  },

  /** Subscribe for one event only */
  once(type: string, fn: ThreatListener): () => void {
    const off = events.on(type, (ev) => {
      off()
      fn(ev)
    })
    return off
  },

  /** Raise a threat event */
  emit(input: Omit<HydeSecurityEvent, 'id' | 'timestamp'> & Partial<Pick<HydeSecurityEvent, 'id' | 'timestamp'>>): HydeSecurityEvent {
    const ev: HydeSecurityEvent = { id: input.id ?? uid(), timestamp: input.timestamp ?? now(), ...input } as HydeSecurityEvent

    history.push(ev)
    if (history.length > historyLimit) history = history.slice(-historyLimit)

    deliver(listeners.get(ev.type), ev)
    if (ev.source) deliver(listeners.get(`source:${ev.source}`), ev)
    deliver(listeners.get('*'), ev)

    if (typeof document !== 'undefined' && typeof CustomEvent !== 'undefined') {
      // Details are also spread at the top level so simple listeners can read e.detail.selector
      document.dispatchEvent(new CustomEvent('hyde:threat', { detail: { ...(ev.details || {}), ...ev } }))
    }
    return ev
  },

  /** Recent events (newest last) */
  history(): HydeSecurityEvent[] {
    return history.slice()
  },

  clearHistory() {
    history = []
  },

  setHistoryLimit(n: number) {
    historyLimit = Math.max(0, n)
    history = history.slice(-historyLimit)
  },

  /** Remove every listener (used by destroy and tests) */
  reset() {
    listeners.clear()
    history = []
  }
}

/**
 * Helper for modules: returns a `report()` bound to the module name that also
 * calls an optional per-module callback.
 */
export function createReporter(source: string, defaultSeverity: Severity = 'warning') {
  let local: ThreatListener | undefined
  return {
    setCallback(fn?: ThreatListener) {
      local = fn
    },
    report(type: string, details?: Record<string, any>, severity: Severity = defaultSeverity) {
      const ev = events.emit({ type, severity, source, details })
      if (local) {
        try {
          local(ev)
        } catch (e) {
          console.error('[HydeSecurity] onThreat callback failed:', e)
        }
      }
      return ev
    }
  }
}
