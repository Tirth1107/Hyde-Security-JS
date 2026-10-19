import React, { useState, useRef } from 'react'
import { useHydeSecurity } from 'hyde-security-js/react'
import { emitLog } from '../LiveLogger'

const RouterGuardDemo = () => {
  const security = useHydeSecurity()
  const [result, setResult] = useState<string | null>(null)
  const stopRouterRef = useRef<(() => void) | null>(null)

  const enableRouter = () => {
    const rg = (security as any).modules?.routerGuard
    if (rg) {
      stopRouterRef.current = rg.protectHistory((loc: any) => {
        const path = `${loc.pathname}${loc.search}${loc.hash}`
        setResult(`Navigation: ${path}`)
        emitLog('router', `Route change: ${path}`, 'info')
      })
      emitLog('router', 'Router guard ENABLED', 'success')
    }
  }

  const testPush = () => {
    const path = '/test-route-' + Math.floor(Math.random() * 100)
    history.pushState({}, '', path)
    emitLog('router', `Pushed: ${path}`, 'info')
  }

  const disableRouter = () => {
    if (stopRouterRef.current) {
      stopRouterRef.current()
      stopRouterRef.current = null
    }
    history.pushState({}, '', '/')
    emitLog('router', 'Router guard DISABLED', 'info')
    setResult(null)
  }

  return (
    <>
      <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 12px 0' }}>
        Intercepts <code>history.pushState</code> and popstate events.
      </p>
      <div className="btn-row">
        <button onClick={enableRouter}>Enable Guard</button>
        <button className="secondary" onClick={testPush}>Simulate pushState</button>
        <button className="secondary" onClick={disableRouter}>Disable</button>
      </div>
      <div style={{ 
        marginTop: 12, padding: 8, background: 'rgba(0,0,0,0.3)', borderRadius: 4, 
        border: '1px solid rgba(255,255,255,0.05)', fontSize: '13px', wordBreak: 'break-all',
        color: result ? '#0ea5e9' : '#94a3b8'
      }}>
        {result || '// Navigation events appear here'}
      </div>
    </>
  )
}

export default RouterGuardDemo
