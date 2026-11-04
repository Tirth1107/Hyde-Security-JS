import { useEffect, useState } from 'react'

export type Route = 'home' | 'docs' | 'changelog' | 'playground'

const ROUTES: Route[] = ['home', 'docs', 'changelog', 'playground']

function parse(): { route: Route; anchor: string } {
  // "#/docs/events" -> route "docs", anchor "events"
  const [, name = '', anchor = ''] = window.location.hash.split('/')
  const route = (ROUTES as string[]).includes(name) ? (name as Route) : 'home'
  return { route, anchor }
}

export function useRoute() {
  const [state, setState] = useState(parse)
  useEffect(() => {
    const onHash = () => setState(parse())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  useEffect(() => {
    if (state.anchor) document.getElementById(state.anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    else window.scrollTo(0, 0)
  }, [state])
  return state
}
