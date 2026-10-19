import React from 'react'
import { useHydeSecurity } from 'hyde-security-js'
import { emitLog } from '../LiveLogger'

const AntiCopyDemo = () => {
  const security = useHydeSecurity()

  const enableCopy = () => {
    const ac = (security as any).modules?.antiCopy
    if (ac) {
      ac.enable({
        disableSelection: true,
        onThreat: (ev: any) => emitLog('anti-copy', `Blocked: ${ev.type}`, 'error')
      })
      emitLog('anti-copy', 'Content protection ENABLED', 'success')
      security.toast('Copy protection enabled')
    }
  }

  const disableCopy = () => {
    const ac = (security as any).modules?.antiCopy
    if (ac) {
      ac.disable()
      emitLog('anti-copy', 'Content protection DISABLED', 'info')
    }
  }

  return (
    <>
      <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8, marginBottom: 12, userSelect: 'auto' }}>
        <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase' }}>Protected Zone</span>
        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#f8fafc' }}>
          Try to select and copy this text. Toggle the protection to enable/disable.
        </p>
      </div>
      <div className="btn-row">
        <button onClick={enableCopy}>Enable Protection</button>
        <button className="secondary" onClick={disableCopy}>Disable Protection</button>
      </div>
    </>
  )
}

export default AntiCopyDemo
