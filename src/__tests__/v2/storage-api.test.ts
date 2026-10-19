import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { storage } from '../../modules/storage'
import { encryption } from '../../modules/encryption'
import HydeSecurity from '../../index'
import { events } from '../../core/events'
import { networkFirewall } from '../../modules/networkFirewall'

describe('encrypted storage', () => {
  beforeEach(() => {
    encryption._reset()
    encryption.setIterations(100_000)
    localStorage.clear()
  })

  it('stores ciphertext and reads it back', async () => {
    await storage.setEncrypted('profile', { email: 'a@b.co' }, { key: 'storage-pass-123' })
    expect(localStorage.getItem('__hyde_profile')).toMatch(/^hyde2\./)
    expect(await storage.getEncrypted('profile', { key: 'storage-pass-123' })).toEqual({ email: 'a@b.co' })
    expect(await storage.getEncrypted('profile', { key: 'wrong-pass-12345' })).toBeNull()
  })

  it('honours TTL on encrypted values', async () => {
    await storage.setEncrypted('t', 1, { key: 'storage-pass-123', ttl: -1 })
    expect(await storage.getEncrypted('t', { key: 'storage-pass-123' })).toBeNull()
  })

  it('rejects the v1 encrypt option with a helpful error', () => {
    expect(() => storage.set('x', 1, { encrypt: true } as any)).toThrow(/setEncrypted/)
  })
})

describe('HydeSecurity v2 API', () => {
  afterEach(() => {
    HydeSecurity.destroy()
    events.reset()
  })

  it('on() and onThreatDetected receive every module event once', () => {
    const cb = vi.fn()
    const on = vi.fn()
    HydeSecurity.init({ mode: 'dev', onThreatDetected: cb })
    HydeSecurity.on('source:test', on)
    events.emit({ type: 't', severity: 'warning', source: 'test' })
    expect(cb).toHaveBeenCalledTimes(1)
    expect(on).toHaveBeenCalledTimes(1)
  })

  it('balanced mode turns on the v2 guards; dev mode does not', () => {
    HydeSecurity.init({ mode: 'dev' })
    expect(HydeSecurity.modules.clipboardGuard.isEnabled()).toBe(false)
    HydeSecurity.init({ mode: 'balanced' })
    expect(HydeSecurity.modules.clipboardGuard.isEnabled()).toBe(true)
    expect(HydeSecurity.modules.scriptGuard.isEnabled()).toBe(false)
    HydeSecurity.init({ mode: 'balanced', scriptGuard: { allow: ['cdn.ok.com'] }, clipboardGuard: false })
    expect(HydeSecurity.modules.scriptGuard.isEnabled()).toBe(true)
    expect(HydeSecurity.modules.clipboardGuard.isEnabled()).toBe(false)
  })

  it('lockdown triggers on configured threats and can be released', () => {
    document.body.innerHTML = '<input id="cc" autocomplete="cc-number">'
    ;(document.getElementById('cc') as HTMLInputElement).value = '4111'
    HydeSecurity.init({ mode: 'dev', lockdown: { on: ['sensitive_field_read'], message: 'Locked' } })
    events.emit({ type: 'sensitive_field_read', severity: 'critical', source: 'skimmerGuard' })
    expect(HydeSecurity.isLockedDown()).toBe(true)
    expect(networkFirewall.isEnabled()).toBe(true)
    expect((document.getElementById('cc') as HTMLInputElement).value).toBe('')
    expect(document.body.textContent).toContain('Locked')
    HydeSecurity.releaseLockdown()
    expect(HydeSecurity.isLockedDown()).toBe(false)
    expect(networkFirewall.isEnabled()).toBe(false)
  })

  it('does not export React from the main entry', async () => {
    const main: any = await import('../../index')
    expect(main.HydeSecurityProvider).toBeUndefined()
  })
})
