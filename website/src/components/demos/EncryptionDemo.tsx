import React, { useState } from 'react'
import { useHydeSecurity } from 'hyde-security-js'
import { emitLog } from '../LiveLogger'

const EncryptionDemo = () => {
  const security = useHydeSecurity()
  const [key, setKey] = useState('my-secret-key')
  const [input, setInput] = useState('Secret API Key: sk-12345')
  const [result, setResult] = useState<{ text: string, type: 'success' | 'error' | 'info' } | null>(null)
  const [lastCipher, setLastCipher] = useState('')

  const doEncrypt = () => {
    const cipher = (security as any).security?.encryptText?.(input, key || undefined)
    if (cipher) {
      setLastCipher(cipher)
      setResult({ text: cipher, type: 'success' })
      emitLog('encryption', `Encrypted ${input.length} chars → ${cipher.length} chars cipher`, 'success')
    }
  }

  const doDecrypt = () => {
    if (!lastCipher) {
      emitLog('encryption', 'Encrypt something first!', 'error')
      return
    }
    const plain = (security as any).security?.decryptText?.(lastCipher, key || undefined)
    if (plain) {
      setResult({ text: plain, type: 'success' })
      emitLog('encryption', 'Decrypted successfully', 'success')
    } else {
      setResult({ text: '[Decryption failed — wrong key?]', type: 'error' })
      emitLog('encryption', 'Decryption failed', 'error')
    }
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        <input 
          value={key} 
          onChange={e => setKey(e.target.value)}
          placeholder="Encryption key (optional)" 
          style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '6px 10px', borderRadius: 4, outline: 'none' }}
        />
        <input 
          value={input} 
          onChange={e => setInput(e.target.value)}
          placeholder="Enter sensitive data..." 
          style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '6px 10px', borderRadius: 4, outline: 'none' }}
        />
      </div>
      <div className="btn-row">
        <button onClick={doEncrypt} style={{ flex: 1 }}>🔒 Encrypt</button>
        <button className="secondary" onClick={doDecrypt} style={{ flex: 1 }}>🔓 Decrypt</button>
      </div>
      <div style={{ 
        marginTop: 12, padding: 8, background: 'rgba(0,0,0,0.3)', borderRadius: 4, 
        border: '1px solid rgba(255,255,255,0.05)', fontSize: '13px', wordBreak: 'break-all',
        color: result ? (result.type === 'error' ? '#ef4444' : '#22c55e') : '#94a3b8'
      }}>
        {result ? result.text : '// Result appears here'}
      </div>
    </>
  )
}

export default EncryptionDemo
