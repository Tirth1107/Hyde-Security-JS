import React, { useState } from 'react'
import { useHydeSecurity } from 'hyde-security-js/react'
import { emitLog } from '../LiveLogger'

const ObfuscatorDemo = () => {
  const security = useHydeSecurity()
  const [val, setVal] = useState("alert('HydeSecurity!')")
  const [result, setResult] = useState<string | null>(null)

  const obfHex = () => {
    const obf = (security as any).modules?.obfuscator
    if (obf) {
      const r = obf.encodeStringHex(val)
      setResult(`Hex: ${r}`)
      emitLog('obfuscator', `Hex encoded (${r.length} chars)`, 'success')
    }
  }

  const obfUnicode = () => {
    const obf = (security as any).modules?.obfuscator
    if (obf) {
      const r = obf.encodeStringUnicode(val)
      setResult(`Unicode: ${r}`)
      emitLog('obfuscator', 'Unicode encoded', 'success')
    }
  }

  const obfBase64 = () => {
    const obf = (security as any).modules?.obfuscator
    if (obf) {
      const r = obf.encodeStringBase64(val)
      setResult(`Base64: ${r}`)
      emitLog('obfuscator', 'Base64 encoded', 'success')
    }
  }

  const obfObfuscate = () => {
    const obf = (security as any).modules?.obfuscator
    if (obf) {
      const r = obf.obfuscateString(val)
      setResult(`Full: ${r}`)
      emitLog('obfuscator', 'Full string obfuscation applied', 'success')
    }
  }

  const obfDisableConsole = () => {
    const obf = (security as any).modules?.obfuscator
    if (obf) {
      obf.disableConsole()
      emitLog('obfuscator', 'Console DISABLED', 'error')
    }
  }

  return (
    <>
      <input 
        value={val} 
        onChange={e => setVal(e.target.value)}
        placeholder="Enter text to encode..." 
        style={{ width: '100%', marginBottom: 12, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '6px 10px', borderRadius: 4, outline: 'none' }}
      />
      <div className="btn-row">
        <button onClick={obfHex}>Hex Encode</button>
        <button onClick={obfUnicode}>Unicode</button>
        <button onClick={obfBase64}>Base64</button>
        <button className="secondary" onClick={obfObfuscate}>Full Obfuscate</button>
      </div>
      <div className="btn-row" style={{ marginTop: 8 }}>
        <button className="danger" onClick={obfDisableConsole}>Disable Console</button>
      </div>
      <div style={{ 
        marginTop: 12, padding: 8, background: 'rgba(0,0,0,0.3)', borderRadius: 4, 
        border: '1px solid rgba(255,255,255,0.05)', fontSize: '13px', wordBreak: 'break-all',
        color: result ? '#22c55e' : '#94a3b8'
      }}>
        {result || '// Encoded output'}
      </div>
    </>
  )
}

export default ObfuscatorDemo
