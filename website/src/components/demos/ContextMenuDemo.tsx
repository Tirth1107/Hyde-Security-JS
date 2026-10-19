import React from 'react'
import { useHydeSecurity } from 'hyde-security-js/react'
import { emitLog } from '../LiveLogger'

const ContextMenuDemo = () => {
  const security = useHydeSecurity()

  const enableCtx = () => {
    const ctx = (security as any).modules?.antiContextMenu
    if (ctx) {
      ctx.enable({
        onThreat: (ev: any) => emitLog('ctx-menu', 'Right-click blocked!', 'error')
      })
      emitLog('ctx-menu', 'Context menu blocking ENABLED', 'success')
    }
  }

  const disableCtx = () => {
    const ctx = (security as any).modules?.antiContextMenu
    if (ctx) {
      ctx.disable()
      emitLog('ctx-menu', 'Context menu blocking DISABLED', 'info')
    }
  }

  return (
    <>
      <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8, marginBottom: 12 }}>
        <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase' }}>Right-Click Here</span>
        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#f8fafc' }}>
          Try right-clicking anywhere on the page after enabling.
        </p>
      </div>
      <div className="btn-row">
        <button onClick={enableCtx}>Block Context Menu</button>
        <button className="secondary" onClick={disableCtx}>Allow Context Menu</button>
      </div>
    </>
  )
}

export default ContextMenuDemo
