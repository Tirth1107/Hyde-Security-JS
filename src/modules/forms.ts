import { sanitize } from './sanitize'
import { createHoneypot, isTriggered } from './honeypot'

export const forms = {
  attachSanitize(form: HTMLFormElement, onBotDetected?: () => void) {
    const submitHandler = (e: Event) => {
      // Validate honeypot first
      if (isTriggered(form)) {
        e.preventDefault()
        e.stopPropagation()
        onBotDetected?.()
        return
      }

      // Sanitize inputs
      const inputs = Array.from(form.querySelectorAll('input,textarea')) as (HTMLInputElement | HTMLTextAreaElement)[]
      inputs.forEach(i => {
        // Don't sanitize password fields or files
        if (i.value && i.type !== 'password' && i.type !== 'file') {
          i.value = sanitize.text(i.value)
        }
      })
    }
    
    form.addEventListener('submit', submitHandler)
    
    return () => {
      form.removeEventListener('submit', submitHandler)
    }
  },
  
  addHoneypot(form: HTMLFormElement) {
    const hp = createHoneypot()
    form.appendChild(hp)
    return hp
  }
}
