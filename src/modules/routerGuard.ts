let originalPush: typeof history.pushState | null = null
let originalReplace: typeof history.replaceState | null = null
let popHandler: ((e: PopStateEvent) => void) | null = null

export const routerGuard = {
  enable(onThreat: (ev: any) => void) {
    if (originalPush) return () => {} // Already enabled

    originalPush = history.pushState
    originalReplace = history.replaceState

    history.pushState = function (...args) {
      onThreat({ id: 'router_push', type: 'navigation', severity: 'info', details: { url: args[2] }, timestamp: Date.now() })
      return originalPush!.apply(this, args)
    }

    history.replaceState = function (...args) {
      onThreat({ id: 'router_replace', type: 'navigation', severity: 'info', details: { url: args[2] }, timestamp: Date.now() })
      return originalReplace!.apply(this, args)
    }
    
    popHandler = (e: PopStateEvent) => {
      onThreat({ id: 'router_pop', type: 'navigation', severity: 'info', details: { state: e.state }, timestamp: Date.now() })
    }
    
    window.addEventListener('popstate', popHandler)
    
    return this.disable.bind(this)
  },
  
  disable() {
    if (originalPush) {
      history.pushState = originalPush
      originalPush = null
    }
    if (originalReplace) {
      history.replaceState = originalReplace
      originalReplace = null
    }
    if (popHandler) {
      window.removeEventListener('popstate', popHandler)
      popHandler = null
    }
  }
}
