import React from 'react'
import { useHydeSecurity } from 'hyde-security-js/react'
import { emitLog } from '../LiveLogger'

const AntiScreenCaptureDemo = () => {
  const security = useHydeSecurity()

  const enableCapture = () => {
    const sc = (security as any).modules?.antiScreenCapture
    if (sc) {
      sc.enable({
        onThreat: (ev: any) => emitLog('screen-capture', 'Screenshot shortcut detected!', 'error')
      })
      emitLog('screen-capture', 'Screenshot shortcut deterrence ENABLED', 'success')
    }
  }

  const disableCapture = () => {
    const sc = (security as any).modules?.antiScreenCapture
    if (sc) {
      sc.disable()
      emitLog('screen-capture', 'Screenshot deterrence DISABLED', 'info')
    }
  }

  return (
    <>
      <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 12px 0' }}>
        Press common screenshot hotkeys (e.g., Win+Shift+S, PrtScn, Cmd+Shift+4) to see the page react.
      </p>
      <div className="btn-row">
        <button onClick={enableCapture}>Enable Deterrence</button>
        <button className="secondary" onClick={disableCapture}>Disable</button>
      </div>
    </>
  )
}

export default AntiScreenCaptureDemo
