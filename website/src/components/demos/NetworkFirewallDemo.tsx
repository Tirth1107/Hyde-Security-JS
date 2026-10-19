import React, { useRef } from 'react'
import { useHydeSecurity } from 'hyde-security-js/react'
import { emitLog } from '../LiveLogger'

const NetworkFirewallDemo = () => {
  const security = useHydeSecurity()
  const disableFwRef = useRef<(() => void) | null>(null)

  const enableFirewall = () => {
    const fw = (security as any).modules.networkFirewall
    if (fw) {
      disableFwRef.current = fw.enable(['api.github.com'], (url: string) => {
        emitLog('firewall', `BLOCKED request to: ${url}`, 'error')
        security.toast('Network Firewall blocked unauthorized request!')
      })
      emitLog('firewall', 'Zero-Trust Firewall ENABLED (Allowlist: api.github.com)', 'success')
    }
  }

  const disableFirewall = () => {
    if (disableFwRef.current) disableFwRef.current()
    emitLog('firewall', 'Firewall disabled', 'info')
  }

  const testFetch = async (url: string) => {
    try {
      emitLog('firewall', `Fetching ${url}...`, 'info')
      await fetch(url)
      emitLog('firewall', `Success: ${url}`, 'success')
    } catch (e: any) {
      // The firewall intercepts and throws an error if blocked
      if (e.message !== 'Blocked by HydeSecurity Firewall') {
        emitLog('firewall', `Fetch failed: ${e.message}`, 'error')
      }
    }
  }

  return (
    <>
      <div className="btn-row" style={{ marginBottom: 12 }}>
        <button onClick={enableFirewall}>Enable Firewall</button>
        <button className="secondary" onClick={disableFirewall}>Disable</button>
      </div>
      <div className="btn-row">
        <button onClick={() => testFetch('https://api.github.com/users/tirth1107')}>
          Fetch Github (Allowed)
        </button>
        <button className="danger" onClick={() => testFetch('https://evil-hacker.com/steal')}>
          Fetch Evil (Blocked)
        </button>
      </div>
    </>
  )
}

export default NetworkFirewallDemo
