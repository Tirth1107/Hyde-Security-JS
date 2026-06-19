import { HydeSecurityConfig } from './config'

let enabled = false

/** Initialize logger based on config */
export function initLogger(cfg: HydeSecurityConfig) {
  enabled = !!cfg.enableLogs
}

/** Log info messages (only when logging is enabled) */
export function log(...args: any[]) {
  if (!enabled) return
  console.log('[HydeSecurity]', ...args)
}

/** Log warning messages (only when logging is enabled) */
export function warn(...args: any[]) {
  if (!enabled) return
  console.warn('[HydeSecurity]', ...args)
}

/** Log error messages (always logs regardless of config — errors are critical) */
export function error(...args: any[]) {
  console.error('[HydeSecurity]', ...args)
}
