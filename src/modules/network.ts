import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios'
import { getSubtle, toHex, utf8 } from '../core/encoding'

// Repeating these is safe; POST/PATCH could create duplicates on the server
const IDEMPOTENT = ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE']

export interface ClientOptions {
  apiKey?: string
  /** Add an HMAC-SHA256 `x-hyde-signature` header. Requires `signingKey`. */
  sign?: boolean
  /** Secret for request signing */
  signingKey?: string
  /** @deprecated use signingKey */
  deriveKey?: string
  baseURL?: string
  /** Max retries for network errors / 5xx (default 3) */
  retries?: number
  /** Also retry POST and PATCH (default false — they may not be safe to repeat) */
  retryNonIdempotent?: boolean
}

const hmacKeys = new Map<string, Promise<CryptoKey>>()
function hmacKey(secret: string) {
  let k = hmacKeys.get(secret)
  if (!k) {
    k = getSubtle().importKey('raw', utf8.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    hmacKeys.set(secret, k)
  }
  return k
}

/** HMAC-SHA256 of `METHOD:url:timestamp:bodyHash`, hex */
export async function signRequest(secret: string, method: string, url: string, timestamp: string, body = ''): Promise<string> {
  const subtle = getSubtle()
  const bodyHash = toHex(await subtle.digest('SHA-256', utf8.encode(body)))
  const payload = `${method.toUpperCase()}:${url}:${timestamp}:${bodyHash}`
  return toHex(await subtle.sign('HMAC', await hmacKey(secret), utf8.encode(payload)))
}

export function createClient(opts: ClientOptions = {}): AxiosInstance {
  const secret = opts.signingKey ?? opts.deriveKey
  if (opts.sign && !secret) {
    throw new Error('[HydeSecurity] network.createClient({ sign: true }) needs a signingKey')
  }
  const maxRetries = opts.retries ?? 3
  const client = axios.create({ baseURL: opts.baseURL })

  client.interceptors.request.use(async config => {
    config.headers = config.headers ?? ({} as any)
    if (opts.apiKey) config.headers['x-api-key'] = opts.apiKey
    const timestamp = Date.now().toString()
    config.headers['x-hyde-ts'] = timestamp

    if (opts.sign && secret) {
      const body = config.data === undefined ? '' : typeof config.data === 'string' ? config.data : JSON.stringify(config.data)
      config.headers['x-hyde-signature'] = await signRequest(secret, config.method || 'GET', config.url || '', timestamp, body)
    }
    return config
  })

  client.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
      const config = error.config as any
      if (!config) return Promise.reject(sanitizeError(error))

      config._retryCount = config._retryCount || 0
      const method = String(config.method || 'GET').toUpperCase()
      const safeToRepeat = opts.retryNonIdempotent || IDEMPOTENT.includes(method)
      const serverOrNetworkError = !error.response || (error.response.status >= 500 && error.response.status <= 599)

      if (safeToRepeat && serverOrNetworkError && config._retryCount < maxRetries) {
        config._retryCount += 1
        const delay = Math.pow(2, config._retryCount - 1) * 1000 // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay))
        return client(config)
      }
      return Promise.reject(sanitizeError(error))
    }
  )

  return client
}

/** Strip stack traces so they aren't shown to users / logged to third parties */
function sanitizeError(error: any) {
  if (error && error.stack) error.stack = undefined
  if (error?.response?.data?.stack) error.response.data.stack = undefined
  return error
}
