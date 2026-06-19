/**
 * Default configuration and types for HydeSecurity
 */

export type Mode = 'dev' | 'balanced' | 'strict'

export interface HydeSecurityConfig {
  /** App name used for logging and watermark text */
  appName?: string
  /** Security level: 'dev' (minimal), 'balanced' (recommended), 'strict' (all features) */
  mode?: Mode
  /** Enable console logging */
  enableLogs?: boolean
  /** Callback fired when a security threat is detected */
  onThreatDetected?: (ev: HydeSecurityEvent) => void
  /** Add a canvas watermark overlay */
  enableWatermark?: boolean
  /** Allowed iframe origins for anti-iframe protection */
  allowedIframes?: string[]
  /** Enable copy/cut/drag blocking (default: true in strict mode) */
  enableAntiCopy?: boolean
  /** Enable print blocking (default: true in strict mode) */
  enableAntiPrint?: boolean
  /** Enable right-click blocking (default: true in strict mode) */
  enableAntiContextMenu?: boolean
  /** Enable tab visibility guard with blur overlay (default: true in strict mode) */
  enableTabGuard?: boolean
  /** Enable screenshot deterrence (default: true in strict mode) */
  enableAntiScreenCapture?: boolean
  /** Enable clickjacking / iframe detection (default: true in strict and balanced modes) */
  enableAntiIframe?: boolean
}

export interface HydeSecurityEvent {
  /** Unique event ID */
  id: string
  /** Event type identifier */
  type: string
  /** Severity level */
  severity: 'info' | 'warning' | 'critical'
  /** Additional details */
  details?: Record<string, any>
  /** Unix timestamp */
  timestamp: number
}

export const defaultConfig: HydeSecurityConfig = {
  appName: 'HydeSecurityApp',
  mode: 'balanced',
  enableLogs: false,
  enableWatermark: false,
  allowedIframes: [],
  enableAntiCopy: undefined,
  enableAntiPrint: undefined,
  enableAntiContextMenu: undefined,
  enableTabGuard: undefined,
  enableAntiScreenCapture: undefined,
  enableAntiIframe: undefined,
}
