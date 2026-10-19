/**
 * prototypeGuard — prototype pollution + DOM clobbering.
 *
 * Prototype pollution (`obj.__proto__.isAdmin = true`) turns into XSS when a
 * library reads config from a polluted prototype (e.g. DOMPurify
 * CVE-2026-41238). DOM clobbering abuses `<a id="config">` so that
 * `window.config` points at an element.
 *
 *  - enable({ mode: 'monitor' }): report new keys on built-in prototypes
 *  - enable({ mode: 'lock' }): block new keys (Object.preventExtensions)
 *  - enable({ mode: 'freeze' }): freeze built-in prototypes (strongest; may break old polyfills)
 *  - safeParse / safeMerge / safeGet helpers
 *  - scanClobbering(): find elements whose id/name shadow globals
 */
import { createReporter, ThreatListener } from '../core/events'

export interface PrototypeGuardOptions {
  mode?: 'monitor' | 'lock' | 'freeze'
  /** Monitor interval in ms (default 2000) */
  interval?: number
  /** Also scan for DOM clobbering on enable (default true) */
  scanDom?: boolean
  onThreat?: ThreatListener
}

const DANGEROUS = new Set(['__proto__', 'constructor', 'prototype'])
const reporter = createReporter('prototypeGuard', 'critical')
let timer: ReturnType<typeof setInterval> | null = null
let baseline = new Map<object, Set<string | symbol>>()

function targets(): Array<[string, object]> {
  return [
    ['Object.prototype', Object.prototype],
    ['Array.prototype', Array.prototype],
    ['Function.prototype', Function.prototype],
    ['String.prototype', String.prototype],
    ['Number.prototype', Number.prototype],
    ['Boolean.prototype', Boolean.prototype],
    ['RegExp.prototype', RegExp.prototype],
    ['Promise.prototype', Promise.prototype]
  ]
}

function snapshot() {
  baseline = new Map(targets().map(([, p]) => [p, new Set(Reflect.ownKeys(p))]))
}

/** New keys on built-in prototypes since enable() */
function diff(): Array<{ target: string; keys: string[] }> {
  const out: Array<{ target: string; keys: string[] }> = []
  for (const [name, p] of targets()) {
    const base = baseline.get(p)
    if (!base) continue
    const added = Reflect.ownKeys(p).filter(k => !base.has(k)).map(String)
    if (added.length) {
      out.push({ target: name, keys: added })
      added.forEach(k => base.add(k))
    }
  }
  return out
}

/** Global names apps commonly read as config or APIs; an element taking them over is suspicious */
const CLOBBER_SENSITIVE = new Set([
  'config', 'settings', 'options', 'env', 'app', 'CONFIG', 'defaultView', 'cookie', 'domain', 'location', 'body', 'head',
  'forms', 'images', 'links', 'scripts', 'currentScript', 'documentElement', 'implementation', 'URL', 'baseURI',
  'attributes', 'children', 'nodeName', 'nodeType', 'parentNode', 'ownerDocument', 'getElementById', 'querySelector',
  'createElement', 'write', 'alert', 'fetch', 'isSecureContext', 'crypto', 'localStorage', 'sessionStorage', '__APP_STATE__', 'globalConfig'
])

const NAMED_BY_NAME = new Set(['form', 'img', 'embed', 'object', 'iframe'])
const NAMED_BY_ID = new Set(['img', 'embed', 'object'])

export const prototypeGuard = {
  enable(options: PrototypeGuardOptions = {}) {
    this.disable()
    reporter.setCallback(options.onThreat)
    const mode = options.mode ?? 'monitor'

    // Pollution may already have happened before we loaded
    if (this.isPolluted()) {
      reporter.report('prototype_polluted', { target: 'Object.prototype', keys: Object.keys(Object.prototype), when: 'before-enable' })
    }

    if (mode === 'freeze') {
      targets().forEach(([, p]) => Object.freeze(p))
    } else if (mode === 'lock') {
      targets().forEach(([, p]) => Object.preventExtensions(p))
    } else {
      snapshot()
      timer = setInterval(() => this.check(), options.interval ?? 2000)
    }
    if (options.scanDom !== false && typeof document !== 'undefined') this.scanClobbering()
    return () => this.disable()
  },

  /** Stops monitoring. (lock/freeze can't be undone — that's the point.) */
  disable() {
    if (timer) clearInterval(timer)
    timer = null
  },

  /** Run a monitor check now; returns what changed */
  check() {
    const changes = diff()
    changes.forEach(c => reporter.report('prototype_polluted', c))
    return changes
  },

  /** Any enumerable key on Object.prototype is a red flag */
  isPolluted(): boolean {
    for (const k in {}) {
      if (k) return true
    }
    return false
  },

  /** JSON.parse that drops __proto__ / constructor / prototype keys */
  safeParse<T = any>(json: string): T {
    return JSON.parse(json, (k, v) => (DANGEROUS.has(k) ? undefined : v))
  },

  /** Deep merge that ignores dangerous keys and never walks into prototypes */
  safeMerge<T extends object>(target: T, ...sources: any[]): T {
    for (const src of sources) {
      if (!src || typeof src !== 'object') continue
      for (const key of Object.keys(src)) {
        if (DANGEROUS.has(key)) continue
        const v = src[key]
        const cur = (target as any)[key]
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          const base = cur && typeof cur === 'object' && Object.prototype.hasOwnProperty.call(target, key) ? cur : {}
          ;(target as any)[key] = this.safeMerge(base, v)
        } else {
          ;(target as any)[key] = v
        }
      }
    }
    return target
  },

  /** Read a nested own property ('a.b.c') without touching prototypes */
  safeGet(obj: any, path: string): any {
    let cur = obj
    for (const part of path.split('.')) {
      if (DANGEROUS.has(part) || cur == null || !Object.prototype.hasOwnProperty.call(cur, part)) return undefined
      cur = cur[part]
    }
    return cur
  },

  /**
   * Find elements whose id/name shadow globals or document properties
   * (`<img name="cookie">` makes document.cookie an element).
   */
  scanClobbering(root: ParentNode = document): Array<{ name: string; attribute: 'id' | 'name'; tag: string; shadows: string[] }> {
    const found: Array<{ name: string; attribute: 'id' | 'name'; tag: string; shadows: string[] }> = []
    root.querySelectorAll('[id], [name]').forEach(el => {
      for (const attr of ['id', 'name'] as const) {
        const name = el.getAttribute(attr)
        if (!name) continue
        const shadows: string[] = []
        const tag = el.tagName.toLowerCase()
        // document.<name>: live check, plus the HTML spec's named-access rules
        // (name= on form/img/embed/object/iframe, id= on img/embed/object) for engines that differ
        const docVal = (document as any)[name]
        const live = docVal === el || (docVal instanceof HTMLCollection && Array.from(docVal).includes(el as any))
        const namedAccess = (attr === 'name' && NAMED_BY_NAME.has(tag)) || (attr === 'id' && NAMED_BY_ID.has(tag))
        if (live || (namedAccess && name in document)) shadows.push('document')
        // window.<name>: every id becomes a global unless something real already has that name
        if (CLOBBER_SENSITIVE.has(name) && ((window as any)[name] === el || (attr === 'id' && !(name in window && (window as any)[name] !== undefined && (window as any)[name] !== el)))) {
          shadows.push('window')
        }
        if (shadows.length) {
          found.push({ name, attribute: attr, tag, shadows })
          reporter.report('dom_clobbering', { name, attribute: attr, tag, shadows }, 'critical')
        }
      }
    })
    return found
  }
}
