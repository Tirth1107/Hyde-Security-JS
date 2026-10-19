/**
 * passkeys — WebAuthn helpers + passkey-derived encryption keys (PRF).
 *
 * Registration / sign-in still need a server to create challenges and verify
 * responses; this handles the browser side: JSON <-> ArrayBuffer conversion,
 * feature detection, conditional UI (autofill), and the PRF extension.
 *
 * PRF ("pseudo-random function", backed by CTAP hmac-secret) lets a passkey
 * produce a stable secret for a given salt. We turn it into an AES-GCM key
 * with HKDF, so you can encrypt data end-to-end with a key that only exists
 * while the user's passkey is present. Supported on Chromium/Android and Safari
 * platform authenticators; feature-detect with `prfSupported()`.
 */
import { Bytes, fromBase64Url, getSubtle, toBase64Url, utf8 } from '../core/encoding'

type Json = Record<string, any>

const PKC = () => (typeof window !== 'undefined' ? (window as any).PublicKeyCredential : undefined)

function b64(v: ArrayBuffer | ArrayBufferView | null | undefined): string | undefined {
  if (!v) return undefined
  const bytes = v instanceof ArrayBuffer ? new Uint8Array(v) : new Uint8Array(v.buffer, v.byteOffset, v.byteLength)
  return toBase64Url(bytes)
}

/** Server JSON (base64url fields) -> PublicKeyCredentialCreationOptions */
export function parseCreationOptions(json: Json): PublicKeyCredentialCreationOptions {
  const P = PKC()
  if (P?.parseCreationOptionsFromJSON) return P.parseCreationOptionsFromJSON(json)
  return {
    ...json,
    challenge: fromBase64Url(json.challenge),
    user: { ...json.user, id: fromBase64Url(json.user.id) },
    excludeCredentials: (json.excludeCredentials ?? []).map((c: Json) => ({ ...c, id: fromBase64Url(c.id) }))
  } as unknown as PublicKeyCredentialCreationOptions
}

/** Server JSON -> PublicKeyCredentialRequestOptions */
export function parseRequestOptions(json: Json): PublicKeyCredentialRequestOptions {
  const P = PKC()
  if (P?.parseRequestOptionsFromJSON) return P.parseRequestOptionsFromJSON(json)
  return {
    ...json,
    challenge: fromBase64Url(json.challenge),
    allowCredentials: (json.allowCredentials ?? []).map((c: Json) => ({ ...c, id: fromBase64Url(c.id) }))
  } as unknown as PublicKeyCredentialRequestOptions
}

/** Credential -> JSON for your server */
export function credentialToJSON(cred: any): Json {
  if (typeof cred?.toJSON === 'function') {
    try {
      const json = cred.toJSON()
      // PRF output is a secret: never send it to the server
      const prf = json?.clientExtensionResults?.prf
      if (prf) json.clientExtensionResults.prf = { enabled: prf.enabled }
      return json
    } catch (e) { /* some password managers return non-compliant objects */ }
  }
  const r = cred.response
  return {
    id: cred.id,
    rawId: b64(cred.rawId),
    type: cred.type,
    authenticatorAttachment: cred.authenticatorAttachment ?? undefined,
    clientExtensionResults: (() => {
      const ext = cred.getClientExtensionResults?.() ?? {}
      // PRF output is a secret; never send it to the server
      const { prf, ...rest } = ext
      return prf ? { ...rest, prf: { enabled: prf.enabled } } : rest
    })(),
    response: {
      clientDataJSON: b64(r.clientDataJSON),
      attestationObject: b64(r.attestationObject),
      authenticatorData: b64(r.authenticatorData),
      signature: b64(r.signature),
      userHandle: b64(r.userHandle),
      transports: typeof r.getTransports === 'function' ? r.getTransports() : undefined
    }
  }
}

export interface PasskeyCapabilities {
  webauthn: boolean
  platformAuthenticator: boolean
  conditionalMediation: boolean
  /** WebAuthn L3 getClientCapabilities() result when available */
  client?: Record<string, boolean>
}

