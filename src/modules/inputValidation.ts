import validator from 'validator'

export type ValidationRule = 
  | { type: 'required'; message?: string }
  | { type: 'minLength'; value: number; message?: string }
  | { type: 'maxLength'; value: number; message?: string }
  | { type: 'email'; message?: string }
  | { type: 'url'; message?: string }
  | { type: 'pattern'; value: RegExp; message?: string }
  | { type: 'noXSS'; message?: string }
  | { type: 'noSQL'; message?: string }

export const inputValidation = {
  isEmail(input: string): boolean {
    return validator.isEmail(input)
  },
  
  isURL(input: string, opts?: { requireHTTPS?: boolean }): boolean {
    return validator.isURL(input, { require_protocol: true, require_valid_protocol: true, protocols: opts?.requireHTTPS ? ['https'] : ['http', 'https'] })
  },
  
  isAlphanumeric(input: string): boolean {
    return validator.isAlphanumeric(input)
  },
  
  isSQLInjection(input: string): boolean {
    // Basic SQLi detection patterns
    const sqlRegex = /(?:'|%27|%22|").*(?:UNION|SELECT|INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|EXEC|--|#|\/\*)/i
    return sqlRegex.test(input)
  },
  
  isXSSAttempt(input: string): boolean {
    // Basic XSS detection patterns
    const xssRegex = /(?:<script|<\/script>|<img[^>]+onerror=|javascript:|onload=|eval\()/i
    return xssRegex.test(input)
  },
  
  sanitizeInput(input: string): string {
    return validator.escape(validator.trim(input))
  },
  
  validateField(input: string, rules: ValidationRule[]): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    for (const rule of rules) {
      switch (rule.type) {
        case 'required':
          if (!input || input.trim() === '') errors.push(rule.message || 'Field is required')
          break
        case 'minLength':
          if (input.length < rule.value) errors.push(rule.message || `Minimum length is ${rule.value}`)
          break
        case 'maxLength':
          if (input.length > rule.value) errors.push(rule.message || `Maximum length is ${rule.value}`)
          break
        case 'email':
          if (!this.isEmail(input)) errors.push(rule.message || 'Invalid email address')
          break
        case 'url':
          if (!this.isURL(input)) errors.push(rule.message || 'Invalid URL')
          break
        case 'pattern':
          if (!rule.value.test(input)) errors.push(rule.message || 'Invalid format')
          break
        case 'noXSS':
          if (this.isXSSAttempt(input)) errors.push(rule.message || 'Invalid characters detected')
          break
        case 'noSQL':
          if (this.isSQLInjection(input)) errors.push(rule.message || 'Invalid query format detected')
          break
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
}
