import { uid } from '../core/utils'

export function createHoneypot(namePrefix = 'hp_') {
  const input = document.createElement('input')
  input.type = 'text'
  input.name = `${namePrefix}${uid().substring(0, 8)}`
  input.className = 'hyde-hp-field'
  
  // Use offscreen positioning instead of display: none which bots can detect
  input.style.cssText = 'position: absolute; left: -9999px; height: 0; width: 0; overflow: hidden; opacity: 0;'
  
  input.tabIndex = -1
  input.autocomplete = 'off'
  
  return input
}

export function isTriggered(form: HTMLFormElement): boolean {
  const hpFields = form.querySelectorAll('.hyde-hp-field') as NodeListOf<HTMLInputElement>
  for (let i = 0; i < hpFields.length; i++) {
    if (hpFields[i].value && hpFields[i].value.trim() !== '') {
      return true
    }
  }
  return false
}
