import React, { useState } from 'react'
import { useHydeSecurity } from 'hyde-security-js/react'
import { emitLog } from '../LiveLogger'

const DeviceDemo = () => {
  const security = useHydeSecurity()
  const [info, setInfo] = useState<any>(null)

  const detectDev = () => {
    const dev = (security as any).modules?.device
    if (dev) {
      const result = dev.detectDevice()
      setInfo(result)
      const b = result.browser || {}
      const os = result.os || {}
      emitLog('device', `${b.name} ${b.version} on ${os.name} ${os.version}`, 'success')
    }
  }

  return (
    <>
      <div className="btn-row">
        <button onClick={detectDev}>Detect Device</button>
      </div>
      {info && (
        <dl style={{ 
          marginTop: 12, padding: 12, background: 'rgba(0,0,0,0.3)', borderRadius: 4, 
          border: '1px solid rgba(255,255,255,0.05)', fontSize: '13px', color: '#f8fafc',
          display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '8px 16px', margin: '12px 0 0 0'
        }}>
          <dt style={{ color: '#94a3b8' }}>Browser</dt>
          <dd style={{ margin: 0 }}>{info.browser?.name || '?'} {info.browser?.version || ''}</dd>
          
          <dt style={{ color: '#94a3b8' }}>OS</dt>
          <dd style={{ margin: 0 }}>{info.os?.name || '?'} {info.os?.version || ''}</dd>
          
          <dt style={{ color: '#94a3b8' }}>Platform</dt>
          <dd style={{ margin: 0 }}>{info.platform?.type || '?'} {info.platform?.vendor || ''} {info.platform?.model || ''}</dd>
          
          <dt style={{ color: '#94a3b8' }}>Engine</dt>
          <dd style={{ margin: 0 }}>{info.engine?.name || '?'} {info.engine?.version || ''}</dd>
        </dl>
      )}
    </>
  )
}

export default DeviceDemo