async function hkdfAesKey(secret: ArrayBuffer, info: string): Promise<CryptoKey> {
  const subtle = getSubtle()
  const base = await subtle.importKey('raw', secret, 'HKDF', false, ['deriveKey'])
  return subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: utf8.encode(info) },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

function saltBytes(salt: string | Bytes): Bytes {
  return typeof salt === 'string' ? utf8.encode(salt) : salt
}

export const passkeys = {
  parseCreationOptions,
  parseRequestOptions,
  credentialToJSON,

  isSupported(): boolean {
    return !!PKC() && typeof navigator !== 'undefined' && !!navigator.credentials
  },

  async capabilities(): Promise<PasskeyCapabilities> {
    const P = PKC()
    if (!this.isSupported()) return { webauthn: false, platformAuthenticator: false, conditionalMediation: false }
    const [platform, conditional, client] = await Promise.all([
      P.isUserVerifyingPlatformAuthenticatorAvailable?.().catch(() => false) ?? false,
      P.isConditionalMediationAvailable?.().catch(() => false) ?? false,
      P.getClientCapabilities?.().catch(() => undefined)
    ])
    return { webauthn: true, platformAuthenticator: !!platform, conditionalMediation: !!conditional, client }
  },

  /** Does the browser say it supports the PRF extension? (L3 capabilities; undefined = unknown) */
  async prfSupported(): Promise<boolean | undefined> {
    const caps = await this.capabilities()
    return caps.client ? !!caps.client['extension:prf'] : undefined
  },

  /**
   * Create a passkey. `options` is the JSON your server sent.
   * Set `prf: true` to ask the authenticator to enable PRF.
   */
  async register(options: Json, opts: { prf?: boolean; signal?: AbortSignal } = {}): Promise<Json> {
    const publicKey = parseCreationOptions(options)
    if (opts.prf) (publicKey as any).extensions = { ...(publicKey as any).extensions, prf: {} }
    const cred = await navigator.credentials.create({ publicKey, signal: opts.signal })
    if (!cred) throw new Error('[HydeSecurity] passkey creation returned nothing')
    return credentialToJSON(cred)
  },

  /**
   * Sign in with a passkey. `conditional: true` uses autofill UI — add
   * autocomplete="username webauthn" to your username input.
   */
  async authenticate(options: Json, opts: { conditional?: boolean; signal?: AbortSignal } = {}): Promise<Json> {
    const publicKey = parseRequestOptions(options)
    const cred = await navigator.credentials.get({
      publicKey,
      signal: opts.signal,
      ...(opts.conditional ? { mediation: 'conditional' as CredentialMediationRequirement } : {})
    })
    if (!cred) throw new Error('[HydeSecurity] passkey sign-in returned nothing')
    return credentialToJSON(cred)
  },

  /**
   * Derive an AES-256-GCM key from a passkey with the PRF extension.
   * The same passkey + salt always gives the same key, and the key never leaves the
   * device. Use it with `encryption.encrypt(text, key)`.
   *
   * Pass `options` from your server (a normal sign-in request), so this doubles as login.
   */
  async deriveEncryptionKey(params: {
    options: Json
    /** Per-purpose salt, e.g. 'notes-v1'. Changing it gives a different key. */
    salt: string | Bytes
    /** HKDF info label (default 'hyde-passkey-aes') */
    info?: string
    signal?: AbortSignal
  }): Promise<{ key: CryptoKey; credentialId: string; assertion: Json }> {
    const publicKey = parseRequestOptions(params.options) as any
    publicKey.extensions = { ...publicKey.extensions, prf: { eval: { first: saltBytes(params.salt) } } }
    const cred: any = await navigator.credentials.get({ publicKey, signal: params.signal })
    if (!cred) throw new Error('[HydeSecurity] passkey sign-in returned nothing')
    const prf = cred.getClientExtensionResults?.()?.prf
    const first: ArrayBuffer | undefined = prf?.results?.first
    if (!first) {
      throw new Error('[HydeSecurity] this passkey/browser did not return a PRF result (PRF not supported)')
    }
    const key = await hkdfAesKey(first, params.info ?? 'hyde-passkey-aes')
    return { key, credentialId: cred.id, assertion: credentialToJSON(cred) }
  }
}
