export function createHoneypot(name = 'hp_email') {
  const input = document.createElement('input')
  input.type = 'text'
  input.name = name
  input.style.display = 'none'
  input.autocomplete = 'off'
  return input
}
