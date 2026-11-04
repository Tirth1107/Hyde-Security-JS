// Shared copy for the site. Keep in sync with README.md and docs/RELEASE_NOTES-v2.0.0.md.

export const PKG = 'hyde-security-js'
export const LINKS = {
  github: 'https://github.com/Tirth1107/Hyde-Security-JS',
  npm: 'https://www.npmjs.com/package/hyde-security-js',
  issues: 'https://github.com/Tirth1107/Hyde-Security-JS/issues',
  changelog: 'https://github.com/Tirth1107/Hyde-Security-JS/blob/main/CHANGELOG.md',
  migration: 'https://github.com/Tirth1107/Hyde-Security-JS/blob/main/docs/MIGRATION-v2.md',
  unpkg: 'https://unpkg.com/hyde-security-js@2/dist/hyde-security-js.umd.js'
}

export type GuardIcon =
  | 'script' | 'card' | 'network' | 'clipboard' | 'bot' | 'fish' | 'message'
  | 'dna' | 'type' | 'key' | 'gauge' | 'radio' | 'siren'

export interface Guard {
  name: string
  title: string
  attack: string
  what: string
  icon: GuardIcon
  mode: 'balanced' | 'strict' | 'configured' | 'helper'
}

export const GUARDS: Guard[] = [
  {
    name: 'scriptGuard', title: 'Script Guard', icon: 'script', mode: 'strict',
    attack: 'Compromised third-party scripts',
    what: 'Keeps an inventory of every script, blocks unauthorized ones before they run, alerts when the script list changes, and exports a report for PCI DSS 6.4.3 / 11.6.1 audits.'
  },
  {
    name: 'skimmerGuard', title: 'Skimmer Guard', icon: 'card', mode: 'strict',
    attack: 'Magecart card skimmers',
    what: 'Third-party scripts that read card, password or OTP fields get an empty value. A hijacked form action is put back.'
  },
  {
    name: 'networkFirewall', title: 'Network Firewall', icon: 'network', mode: 'configured',
    attack: 'Data sent to unapproved servers',
    what: 'One allowlist across fetch, XHR, sendBeacon, WebSocket, EventSource and image or script "pixel" beacons.'
  },
  {
    name: 'clipboardGuard', title: 'Clipboard Guard', icon: 'clipboard', mode: 'balanced',
    attack: 'ClickFix fake-CAPTCHA lures',
    what: 'Blocks scripts that copy PowerShell, mshta, curl | sh and other commands for the user to paste. Also catches crypto-wallet address swaps.'
  },
  {
    name: 'agentShield', title: 'Agent Shield', icon: 'bot', mode: 'strict',
    attack: 'Prompt injection against AI browser agents',
    what: 'Finds instruction-like text hidden from people but visible to AI agents, in your page or user content, and can remove it.'
  },
  {
    name: 'phishingGuard', title: 'Phishing Guard', icon: 'fish', mode: 'balanced',
    attack: 'Clones and fake login pop-ups',
    what: 'Alerts you when your site runs on a phishing domain. Catches lookalike domains, Browser-in-the-Browser pop-ups and login forms that post elsewhere.'
  },
  {
    name: 'messageGuard', title: 'Message Guard', icon: 'message', mode: 'balanced',
    attack: 'Insecure postMessage',
    what: 'Exact-origin listeners, a send() that refuses "*", and a page-wide firewall that drops messages from unknown origins.'
  },
  {
    name: 'prototypeGuard', title: 'Prototype Guard', icon: 'dna', mode: 'balanced',
    attack: 'Prototype pollution and DOM clobbering',
    what: 'Monitors, locks or freezes built-in prototypes, and gives you safeParse, safeMerge and safeGet.'
  },
  {
    name: 'trustedTypes', title: 'Trusted Types', icon: 'type', mode: 'configured',
    attack: 'DOM XSS',
    what: 'Default and named policies that sanitize HTML and allowlist script URLs. Pairs with a strict nonce-based CSP preset.'
  },
  {
    name: 'passkeys', title: 'Passkeys', icon: 'key', mode: 'helper',
    attack: 'Password theft, key exposure',
    what: 'WebAuthn helpers and the PRF extension: derive an AES-256 key from a passkey, so data is encrypted with a key that never leaves the device.'
  },
  {
    name: 'securityAudit', title: 'Security Audit', icon: 'gauge', mode: 'helper',
    attack: 'Weak page configuration',
    what: 'One call grades the page A+ to F: HTTPS, CSP, Trusted Types, framing, SRI, mixed content, cookies, token storage and more, with fixes.'
  },
  {
    name: 'reporting', title: 'Reporting', icon: 'radio', mode: 'configured',
    attack: 'Attacks nobody hears about',
    what: 'Batched, de-duplicated, redacted threat reports sent to your server, plus the browser\'s own CSP reports.'
  },
  {
    name: 'lockdown', title: 'Lockdown', icon: 'siren', mode: 'configured',
    attack: 'An attack in progress',
    what: 'Manual or automatic emergency mode: network cut to same-origin, sensitive fields wiped, forms blocked, page covered.'
  }
]

export const MODE_LABEL: Record<Guard['mode'], string> = {
  balanced: 'On in balanced',
  strict: 'On in strict',
  configured: 'When configured',
  helper: 'Call it'
}
