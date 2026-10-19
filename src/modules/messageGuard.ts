/**
 * messageGuard — postMessage security.
 *
 * Common bugs: handlers that never check `event.origin`, substring checks
 * (`origin.includes('trusted.com')` matches `trusted.com.evil.io`), and
 * sending secrets with targetOrigin '*'.
 *
 *  - listen(): a handler that only ever sees exact, allowlisted origins
 *  - send(): refuses '*' as a target origin
 *  - enable(): page-wide message firewall — drops messages from origins you
 *    didn't allow before *any* handler sees them, and reports wildcard sends
 */
import { createReporter, ThreatListener } from '../core/events'
import { ownerOf, patchMethod, PatchGroup } from '../core/hooks'

export interface ListenOptions<T = any> {
  /** Exact origins, e.g. ['https://pay.example.com']. Use 'self' for same-origin. */
  origins: string[]
  handler: (data: T, event: MessageEvent) => void
  /** Return false to drop a message with an unexpected shape */
  validate?: (data: unknown) => boolean
  /** Only accept from this window (e.g. iframe.contentWindow) */
  source?: () => Window | null
  /** Drop messages above this rate per second (default unlimited) */
  maxPerSecond?: number
}

export interface MessageGuardOptions {
  /** Origins allowed to message this page. 'self' = same origin. */
  allowedOrigins: string[]
  /** 'enforce' drops other messages (default), 'report' only reports */
  mode?: 'report' | 'enforce'
  /** Report postMessage(..., '*') from this page (default true) */
  auditWildcardSends?: boolean
  onThreat?: ThreatListener
}

const reporter = createReporter('messageGuard', 'warning')
let group: PatchGroup | null = null
let handlerMap = new WeakMap<object, EventListener>()

function resolveOrigins(list: string[]): Set<string> {
  const self = typeof location !== 'undefined' ? location.origin : ''
  return new Set(list.map(o => (o === 'self' ? self : o.replace(/\/+$/, ''))))
}

export const messageGuard = {
  /** Add a message handler that only receives exact allowlisted origins. Returns an unsubscribe function. */
  listen<T = any>(opts: ListenOptions<T>): () => void {
    if (typeof window === 'undefined') return () => {}
    if (opts.origins.includes('*')) throw new Error('[HydeSecurity] messageGuard.listen: "*" is not allowed; list exact origins')
    const allowed = resolveOrigins(opts.origins)
    let windowStart = 0
    let count = 0
    const fn = (e: MessageEvent) => {
      if (!allowed.has(e.origin)) return
      if (opts.source) {
        const src = opts.source()
        if (src && e.source !== src) return
      }
      if (opts.maxPerSecond) {
        const now = Date.now()
        if (now - windowStart > 1000) {
          windowStart = now
          count = 0
        }
        if (++count > opts.maxPerSecond) {
          if (count === opts.maxPerSecond + 1) reporter.report('message_rate_limited', { origin: e.origin })
          return
        }
      }
      if (opts.validate && !opts.validate(e.data)) {
        reporter.report('message_invalid_shape', { origin: e.origin })
        return
      }
      opts.handler(e.data as T, e)
    }
    window.addEventListener('message', fn)
    return () => window.removeEventListener('message', fn)
  },

  /** postMessage that refuses '*' */
  send(target: Window, data: unknown, targetOrigin: string, transfer?: Transferable[]) {
    if (!targetOrigin || targetOrigin === '*') {
      throw new Error('[HydeSecurity] messageGuard.send: give an exact targetOrigin, not "*"')
    }
    target.postMessage(data, targetOrigin === 'self' ? location.origin : targetOrigin, transfer)
  },

  /** Page-wide message firewall */
  enable(options: MessageGuardOptions) {
    if (typeof window === 'undefined') return () => {}
    this.disable()
    reporter.setCallback(options.onThreat)
    const allowed = resolveOrigins(options.allowedOrigins)
    const enforce = options.mode !== 'report'
    handlerMap = new WeakMap()
    group = new PatchGroup()

    const permit = (e: MessageEvent) => {
      if (allowed.has(e.origin)) return true
      reporter.report(enforce ? 'message_blocked' : 'message_unexpected_origin', { origin: e.origin })
      return !enforce
    }

    // Wrap every 'message' listener on window
    const wrapListener = (listener: any): EventListener => {
      if (!listener) return listener
      let w = handlerMap.get(listener)
      if (!w) {
        w = function (this: any, e: Event) {
          if (!permit(e as MessageEvent)) return
          return typeof listener === 'function' ? listener.call(this, e) : listener.handleEvent(e)
        }
        handlerMap.set(listener, w)
      }
      return w
    }
    // Patch wherever addEventListener really lives (EventTarget.prototype in
    // browsers) so other guards that wrap it keep working in any order
    const owner = (ownerOf(window, 'addEventListener') ?? EventTarget.prototype) as any
    group.add(patchMethod(owner, 'addEventListener', original => function (this: any, type: string, listener: any, opts?: any) {
      return original.call(this, type, type === 'message' && this === window ? wrapListener(listener) : listener, opts)
    }))
    group.add(patchMethod((ownerOf(window, 'removeEventListener') ?? EventTarget.prototype) as any, 'removeEventListener', original => function (this: any, type: string, listener: any, opts?: any) {
      const l = type === 'message' && this === window && listener ? handlerMap.get(listener) ?? listener : listener
      return original.call(this, type, l, opts)
    }))
    // window.onmessage = fn
    const proto = Object.getOwnPropertyDescriptor(window, 'onmessage') ? window : Object.getPrototypeOf(window)
    const desc = Object.getOwnPropertyDescriptor(proto, 'onmessage')
    if (desc?.set && desc.configurable) {
      const set = desc.set
      Object.defineProperty(proto, 'onmessage', {
        ...desc,
        set(this: any, fn: any) {
          set.call(this, typeof fn === 'function' ? wrapListener(fn) : fn)
        }
      })
      group.add(() => Object.defineProperty(proto, 'onmessage', desc))
    }

    // Report postMessage(..., '*') sent from this window
    if (options.auditWildcardSends !== false) {
      group.add(patchMethod(window as any, 'postMessage', original => function (this: any, message: any, targetOrigin?: any, transfer?: any) {
        const origin = typeof targetOrigin === 'string' ? targetOrigin : targetOrigin?.targetOrigin
        if (origin === '*') reporter.report('postmessage_wildcard_target', { type: typeof message })
        return original.call(this, message, targetOrigin, transfer)
      }))
    }
    return () => this.disable()
  },

  disable() {
    group?.restoreAll()
    group = null
  }
}
