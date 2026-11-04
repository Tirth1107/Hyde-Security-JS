import { describe, it, expect, beforeEach } from 'vitest'
import { antiBot } from '../../modules/antiBot'
import { events } from '../../core/events'

describe('antiBot reports through the event bus', () => {
  beforeEach(() => events.reset())

  it('paste on a watched field is reported', () => {
    const input = document.createElement('input')
    input.name = 'email'
    const off = antiBot.detectPaste(input)
    input.dispatchEvent(new Event('paste'))
    off()
    const ev = events.history().find(e => e.type === 'paste_detected')
    expect(ev?.source).toBe('antiBot')
    expect(ev?.details?.field).toBe('email')
  })

  it('a form submitted too fast is blocked and reported', () => {
    const form = document.createElement('form')
    document.body.appendChild(form)
    const done = antiBot.timingChallenge(form, 10_000)
    const submit = new Event('submit', { cancelable: true })
    form.dispatchEvent(submit)
    expect(submit.defaultPrevented).toBe(true)
    expect(done()).toBe(false)
    expect(events.history().some(e => e.type === 'form_submitted_too_fast')).toBe(true)
    form.remove()
  })
})
