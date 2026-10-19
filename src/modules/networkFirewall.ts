/**
 * Zero-Trust Network Firewall v2
 *
 * Allowlists where the page may send data. Covers the common exfiltration
 * channels used by skimmers and XSS payloads:
 *   fetch, XMLHttpRequest, navigator.sendBeacon, WebSocket, EventSource,
 *   and resource "beacons" via <img>/<script>/<iframe> src and <link> href
 *   (property setters and setAttribute).
 *
 * Same-origin requests, data: and blob: URLs are always allowed.
 * In 'report' mode nothing is blocked, only reported.
 */
import { createReporter, ThreatListener } from '../core/events'
import { isAllowedUrl } from '../core/callsite'
import { patchMethod, patchSetter, PatchGroup } from '../core/hooks'

export interface NetworkFirewallOptions {
  /** Hosts, origins or wildcards ('*.stripe.com') that may receive requests */
  allow: string[]
  /** 'enforce' blocks (default), 'report' only reports */
  mode?: 'enforce' | 'report'
  /** Watch <img>/<script>/<iframe>/<link> URLs too (default true) */
  resources?: boolean
  onBlocked?: (url: string, channel: string) => void
  onThreat?: ThreatListener
}

const reporter = createReporter('networkFirewall', 'critical')
let group: PatchGroup | null = null
let activeDisable: (() => void) | null = null
let stats = { allowed: 0, blocked: 0, blockedUrls: [] as string[] }

const ALWAYS_OK = /^(data|blob|about|javascript):/i

function toUrlString(input: any): string {
  if (typeof input === 'string') return input
  if (typeof Request !== 'undefined' && input instanceof Request) return input.url
  return String(input)
}

export const networkFirewall = {
  isEnabled() {
    return activeDisable !== null
  },

  /** Counts since enable() */
  getStats() {
    return { ...stats, blockedUrls: stats.blockedUrls.slice() }
  },

  disable() {
    activeDisable?.()
  },

  /**
   * Turn the firewall on. Accepts options, or the v1 form `enable(['api.x.com'], onBlocked)`.
   * Calling it again replaces the previous configuration.
   * Returns a function that turns it off.
   */
  enable(optsOrAllow: NetworkFirewallOptions | string[], onBlockedV1?: (url: string) => void): () => void {
    if (typeof window === 'undefined') return () => {}
    const opts: NetworkFirewallOptions = Array.isArray(optsOrAllow)
      ? { allow: optsOrAllow, onBlocked: onBlockedV1 ? (u) => onBlockedV1(u) : undefined }
      : optsOrAllow

    if (activeDisable) activeDisable()
    reporter.setCallback(opts.onThreat)
    stats = { allowed: 0, blocked: 0, blockedUrls: [] }

    const enforce = opts.mode !== 'report'
    const allow = opts.allow ?? []

    /** true = let it through */
    const check = (raw: unknown, channel: string): boolean => {
      const url = toUrlString(raw)
      if (!url || ALWAYS_OK.test(url.trim()) || isAllowedUrl(url, allow)) {
        stats.allowed++
        return true
      }
      stats.blocked++
      if (stats.blockedUrls.length < 100) stats.blockedUrls.push(url)
      reporter.report(enforce ? 'request_blocked' : 'request_reported', { url, channel, enforced: enforce })
      opts.onBlocked?.(url, channel)
      return !enforce
    }

    const blockedError = (url: string, channel: string) =>
      new TypeError(`[HydeSecurity] ${channel} blocked by network firewall: ${url}`)

    group = new PatchGroup()

    // fetch
    group.add(patchMethod(window, 'fetch', original => function (this: any, input: any, init?: any) {
      const url = toUrlString(input)
      if (!check(url, 'fetch')) return Promise.reject(blockedError(url, 'fetch'))
      return original.call(this, input, init)
    }))

    // XMLHttpRequest
    if (typeof XMLHttpRequest !== 'undefined') {
      group.add(patchMethod(XMLHttpRequest.prototype, 'open', original => function (this: any, ...args: any[]) {
        const url = toUrlString(args[1])
        if (!check(url, 'xhr')) throw blockedError(url, 'xhr')
        return original.apply(this, args)
      }))
    }

    // sendBeacon — a favourite of skimmers (fires even on page unload)
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      group.add(patchMethod(navigator, 'sendBeacon', original => function (this: any, url: any, data?: any) {
        if (!check(url, 'sendBeacon')) return false
        return original.call(this, url, data)
      }))
    }

    // WebSocket / EventSource constructors
    for (const name of ['WebSocket', 'EventSource'] as const) {
      const Original = (window as any)[name]
      if (typeof Original !== 'function') continue
      const Guarded: any = new Proxy(Original, {
        construct(target, args, newTarget): object {
          const url = toUrlString(args[0])
          if (!check(url, name)) throw blockedError(url, name)
          return Reflect.construct(target, args, newTarget === Guarded ? target : newTarget)
        }
      })
      ;(window as any)[name] = Guarded
      group.add(() => {
        if ((window as any)[name] === Guarded) (window as any)[name] = Original
      })
    }

    // Resource beacons: new Image().src = 'https://evil/?cc=...'
    if (opts.resources !== false && typeof HTMLElement !== 'undefined') {
      const targets: Array<[any, string]> = [
        [typeof HTMLImageElement !== 'undefined' && HTMLImageElement.prototype, 'src'],
        [typeof HTMLScriptElement !== 'undefined' && HTMLScriptElement.prototype, 'src'],
        [typeof HTMLIFrameElement !== 'undefined' && HTMLIFrameElement.prototype, 'src'],
        [typeof HTMLLinkElement !== 'undefined' && HTMLLinkElement.prototype, 'href']
      ]
      for (const [proto, prop] of targets) {
        if (!proto) continue
        group.add(patchSetter(proto, prop, (el, value) => check(value, `${el.tagName.toLowerCase()}.${prop}`)))
      }
      const watched: Record<string, string> = { IMG: 'src', SCRIPT: 'src', IFRAME: 'src', LINK: 'href' }
      group.add(patchMethod(Element.prototype, 'setAttribute', original => function (this: Element, name: string, value: string) {
        if (watched[this.tagName] === String(name).toLowerCase() && !check(value, `${this.tagName.toLowerCase()}.${name}`)) return
        return original.call(this, name, value)
      }))
    }

    const disable = () => {
      if (activeDisable !== disable) return // a newer enable() replaced this one
      group?.restoreAll()
      group = null
      activeDisable = null
    }
    activeDisable = disable
    return disable
  }
}
