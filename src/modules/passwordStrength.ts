import zxcvbn from 'zxcvbn'

export interface PasswordResult {
  score: number // 0-4
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong'
  percent: number // 0-100
  crackTime: string
  feedback: string[]
  warning: string
}

export interface PasswordRules {
  minLength?: number
  requireUppercase?: boolean
  requireLowercase?: boolean
  requireDigit?: boolean
  requireSpecial?: boolean
}

const LABELS: PasswordResult['label'][] = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong']

export const passwordStrength = {
  /**
   * Analyze password strength using zxcvbn entropy estimation.
   */
  check(password: string): PasswordResult {
    if (!password || password.length === 0) {
      return { score: 0, label: 'Very Weak', percent: 0, crackTime: 'instant', feedback: ['Enter a password'], warning: '' }
    }
    const result = zxcvbn(password)
    return {
      score: result.score,
      label: LABELS[result.score],
      percent: Math.min(100, (result.score + 1) * 20),
      crackTime: result.crack_times_display.offline_slow_hashing_1e4_per_second as string,
      feedback: result.feedback.suggestions || [],
      warning: result.feedback.warning || ''
    }
  },

  /**
   * Validate a password against configurable rules.
   * Returns an object with `valid` boolean and list of `errors`.
   */
  validate(password: string, rules: PasswordRules = {}): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    const minLen = rules.minLength ?? 8

    if (password.length < minLen) errors.push(`Must be at least ${minLen} characters`)
    if (rules.requireUppercase !== false && !/[A-Z]/.test(password)) errors.push('Must contain an uppercase letter')
    if (rules.requireLowercase !== false && !/[a-z]/.test(password)) errors.push('Must contain a lowercase letter')
    if (rules.requireDigit !== false && !/[0-9]/.test(password)) errors.push('Must contain a digit')
    if (rules.requireSpecial && !/[^A-Za-z0-9]/.test(password)) errors.push('Must contain a special character')

    return { valid: errors.length === 0, errors }
  },

  /**
   * Generate actionable suggestions for improving a password.
   */
  generateSuggestions(password: string): string[] {
    const tips: string[] = []
    if (password.length < 8) tips.push('Use at least 8 characters')
    if (password.length < 12) tips.push('Consider using 12+ characters for better security')
    if (!/[A-Z]/.test(password)) tips.push('Add uppercase letters (A-Z)')
    if (!/[a-z]/.test(password)) tips.push('Add lowercase letters (a-z)')
    if (!/[0-9]/.test(password)) tips.push('Add numbers (0-9)')
    if (!/[^A-Za-z0-9]/.test(password)) tips.push('Add special characters (!@#$%^&*)')
    if (/^[a-zA-Z]+$/.test(password)) tips.push('Don\'t use only letters')
    if (/(.)\1{2,}/.test(password)) tips.push('Avoid repeated characters')
    if (/^(123|abc|qwerty|password)/i.test(password)) tips.push('Avoid common patterns')

    const result = zxcvbn(password)
    if (result.feedback.suggestions) {
      tips.push(...result.feedback.suggestions)
    }
    // Deduplicate
    return [...new Set(tips)]
  }
}
