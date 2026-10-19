import React, { useRef } from 'react'
import { useHydeSecurity } from 'hyde-security-js'
import { emitLog } from '../LiveLogger'

const WatermarkDemo = () => {
  const security = useHydeSecurity()
  const removeHandleRef = useRef<(() => void) | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const addWM = () => {
    const wm = (security as any).modules?.watermark
    if (wm) {
      removeHandleRef.current = wm.addWatermark(`TestUser_${Date.now()}`)
      emitLog('watermark', 'Page watermark injected', 'success')
      
      // Also add visual watermark inside container
      if (containerRef.current) {
        let overlay = containerRef.current.querySelector('.wm-overlay')
        if (!overlay) {
          overlay = document.createElement('div')
          overlay.className = 'wm-overlay'
          overlay.setAttribute('style', 'position:absolute;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;transform:rotate(-10deg);color:rgba(255,255,255,0.08);font-size:13px;pointer-events:none;font-weight:bold;')
          overlay.textContent = `USER_${Math.floor(Math.random() * 9999)} | ${new Date().toISOString().split('T')[0]}`
          containerRef.current.appendChild(overlay)
        }
      }
    }
  }

  const removeWM = () => {
    if (removeHandleRef.current) {
      removeHandleRef.current()
      removeHandleRef.current = null
    }
    if (containerRef.current) {
      const overlay = containerRef.current.querySelector('.wm-overlay')
      if (overlay) overlay.remove()
    }
    emitLog('watermark', 'Watermark removed', 'info')
  }

  return (
    <>
      <div ref={containerRef} style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8, marginBottom: 12, height: 80, position: 'relative', overflow: 'hidden' }}>
        <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase' }}>Document Body</span>
        <div style={{ zIndex: 1, position: 'relative', marginTop: 8, fontSize: '13px' }}>
          Confidential Document Content...
        </div>
      </div>
      <div className="btn-row">
        <button onClick={addWM}>Add Watermark</button>
        <button className="secondary" onClick={removeWM}>Remove Watermark</button>
      </div>
    </>
  )
}

export default WatermarkDemo
