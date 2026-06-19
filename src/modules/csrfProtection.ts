import { cookie } from './cookie'

export const csrfProtection = {
  getToken(): string | null {
    if (typeof document === 'undefined') return null
    const meta = document.querySelector('meta[name="csrf-token"]')
    if (meta) {
      return meta.getAttribute('content')
    }
    return null
  },
  
  getTokenFromCookie(cookieName = 'csrftoken'): string | null {
    if (typeof document === 'undefined') return null
    return cookie.get(cookieName)
  },
  
  attachToAxios(client: any, opts?: { headerName?: string; tokenSource?: 'meta' | 'cookie'; cookieName?: string }): void {
    if (!client || !client.interceptors) return
    
    const headerName = opts?.headerName || 'X-CSRF-Token'
    const source = opts?.tokenSource || 'meta'
    
    client.interceptors.request.use((config: any) => {
      // Only attach to unsafe methods
      const method = config.method?.toUpperCase() || 'GET'
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        const token = source === 'cookie' 
          ? this.getTokenFromCookie(opts?.cookieName)
          : this.getToken()
          
        if (token && config.headers) {
          config.headers[headerName] = token
        }
      }
      return config
    })
  },
  
  attachToForm(form: HTMLFormElement, tokenFieldName = 'csrfmiddlewaretoken'): void {
    if (typeof document === 'undefined') return
    
    const token = this.getToken() || this.getTokenFromCookie()
    if (!token) return
    
    // Check if it already exists
    let input = form.querySelector(`input[name="${tokenFieldName}"]`) as HTMLInputElement
    if (!input) {
      input = document.createElement('input')
      input.type = 'hidden'
      input.name = tokenFieldName
      form.appendChild(input)
    }
    input.value = token
  }
}
