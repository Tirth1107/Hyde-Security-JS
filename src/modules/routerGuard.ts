import { createReporter, ThreatListener } from '../core/events'
import { patchMethod, PatchGroup } from '../core/hooks'

const reporter = createReporter('routerGuard', 'info')
let group: PatchGroup | null = null
let popHandler: ((e: PopStateEvent) => void) | null = null

export const routerGuard = {
  /** Report every client-side navigation (pushState / replaceState / back-forward) */
  enable(onThreat?: ThreatListener) {
    if (typeof window === 'undefined' || group) return () => this.disable()
    reporter.setCallback(onThreat)
    group = new PatchGroup()
    group.add(patchMethod(history, 'pushState', original => function (this: any, ...args: any[]) {
      reporter.report('navigation', { method: 'pushState', url: args[2] })
      return original.apply(this, args)
    }))
    group.add(patchMethod(history, 'replaceState', original => function (this: any, ...args: any[]) {
      reporter.report('navigation', { method: 'replaceState', url: args[2] })
      return original.apply(this, args)
    }))
    popHandler = (e: PopStateEvent) => reporter.report('navigation', { method: 'popstate', state: e.state })
    window.addEventListener('popstate', popHandler)
    return () => this.disable()
  },

  disable() {
    group?.restoreAll()
    group = null
    if (popHandler) window.removeEventListener('popstate', popHandler)
    popHandler = null
  }
}
