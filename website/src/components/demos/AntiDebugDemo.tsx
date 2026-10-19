import React from 'react'
import { useHydeSecurity } from 'hyde-security-js/react'
import { emitLog } from '../LiveLogger'

const AntiDebugDemo = () => {
  const security = useHydeSecurity()

  const enableAD = () => {
    const ad = (security as any).modules?.antiDebug
    if (ad) {
      ad.enable({
        onThreat: (ev: any) => {
          emitLog('debug', `Debugger detected! Delta: ${ev.details?.delta?.toFixed(0)}ms`, 'error')
          security.toast('Debugger timing trap triggered!')
        }
      })
      emitLog('debug', 'Anti-debug timing trap ENABLED', 'success')
    }
  }

  const disableAD = () => {
    const ad = (security as any).modules?.antiDebug
    if (ad) {
      ad.disable()
      emitLog('debug', 'Anti-debug DISABLED', 'info')
    }
  }

  return (
    <>
      <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 12px 0' }}>
        Starts a timing loop — if a debugger pauses execution, the delta spike is detected.
      </p>
      <div className="btn-row">
        <button onClick={enableAD}>Enable Timing Trap</button>
        <button className="secondary" onClick={disableAD}>Disable</button>
      </div>
    </>
  )
}

export default AntiDebugDemo
