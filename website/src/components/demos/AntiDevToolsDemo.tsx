import React from 'react'
import { useHydeSecurity } from 'hyde-security-js/react'
import { emitLog } from '../LiveLogger'

const AntiDevToolsDemo = () => {
  const security = useHydeSecurity()

  const enableDT = () => {
    const dt = (security as any).modules?.antiDevtools
    if (dt) {
      dt.enable({
        onThreat: (ev: any) => emitLog('devtools', `Threat: ${ev.type}`, 'error')
      })
      emitLog('devtools', 'DevTools detection ENABLED', 'success')
    }
  }

  const disableDT = () => {
    const dt = (security as any).modules?.antiDevtools
    if (dt) {
      dt.disable()
      emitLog('devtools', 'DevTools detection DISABLED', 'info')
    }
  }

  const lockScr = () => {
    security.lockScreen?.('⚠️ Security Lock — DevTools detected')
    emitLog('devtools', 'Screen LOCKED', 'error')
  }

  const unlockScr = () => {
    security.unlockScreen?.()
    emitLog('devtools', 'Screen UNLOCKED', 'success')
  }

  return (
    <>
      <p style={{ fontSize: '13px', color: '#f59e0b', margin: '0 0 12px 0' }}>
        ⚠️ <strong>Aggressive V1 Mode:</strong> Enabling this will unleash the aggressive <code>debugger</code> loop, actively crippling the DevTools panel if opened!
      </p>
      <div className="btn-row">
        <button onClick={enableDT}>Enable Detection</button>
        <button className="secondary" onClick={disableDT}>Disable</button>
      </div>
      <div className="btn-row" style={{ marginTop: 8 }}>
        <button className="danger" onClick={lockScr}>Lock Screen</button>
        <button className="secondary" onClick={unlockScr}>Unlock</button>
      </div>
    </>
  )
}

export default AntiDevToolsDemo
