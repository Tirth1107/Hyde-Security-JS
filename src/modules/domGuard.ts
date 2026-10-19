const OBSERVE_ELEMENT: MutationObserverInit = {
  childList: true,
  attributes: true,
  subtree: true,
  characterData: true
}

function emitThreat(selector: string, type: string, extra?: Record<string, any>) {
  document.dispatchEvent(new CustomEvent('hyde:threat', {
    detail: { source: 'domGuard', selector, type, ...extra }
  }))
}

export const domGuard = {
  /**
   * Watch an element for tampering (attribute, content or removal).
   * With `selfHealing`, a modified or removed element is put back from a
   * snapshot taken when `protect()` was called.
   * Returns a function that stops watching.
   */
  protect(selector: string, onTamper: () => void, selfHealing: boolean = false) {
    if (typeof window === 'undefined' || typeof document === 'undefined') return () => {}

    const first = document.querySelector(selector)
    if (!first) return () => {}

    const snapshot = first.cloneNode(true) as Element
    let current: Element = first
    let parent: Node | null = first.parentNode
    let next: Node | null = first.nextSibling
    let stopped = false

    const elementObserver = new MutationObserver((mutations) => {
      if (stopped || mutations.length === 0) return
      onTamper()
      emitThreat(selector, mutations[0].type)
      if (selfHealing) heal(() => {
        const fresh = snapshot.cloneNode(true) as Element
        current.replaceWith(fresh)
        return fresh
      })
    })

    // Watches the whole document so removal is caught even if the parent is replaced.
    const removalObserver = new MutationObserver(() => {
      if (stopped || document.contains(current)) return
      onTamper()
      if (!selfHealing) {
        emitThreat(selector, 'node_removed', { healed: false })
        stop()
        return
      }
      const target = parent && document.contains(parent) ? parent : null
      if (!target) {
        // Original parent is gone too; nowhere sensible to put it back
        emitThreat(selector, 'node_removed', { healed: false })
        stop()
        return
      }
      emitThreat(selector, 'node_removed', { healed: true })
      heal(() => {
        const fresh = snapshot.cloneNode(true) as Element
        const ref = next && next.parentNode === target ? next : null
        target.insertBefore(fresh, ref)
        return fresh
      })
    })

    function watch(el: Element) {
      current = el
      parent = el.parentNode
      next = el.nextSibling
      elementObserver.disconnect()
      elementObserver.observe(el, OBSERVE_ELEMENT)
    }

    function heal(restore: () => Element) {
      try {
        watch(restore())
      } catch (e) {
        console.error('[HydeSecurity] Failed to self-heal element:', e)
      }
      // Drop the mutation records caused by our own repair
      elementObserver.takeRecords()
      removalObserver.takeRecords()
    }

    function stop() {
      stopped = true
      elementObserver.disconnect()
      removalObserver.disconnect()
    }

    watch(first)
    removalObserver.observe(document.documentElement, { childList: true, subtree: true })

    return stop
  }
}
