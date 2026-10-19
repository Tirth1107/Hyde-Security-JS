import React, { useState } from 'react'
import { useHydeSecurity } from 'hyde-security-js/react'
import { emitLog } from '../LiveLogger'

const EncryptionDemo = () => {
  const security = useHydeSecurity()
  const [key, setKey] = useState('my-secret-key')
  const [input, setInput] = useState('Secret API Key: sk-12345')
  const [result, setResult] = useState<{ text: string, type: 'success' | 'error' | 'info' } | null>(null)
  const [lastCipher, setLastCipher] = useState('')

  const doEncrypt = async () => {
    if (!key) {
      setResult({ text: 'v2 needs a key — there is no built-in default', type: 'error' })
      return
    }
    const cipher = await security.security.encryptText(input, key)
    setLastCipher(cipher)
    setResult({ text: cipher, type: 'success' })
    emitLog('encryption', `AES-256-GCM: ${input.length} chars → ${cipher.length} chars (PBKDF2 600k)`, 'success')
  }

  const doDecrypt = async () => {
    if (!lastCipher) {
      emitLog('encryption', 'Encrypt something first!', 'error')
      return
    }
    const plain = key ? await security.security.decryptText(lastCipher, key) : null
    if (plain !== null) {
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
          placeholder="Passphrase (required)" 
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
