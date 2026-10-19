import React, { useState, useEffect, useRef } from 'react'
import { useHydeSecurity } from 'hyde-security-js/react'
import { emitLog } from '../LiveLogger'

const RateLimiterDemo = () => {
  const security = useHydeSecurity()
  const [count, setCount] = useState(0)
  const throttledFnRef = useRef<any>(null)

  useEffect(() => {
    const rl = (security as any).modules?.rateLimiter
    if (rl) {
      throttledFnRef.current = rl.makeRateLimited(() => {
        setCount(c => {
          const newC = c + 1
          emitLog('rate', `Call #${newC} passed through throttle`, 'success')
          return newC
        })
      }, 1000)
    }
  }, [security])

  const rateClick = () => {
    if (throttledFnRef.current) {
      throttledFnRef.current()
    }
  }

  return (
    <>
      <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 12px 0' }}>
        Click the button rapidly — only one call per 1000ms will go through.
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={rateClick}>Click Me Rapidly</button>
        <span style={{ fontSize: '12px', color: '#94a3b8' }}>Calls: {count}</span>
      </div>
    </>
  )
}

export default RateLimiterDemo
