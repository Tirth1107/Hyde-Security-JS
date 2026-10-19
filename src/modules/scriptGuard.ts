/**
 * scriptGuard — client-side supply-chain protection.
 *
 * Built around PCI DSS 4.0 requirements 6.4.3 (inventory + authorize every
 * payment-page script) and 11.6.1 (alert on unauthorized changes):
 *
 *  - Inventory: every <script> on the page with origin, SRI, and inline SHA-256
 *  - Authorization: allowlist of hosts / inline hashes; others are reported
 *  - Enforcement: in 'enforce' mode, unauthorized scripts inserted after enable()
 *    are neutralized *before* the browser runs them
 *  - Change detection: compares against the inventory saved on earlier visits
 *  - Audit export: JSON report for assessors
 *
 * Parser-inserted scripts that ran before enable() can only be reported.
 * Load HydeSecurity first (and use CSP) for the strongest setup.
 */
import { createReporter, ThreatListener } from '../core/events'
import { patchMethod, PatchGroup } from '../core/hooks'
import { currentStackUrls, isAllowedUrl, originOf } from '../core/callsite'
import { sha256SriSync } from '../core/sha256'
import { safeDom } from '../core/dom'

export interface ScriptRecord {
  /** 'external' (has src) or 'inline' */
  kind: 'external' | 'inline'
  src?: string
  origin?: string | null
  /** sha256-... of inline content */
  hash?: string
  /** integrity="" attribute (external) */
  integrity?: string | null
  type?: string
  authorized: boolean
  reason: string
  /** Inserted after enable() (vs. present at load) */
  dynamic: boolean
  /** Script URLs on the stack when it was inserted (dynamic only) */
  insertedBy?: string[]
  blocked: boolean
  firstSeen: number
}

export interface ScriptGuardOptions {
  /** Hosts/origins/wildcards allowed to serve scripts. Same-origin is always allowed. */
  allow?: string[]
  /** Allowed inline script hashes ('sha256-...') */
  allowInlineHashes?: string[]
  /** Allow all inline scripts present at page load (default true; dynamic ones are still checked) */
  allowInitialInline?: boolean
  /** 'report' (default) or 'enforce' */
  mode?: 'report' | 'enforce'
  /** Third-party scripts must carry an integrity attribute (default false) */
  requireIntegrity?: boolean
  /** Persist inventory in localStorage and report changes between visits (default true) */
  trackChanges?: boolean
  /** localStorage key for the baseline */
  baselineKey?: string
  onThreat?: ThreatListener
}

const reporter = createReporter('scriptGuard', 'critical')
const EXEC_TYPES = new Set(['', 'text/javascript', 'application/javascript', 'module', 'text/ecmascript', 'application/ecmascript'])
const BLOCKED_TYPE = 'text/hyde-blocked'

let opts: Required<Omit<ScriptGuardOptions, 'onThreat'>> | null = null
let group: PatchGroup | null = null
let observer: MutationObserver | null = null
let inventory: ScriptRecord[] = []
let seen = new WeakSet<HTMLScriptElement>()
const runtimeAllowHosts: string[] = []
const runtimeAllowHashes = new Set<string>()

function isExecutable(s: HTMLScriptElement) {
  return EXEC_TYPES.has((s.getAttribute('type') || '').trim().toLowerCase())
}

function evaluate(s: HTMLScriptElement, dynamic: boolean): Omit<ScriptRecord, 'firstSeen' | 'blocked' | 'insertedBy'> {
  const o = opts!
  const type = s.getAttribute('type') || ''
  const src = s.getAttribute('src')
  if (src) {
    const abs = (() => { try { return new URL(src, location.href).href } catch (e) { return src } })()
    const origin = originOf(abs)
    const integrity = s.getAttribute('integrity')
    const sameOrigin = origin === location.origin
    const allowed = isAllowedUrl(abs, [...o.allow, ...runtimeAllowHosts])
    let authorized = allowed
    let reason = allowed ? (sameOrigin ? 'same-origin' : 'allowlisted host') : 'host not in allowlist'
    if (allowed && !sameOrigin && o.requireIntegrity && !integrity) {
      authorized = false
      reason = 'third-party script without integrity attribute'
    }
    return { kind: 'external', src: abs, origin, integrity, type, authorized, reason, dynamic }
  }
  const hash = sha256SriSync(s.textContent || '')
  const hashOk = o.allowInlineHashes.includes(hash) || runtimeAllowHashes.has(hash)
  const initialOk = !dynamic && o.allowInitialInline
  const authorized = hashOk || initialOk
  return {
    kind: 'inline', hash, type, dynamic, authorized,
    reason: hashOk ? 'allowlisted hash' : initialOk ? 'present at page load' : 'inline hash not allowlisted'
  }
}

/** Decide on a script element. Returns true if it was neutralized. */
function inspect(s: HTMLScriptElement, dynamic: boolean): boolean {
  if (seen.has(s) || !opts) return false
  if (!isExecutable(s)) {
    // JSON-LD, templates, already-blocked scripts: not code
    seen.add(s)
    return false
  }
  // Inline script with no content yet (content set after insertion): check later
  if (dynamic && !s.src && !(s.textContent || '').trim()) return false
  seen.add(s)

  const rec = evaluate(s, dynamic)
  const insertedBy = dynamic ? currentStackUrls().slice(0, 5) : undefined
  const block = !rec.authorized && dynamic && opts.mode === 'enforce'
  if (block) {
    // A non-JS type stops the browser from executing it on insertion
    s.setAttribute('data-hyde-original-type', s.getAttribute('type') || '')
    s.setAttribute('type', BLOCKED_TYPE)
  }
  const record: ScriptRecord = { ...rec, insertedBy, blocked: block, firstSeen: Date.now() }
  inventory.push(record)

  if (!rec.authorized) {
    reporter.report(block ? 'script_blocked' : 'script_unauthorized', {
      src: rec.src, hash: rec.hash, reason: rec.reason, dynamic, insertedBy
    }, block || dynamic ? 'critical' : 'warning')
  }
  return block
}

