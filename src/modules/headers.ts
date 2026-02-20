import axios from 'axios'

export function setupAxios(client = axios, opts?: { appName?: string }) {
  client.interceptors.request.use(cfg => {
    cfg.headers = cfg.headers || {}
    if (opts?.appName) cfg.headers['x-hyde-app'] = opts.appName
    cfg.headers['x-hyde-ts'] = String(Date.now())
    return cfg
  })
}
