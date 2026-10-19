import { useEffect, useState } from 'react'
import { useHydeSecurityContext } from './HydeSecurityProvider'
import { events, HydeSecurityEvent } from '../../core/events'
import type { AuditResult } from '../securityAudit'

export function useHydeSecurity() {
  const ctx = useHydeSecurityContext()
  const s = ctx.security
  return {
    ...ctx,
    init: s?.init.bind(s),
    destroy: s?.destroy.bind(s),
    setMode: s?.setMode.bind(s),
    toast: s?.toast.bind(s),
    lockScreen: s?.lockScreen.bind(s),
    unlockScreen: s?.unlockScreen.bind(s),
    lockdown: s?.lockdown.bind(s),
    on: s?.on.bind(s),
    modules: s?.modules
  }
}

/**
 * Live list of threat events (newest first).
 * `filter` is a type, 'source:<module>', or '*'.
 */
export function useThreats(filter = '*', limit = 50): HydeSecurityEvent[] {
  const [list, setList] = useState<HydeSecurityEvent[]>(() => {
    const h = events.history().slice().reverse()
    return h.filter(e => filter === '*' || e.type === filter || `source:${e.source}` === filter).slice(0, limit)
  })
  useEffect(() => {
    return events.on(filter, ev => setList(prev => [ev, ...prev].slice(0, limit)))
  }, [filter, limit])
  return list
}

/** Run the security audit once on mount */
export function useSecurityAudit(): { result: AuditResult | null; loading: boolean; rerun: () => void } {
  const ctx = useHydeSecurityContext()
  const [result, setResult] = useState<AuditResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [n, setN] = useState(0)
  useEffect(() => {
    let alive = true
    setLoading(true)
    ctx.security?.audit().then(r => {
      if (alive) {
        setResult(r)
        setLoading(false)
      }
    }).catch(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [n])
  return { result, loading, rerun: () => setN(x => x + 1) }
}
