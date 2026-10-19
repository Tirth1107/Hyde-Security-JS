import React, { useRef, useState } from 'react'
import { useHydeSecurity } from 'hyde-security-js'
import { emitLog } from '../LiveLogger'

const ClickjackDemo = () => {
  const security = useHydeSecurity()
  const cleanupRef = useRef<(() => void) | null>(null)
  const [btnDisabled, setBtnDisabled] = useState(false)

  const enableCJ = () => {
    // We access the module directly via the API wrapper
    const module = (security as any).modules.antiClickjacking
    if (module) {
      cleanupRef.current = module.protect('#cj-target', () => {
        emitLog('clickjack', 'OCCLUSION DETECTED: Button is covered!', 'error')
        security.toast('Clickjacking attempt blocked!')
        setBtnDisabled(true)
      })
      emitLog('clickjack', 'Button protected via IntersectionObserver v2', 'success')
    }
  }

  const simulateOverlay = () => {
    const overlay = document.getElementById('cj-overlay')
    if (overlay) {
      overlay.style.opacity = '0.01' // Invisible overlay attack
      overlay.style.pointerEvents = 'auto'
      emitLog('clickjack', 'Malicious overlay deployed over button', 'info')
      setTimeout(() => {
        overlay.style.opacity = '0'
        overlay.style.pointerEvents = 'none'
        setBtnDisabled(false)
      }, 3000)
    }
  }

  return (
    <>
      <div style={{ position: 'relative', zIndex: 1, background: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 8, marginBottom: 12 }}>
        <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase' }}>Target Area</span>
        <button id="cj-target" disabled={btnDisabled} style={{ width: '100%', marginTop: 8, background: '#8b5cf6' }}>
          Sensitive Action Button
        </button>
      </div>
      {/* The invisible malicious overlay */}
      <div 
        id="cj-overlay" 
        style={{ 
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
          background: 'red', opacity: 0, zIndex: 2, pointerEvents: 'none', borderRadius: 8 
        }} 
      />
      <div className="btn-row" style={{ position: 'relative', zIndex: 3 }}>
        <button onClick={enableCJ}>Protect Button</button>
        <button className="secondary" onClick={simulateOverlay}>Simulate Overlay Attack</button>
      </div>
    </>
  )
}

export default ClickjackDemo
