import axios from 'axios'

export function createClient(opts?: { apiKey?: string; sign?: boolean; deriveKey?: string }) {
  const client = axios.create()
  client.interceptors.request.use(config => {
    if (opts?.apiKey && config.headers) {
      config.headers['x-api-key'] = opts.apiKey
    }
    if (opts?.sign && config.headers) {
      config.headers['x-hyde-sign'] = '1'
    }
    return config
  })
  return client
}
