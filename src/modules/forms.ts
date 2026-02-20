import { sanitize } from './sanitize'
import { createHoneypot } from './honeypot'

export const forms = {
  attachSanitize(form: HTMLFormElement) {
    form.addEventListener('submit', (e) => {
      const inputs = Array.from(form.querySelectorAll('input,textarea')) as (HTMLInputElement | HTMLTextAreaElement)[]
      inputs.forEach(i => {
        if (i.value) i.value = sanitize.html(i.value)
      })
    })
  },
  addHoneypot(form: HTMLFormElement) {
    const hp = createHoneypot()
    form.appendChild(hp)
  }
}
