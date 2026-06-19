import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios'
import CryptoJS from 'crypto-js'

export function createClient(opts?: { apiKey?: string; sign?: boolean; deriveKey?: string; baseURL?: string }): AxiosInstance {
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
      const key = opts.deriveKey || 'hyde-default-sign-key'
      
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
      const shouldRetry = !error.response || (error.response.status >= 500 && error.response.status <= 599)
      
      if (shouldRetry && config._retryCount < 3) {
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
