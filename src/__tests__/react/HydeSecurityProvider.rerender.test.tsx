import { describe, it, expect, vi, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'
import HydeSecurity from '../../index'
import { HydeSecurityProvider } from '../../modules/react/HydeSecurityProvider'
import { useHydeSecurity } from '../../modules/react/useHydeSecurity'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('HydeSecurityProvider re-renders', () => {
  it('does not re-initialize when an inline config object is re-created', () => {
    const init = vi.spyOn(HydeSecurity, 'init')
    const { rerender } = render(
      <HydeSecurityProvider config={{ mode: 'dev', onThreatDetected: () => {} }}><div /></HydeSecurityProvider>
    )
    rerender(<HydeSecurityProvider config={{ mode: 'dev', onThreatDetected: () => {} }}><div /></HydeSecurityProvider>)
    rerender(<HydeSecurityProvider config={{ mode: 'dev', onThreatDetected: () => {} }}><div /></HydeSecurityProvider>)
    expect(init).toHaveBeenCalledTimes(1)
  })

  it('re-initializes when a setting changes', () => {
    const init = vi.spyOn(HydeSecurity, 'init')
    const { rerender } = render(<HydeSecurityProvider config={{ mode: 'dev' }}><div /></HydeSecurityProvider>)
    rerender(<HydeSecurityProvider config={{ mode: 'balanced' }}><div /></HydeSecurityProvider>)
    expect(init).toHaveBeenCalledTimes(2)
  })

  it('calls the latest onThreatDetected callback', () => {
    let passed: any
    vi.spyOn(HydeSecurity, 'init').mockImplementation((cfg: any) => { passed = cfg })
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = render(<HydeSecurityProvider config={{ mode: 'dev', onThreatDetected: first }}><div /></HydeSecurityProvider>)
    rerender(<HydeSecurityProvider config={{ mode: 'dev', onThreatDetected: second }}><div /></HydeSecurityProvider>)
    passed.onThreatDetected({ id: '1', type: 't', severity: 'info', timestamp: 0 })
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('exposes isInitialized through the hook', () => {
    let ready = false
    function Probe() {
      ready = useHydeSecurity().isInitialized
      return null
    }
    render(<HydeSecurityProvider config={{ mode: 'dev' }}><Probe /></HydeSecurityProvider>)
    expect(ready).toBe(true)
  })
})
