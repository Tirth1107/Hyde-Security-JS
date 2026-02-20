import { HydeSecurityConfig } from './config'

let enabled = false

export function initLogger(cfg: HydeSecurityConfig) {
  enabled = !!cfg.enableLogs
}

export function log(...args: any[]) {
  if (!enabled) return
  console.log('[HydeSecurity]', ...args)
}

export function warn(...args: any[]) {
  if (!enabled) return
  console.warn('[HydeSecurity]', ...args)
}

export function error(...args: any[]) {
  if (!enabled) return
  console.error('[HydeSecurity]', ...args)
}
