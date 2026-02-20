import React, { createContext, useContext, useEffect } from 'react'
import { HydeSecurityConfig, defaultConfig } from '../../core/config'
import { initLogger } from '../../core/logger'
import { antiDevtools } from '../antiDevtools'
import { antiDebug } from '../antiDebug'
import { addWatermark } from '../watermark'

const HydeContext = createContext<{ config: HydeSecurityConfig }>({ config: defaultConfig })

export function HydeSecurityProvider({ config, children }: { config: HydeSecurityConfig; children: React.ReactNode }) {
  useEffect(() => {
    initLogger(config)
    if (config.mode === 'strict') {
      antiDevtools.enable({ onThreat: config.onThreatDetected, autoLock: true })
      antiDebug.enable({ onThreat: config.onThreatDetected })
    } else if (config.mode === 'balanced') {
      antiDevtools.enable({ onThreat: config.onThreatDetected })
    }
    let removeWatermark: (() => void) | null = null
    if (config.enableWatermark) removeWatermark = addWatermark(config.appName)
    return () => {
      antiDevtools.disable()
      antiDebug.disable()
      removeWatermark && removeWatermark()
    }
  }, [config])

  return <HydeContext.Provider value={{ config }}>{children}</HydeContext.Provider>
}

export function useHydeSecurityContext() {
  return useContext(HydeContext)
}
