import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios'
import CryptoJS from 'crypto-js'

const BUILTIN_SIGN_KEY = 'hyde-default-sign-key'
// Repeating these is safe; POST/PATCH could create duplicates on the server
const IDEMPOTENT = ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE']

export interface ClientOptions {
  apiKey?: string
  /** Add an HMAC-SHA256 `x-hyde-signature` header */
  sign?: boolean
  /** Key used for signing. Without it a public built-in key is used. */
  deriveKey?: string
  baseURL?: string
  /** Max retries for network errors / 5xx (default 3) */
  retries?: number
  /** Also retry POST and PATCH (default false — they may not be safe to repeat) */
  retryNonIdempotent?: boolean
}

export function createClient(opts?: ClientOptions): AxiosInstance {
  if (opts?.sign && !opts.deriveKey) {
    console.warn('[HydeSecurity] network.createClient({ sign: true }) without deriveKey uses a public built-in key.')
  }
  const maxRetries = opts?.retries ?? 3

  const client = axios.create({
    baseURL: opts?.baseURL
  })
  
  client.interceptors.request.use(config => {
    if (opts?.apiKey && config.headers) {
      config.headers['x-api-key'] = opts.apiKey
    }
    
    const timestamp = Date.now().toString()
    if (config.headers) {
      config.headers['x-hyde-ts'] = timestamp
    }
    
    if (opts?.sign && config.headers) {
      const method = config.method?.toUpperCase() || 'GET'
      const url = config.url || ''
      const key = opts.deriveKey || BUILTIN_SIGN_KEY
      
      const payload = `${method}:${url}:${timestamp}`
      const signature = CryptoJS.HmacSHA256(payload, key).toString(CryptoJS.enc.Hex)
      
      config.headers['x-hyde-signature'] = signature
    }
    return config
  })

  client.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
      const config = error.config as any
      if (!config) {
        return Promise.reject(sanitizeError(error))
      }

      config._retryCount = config._retryCount || 0

      // Only retry on 5xx errors or network errors
      const method = String(config.method || 'GET').toUpperCase()
      const safeToRepeat = opts?.retryNonIdempotent || IDEMPOTENT.includes(method)
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

function sanitizeError(error: any) {
  if (error && error.stack) {
    error.stack = undefined
  }
  if (error.response && error.response.data && error.response.data.stack) {
    error.response.data.stack = undefined
  }
  return error
}
