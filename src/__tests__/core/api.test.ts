import { describe, it, expect, afterEach } from 'vitest'
import pkg from '../../../package.json'
import HydeSecurity from '../../index'
import { encryption } from '../../modules/encryption'

describe('HydeSecurity API', () => {
  afterEach(() => {
    HydeSecurity.destroy()
    encryption.setDefaultKey(null)
  })

  it('getVersion matches package.json', () => {
    expect(HydeSecurity.getVersion()).toBe(pkg.version)
  })

  it('init sets the encryption key from config', () => {
    HydeSecurity.init({ mode: 'dev', encryptionKey: 'config-provided-key' })
    const c = HydeSecurity.encryptText('x')
    expect(HydeSecurity.decryptText(c, 'config-provided-key')).toBe('x')
  })

  it('a second init applies the new config', () => {
    HydeSecurity.init({ mode: 'dev', enableWatermark: false })
    HydeSecurity.init({ mode: 'dev', enableAntiCopy: true })
    const ev = new Event('copy', { cancelable: true })
    document.dispatchEvent(ev)
    expect(ev.defaultPrevented).toBe(true)
  })
})
