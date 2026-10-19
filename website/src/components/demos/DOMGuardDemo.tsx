import React, { useRef } from 'react'
import { useHydeSecurity } from 'hyde-security-js'
import { emitLog } from '../LiveLogger'

const DOMGuardDemo = () => {
  const security = useHydeSecurity()
  const stopGuardRef = useRef<(() => void) | null>(null)

  const enableGuard = () => {
    // `security.security` provides access to the raw HydeSecurity API which contains protectElement
    stopGuardRef.current = security.security.protectElement('#guarded-el')
    emitLog('domguard', 'Self-Healing DOM Guard ENABLED on #guarded-el', 'success')
  }

  const simulateTamper = () => {
    const text = document.getElementById('guarded-text')
    if (text) {
      text.textContent = '🚨 TAMPERED CONTENT — ' + Date.now()
      text.style.color = '#ef4444'
    } else {
      const el = document.getElementById('guarded-el')
      if (el) el.remove()
    }
    emitLog('domguard', 'Manual tamper simulation triggered', 'info')
  }

  return (
    <>
      <div className="glass-panel" id="guarded-el" style={{ padding: 12, marginBottom: 12, background: 'rgba(255,255,255,0.05)' }}>
        <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase' }}>Guarded Element</span>
        <p id="guarded-text" style={{ fontSize: '14px', margin: '8px 0 0 0', color: '#f8fafc' }}>
          This content is protected. Try deleting it in DevTools or click Simulate Tamper!
        </p>
      </div>
      <div className="btn-row">
        <button onClick={enableGuard}>Enable Guard</button>
        <button className="secondary" onClick={simulateTamper}>Simulate Tamper</button>
      </div>
    </>
  )
}

export default DOMGuardDemo
