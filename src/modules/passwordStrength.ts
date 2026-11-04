type Zxcvbn = typeof import('zxcvbn')

// zxcvbn is ~800 KB (its word lists). It's loaded on first use, so apps that never check a
// password don't ship it in their main bundle. Until it arrives, check() uses a built-in
// estimate based on length, character classes and common patterns.
let zxcvbn: Zxcvbn | null = null
let loading: Promise<Zxcvbn | null> | null = null
function load(): Promise<Zxcvbn | null> {
  if (!loading) {
    loading = import('zxcvbn')
      .then((m: any) => (zxcvbn = (m.default ?? m) as Zxcvbn))
      .catch(() => null)
  }
  return loading
}

const COMMON = /^(?:password|passw0rd|qwerty|letmein|welcome|admin|iloveyou|monkey|dragon|abc123|111111|123123|123456|1234567|12345678|123456789|000000)/i

function displayTime(seconds: number): string {
  if (seconds < 1) return 'less than a second'
  const units: [number, string][] = [[31536000 * 100, 'centuries'], [31536000, 'year'], [2592000, 'month'], [86400, 'day'], [3600, 'hour'], [60, 'minute'], [1, 'second']]
  if (seconds >= units[0][0]) return 'centuries'
  for (const [size, name] of units.slice(1)) {
    if (seconds >= size) {
      const n = Math.round(seconds / size)
      return `${n} ${name}${n === 1 ? '' : 's'}`
    }
  }
  return 'less than a second'
}

/** Built-in estimate used before zxcvbn has loaded (or if it can't load). */
function estimate(password: string): { score: number; crackTime: string; warning: string; suggestions: string[] } {
  let pool = 0
  if (/[a-z]/.test(password)) pool += 26
  if (/[A-Z]/.test(password)) pool += 26
  if (/[0-9]/.test(password)) pool += 10
  if (/[^A-Za-z0-9]/.test(password)) pool += 33
  const unique = new Set(password).size
  // Repeats and short alphabets carry less information than their length suggests
  let bits = Math.min(password.length, unique * 2) * Math.log2(Math.max(pool, 1))
  let warning = ''
  if (COMMON.test(password)) { bits = Math.min(bits, 10); warning = 'This is a very common password' }
  else if (/(.)\1{2,}/.test(password)) { bits *= 0.7; warning = 'Repeated characters are easy to guess' }
  else if (/(?:abc|bcd|cde|123|234|345|456|567|678|789|qwe|wer|asd|zxc)/i.test(password)) { bits *= 0.8; warning = 'Sequences like abc or 123 are easy to guess' }
  const score = bits < 28 ? 0 : bits < 36 ? 1 : bits < 60 ? 2 : bits < 80 ? 3 : 4
  const seconds = Math.pow(2, bits) / 2 / 1e4
  const suggestions = score < 3 ? ['Add another word or two. Uncommon words are better.'] : []
  return { score, crackTime: displayTime(seconds), warning, suggestions }
}

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
  /** Loads zxcvbn. check() uses it from then on. Resolves false if it can't be loaded. */
  load(): Promise<boolean> {
    return load().then(z => !!z)
  },

  /** Whether zxcvbn has loaded (otherwise check() uses the built-in estimate). */
  isLoaded(): boolean {
    return !!zxcvbn
  },

  /** Like check(), but waits for zxcvbn first. */
  async checkAsync(password: string): Promise<PasswordResult> {
    await load()
    return this.check(password)
  },

  /**
   * Analyze password strength. Uses zxcvbn once loaded (the first call starts loading it),
   * and a built-in estimate until then.
   */
  check(password: string): PasswordResult {
    if (!password || password.length === 0) {
      return { score: 0, label: 'Very Weak', percent: 0, crackTime: 'instant', feedback: ['Enter a password'], warning: '' }
    }
    if (!zxcvbn) {
      void load()
      const e = estimate(password)
      return {
        score: e.score,
        label: LABELS[e.score],
        percent: Math.min(100, (e.score + 1) * 20),
        crackTime: e.crackTime,
        feedback: e.suggestions,
        warning: e.warning
      }
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

    const suggestions = zxcvbn ? zxcvbn(password).feedback.suggestions : estimate(password).suggestions
    if (suggestions) tips.push(...suggestions)
    // Deduplicate
    return [...new Set(tips)]
  }
}
