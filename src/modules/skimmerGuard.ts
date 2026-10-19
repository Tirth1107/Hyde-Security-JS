/**
 * skimmerGuard — formjacking / Magecart defense for sensitive fields.
 *
 * Skimmers usually: (1) read card or password fields, (2) attach key/input
 * listeners to them, or (3) swap a form's action to their own server.
 * This module watches all three and attributes each access to the scripts on
 * the call stack. Third-party callers (not same-origin, not trusted) are
 * reported, and in 'enforce' mode get an empty value / no listener.
 *
 * Pair with networkFirewall so anything that slips through can't be sent out.
 */
import { createReporter, ThreatListener } from '../core/events'
import { patchMethod, PatchGroup } from '../core/hooks'
import { currentStackUrls, isAllowedUrl, isExtensionUrl } from '../core/callsite'

export interface SkimmerGuardOptions {
  /** CSS selector for sensitive fields */
  selector?: string
  /** Script hosts allowed to touch sensitive fields (e.g. your payment provider). Same-origin always allowed. */
  trusted?: string[]
  /** 'report' (default) or 'enforce' */
  mode?: 'report' | 'enforce'
  /** Allowed form action hosts. Same-origin always allowed. */
  allowedFormActions?: string[]
  /** Also flag browser-extension scripts (default true) */
  flagExtensions?: boolean
  onThreat?: ThreatListener
}

export const DEFAULT_SENSITIVE_SELECTOR = [
  'input[type="password"]',
  'input[autocomplete^="cc-"]',
  'input[autocomplete="one-time-code"]',
  'input[name*="card" i]',
  'input[name*="cvv" i]',
  'input[name*="cvc" i]',
  'input[id*="card" i]',
  'input[id*="cvv" i]',
  'input[data-hyde-sensitive]'
].join(',')

const KEY_EVENTS = new Set(['keydown', 'keyup', 'keypress', 'input', 'change', 'paste', 'beforeinput', 'blur'])

const reporter = createReporter('skimmerGuard', 'critical')
let group: PatchGroup | null = null
let formObserver: MutationObserver | null = null
let cfg: Required<Omit<SkimmerGuardOptions, 'onThreat'>> | null = null
// Avoid flooding: one report per (type, caller) per field
let reported = new WeakMap<object, Set<string>>()

function isSensitive(el: unknown): el is HTMLInputElement {
  return !!cfg && el instanceof HTMLInputElement && el.matches(cfg.selector)
}

function containsSensitive(el: unknown): boolean {
  if (!cfg) return false
  if (el instanceof HTMLFormElement || el === document || el instanceof HTMLBodyElement || el === window) return true
  return el instanceof Element && !!el.querySelector(cfg.selector)
}

/** Third-party script URLs on the stack, or [] if all first-party */
function foreign(): string[] {
  const urls = currentStackUrls()
  return urls.filter(u => {
    if (isExtensionUrl(u)) return cfg!.flagExtensions
    return !isAllowedUrl(u, cfg!.trusted)
  })
}

function once(target: object, key: string): boolean {
  let set = reported.get(target)
  if (!set) reported.set(target, (set = new Set()))
  if (set.has(key)) return false
  set.add(key)
  return true
}

function fieldInfo(el: HTMLInputElement) {
  return { name: el.name || null, id: el.id || null, autocomplete: el.getAttribute('autocomplete') }
}

function checkFormAction(form: HTMLFormElement) {
  if (!cfg || !form.querySelector(cfg.selector)) return true
  const action = form.getAttribute('action')
  if (!action) return true
  if (isAllowedUrl(action, cfg.allowedFormActions)) return true
  reporter.report('form_action_hijack', { action, form: form.id || form.name || null })
  return false
}

export const skimmerGuard = {
  enable(options: SkimmerGuardOptions = {}) {
    if (typeof document === 'undefined') return () => {}
    this.disable()
    reporter.setCallback(options.onThreat)
    cfg = {
      selector: options.selector ?? DEFAULT_SENSITIVE_SELECTOR,
      trusted: options.trusted ?? [],
      mode: options.mode ?? 'report',
      allowedFormActions: options.allowedFormActions ?? [],
      flagExtensions: options.flagExtensions ?? true
    }
    reported = new WeakMap()
    const enforce = cfg.mode === 'enforce'
    group = new PatchGroup()

    // (1) Reads of .value on sensitive fields
    const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')
    if (desc?.get && desc.set && desc.configurable) {
      let active = true
      const guardedGet = function (this: HTMLInputElement) {
        const real = desc.get!.call(this)
        if (!active || !isSensitive(this) || !real) return real
        const callers = foreign()
        if (!callers.length) return real
        if (once(this, `read:${callers[0]}`)) {
          reporter.report('sensitive_field_read', { field: fieldInfo(this), callers, blocked: enforce })
        }
        return enforce ? '' : real
      }
      Object.defineProperty(HTMLInputElement.prototype, 'value', { ...desc, get: guardedGet })
      group.add(() => {
        active = false
        const cur = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')
        if (cur?.get === guardedGet) Object.defineProperty(HTMLInputElement.prototype, 'value', desc)
      })
    }

    // (2) Listeners on sensitive fields, their forms, or global key logging
    group.add(patchMethod(EventTarget.prototype, 'addEventListener', original => function (this: any, type: string, listener: any, options?: any) {
      if (KEY_EVENTS.has(type) && (isSensitive(this) || containsSensitive(this))) {
        const callers = foreign()
        if (callers.length) {
          if (once(this, `listen:${type}:${callers[0]}`)) {
            reporter.report('sensitive_listener_added', {
              event: type,
              target: isSensitive(this) ? fieldInfo(this) : (this === window ? 'window' : this === document ? 'document' : (this as Element).tagName?.toLowerCase()),
              callers,
              blocked: enforce
            }, isSensitive(this) ? 'critical' : 'warning')
          }
          if (enforce) return
        }
      }
      return original.call(this, type, listener, options)
    }))

    // (3) Form action swaps and submissions to foreign hosts
    formObserver = new MutationObserver(muts => {
      for (const m of muts) {
        if (m.type === 'attributes' && m.target instanceof HTMLFormElement && !checkFormAction(m.target) && enforce) {
          // Put the original action back
          if (m.oldValue === null) m.target.removeAttribute('action')
          else m.target.setAttribute('action', m.oldValue)
        }
      }
    })
    formObserver.observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['action'], attributeOldValue: true })
    const onSubmit = (e: Event) => {
      const form = e.target
      if (form instanceof HTMLFormElement && !checkFormAction(form) && enforce) {
        e.preventDefault()
        e.stopImmediatePropagation()
      }
    }
    document.addEventListener('submit', onSubmit, true)
    group.add(() => document.removeEventListener('submit', onSubmit, true))
    document.querySelectorAll('form').forEach(f => checkFormAction(f))

    return () => this.disable()
  },

  disable() {
    group?.restoreAll()
    group = null
    formObserver?.disconnect()
    formObserver = null
  },

  isEnabled() {
    return group !== null
  },

  /** Mark an extra element as sensitive */
  markSensitive(el: HTMLInputElement) {
    el.setAttribute('data-hyde-sensitive', '')
  }
}
