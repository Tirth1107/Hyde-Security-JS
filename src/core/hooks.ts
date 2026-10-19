/**
 * Safe monkey-patching.
 *
 * Several modules wrap the same browser APIs (fetch, addEventListener, ...).
 * Naive wrapping breaks when they are removed out of order. Here each wrapper
 * checks an `active` flag, so a removed wrapper becomes a pass-through even if
 * another wrapper was installed on top of it later.
 */

type AnyFn = (...args: any[]) => any

export interface Patch {
  /** Stop the wrapper. Restores the original if nothing else wrapped it since. */
  restore(): void
  readonly active: boolean
}

/**
 * Wrap `obj[key]` (a method). `wrap` receives the original function and returns
 * the replacement. Returns a Patch with `restore()`.
 */
export function patchMethod<T extends object, K extends keyof T>(
  obj: T,
  key: K,
  wrap: (original: T[K] & AnyFn) => (this: any, ...args: any[]) => any
): Patch {
  const original = obj[key] as T[K] & AnyFn
  if (typeof original !== 'function') {
    return { restore() {}, active: false }
  }
  let active = true
  const wrapped = wrap(original)
  const replacement = function (this: any, ...args: any[]) {
    if (!active) return original.apply(this, args)
    return wrapped.apply(this, args)
  }
  // Keep name/length looking native-ish for code that inspects them
  try {
    Object.defineProperty(replacement, 'name', { value: (original as AnyFn).name })
  } catch (e) { }
  ;(obj as any)[key] = replacement

  return {
    get active() {
      return active
    },
    restore() {
      if (!active) return
      active = false
      if ((obj as any)[key] === replacement) (obj as any)[key] = original
    }
  }
}

/**
 * Wrap a property setter (e.g. HTMLImageElement.prototype.src). `onSet` runs before
 * the real setter; return `false` to block the assignment.
 */
export function patchSetter(
  proto: object,
  prop: string,
  onSet: (el: any, value: any) => boolean | void
): Patch {
  const desc = Object.getOwnPropertyDescriptor(proto, prop)
  if (!desc || !desc.set || !desc.configurable) {
    return { restore() {}, active: false }
  }
  let active = true
  const newDesc: PropertyDescriptor = {
    ...desc,
    set(this: any, value: any) {
      if (active && onSet(this, value) === false) return
      desc.set!.call(this, value)
    }
  }
  Object.defineProperty(proto, prop, newDesc)
  return {
    get active() {
      return active
    },
    restore() {
      if (!active) return
      active = false
      const current = Object.getOwnPropertyDescriptor(proto, prop)
      if (current && current.set === newDesc.set) Object.defineProperty(proto, prop, desc)
    }
  }
}

/**
 * Wrap a property getter. `onGet` runs before the value is returned.
 */
export function patchGetter(
  proto: object,
  prop: string,
  onGet: (el: any) => void
): Patch {
  const desc = Object.getOwnPropertyDescriptor(proto, prop)
  if (!desc || !desc.get || !desc.configurable) {
    return { restore() {}, active: false }
  }
  let active = true
  const newDesc: PropertyDescriptor = {
    ...desc,
    get(this: any) {
      if (active) onGet(this)
      return desc.get!.call(this)
    }
  }
  Object.defineProperty(proto, prop, newDesc)
  return {
    get active() {
      return active
    },
    restore() {
      if (!active) return
      active = false
      const current = Object.getOwnPropertyDescriptor(proto, prop)
      if (current && current.get === newDesc.get) Object.defineProperty(proto, prop, desc)
    }
  }
}

/** The object in `obj`'s prototype chain that actually owns `key` (or null) */
export function ownerOf(obj: object, key: PropertyKey): object | null {
  let cur: object | null = obj
  while (cur) {
    if (Object.prototype.hasOwnProperty.call(cur, key)) return cur
    cur = Object.getPrototypeOf(cur)
  }
  return null
}

/** Collects patches and cleanup functions so a module can undo everything at once */
export class PatchGroup {
  private items: Array<() => void> = []

  add(p: Patch | (() => void)) {
    this.items.push(typeof p === 'function' ? p : () => p.restore())
    return p
  }

  get size() {
    return this.items.length
  }

  restoreAll() {
    // Undo in reverse order
    while (this.items.length) {
      const fn = this.items.pop()!
      try {
        fn()
      } catch (e) { }
    }
  }
}
