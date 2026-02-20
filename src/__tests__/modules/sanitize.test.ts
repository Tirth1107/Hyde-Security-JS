import { describe, it, expect } from 'vitest'
import { sanitize } from '../../modules/sanitize'

describe('Sanitize Module', () => {
  it('should remove XSS script tags', () => {
    const dirty = '<img src=x onerror="alert(1)">'
    const clean = sanitize.html(dirty)
    expect(clean).not.toContain('onerror')
    expect(clean).not.toContain('alert')
  })

  it('should allow safe HTML tags', () => {
    const safe = '<b>Bold</b><i>Italic</i><p>Paragraph</p>'
    const clean = sanitize.html(safe)
    expect(clean).toContain('Bold')
    expect(clean).toContain('Italic')
  })

  it('should remove event handlers', () => {
    const dirty = '<div onclick="malicious()">Click</div>'
    const clean = sanitize.html(dirty)
    expect(clean).not.toContain('onclick')
  })

  it('should handle null and empty strings', () => {
    expect(sanitize.html('')).toBe('')
  })

  it('should remove dangerous protocols', () => {
    const dangerous = '<a href="vbscript:msgbox(1)">Click</a>'
    const clean = sanitize.html(dangerous)
    expect(clean).not.toContain('vbscript')
  })
})
