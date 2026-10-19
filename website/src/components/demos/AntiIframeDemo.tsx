import React, { useState } from 'react'
import { emitLog } from '../LiveLogger'

const AntiIframeDemo = () => {
  const [result, setResult] = useState<{ text: string, type: 'info' | 'success' | 'error' } | null>(null)

  const checkIframe = () => {
    try {
      const inIframe = window.self !== window.top
      if (inIframe) {
        setResult({ text: '⚠️ Running inside an iframe!', type: 'error' })
        emitLog('iframe', 'Iframe detected!', 'error')
      } else {
        setResult({ text: '✅ Running as top-level window', type: 'success' })
        emitLog('iframe', 'Not in iframe — safe', 'success')
      }
    } catch (e) {
      setResult({ text: '⚠️ Cross-origin iframe detected (access blocked)', type: 'error' })
      emitLog('iframe', 'Cross-origin iframe detection blocked', 'error')
    }
  }

  return (
    <>
      <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 12px 0' }}>
        Checks if <code>window.self !== window.top</code> and reports.
      </p>
      <div className="btn-row">
        <button onClick={checkIframe}>Check Iframe Status</button>
      </div>
      <div style={{ 
        marginTop: 12, padding: 8, background: 'rgba(0,0,0,0.3)', borderRadius: 4, 
        border: '1px solid rgba(255,255,255,0.05)', fontSize: '13px',
        color: result ? (result.type === 'error' ? '#ef4444' : '#22c55e') : '#94a3b8'
      }}>
        {result ? result.text : '// Click to check'}
      </div>
    </>
  )
}

export default AntiIframeDemo
