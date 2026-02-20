import React from 'react'
import { HydeSecurityProvider } from '../../src/modules/react/HydeSecurityProvider'

export default function App() {
  return (
    <HydeSecurityProvider config={{ appName: 'React Demo', mode: 'balanced', enableWatermark: true }}>
      <div>
        <h1>React Demo</h1>
        <p>HydeSecurity is running in the provider.</p>
      </div>
    </HydeSecurityProvider>
  )
}
