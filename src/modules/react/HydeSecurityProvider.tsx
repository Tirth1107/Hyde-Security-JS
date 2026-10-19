import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { HydeSecurityConfig, HydeSecurityEvent, defaultConfig } from '../../core/config'
import HydeSecurity from '../../index'

export interface HydeSecurityContextType {
  config: HydeSecurityConfig
  isInitialized: boolean
  security: typeof HydeSecurity
}

const HydeContext = createContext<HydeSecurityContextType>({
  config: defaultConfig,
  isInitialized: false,
  security: null as any
})

/**
 * Turn a config into a string that only changes when a setting changes.
 * Functions (like onThreatDetected) are skipped, so an inline
 * `config={{ ... }}` doesn't re-initialize on every render.
 */
function configKey(config: HydeSecurityConfig) {
  return JSON.stringify(config, (_k, v) => (typeof v === 'function' ? undefined : v))
}

export function HydeSecurityProvider({ config = {}, children }: { config?: HydeSecurityConfig; children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false)

  // Always call the latest callback without re-initializing when it changes
  const latestConfig = useRef(config)
  latestConfig.current = config

  const key = configKey(config)

  useEffect(() => {
    if (typeof window === 'undefined') return

    HydeSecurity.init({
      ...latestConfig.current,
      onThreatDetected: (ev: HydeSecurityEvent) => latestConfig.current.onThreatDetected?.(ev)
    })
    setIsInitialized(true)

    return () => {
      HydeSecurity.destroy()
      setIsInitialized(false)
    }
  }, [key])

  return (
    <HydeContext.Provider value={{ config, isInitialized, security: HydeSecurity }}>
      {children}
    </HydeContext.Provider>
  )
}

export function useHydeSecurityContext() {
  return useContext(HydeContext)
}
