/**
 * Configuration and types for HydeSecurity v2
 */
import type { HydeSecurityEvent, ThreatListener } from './events'
import type { KeyInput } from '../modules/encryption'
import type { ScriptGuardOptions } from '../modules/scriptGuard'
import type { SkimmerGuardOptions } from '../modules/skimmerGuard'
import type { NetworkFirewallOptions } from '../modules/networkFirewall'
import type { ClipboardGuardOptions } from '../modules/clipboardGuard'
import type { AgentShieldOptions } from '../modules/agentShield'
import type { PhishingGuardOptions } from '../modules/phishingGuard'
import type { MessageGuardOptions } from '../modules/messageGuard'
import type { PrototypeGuardOptions } from '../modules/prototypeGuard'
import type { TrustedTypesOptions } from '../modules/trustedTypes'
import type { ReportingOptions } from '../modules/reporting'

export type { HydeSecurityEvent, ThreatListener }

export type Mode = 'dev' | 'balanced' | 'strict'

export interface LockdownOptions {
  /** Threat types or 'source:<module>' that trigger lockdown */
  on: string[]
  /** Message shown on the lock overlay */
  message?: string
  /** Show an overlay (default true) */
  overlay?: boolean
}

export interface HydeSecurityConfig {
  /** App name used for logging and watermark text */
  appName?: string
  /** 'dev' (minimal), 'balanced' (recommended), 'strict' (everything) */
  mode?: Mode
  /** Enable console logging */
  enableLogs?: boolean
  /** Called for every threat from every module */
  onThreatDetected?: (ev: HydeSecurityEvent) => void
  /** Default key (passphrase or CryptoKey) for encryption helpers */
  encryptionKey?: KeyInput

  // ── v1 deterrents ───────────────────────────────────────────────
  enableWatermark?: boolean
  allowedIframes?: string[]
  enableAntiCopy?: boolean
  enableAntiPrint?: boolean
  enableAntiContextMenu?: boolean
  enableTabGuard?: boolean
  enableAntiScreenCapture?: boolean
  enableAntiIframe?: boolean
  /** DevTools detection (default: strict only) */
  enableAntiDevtools?: boolean
  /** `debugger` pause trap (default: strict only) */
  enableDebuggerTrap?: boolean

  // ── v2 guards: true / options to turn on, false to turn off ─────
  /** Script inventory + allowlist (PCI DSS 6.4.3 / 11.6.1). Default: strict (report) */
  scriptGuard?: boolean | ScriptGuardOptions
  /** Formjacking / skimmer detection on sensitive fields. Default: strict (report) */
  skimmerGuard?: boolean | SkimmerGuardOptions
  /** Outbound allowlist. Off unless configured. */
  networkFirewall?: false | NetworkFirewallOptions
  /** ClickFix + clipboard hijack blocking. Default: balanced/strict */
  clipboardGuard?: boolean | ClipboardGuardOptions
  /** AI-agent prompt-injection scanner. Default: strict (report) */
  agentShield?: boolean | AgentShieldOptions
  /** Clone detection, credential forms, BitB, tabnabbing. Default: balanced/strict */
  phishingGuard?: boolean | PhishingGuardOptions
  /** postMessage firewall. Default: balanced/strict in report mode for same-origin only */
  messageGuard?: false | MessageGuardOptions
  /** Prototype pollution + DOM clobbering. Default: balanced/strict (monitor) */
  prototypeGuard?: boolean | PrototypeGuardOptions
  /** Trusted Types default policy. Off unless configured. */
  trustedTypes?: boolean | TrustedTypesOptions
  /** Send threats to your backend. Off unless configured. */
  reporting?: ReportingOptions
  /** Automatic lockdown when matching threats fire */
  lockdown?: false | LockdownOptions
}

export const defaultConfig: HydeSecurityConfig = {
  appName: 'HydeSecurityApp',
  mode: 'balanced',
  enableLogs: false,
  enableWatermark: false,
  allowedIframes: []
}
