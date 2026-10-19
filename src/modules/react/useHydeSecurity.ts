import { useHydeSecurityContext } from './HydeSecurityProvider'

export function useHydeSecurity() {
  const ctx = useHydeSecurityContext()
  return {
    ...ctx,
    // Convenience shortcuts bound to context
    init: ctx.security?.init.bind(ctx.security),
    destroy: ctx.security?.destroy.bind(ctx.security),
    setMode: ctx.security?.setMode.bind(ctx.security),
    toast: ctx.security?.toast.bind(ctx.security),
    lockScreen: ctx.security?.lockScreen.bind(ctx.security),
    unlockScreen: ctx.security?.unlockScreen.bind(ctx.security),
    modules: ctx.security?.modules
  }
}
