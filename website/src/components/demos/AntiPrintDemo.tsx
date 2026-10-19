import React from 'react'
import { useHydeSecurity } from 'hyde-security-js'
import { emitLog } from '../LiveLogger'

const AntiPrintDemo = () => {
  const security = useHydeSecurity()

  const enablePrint = () => {
    const ap = (security as any).modules?.antiPrint
    if (ap) {
      ap.enable({
        onThreat: (ev: any) => emitLog('print', 'Print attempt detected & blurred!', 'error')
      })
      emitLog('print', 'Anti-print ENABLED', 'success')
    }
  }

  const disablePrint = () => {
    const ap = (security as any).modules?.antiPrint
    if (ap) {
      ap.disable()
      emitLog('print', 'Anti-print DISABLED', 'info')
    }
  }

  return (
    <>
      <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 12px 0' }}>
        Enable, then press Ctrl+P to see the page blur.
      </p>
      <div className="btn-row">
        <button onClick={enablePrint}>Enable Anti-Print</button>
        <button className="secondary" onClick={disablePrint}>Disable</button>
        <button className="secondary" onClick={() => window.print()}>Test Print</button>
      </div>
    </>
  )
}

export default AntiPrintDemo
