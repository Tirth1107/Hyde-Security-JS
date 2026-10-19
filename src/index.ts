import { defaultConfig, HydeSecurityConfig, LockdownOptions, Mode } from './core/config'
import { events, HydeSecurityEvent, ThreatListener } from './core/events'
import { initLogger, log } from './core/logger'
import { optionsOf } from './core/utils'

import { antiDevtools } from './modules/antiDevtools'
import { antiDebug } from './modules/antiDebug'
import { antiCopy } from './modules/antiCopy'
import { antiContextMenu } from './modules/antiContextMenu'
import { antiPrint } from './modules/antiPrint'
import { antiIframe } from './modules/antiIframe'
import { tabGuard } from './modules/tabGuard'
import { antiScreenCapture } from './modules/antiScreenCapture'
import { addWatermark } from './modules/watermark'
import { sanitize } from './modules/sanitize'
import { encryption } from './modules/encryption'
import { storage } from './modules/storage'
import { cookie } from './modules/cookie'
import { session } from './modules/session'
import { makeRateLimited } from './modules/rateLimiter'
import { forms } from './modules/forms'
import * as network from './modules/network'
import * as fingerprint from './modules/fingerprint'
import * as device from './modules/device'
import { domGuard } from './modules/domGuard'
import { routerGuard } from './modules/routerGuard'
import { antiBot } from './modules/antiBot'
import { passwordStrength } from './modules/passwordStrength'
import { createHoneypot, isTriggered } from './modules/honeypot'
import { integrity } from './modules/integrity'
import { setupAxios } from './modules/headers'
import { obfuscator } from './modules/obfuscator'
import { csrfProtection } from './modules/csrfProtection'
import { contentSecurityPolicy } from './modules/contentSecurityPolicy'
import { inputValidation } from './modules/inputValidation'
import { biometrics } from './modules/biometrics'
import { antiClickjacking } from './modules/antiClickjacking'
import { networkFirewall } from './modules/networkFirewall'
// v2
import { scriptGuard } from './modules/scriptGuard'
import { skimmerGuard, DEFAULT_SENSITIVE_SELECTOR } from './modules/skimmerGuard'
import { clipboardGuard } from './modules/clipboardGuard'
import { agentShield } from './modules/agentShield'
import { phishingGuard } from './modules/phishingGuard'
import { messageGuard } from './modules/messageGuard'
import { prototypeGuard } from './modules/prototypeGuard'
import { trustedTypes } from './modules/trustedTypes'
import { passkeys } from './modules/passkeys'
import { securityAudit } from './modules/securityAudit'
import { reporting } from './modules/reporting'

export type { HydeSecurityConfig, HydeSecurityEvent, ThreatListener, Mode, LockdownOptions }
export type { ScriptGuardOptions, ScriptRecord } from './modules/scriptGuard'
export type { SkimmerGuardOptions } from './modules/skimmerGuard'
export type { NetworkFirewallOptions } from './modules/networkFirewall'
export type { ClipboardGuardOptions, ClipboardAnalysis } from './modules/clipboardGuard'
export type { AgentShieldOptions, InjectionFinding, AgentDetection } from './modules/agentShield'
export type { PhishingGuardOptions, LookalikeResult } from './modules/phishingGuard'
export type { MessageGuardOptions, ListenOptions } from './modules/messageGuard'
export type { PrototypeGuardOptions } from './modules/prototypeGuard'
export type { TrustedTypesOptions } from './modules/trustedTypes'
export type { AuditResult, AuditFinding, AuditOptions } from './modules/securityAudit'
export type { ReportingOptions } from './modules/reporting'
export type { CSPDirectives } from './modules/contentSecurityPolicy'
export type { KeyInput } from './modules/encryption'

const VERSION = typeof __HYDE_VERSION__ !== 'undefined' ? __HYDE_VERSION__ : '0.0.0-dev'

const state = {
  config: { ...defaultConfig } as HydeSecurityConfig,
  enabled: false,
  initialized: false,
  lockedDown: false
}

let removeWatermark: (() => void) | null = null
let offGlobal: (() => void) | null = null
let offLockdown: (() => void) | null = null
let lockdownCleanup: Array<() => void> = []

/** Which guards a mode turns on when the config doesn't say */
function defaultsFor(mode: Mode) {
  const on = mode !== 'dev'
  const strict = mode === 'strict'
  return { clipboardGuard: on, phishingGuard: on, messageGuard: on, prototypeGuard: on, scriptGuard: strict, skimmerGuard: strict, agentShield: strict }
}

/** Resolve a `boolean | options` config key against the mode default */
function want<T extends object>(value: boolean | T | undefined, modeDefault: boolean, base: T): T | null {
  if (value === undefined) return modeDefault ? { ...base } : null
  return optionsOf(value, base)
}

