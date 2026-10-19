import React, { useState } from 'react'
import { useHydeSecurity } from 'hyde-security-js/react'
import { emitLog } from '../LiveLogger'

const PasswordDemo = () => {
  const security = useHydeSecurity()
  const [val, setVal] = useState('')

  const result = val ? (security as any).security?.checkPassword?.(val) : null
  const rules = val ? (security as any).modules?.passwordStrength?.validate(val) : null
  const tips = val ? (security as any).modules?.passwordStrength?.generateSuggestions(val) : []

  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981']
  const color = result ? colors[result.score] : '#94a3b8'
  const width = result ? `${result.percent}%` : '0%'

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setVal(v)
    if (v) {
      const res = (security as any).security?.checkPassword?.(v)
      if (res) {
        emitLog('password', `Score: ${res.score}/4 — ${res.label}`, res.score >= 3 ? 'success' : 'info')
      }
    }
  }

  return (
    <>
      <input 
        type="password"
        value={val}
        onChange={handleInput}
        placeholder="Type a password..."
        style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '6px 10px', borderRadius: 4, outline: 'none' }}
      />
      
      <div style={{ height: 6, width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden', margin: '12px 0 8px 0' }}>
        <div style={{ height: '100%', width: width, background: color, transition: 'all 0.3s' }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
        <span style={{ color }}>Strength: {result ? result.label : '—'}</span>
        <span style={{ color: '#94a3b8' }}>Crack time: {result ? result.crackTime : '—'}</span>
      </div>

      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: 8 }}>
        {tips.length > 0 && <div>💡 {tips.slice(0, 3).join(' • ')}</div>}
      </div>

      <div style={{ fontSize: '11px', marginTop: 4 }}>
        {rules && rules.errors.length > 0 ? (
          rules.errors.map((e: string, i: number) => <div key={i} style={{ color: '#ef4444' }}>✗ {e}</div>)
        ) : (
          val && <div style={{ color: '#22c55e' }}>✓ All rules passed</div>
        )}
      </div>
    </>
  )
}

export default PasswordDemo
