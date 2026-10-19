import React, { useState } from 'react'
import { useHydeSecurity } from 'hyde-security-js'
import { emitLog } from '../LiveLogger'

const StorageDemo = () => {
  const security = useHydeSecurity()
  const [key, setKey] = useState('test-key')
  const [val, setVal] = useState('Hello Secure World!')
  const [result, setResult] = useState<{ text: string, type: 'success' | 'error' | 'info' } | null>(null)

  const stSet = () => {
    (security as any).modules?.storage?.set(key, val)
    emitLog('storage', `Set "${key}" = "${val}"`, 'success')
  }

  const stSetEnc = () => {
    (security as any).modules?.storage?.set(key, val, { encrypt: true })
    emitLog('storage', `Set "${key}" (encrypted)`, 'success')
  }

  const stGet = () => {
    const v = (security as any).modules?.storage?.get(key)
    if (v !== null) {
      setResult({ text: String(v), type: 'success' })
      emitLog('storage', `Get "${key}" → ${String(v).substring(0, 50)}`, 'success')
    } else {
      setResult({ text: 'null (not found)', type: 'error' })
      emitLog('storage', `Get "${key}" → null`, 'error')
    }
  }

  const stGetDec = () => {
    const v = (security as any).modules?.storage?.get(key, { decrypt: true })
    if (v) {
      setResult({ text: String(v), type: 'success' })
      emitLog('storage', `Get+Decrypt "${key}" → ${v}`, 'success')
    } else {
      setResult({ text: 'null (not found or decryption failed)', type: 'error' })
      emitLog('storage', `Get+Decrypt "${key}" → null`, 'error')
    }
  }

  const stClear = () => {
    (security as any).modules?.storage?.clear()
    setResult({ text: 'Storage cleared', type: 'info' })
    emitLog('storage', 'All storage cleared', 'info')
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        <input 
          value={key} onChange={e => setKey(e.target.value)}
          placeholder="Key" 
          style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '6px 10px', borderRadius: 4, outline: 'none' }}
        />
        <input 
          value={val} onChange={e => setVal(e.target.value)}
          placeholder="Value" 
          style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '6px 10px', borderRadius: 4, outline: 'none' }}
        />
      </div>
      <div className="btn-row">
        <button onClick={stSet}>Set</button>
        <button className="secondary" onClick={stSetEnc}>Set (Encrypted)</button>
        <button className="secondary" onClick={stGet}>Get</button>
        <button className="secondary" onClick={stGetDec}>Get (Decrypt)</button>
        <button className="danger" onClick={stClear}>Clear All</button>
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

export default StorageDemo
