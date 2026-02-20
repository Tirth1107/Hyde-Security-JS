import { useContext } from 'react'
import { useHydeSecurityContext } from './HydeSecurityProvider'

export function useHydeSecurity() {
  const ctx = useHydeSecurityContext()
  return ctx
}
