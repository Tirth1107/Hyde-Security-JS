/**
 * In-house DevTools detection (replaces the `devtools-detector` dependency).
 *
 * No eval, no `Function(...)`, so it is safe under a strict CSP. Each check uses a
 * side effect that only happens while a DevTools console is open:
 *  - Chrome: the console formats a logged Date twice (toString called 2x).
 *  - Firefox and other non-WebKit engines: the console calls a logged RegExp's toString.
 *  - Safari: the console reads a logged element's `id`.
 *  - All: `console.table` of a large array is much slower than `console.log` when open.
 *
 * This is a deterrent. Anyone who controls the browser can hide DevTools from it.
 */

export type DevtoolsListener = (open: boolean, method: string) => void

export interface DevtoolsChecker {
  name: string
  enabled(): boolean
  isOpen(): boolean
}

// Captured at load, so modules that silence the console (obfuscator) don't break detection
const nativeConsole = typeof console !== 'undefined'
  ? { log: console.log, table: console.table, clear: console.clear }
  : null

const ua = () => (typeof navigator === 'undefined' ? '' : navigator.userAgent)
const isFirefox = () => /firefox|fxios/i.test(ua())
const isChrome = () => /chrome|chromium|crios|edg\//i.test(ua()) && !isFirefox()
const isSafari = () => /safari/i.test(ua()) && !isChrome() && !isFirefox()
const isWebkit = () => /applewebkit/i.test(ua()) && !isFirefox()
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

function call(fn: ((...a: any[]) => void) | undefined, ...args: any[]) {
  try { fn?.apply(console, args) } catch { /* console may be replaced */ }
}

function clear() {
  call(nativeConsole?.clear)
}

const dateChecker: DevtoolsChecker = (() => {
  let count = 0
  const date = new Date()
  date.toString = () => { count++; return '' }
  return {
    name: 'date-to-string',
    enabled: () => isChrome() && !/iphone|ipad/i.test(ua()),
    isOpen() {
      count = 0
      call(nativeConsole?.log, date)
      clear()
      return count >= 2
    }
  }
})()

const regChecker: DevtoolsChecker = (() => {
  let hit = false
  const reg = / /
  reg.toString = () => { hit = true; return '' }
  return {
    name: 'reg-to-string',
    enabled: () => !isWebkit(),
    isOpen() {
      hit = false
      call(nativeConsole?.log, reg)
      clear()
      return hit
    }
  }
})()

const elementChecker: DevtoolsChecker = (() => {
  let hit = false
  let el: HTMLElement | null = null
  return {
    name: 'element-id',
    enabled: () => isSafari() && typeof document !== 'undefined',
    isOpen() {
      if (!el) {
        el = document.createElement('div')
        Object.defineProperty(el, 'id', { get() { hit = true; return '' }, configurable: true })
      }
      hit = false
      call(nativeConsole?.log, el)
      clear()
      return hit
    }
  }
})()

const performanceChecker: DevtoolsChecker = (() => {
  let rows: Record<string, string>[] | null = null
  let maxLog = 0
  const big = () => {
    if (!rows) {
      const row: Record<string, string> = {}
      for (let i = 0; i < 500; i++) row[String(i)] = String(i)
      rows = Array.from({ length: 50 }, () => row)
    }
    return rows
  }
  const time = (fn: (() => void)) => { const t = now(); fn(); return now() - t }
  return {
    name: 'performance',
    enabled: () => !!nativeConsole?.table,
    isOpen() {
      const data = big()
      const tableTime = time(() => call(nativeConsole?.table, data))
      const logTime = Math.max(time(() => call(nativeConsole?.log, data)), time(() => call(nativeConsole?.log, data)))
      maxLog = Math.max(maxLog, logTime)
      clear()
      if (tableTime === 0 || maxLog === 0) return false
      return tableTime > maxLog * 10
    }
  }
})()

/**
 * Opt-in: a docked panel makes outer and inner window sizes differ a lot. Not in the
 * defaults because browser sidebars, vertical tabs and page zoom cause false hits.
 */
export const windowSizeChecker: DevtoolsChecker = {
  name: 'window-size',
  enabled: () => typeof window !== 'undefined' && window.outerWidth > 0,
  isOpen() {
    // Same thresholds as the widely used devtools-detect heuristic; page zoom can cause false hits
    const threshold = 170
    const w = window.outerWidth - window.innerWidth
    const h = window.outerHeight - window.innerHeight
    return w > threshold || h > threshold + 80
  }
}

export const defaultCheckers: DevtoolsChecker[] = [dateChecker, regChecker, elementChecker, performanceChecker]

export interface DevtoolsDetector {
  addListener(fn: DevtoolsListener): void
  removeListener(fn: DevtoolsListener): void
  launch(intervalMs?: number): void
  stop(): void
  /** Runs every enabled checker once */
  check(): { open: boolean; method: string }
  readonly isOpen: boolean
}

export function createDevtoolsDetector(checkers: DevtoolsChecker[] = defaultCheckers): DevtoolsDetector {
  let listeners: DevtoolsListener[] = []
  let timer: ReturnType<typeof setInterval> | null = null
  let open = false

  const check = () => {
    for (const c of checkers) {
      let enabled = false
      try { enabled = c.enabled() } catch { /* ignore */ }
      if (!enabled) continue
      let hit = false
      try { hit = c.isOpen() } catch { /* ignore */ }
      if (hit) return { open: true, method: c.name }
    }
    return { open: false, method: '' }
  }

  const tick = () => {
    const r = check()
    if (r.open === open) return
    open = r.open
    for (const fn of listeners.slice()) {
      try { fn(open, r.method) } catch { /* a listener must not break the loop */ }
    }
  }

  return {
    addListener(fn) { listeners.push(fn) },
    removeListener(fn) { listeners = listeners.filter(l => l !== fn) },
    launch(intervalMs = 1000) {
      if (timer || typeof window === 'undefined') return
      timer = setInterval(tick, intervalMs)
      tick()
    },
    stop() {
      if (timer) clearInterval(timer)
      timer = null
      open = false
    },
    check,
    get isOpen() { return open }
  }
}
