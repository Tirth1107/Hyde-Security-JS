/**
 * clipboardGuard — ClickFix and clipboard-hijack protection.
 *
 * ClickFix (fake CAPTCHA / "fix this error" pages) writes a shell command to
 * the clipboard and tells the user to paste it into Win+R or a terminal.
 * If an attacker injects such a lure into *your* site (XSS, compromised
 * vendor, malicious ad), this guard inspects every script-initiated clipboard
 * write and blocks command payloads. It also catches crypto-address swapping
 * (copy one wallet address, clipboard silently gets another).
 */
import { createReporter, ThreatListener } from '../core/events'
import { patchMethod, PatchGroup } from '../core/hooks'
import { preview } from '../core/utils'

export interface ClipboardAnalysis {
  malicious: boolean
  score: number
  reasons: string[]
}

export interface ClipboardGuardOptions {
  /** 'enforce' blocks malicious writes (default), 'report' only reports */
  mode?: 'report' | 'enforce'
  /** Score at or above which a write is treated as malicious (default 5) */
  threshold?: number
  /** Detect crypto wallet address swaps (default true) */
  addressSwap?: boolean
  onThreat?: ThreatListener
}

// [pattern, score, reason]
const RULES: Array<[RegExp, number, string]> = [
  [/\b(powershell|pwsh)(\.exe)?\b/i, 3, 'PowerShell'],
  [/\s-(e|en|enc|encodedcommand)\s+[A-Za-z0-9+/=]{16,}/i, 4, 'encoded PowerShell command'],
  [/\s-(w|win|windowstyle)\s+(h|hidden)\b/i, 3, 'hidden window'],
  [/\b(iex|invoke-expression)\b/i, 4, 'Invoke-Expression'],
  [/\b(iwr|irm|invoke-webrequest|invoke-restmethod|downloadstring|downloadfile|net\.webclient|start-bitstransfer)\b/i, 3, 'downloads from the internet'],
  [/\bmshta(\.exe)?\s+["']?(https?:|vbscript:|javascript:)/i, 5, 'mshta remote script'],
  [/\b(rundll32|regsvr32)(\.exe)?\b.*(https?:|\\\\|scrobj|javascript:)/i, 5, 'LOLBin remote load'],
  [/\b(certutil)(\.exe)?\b.*-(urlcache|decode)/i, 5, 'certutil download/decode'],
  [/\b(bitsadmin|msiexec)(\.exe)?\b.*https?:/i, 4, 'remote installer'],
  [/\bcmd(\.exe)?\s+\/[ck]\b/i, 3, 'cmd /c'],
  [/\b(curl|wget|iwr|invoke-webrequest)\b[^\n]*\s(-o|-outfile|--output|>)\s*\S+[^\n]*(&&|;|\|\||\bstart\b)/i, 3, 'download then execute'],
  [/%(temp|tmp|appdata|localappdata|public)%|\$env:(temp|appdata)|\/tmp\/[\w.-]+\s*(&&|;)/i, 2, 'payload in temp folder'],
  [/\b(wscript|cscript|conhost)(\.exe)?\b/i, 2, 'script host'],
  [/\b(curl|wget)\b[^|\n]*\|\s*(sudo\s+)?(ba|z|da)?sh\b/i, 5, 'download piped to shell'],
  [/\bbase64\s+(-d|--decode)\b[^|\n]*\|\s*(ba|z)?sh\b/i, 5, 'base64 decoded to shell'],
  [/\b(bash|zsh|sh)\s+-c\s+["'$]/i, 3, 'shell -c'],
  [/\bosascript\s+-e\b/i, 4, 'AppleScript execution'],
  [/\bnohup\b|\bdisown\b|&\s*$/im, 1, 'background process'],
  [/\bchmod\s+\+x\b/i, 2, 'make executable'],
  [/#\s*(i\s*a?m\s*not\s*a\s*robot|captcha|verif(y|ication)|human)/i, 4, 'fake verification comment'],
  [/\b(ray id|verification id|recaptcha)\b/i, 2, 'CAPTCHA wording'],
  [/https?:\/\/\d{1,3}(\.\d{1,3}){3}/i, 2, 'raw IP URL'],
  [/[A-Za-z0-9+/]{120,}={0,2}/, 2, 'long base64 blob']
]

const ADDRESS_PATTERNS: Array<[RegExp, string]> = [
  [/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/, 'bitcoin'],
  [/^0x[a-fA-F0-9]{40}$/, 'ethereum'],
  [/^T[1-9A-HJ-NP-Za-km-z]{33}$/, 'tron'],
  [/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, 'solana'],
  [/^(ltc1|[LM])[a-zA-HJ-NP-Z0-9]{26,62}$/, 'litecoin']
]

const reporter = createReporter('clipboardGuard', 'critical')
let group: PatchGroup | null = null
let cfg: Required<Omit<ClipboardGuardOptions, 'onThreat'>> | null = null
let lastUserCopy: { text: string; at: number } | null = null

export function analyzeClipboardText(text: string, threshold = 5): ClipboardAnalysis {
  const reasons: string[] = []
  let score = 0
  for (const [re, pts, why] of RULES) {
    if (re.test(text)) {
      score += pts
      reasons.push(why)
    }
  }
  return { malicious: score >= threshold, score, reasons }
}

export function addressType(text: string): string | null {
  const t = text.trim()
  for (const [re, kind] of ADDRESS_PATTERNS) if (re.test(t)) return kind
  return null
}

/** Returns true if the write may proceed */
function inspectWrite(text: string, channel: string): boolean {
  if (!cfg || typeof text !== 'string' || !text) return true
  const enforce = cfg.mode === 'enforce'

  const a = analyzeClipboardText(text, cfg.threshold)
  if (a.malicious) {
    reporter.report(enforce ? 'clipboard_payload_blocked' : 'clipboard_payload_detected', {
      channel, score: a.score, reasons: a.reasons, preview: preview(text, 160)
    })
    return !enforce
  }

  if (cfg.addressSwap && lastUserCopy && Date.now() - lastUserCopy.at < 2000) {
    const kind = addressType(text)
    if (kind && addressType(lastUserCopy.text) && lastUserCopy.text.trim() !== text.trim()) {
      reporter.report('clipboard_address_swap', {
        channel, kind, selected: preview(lastUserCopy.text, 64), written: preview(text, 64), blocked: enforce
      })
      return !enforce
    }
  }
  return true
}

export const clipboardGuard = {
  analyze: analyzeClipboardText,

  enable(options: ClipboardGuardOptions = {}) {
    if (typeof document === 'undefined') return () => {}
    this.disable()
    reporter.setCallback(options.onThreat)
    cfg = {
      mode: options.mode ?? 'enforce',
      threshold: options.threshold ?? 5,
      addressSwap: options.addressSwap ?? true
    }
    group = new PatchGroup()

    // Async Clipboard API
    const clip = typeof navigator !== 'undefined' ? navigator.clipboard : undefined
    if (clip && typeof clip.writeText === 'function') {
      group.add(patchMethod(clip, 'writeText', original => function (this: any, text: string) {
        if (!inspectWrite(text, 'clipboard.writeText')) {
          return Promise.reject(new DOMException('Blocked by HydeSecurity clipboardGuard', 'NotAllowedError'))
        }
        return original.call(this, text)
      }))
    }
    if (clip && typeof (clip as any).write === 'function') {
      group.add(patchMethod(clip as any, 'write', original => async function (this: any, items: any[]) {
        for (const item of items || []) {
          if (item?.types?.includes?.('text/plain')) {
            const blob = await item.getType('text/plain')
            const text = typeof blob?.text === 'function' ? await blob.text() : String(blob)
            if (!inspectWrite(text, 'clipboard.write')) {
              throw new DOMException('Blocked by HydeSecurity clipboardGuard', 'NotAllowedError')
            }
          }
        }
        return original.call(this, items)
      }))
    }

    // copy events where a script replaces the data: e.clipboardData.setData(...)
    if (typeof DataTransfer !== 'undefined') {
      group.add(patchMethod(DataTransfer.prototype, 'setData', original => function (this: DataTransfer, format: string, data: string) {
        if (/^text(\/plain)?$/i.test(format) && !inspectWrite(data, 'clipboardData.setData')) return
        return original.call(this, format, data)
      }))
    }

    // Legacy: select hidden textarea + execCommand('copy')
    group.add(patchMethod(document, 'execCommand', original => function (this: Document, cmd: string, ...rest: any[]) {
      if (String(cmd).toLowerCase() === 'copy' || String(cmd).toLowerCase() === 'cut') {
        const active = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null
        let text = document.getSelection?.()?.toString() || ''
        if (!text && active && typeof active.value === 'string' && typeof active.selectionStart === 'number') {
          text = active.value.slice(active.selectionStart ?? 0, active.selectionEnd ?? active.value.length)
        }
        if (!inspectWrite(text, 'execCommand')) return false
      }
      return original.call(this, cmd, ...rest)
    }))

    // Remember what the user really selected, for address-swap detection
    const onCopy = () => {
      const text = document.getSelection?.()?.toString() || ''
      if (text) lastUserCopy = { text, at: Date.now() }
    }
    document.addEventListener('copy', onCopy, true)
    group.add(() => document.removeEventListener('copy', onCopy, true))

    return () => this.disable()
  },

  disable() {
    group?.restoreAll()
    group = null
    lastUserCopy = null
  },

  isEnabled() {
    return group !== null
  }
}
