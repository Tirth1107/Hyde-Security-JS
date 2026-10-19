import React, { useState } from 'react'
import { useHydeSecurity } from 'hyde-security-js/react'
import { emitLog } from '../LiveLogger'

const CookieDemo = () => {
  const security = useHydeSecurity()
  const [key, setKey] = useState('hyde_test')
  const [val, setVal] = useState('secure_value_123')
  const [result, setResult] = useState<{ text: string, type: 'success' | 'error' | 'info' } | null>(null)

  const ckSet = () => {
    (security as any).modules?.cookie?.set(key, val, 7)
    emitLog('cookie', `Cookie "${key}" set for 7 days`, 'success')
    setResult({ text: 'Cookie set', type: 'success' })
  }

  const ckGet = () => {
    const v = (security as any).modules?.cookie?.get(key)
    if (v !== null) {
      setResult({ text: String(v), type: 'success' })
      emitLog('cookie', `Cookie "${key}" = ${v}`, 'success')
    } else {
      setResult({ text: 'null (not found)', type: 'error' })
      emitLog('cookie', `Cookie "${key}" not found`, 'info')
    }
  }

  const ckRemove = () => {
    (security as any).modules?.cookie?.remove(key)
    setResult({ text: 'Cookie removed', type: 'info' })
    emitLog('cookie', `Cookie "${key}" removed`, 'info')
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        <input 
          value={key} onChange={e => setKey(e.target.value)}
          placeholder="Cookie name" 
          style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '6px 10px', borderRadius: 4, outline: 'none' }}
        />
        <input 
          value={val} onChange={e => setVal(e.target.value)}
          placeholder="Cookie value" 
          style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '6px 10px', borderRadius: 4, outline: 'none' }}
        />
      </div>
      <div className="btn-row">
        <button onClick={ckSet}>Set Cookie</button>
        <button className="secondary" onClick={ckGet}>Get Cookie</button>
        <button className="danger" onClick={ckRemove}>Remove</button>
      </div>
      <div style={{ 
        marginTop: 12, padding: 8, background: 'rgba(0,0,0,0.3)', borderRadius: 4, 
        border: '1px solid rgba(255,255,255,0.05)', fontSize: '13px', wordBreak: 'break-all',
        color: result ? (result.type === 'error' ? '#ef4444' : (result.type === 'info' ? '#0ea5e9' : '#22c55e')) : '#94a3b8'
      }}>
        {result ? result.text : '// Result appears here'}
      </div>
    </>
  )
}

export default CookieDemo
