import { describe, it, expect } from 'vitest'
import { defaultConfig } from '../../core/config'

describe('Config', () => {
  it('should have default config', () => {
    expect(defaultConfig.appName).toBe('HydeSecurityApp')
    expect(defaultConfig.mode).toBe('balanced')
  })

  it('should have valid mode values', () => {
    expect(['dev', 'balanced', 'strict']).toContain(defaultConfig.mode)
  })
})
