import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { HydeSecurityProvider } from '../../modules/react/HydeSecurityProvider'
import { defaultConfig } from '../../core/config'
import '@testing-library/jest-dom'

function TestComponent() {
  return <div data-testid="app-content">Test App</div>
}

describe('HydeSecurityProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('should render with default config', () => {
    render(
      <HydeSecurityProvider config={defaultConfig}>
        <TestComponent />
      </HydeSecurityProvider>
    )
    expect(screen.getByTestId('app-content')).toBeInTheDocument()
  })

  it('should render children', () => {
    render(
      <HydeSecurityProvider config={defaultConfig}>
        <div data-testid="child">Child Component</div>
      </HydeSecurityProvider>
    )
    expect(screen.getByTestId('child')).toHaveTextContent('Child Component')
  })

  it('should handle strict mode config', () => {
    const strictConfig = { ...defaultConfig, mode: 'strict' as const }
    render(
      <HydeSecurityProvider config={strictConfig}>
        <TestComponent />
      </HydeSecurityProvider>
    )
    expect(screen.getByTestId('app-content')).toBeInTheDocument()
  })

  it('should handle balanced mode config', () => {
    const balancedConfig = { ...defaultConfig, mode: 'balanced' as const }
    render(
      <HydeSecurityProvider config={balancedConfig}>
        <TestComponent />
      </HydeSecurityProvider>
    )
    expect(screen.getByTestId('app-content')).toBeInTheDocument()
  })
})