function showLockOverlay(message: string) {
  if (typeof document === 'undefined') return () => {}
  const el = document.createElement('div')
  el.setAttribute('role', 'alertdialog')
  el.setAttribute('aria-live', 'assertive')
  el.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;' +
    'background:rgba(10,10,15,.92);color:#fff;font:600 18px/1.5 system-ui,sans-serif;text-align:center;padding:24px'
  el.textContent = message
  document.body.appendChild(el)
  return () => el.remove()
}

const API = {
  version: VERSION,

  init(cfg: Partial<HydeSecurityConfig> = {}) {
    if (state.initialized) this.disableAll()
    state.config = { ...state.config, ...cfg }
    initLogger(state.config)
    if (state.config.encryptionKey) encryption.setDefaultKey(state.config.encryptionKey)

    // One global subscription delivers every module's threats to the app callback
    offGlobal?.()
    offGlobal = events.on('*', ev => state.config.onThreatDetected?.(ev))

    if (state.config.reporting) reporting.enable(state.config.reporting)

    offLockdown?.()
    offLockdown = null
    const ld = state.config.lockdown
    if (ld && ld.on?.length) {
      offLockdown = events.on('*', ev => {
        if (ld.on.includes(ev.type) || (ev.source && ld.on.includes(`source:${ev.source}`))) {
          this.lockdown(ld.message ?? 'A security threat was detected. This page has been locked to protect you.', ld)
        }
      })
    }

    state.initialized = true
    this.enableAll()
    log('initialized', { mode: state.config.mode, version: VERSION })
  },

  setMode(mode: Mode) {
    state.config.mode = mode
    this.disableAll()
    this.enableAll()
  },

  enableAll() {
    state.enabled = true
    const c = state.config
    const mode = c.mode ?? 'balanced'
    const strict = mode === 'strict'
    const d = defaultsFor(mode)

    // ── v1 deterrents ──
    // DevTools detection is a deterrent, not security: strict mode only (or opt in)
    if (c.enableAntiDevtools ?? strict) {
      antiDevtools.enable({ autoLock: strict, debuggerTrap: c.enableDebuggerTrap ?? strict })
    }
    if (mode !== 'dev' && c.enableAntiIframe !== false) antiIframe.enable({ allowedOrigins: c.allowedIframes })
    if (strict) antiDebug.enable()
    const deterrent = (flag: boolean | undefined) => (strict ? flag !== false : flag === true)
    if (deterrent(c.enableAntiCopy)) antiCopy.enable()
    if (deterrent(c.enableAntiPrint)) antiPrint.enable()
    if (deterrent(c.enableAntiContextMenu)) antiContextMenu.enable()
    if (deterrent(c.enableTabGuard)) tabGuard.enable()
    if (deterrent(c.enableAntiScreenCapture)) antiScreenCapture.enable()
    if (c.enableWatermark) {
      removeWatermark?.()
      removeWatermark = addWatermark(c.appName)
    }

    // ── v2 guards ──
    const pg = want(c.prototypeGuard, d.prototypeGuard, { mode: 'monitor' as const })
    if (pg) prototypeGuard.enable(pg)
    const cg = want(c.clipboardGuard, d.clipboardGuard, {})
    if (cg) clipboardGuard.enable(cg)
    const ph = want(c.phishingGuard, d.phishingGuard, {})
    if (ph) phishingGuard.enable(ph)
    const mg = c.messageGuard === false ? null : c.messageGuard ?? (d.messageGuard ? { allowedOrigins: ['self'], mode: 'report' as const } : null)
    if (mg) messageGuard.enable(mg)
    const sg = want(c.scriptGuard, d.scriptGuard, { mode: 'report' as const })
    if (sg) scriptGuard.enable(sg)
    const sk = want(c.skimmerGuard, d.skimmerGuard, { mode: 'report' as const })
    if (sk) skimmerGuard.enable(sk)
    const as = want(c.agentShield, d.agentShield, { action: 'report' as const })
    if (as) agentShield.enable(as)
    if (c.networkFirewall) networkFirewall.enable(c.networkFirewall)
    const tt = want(c.trustedTypes, false, {})
    if (tt) trustedTypes.enableDefaultPolicy(tt)
  },

  disableAll() {
    state.enabled = false
    antiDevtools.disable()
    antiDebug.disable()
    antiCopy.disable()
    antiContextMenu.disable()
    antiPrint.disable()
    tabGuard.disable()
    antiScreenCapture.disable()
    antiIframe.disable()
    removeWatermark?.()
    removeWatermark = null

    prototypeGuard.disable()
    clipboardGuard.disable()
    phishingGuard.disable()
    messageGuard.disable()
    scriptGuard.disable()
    skimmerGuard.disable()
    agentShield.disable()
    networkFirewall.disable()
  },

  /** Turn everything off and remove all listeners */
  destroy() {
    this.disableAll()
    this.releaseLockdown()
    session.destroy?.()
    reporting.disable()
    offGlobal?.()
    offGlobal = null
    offLockdown?.()
    offLockdown = null
    state.initialized = false
  },

  getVersion() {
    return VERSION
  },

  getConfig(): Readonly<HydeSecurityConfig> {
    return { ...state.config }
  },

  /** Subscribe to threats: a type, 'source:<module>', or '*'. Returns unsubscribe. */
  on(type: string, fn: ThreatListener) {
    return events.on(type, fn)
  },

  /** Recent threat events */
  history() {
    return events.history()
  },

  /** Grade this page's security posture */
  audit: securityAudit.run.bind(securityAudit),

  /**
   * Emergency mode: cut the network to same-origin, wipe sensitive fields,
   * block form submits, and (optionally) cover the page.
   */
  lockdown(reason = 'Security lockdown', opts: Partial<LockdownOptions> = {}) {
    if (state.lockedDown || typeof document === 'undefined') return
    state.lockedDown = true
    events.emit({ type: 'lockdown', severity: 'critical', source: 'core', details: { reason } })

    const firewallWasOn = networkFirewall.isEnabled()
    networkFirewall.enable({ allow: [], mode: 'enforce' })
    lockdownCleanup.push(() => {
      networkFirewall.disable()
      if (firewallWasOn && state.config.networkFirewall) networkFirewall.enable(state.config.networkFirewall)
    })

    document.querySelectorAll<HTMLInputElement>(DEFAULT_SENSITIVE_SELECTOR).forEach(el => {
      el.value = ''
    })
    const blockSubmit = (e: Event) => {
      e.preventDefault()
      e.stopImmediatePropagation()
    }
    document.addEventListener('submit', blockSubmit, true)
    lockdownCleanup.push(() => document.removeEventListener('submit', blockSubmit, true))

    if (opts.overlay !== false) lockdownCleanup.push(showLockOverlay(reason))
  },

  releaseLockdown() {
    lockdownCleanup.reverse().forEach(fn => fn())
    lockdownCleanup = []
    state.lockedDown = false
  },

  isLockedDown() {
    return state.lockedDown
  },

  toast(msg: string) {
    if (typeof document === 'undefined') return
    const el = document.createElement('div')
    el.setAttribute('role', 'status')
    el.style.cssText = 'position:fixed;bottom:12px;left:12px;padding:8px 12px;background:#222;color:#fff;z-index:999999;border-radius:4px;font:14px system-ui'
    el.textContent = msg
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 3000)
  },

  lockScreen(reason?: string) {
    antiDevtools.lockScreen(reason)
  },

  unlockScreen() {
    antiDevtools.unlockScreen()
  },

  encryptText(text: string, key?: string | CryptoKey) {
    return encryption.encrypt(text, key)
  },

  decryptText(payload: string, key?: string | CryptoKey) {
    return encryption.decrypt(payload, key)
  },

  safeHTML(s: string) {
    return sanitize.html(s)
  },

  checkPassword(password: string) {
    return passwordStrength.check(password)
  },

  detectBot() {
    return antiBot.detectHeadless()
  },

  detectAgent() {
    return agentShield.detectAgent()
  },

  protectElement(selector: string, selfHealing = false) {
    if (typeof document === 'undefined') return null
    return domGuard.protect(selector, () => {}, selfHealing)
  },

  protectInput(selector: string) {
    if (typeof document === 'undefined') return null
    const el = document.querySelector(selector) as HTMLInputElement | null
    if (!el) return null
    const handler = (e: Event) => e.preventDefault()
    el.addEventListener('paste', handler)
    return () => el.removeEventListener('paste', handler)
  },

  events,

  modules: {
    // deterrents
    antiDevtools, antiDebug, antiCopy, antiContextMenu, antiPrint, antiIframe, tabGuard, antiScreenCapture,
    watermark: { addWatermark },
    // v2 guards
    scriptGuard, skimmerGuard, networkFirewall, clipboardGuard, agentShield, phishingGuard, messageGuard,
    prototypeGuard, trustedTypes, passkeys, securityAudit, reporting,
    // helpers
    sanitize, encryption, storage, cookie, session,
    rateLimiter: { makeRateLimited },
    forms, network, fingerprint, device, domGuard, routerGuard, antiBot, passwordStrength,
    honeypot: { createHoneypot, isTriggered },
    integrity,
    headers: { setupAxios },
    obfuscator, csrfProtection, contentSecurityPolicy, inputValidation, biometrics, antiClickjacking
  }
}

if (typeof window !== 'undefined') {
  ;(window as any).HydeSecurity = API
}

export const HydeSecurity = API
export default HydeSecurity

// Named exports so bundlers can tree-shake when you only need one module
export {
  events,
  scriptGuard, skimmerGuard, networkFirewall, clipboardGuard, agentShield, phishingGuard, messageGuard,
  prototypeGuard, trustedTypes, passkeys, securityAudit, reporting,
  sanitize, encryption, storage, cookie, session, contentSecurityPolicy, inputValidation, csrfProtection,
  domGuard, antiClickjacking, antiBot, biometrics, passwordStrength, integrity
}
