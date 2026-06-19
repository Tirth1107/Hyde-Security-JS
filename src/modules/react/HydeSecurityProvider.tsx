import React, { createContext, useContext, useEffect, useState } from 'react'
import { HydeSecurityConfig, defaultConfig } from '../../core/config'
import HydeSecurity from '../../index'

export interface HydeSecurityContextType {
  config: HydeSecurityConfig
  isInitialized: boolean
  security: typeof HydeSecurity
}

const HydeContext = createContext<HydeSecurityContextType>({ 
  config: defaultConfig,
  isInitialized: false,
  security: HydeSecurity
})

export function HydeSecurityProvider({ config, children }: { config: HydeSecurityConfig; children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Initialize HydeSecurity
    HydeSecurity.init(config)
    setIsInitialized(true)

    return () => {
      HydeSecurity.destroy()
    }
  }, [config])

  return (
    <HydeContext.Provider value={{ config, isInitialized, security: HydeSecurity }}>
      {children}
    </HydeContext.Provider>
  )
}

export function useHydeSecurityContext() {
  return useContext(HydeContext)
}
