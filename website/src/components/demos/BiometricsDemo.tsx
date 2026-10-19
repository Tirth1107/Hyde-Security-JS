import React, { useRef, useState, useEffect } from 'react'
import { useHydeSecurity } from 'hyde-security-js'
import { emitLog } from '../LiveLogger'
import { User, Lock, ShieldCheck, AlertTriangle } from 'lucide-react'

const BiometricsDemo = () => {
  const security = useHydeSecurity()
  const [score, setScore] = useState<number>(0)
  const [isTracking, setIsTracking] = useState(false)
  const trackerRef = useRef<any>(null)
  const intervalRef = useRef<any>(null)

  const startTracking = () => {
    const bio = (security as any).modules?.biometrics
    if (bio) {
      trackerRef.current = bio.startTracking(document.getElementById('login-form-zone'))
      setIsTracking(true)
      emitLog('biometrics', 'Behavioral Biometrics tracking enabled on login form', 'success')

      intervalRef.current = setInterval(() => {
        if (trackerRef.current) {
          const s = trackerRef.current.getHumanScore()
          setScore(s)
        }
      }, 500)
    }
  }

  const stopTracking = () => {
    if (trackerRef.current) trackerRef.current.stop()
    if (intervalRef.current) clearInterval(intervalRef.current)
    setIsTracking(false)
    setScore(0)
    emitLog('biometrics', 'Stopped tracking', 'info')
  }

  // Auto-start tracking on mount
  useEffect(() => {
    startTracking()
    return () => stopTracking()
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (score < 40) {
      emitLog('biometrics', `Login blocked! Trust score too low (${score}%)`, 'error')
      security.toast('Access Denied: Bot-like behavior detected.')
    } else {
      emitLog('biometrics', `Login successful. Human confidence: ${score}%`, 'success')
      security.toast('Access Granted!')
    }
  }

  // Calculate colors based on score
  const scoreColor = score === 0 ? '#94a3b8' : (score > 60 ? '#10b981' : (score > 35 ? '#f59e0b' : '#ef4444'))
  const scoreWidth = `${Math.max(5, score)}%`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
        Interact with the form to build your "Trust Score" using mouse dynamics and keystroke analysis.
      </p>

      {/* Trust Score Gauge */}
      <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '12px 16px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: '#94a3b8' }}>Human Trust Score</span>
          <span style={{ fontSize: '14px', fontWeight: 700, color: scoreColor }}>{score}%</span>
        </div>
        <div style={{ height: 6, width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: scoreWidth, background: scoreColor, transition: 'width 0.3s ease, background 0.3s ease' }} />
        </div>
      </div>

      {/* Mock Login Form */}
      <form id="login-form-zone" onSubmit={handleLogin} style={{ 
        background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 8, 
        border: '1px dashed rgba(255,255,255,0.15)', display: 'flex', flexDirection: 'column', gap: 12 
      }}>
        <div style={{ position: 'relative' }}>
          <User size={16} style={{ position: 'absolute', top: 10, left: 10, color: '#94a3b8' }} />
          <input 
            type="text" 
            placeholder="Email address" 
            style={{ width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px 10px 8px 36px', borderRadius: 4, outline: 'none' }}
          />
        </div>
        <div style={{ position: 'relative' }}>
          <Lock size={16} style={{ position: 'absolute', top: 10, left: 10, color: '#94a3b8' }} />
          <input 
            type="password" 
            placeholder="Password" 
            style={{ width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px 10px 8px 36px', borderRadius: 4, outline: 'none' }}
          />
        </div>

        <button 
          type="submit" 
          style={{ 
            marginTop: 4, width: '100%', 
            background: score > 35 ? '#0ea5e9' : 'rgba(239, 68, 68, 0.2)',
            color: score > 35 ? 'white' : '#ef4444',
            cursor: score > 35 ? 'pointer' : 'not-allowed'
          }}
        >
          {score > 35 ? <><ShieldCheck size={16} /> Secure Login</> : <><AlertTriangle size={16} /> Bot Detected - Blocked</>}
        </button>
      </form>
    </div>
  )
}

export default BiometricsDemo
