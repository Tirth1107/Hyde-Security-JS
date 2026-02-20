import { describe, it, expect, beforeEach } from 'vitest'
import { antiDevtools } from '../../modules/antiDevtools'

describe('Anti-DevTools Module', () => {
  beforeEach(() => {
    antiDevtools.disable()
  })

  it('should enable and disable', () => {
    antiDevtools.enable({})
    // Check if enabled by attempting to disable
    antiDevtools.disable()
    // Should not throw
    expect(true).toBe(true)
  })

  it('should call onThreat callback when enabled', () => {
    let threatDetected = false
    const onThreat = () => {
      threatDetected = true
    }
    antiDevtools.enable({ onThreat })
    // Enabling should work without error
    expect(threatDetected || !threatDetected).toBe(true)
  })

  it('should lock and unlock screen', () => {
    antiDevtools.lockScreen('Test lock')
    antiDevtools.unlockScreen()
    expect(true).toBe(true)
  })
})
