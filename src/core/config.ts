/**
 * Default configuration and types for HydeSecurity
 */

export type Mode = 'dev' | 'balanced' | 'strict'

export interface HydeSecurityConfig {
  appName?: string
  mode?: Mode
  enableLogs?: boolean
  onThreatDetected?: (ev: HydeSecurityEvent) => void
  enableWatermark?: boolean
  allowedIframes?: string[]
}

export interface HydeSecurityEvent {
  id: string
  type: string
  severity: 'info' | 'warning' | 'critical'
  details?: Record<string, any>
  timestamp: number
}

export const defaultConfig: HydeSecurityConfig = {
  appName: 'HydeSecurityApp',
  mode: 'balanced',
  enableLogs: false,
  enableWatermark: false,
  allowedIframes: []
}
