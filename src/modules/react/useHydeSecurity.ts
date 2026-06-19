import { useHydeSecurityContext } from './HydeSecurityProvider'

export function useHydeSecurity() {
  const ctx = useHydeSecurityContext()
  return {
    ...ctx,
    // Convenience shortcuts
    init: ctx.security.init,
    destroy: ctx.security.destroy,
    setMode: ctx.security.setMode,
    toast: ctx.security.toast,
    lockScreen: ctx.security.lockScreen,
    unlockScreen: ctx.security.unlockScreen,
    modules: ctx.security.modules
  }
}
