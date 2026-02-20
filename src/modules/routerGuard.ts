export const routerGuard = {
  protectHistory(onChange: (loc: Location) => void) {
    const orig = window.history.pushState.bind(window.history)
    window.history.pushState = function (state: any, unused: string, url?: string | URL | null) {
      orig(state, unused, url)
      onChange(window.location)
    } as any
    window.addEventListener('popstate', () => onChange(window.location))
    return () => {
      window.history.pushState = orig as any
    }
  }
}
