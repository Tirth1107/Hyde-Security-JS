import React, { useState } from 'react'
import { useHydeSecurity } from 'hyde-security-js/react'
import { emitLog } from '../LiveLogger'

const FingerprintDemo = () => {
  const security = useHydeSecurity()
  const [result, setResult] = useState<{ text: string, type: 'success' | 'error' | 'info' } | null>(null)

  const getFP = async () => {
    const fpModule = (security as any).modules?.fingerprint
    if (fpModule) {
      setResult({ text: 'Generating...', type: 'info' })
      try {
        const fp = await fpModule.getFingerprint()
        setResult({ text: fp, type: 'success' })
        emitLog('fingerprint', `Visitor ID: ${fp}`, 'success')
      } catch (e: any) {
        setResult({ text: 'Error: ' + e.message, type: 'error' })
        emitLog('fingerprint', 'Fingerprint generation failed: ' + e.message, 'error')
      }
    }
  }

  return (
    <>
      <div className="btn-row">
        <button onClick={getFP}>Generate Fingerprint</button>
      </div>
      <div style={{ 
        marginTop: 12, padding: 8, background: 'rgba(0,0,0,0.3)', borderRadius: 4, 
        border: '1px solid rgba(255,255,255,0.05)', fontSize: '13px', wordBreak: 'break-all',
        color: result ? (result.type === 'error' ? '#ef4444' : (result.type === 'info' ? '#0ea5e9' : '#22c55e')) : '#94a3b8'
      }}>
        {result ? result.text : '// Click to generate'}
      </div>
    </>
  )
}

export default FingerprintDemo
