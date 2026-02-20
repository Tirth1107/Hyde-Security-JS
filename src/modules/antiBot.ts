import { uid } from '../core/utils'

export const antiBot = {
  /**
   * Detect superhuman typing speeds on an input element.
   * Returns a function that provides stats when called.
   */
  detectFastTyping(el: HTMLInputElement | HTMLTextAreaElement, threshold = 30) {
    let last = Date.now()
    let fast = 0
    let total = 0
    const handler = () => {
      const now = Date.now()
      const dt = now - last
      last = now
      total++
      if (dt < threshold) fast++
    }
    el.addEventListener('keydown', handler)
    return {
      getStats: () => ({ fast, total, ratio: total > 0 ? fast / total : 0 }),
      isBot: () => total > 5 && (fast / total) > 0.5,
      destroy: () => el.removeEventListener('keydown', handler)
    }
  },

  /**
   * Detect paste events on an input element.
   * Calls `onPaste` callback when paste is detected.
   */
  detectPaste(el: HTMLInputElement | HTMLTextAreaElement, onPaste?: (e: ClipboardEvent) => void) {
    const handler = (e: Event) => {
      onPaste?.(e as ClipboardEvent)
    }
    el.addEventListener('paste', handler)
    return () => el.removeEventListener('paste', handler)
  },

  /**
   * Check if the browser is a headless / automated environment.
   * Combines multiple signals for more reliable detection.
   */
  detectHeadless(): { isBot: boolean; signals: string[] } {
    const signals: string[] = []

    // Check navigator.webdriver (set by Selenium, Puppeteer, Playwright)
    if (navigator && (navigator as any).webdriver) {
      signals.push('navigator.webdriver is true')
    }

    // Headless browsers often have empty languages
    if (navigator && navigator.languages && navigator.languages.length === 0) {
      signals.push('navigator.languages is empty')
    }

    // PhantomJS detection
    if ((window as any)._phantom || (window as any).__nightmare || (window as any).callPhantom) {
      signals.push('PhantomJS/Nightmare detected')
    }

    // Chrome headless detection
    if ((window as any).chrome && !(window as any).chrome.runtime) {
      // Headless Chrome lacks chrome.runtime
      // But this is also true for some extensions, so it's a weak signal
    }

    // Check for missing plugins (headless browsers usually have 0 plugins)
    if (navigator.plugins && navigator.plugins.length === 0) {
      signals.push('No browser plugins detected')
    }

    // Check for missing connection info
    if (!navigator.onLine && !(navigator as any).connection) {
      signals.push('No network connection info')
    }

    return {
      isBot: signals.length >= 2,
      signals
    }
  },

  /**
   * Challenge: track mouse movement over a duration.
   * Bots typically do not generate realistic mouse events.
   * Returns a promise that resolves with { moved, moveCount }.
   */
  challengeMouseMovement(el: HTMLElement, durationMs = 3000): Promise<{ moved: boolean; moveCount: number }> {
    return new Promise((resolve) => {
      let moveCount = 0
      const handler = () => { moveCount++ }
      el.addEventListener('mousemove', handler)
      setTimeout(() => {
        el.removeEventListener('mousemove', handler)
        resolve({ moved: moveCount > 3, moveCount })
      }, durationMs)
    })
  },

  /**
   * Simple timing-based CAPTCHA challenge.
   * If a form is submitted faster than `minMs`, it's likely a bot.
   */
  timingChallenge(form: HTMLFormElement, minMs = 2000): () => boolean {
    const start = Date.now()
    let isValid = false
    const handler = (e: Event) => {
      const elapsed = Date.now() - start
      if (elapsed < minMs) {
        e.preventDefault()
        isValid = false
      } else {
        isValid = true
      }
    }
    form.addEventListener('submit', handler)
    return () => {
      form.removeEventListener('submit', handler)
      return isValid
    }
  }
}