function scriptsIn(node: Node): HTMLScriptElement[] {
  if (node instanceof HTMLScriptElement) return [node]
  if (node instanceof Element || node instanceof DocumentFragment) {
    return Array.from(node.querySelectorAll('script'))
  }
  return []
}

function baselineDiff() {
  const o = opts!
  if (!o.trackChanges) return
  const current = inventory.filter(r => !r.dynamic).map(r => r.src ?? r.hash!).sort()
  let previous: string[] | null = null
  try {
    previous = JSON.parse(localStorage.getItem(o.baselineKey) || 'null')
  } catch (e) { }
  if (previous) {
    const added = current.filter(x => !previous!.includes(x))
    const removed = previous.filter(x => !current.includes(x))
    if (added.length) reporter.report('script_inventory_changed', { added, removed }, 'warning')
  }
  try {
    localStorage.setItem(o.baselineKey, JSON.stringify(current))
  } catch (e) { }
}

export const scriptGuard = {
  enable(options: ScriptGuardOptions = {}) {
    if (typeof document === 'undefined') return () => {}
    this.disable()
    reporter.setCallback(options.onThreat)
    opts = {
      allow: options.allow ?? [],
      allowInlineHashes: options.allowInlineHashes ?? [],
      allowInitialInline: options.allowInitialInline ?? true,
      mode: options.mode ?? 'report',
      requireIntegrity: options.requireIntegrity ?? false,
      trackChanges: options.trackChanges ?? true,
      baselineKey: options.baselineKey ?? '__hyde_script_baseline'
    }
    inventory = []
    seen = new WeakSet()

    safeDom.all<HTMLScriptElement>('script').forEach(s => inspect(s, false))
    baselineDiff()

    // Catch dynamic scripts *before* insertion so enforcement can stop execution
    group = new PatchGroup()
    const before = (nodes: any[]) => {
      for (const n of nodes) if (n instanceof Node) scriptsIn(n).forEach(s => inspect(s, true))
    }
    for (const m of ['appendChild', 'insertBefore', 'replaceChild'] as const) {
      group.add(patchMethod(Node.prototype, m, original => function (this: Node, ...args: any[]) {
        before([args[0]])
        return original.apply(this, args)
      }))
    }
    for (const m of ['append', 'prepend', 'before', 'after', 'replaceWith'] as const) {
      group.add(patchMethod(Element.prototype as any, m, original => function (this: Element, ...args: any[]) {
        before(args)
        return original.apply(this, args)
      }))
    }

    // Anything else (document.write, inline scripts filled in after insertion)
    observer = new MutationObserver(muts => {
      for (const m of muts) {
        m.addedNodes.forEach(n => scriptsIn(n).forEach(s => inspect(s, true)))
        if (m.type === 'characterData' || (m.type === 'childList' && m.target instanceof HTMLScriptElement)) {
          const t = m.target instanceof HTMLScriptElement ? m.target : m.target.parentElement
          if (t instanceof HTMLScriptElement) inspect(t, true)
        }
      }
    })
    observer.observe(document.documentElement, { childList: true, subtree: true })
    return () => this.disable()
  },

  disable() {
    group?.restoreAll()
    group = null
    observer?.disconnect()
    observer = null
  },

  isEnabled() {
    return group !== null
  },

  /** Allow a host or inline hash at runtime (e.g. after a consent banner) */
  authorize(hostOrHash: string) {
    if (hostOrHash.startsWith('sha256-')) runtimeAllowHashes.add(hostOrHash)
    else runtimeAllowHosts.push(hostOrHash)
  },

  /** Every script seen since enable() */
  getInventory(): ScriptRecord[] {
    return inventory.map(r => ({ ...r }))
  },

  /** SHA-256 for an inline script, ready for allowInlineHashes or a CSP script-src */
  hashInline(code: string): string {
    return sha256SriSync(code)
  },

  /** JSON report for assessors (PCI DSS 6.4.3 / 11.6.1 evidence) */
  exportReport(): string {
    const inv = this.getInventory()
    return JSON.stringify({
      generatedAt: new Date().toISOString(),
      page: typeof location !== 'undefined' ? location.href : null,
      mode: opts?.mode ?? null,
      allowlist: [...(opts?.allow ?? []), ...runtimeAllowHosts],
      summary: {
        total: inv.length,
        authorized: inv.filter(r => r.authorized).length,
        unauthorized: inv.filter(r => !r.authorized).length,
        blocked: inv.filter(r => r.blocked).length,
        thirdParty: inv.filter(r => r.kind === 'external' && r.origin !== location.origin).length,
        withoutIntegrity: inv.filter(r => r.kind === 'external' && r.origin !== location.origin && !r.integrity).length
      },
      scripts: inv
    }, null, 2)
  },

  /** @internal */
  _reset() {
    this.disable()
    inventory = []
    runtimeAllowHosts.length = 0
    runtimeAllowHashes.clear()
    opts = null
  }
}
