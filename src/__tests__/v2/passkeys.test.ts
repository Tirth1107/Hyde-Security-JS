import { describe, it, expect, vi, afterEach } from 'vitest'
import { passkeys } from '../../modules/passkeys'
import { encryption } from '../../modules/encryption'
import { toBase64Url } from '../../core/encoding'

const buf = (n: number[]) => new Uint8Array(n).buffer

function fakeAssertion(prfFirst?: ArrayBuffer) {
  return {
    id: 'cred-1', rawId: buf([1, 2, 3]), type: 'public-key', authenticatorAttachment: 'platform',
    response: { clientDataJSON: buf([4]), authenticatorData: buf([5]), signature: buf([6]), userHandle: buf([7]) },
    getClientExtensionResults: () => (prfFirst ? { prf: { enabled: true, results: { first: prfFirst } } } : {})
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  delete (window as any).PublicKeyCredential
})

describe('passkeys', () => {
  it('converts server JSON options to binary', () => {
    const opts = passkeys.parseRequestOptions({ challenge: toBase64Url(new Uint8Array([9, 9])), allowCredentials: [{ id: toBase64Url(new Uint8Array([1])), type: 'public-key' }] })
    expect(Array.from(new Uint8Array(opts.challenge as ArrayBuffer))).toEqual([9, 9])
    expect(ArrayBuffer.isView((opts.allowCredentials as any)[0].id)).toBe(true)
  })

  it('serializes credentials and never leaks the PRF secret', () => {
    const json = passkeys.credentialToJSON(fakeAssertion(buf([1, 2, 3, 4])))
    expect(json.response.signature).toBe(toBase64Url(new Uint8Array([6])))
    expect(json.clientExtensionResults.prf).toEqual({ enabled: true })
    expect(JSON.stringify(json)).not.toContain('results')
  })

  it('derives a stable AES key from PRF output that works with encryption', async () => {
    const secret = new Uint8Array(32).fill(7).buffer
    const get = vi.fn(async () => fakeAssertion(secret))
    vi.stubGlobal('navigator', { ...navigator, credentials: { get } })
    ;(window as any).PublicKeyCredential = function () {}
    const options = { challenge: toBase64Url(new Uint8Array([1])) }
    const a = await passkeys.deriveEncryptionKey({ options, salt: 'notes-v1' })
    const b = await passkeys.deriveEncryptionKey({ options, salt: 'notes-v1' })
    const sent: any = (get.mock.calls[0] as any[])[0]
    expect(ArrayBuffer.isView(sent.publicKey.extensions.prf.eval.first)).toBe(true)
    const c = await encryption.encrypt('top secret', a.key)
    expect(await encryption.decrypt(c, b.key)).toBe('top secret')
    expect(a.assertion.clientExtensionResults.prf).toEqual({ enabled: true })
  })

  it('fails clearly when PRF is not supported', async () => {
    vi.stubGlobal('navigator', { ...navigator, credentials: { get: async () => fakeAssertion() } })
    ;(window as any).PublicKeyCredential = function () {}
    await expect(passkeys.deriveEncryptionKey({ options: { challenge: 'AQ' }, salt: 's' })).rejects.toThrow(/PRF/)
  })

  it('reports capabilities', async () => {
    ;(window as any).PublicKeyCredential = {
      isUserVerifyingPlatformAuthenticatorAvailable: async () => true,
      isConditionalMediationAvailable: async () => true,
      getClientCapabilities: async () => ({ 'extension:prf': true })
    }
    vi.stubGlobal('navigator', { ...navigator, credentials: {} })
    expect(await passkeys.capabilities()).toMatchObject({ webauthn: true, platformAuthenticator: true, conditionalMediation: true })
    expect(await passkeys.prfSupported()).toBe(true)
  })
})
