import React, { useState } from 'react'
import { useHydeSecurity } from 'hyde-security-js'
import { emitLog } from '../LiveLogger'

const TabGuardDemo = () => {
  const security = useHydeSecurity()
  const [status, setStatus] = useState<{ text: string, color: string } | null>(null)

  const enableTabGuard = () => {
    const tg = (security as any).modules?.tabGuard
    if (tg) {
      tg.enable({
        blurOnWindowBlur: true,
        onThreat: (ev: any) => emitLog('tabguard', 'Event: ' + ev.type, ev.type === 'tab_hidden' ? 'error' : 'success')
      })
      emitLog('tabguard', 'Tab Guard ENABLED — try switching tabs!', 'success')
      setStatus({ text: '🛡️ Active — switch to another tab to test', color: '#22c55e' })
    }
  }

  const disableTabGuard = () => {
    const tg = (security as any).modules?.tabGuard
    if (tg) {
      tg.disable()
      emitLog('tabguard', 'Tab Guard DISABLED', 'info')
      setStatus({ text: 'Disabled', color: '#7b8fa6' })
    }
  }

  const checkTabStatus = () => {
    const tg = (security as any).modules?.tabGuard
    if (tg) {
      const s = tg.getStatus()
      setStatus({ text: JSON.stringify(s), color: '#0ea5e9' })
      emitLog('tabguard', `Status — enabled: ${s.enabled}, hidden: ${s.hidden}`, 'info')
    }
  }

  return (
    <>
      <div className="btn-row">
        <button onClick={enableTabGuard}>Enable Tab Guard</button>
        <button className="secondary" onClick={disableTabGuard}>Disable</button>
        <button className="secondary" onClick={checkTabStatus}>Check Status</button>
      </div>
      <div style={{ 
        marginTop: 12, padding: 8, background: 'rgba(0,0,0,0.3)', borderRadius: 4, 
        border: '1px solid rgba(255,255,255,0.05)', fontSize: '13px',
        color: status ? status.color : '#94a3b8'
      }}>
        {status ? status.text : '// Switch tabs to see the privacy blur'}
      </div>
    </>
  )
}

export default TabGuardDemo
