import React, { useState, useEffect } from 'react'
import { useHydeSecurity } from 'hyde-security-js/react'
import { emitLog } from '../LiveLogger'

const XSSDemo = () => {
  const security = useHydeSecurity()
  const [val, setVal] = useState('')
  const [safe, setSafe] = useState('// Output will appear here')

  useEffect(() => {
    // Avoid HTML parser issues
    setVal("<img src=x onerror=alert('Hacked!')>" + "<scr" + "ipt>steal(cookies)</" + "scr" + "ipt>")
  }, [])

  const runXSS = () => {
    const s = (security as any).security?.safeHTML?.(val) || ''
    setSafe(s)
    if (val !== s) {
      emitLog('xss', `Cleaned: removed ${val.length - s.length} chars of malicious content`, 'success')
      security.toast('XSS Attack Blocked!')
    } else {
      emitLog('xss', 'Input was already safe', 'info')
    }
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
        <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase' }}>Malicious Input</span>
        <textarea 
          rows={3} 
          value={val} 
          onChange={e => setVal(e.target.value)}
          style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '6px 10px', borderRadius: 4, outline: 'none', resize: 'vertical' }}
        />
      </div>
      <div className="btn-row">
        <button onClick={runXSS}>Sanitize</button>
      </div>
      <div style={{ marginTop: 12 }}>
        <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase' }}>Safe Output</span>
        <div style={{ 
          marginTop: 4, padding: 8, background: 'rgba(0,0,0,0.3)', borderRadius: 4, 
          border: '1px solid rgba(255,255,255,0.05)', fontSize: '13px', wordBreak: 'break-all',
          color: safe.includes('//') ? '#94a3b8' : '#22c55e'
        }}>
          {safe}
        </div>
      </div>
    </>
  )
}

export default XSSDemo
