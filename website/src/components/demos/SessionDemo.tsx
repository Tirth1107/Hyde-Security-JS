import React, { useState } from 'react'
import { useHydeSecurity } from 'hyde-security-js'
import { emitLog } from '../LiveLogger'

const SessionDemo = () => {
  const security = useHydeSecurity()
  const [mins, setMins] = useState('1')

  const sessInit = () => {
    const session = (security as any).modules?.session
    if (session) {
      session.init({
        timeoutMinutes: parseInt(mins) || 1,
        onExpire: () => {
          emitLog('session', 'SESSION EXPIRED — storage cleared!', 'error')
          security.toast('Session expired due to inactivity')
        }
      })
      emitLog('session', `Session initialized with ${mins}min timeout`, 'success')
    }
  }

  const sessEnd = () => {
    const session = (security as any).modules?.session
    if (session) {
      session.end()
      emitLog('session', 'Session ended — logout broadcast sent', 'info')
    }
  }

  const sessBroadcast = () => {
    const session = (security as any).modules?.session
    if (session) {
      session.broadcast('logout')
      emitLog('session', 'Broadcast "logout" sent to other tabs', 'info')
    }
  }

  return (
    <>
      <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 12px 0' }}>
        Starts an idle timer. If no activity for N minutes, session expires and storage clears.
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <input 
          type="number"
          value={mins} 
          onChange={e => setMins(e.target.value)}
          placeholder="Timeout (mins)" 
          style={{ width: '120px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '6px 10px', borderRadius: 4, outline: 'none' }}
        />
        <span style={{ fontSize: '13px', color: '#94a3b8' }}>minutes</span>
      </div>
      <div className="btn-row">
        <button onClick={sessInit}>Init Session</button>
        <button className="danger" onClick={sessEnd}>End Session</button>
        <button className="secondary" onClick={sessBroadcast}>Broadcast Logout</button>
      </div>
    </>
  )
}

export default SessionDemo
