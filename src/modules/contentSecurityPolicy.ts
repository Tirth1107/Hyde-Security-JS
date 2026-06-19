export interface CSPDirectives {
  defaultSrc?: string[]
  scriptSrc?: string[]
  styleSrc?: string[]
  imgSrc?: string[]
  connectSrc?: string[]
  fontSrc?: string[]
  objectSrc?: string[]
  mediaSrc?: string[]
  frameSrc?: string[]
  frameAncestors?: string[]
  formAction?: string[]
  baseUri?: string[]
  reportUri?: string
}

export const contentSecurityPolicy = {
  build(directives: CSPDirectives): string {
    const parts: string[] = []
    
    const map: Record<keyof CSPDirectives, string> = {
      defaultSrc: 'default-src',
      scriptSrc: 'script-src',
      styleSrc: 'style-src',
      imgSrc: 'img-src',
      connectSrc: 'connect-src',
      fontSrc: 'font-src',
      objectSrc: 'object-src',
      mediaSrc: 'media-src',
      frameSrc: 'frame-src',
      frameAncestors: 'frame-ancestors',
      formAction: 'form-action',
      baseUri: 'base-uri',
      reportUri: 'report-uri'
    }

    for (const [key, prop] of Object.entries(map)) {
      const val = directives[key as keyof CSPDirectives]
      if (val) {
        if (Array.isArray(val) && val.length > 0) {
          parts.push(`${prop} ${val.join(' ')}`)
        } else if (typeof val === 'string') {
          parts.push(`${prop} ${val}`)
        }
      }
    }

    return parts.join('; ')
  },

  inject(directives: CSPDirectives): () => void {
    if (typeof document === 'undefined') return () => {}
    
    const csp = this.build(directives)
    const meta = document.createElement('meta')
    meta.httpEquiv = 'Content-Security-Policy'
    meta.content = csp
    
    document.head.appendChild(meta)
    
    return () => {
      meta.remove()
    }
  },

  onViolation(callback: (event: SecurityPolicyViolationEvent) => void): () => void {
    if (typeof document === 'undefined') return () => {}
    
    const handler = (e: SecurityPolicyViolationEvent) => {
      callback(e)
    }
    
    document.addEventListener('securitypolicyviolation', handler)
    
    return () => {
      document.removeEventListener('securitypolicyviolation', handler)
    }
  },

  getDefaults(): CSPDirectives {
    return {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"]
    }
  }
}
