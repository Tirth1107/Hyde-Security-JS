import { defaultConfig, HydeSecurityConfig, HydeSecurityEvent } from './core/config'
import { initLogger, log } from './core/logger'
import * as antiDevtools from './modules/antiDevtools'
import * as antiDebug from './modules/antiDebug'
import * as antiCopy from './modules/antiCopy'
import * as antiContextMenu from './modules/antiContextMenu'
import * as antiPrint from './modules/antiPrint'
import * as antiIframe from './modules/antiIframe'
import * as sanitize from './modules/sanitize'
import * as encryption from './modules/encryption'
import * as storage from './modules/storage'
import * as cookie from './modules/cookie'
import * as session from './modules/session'
import * as rateLimiter from './modules/rateLimiter'
import * as forms from './modules/forms'
import * as network from './modules/network'
import * as fingerprint from './modules/fingerprint'
import * as device from './modules/device'
import * as domGuard from './modules/domGuard'
import * as routerGuard from './modules/routerGuard'
import { addWatermark } from './modules/watermark'
import { antiBot } from './modules/antiBot'
import { passwordStrength } from './modules/passwordStrength'
import { createHoneypot } from './modules/honeypot'
import { integrity } from './modules/integrity'
import { setupAxios } from './modules/headers'
import { tabGuard } from './modules/tabGuard'
import { obfuscator } from './modules/obfuscator'
import { antiScreenCapture } from './modules/antiScreenCapture'
import { HydeSecurityProvider } from './modules/react/HydeSecurityProvider'
import { useHydeSecurity } from './modules/react/useHydeSecurity'

export { HydeSecurityProvider, useHydeSecurity }

export type { HydeSecurityConfig, HydeSecurityEvent }

const state = {
  config: { ...defaultConfig } as HydeSecurityConfig,
  enabled: true
}

const API = {
  init(cfg: Partial<HydeSecurityConfig> = {}) {
    state.config = { ...state.config, ...cfg }
    initLogger(state.config)
    // enable features depending on mode
    if (state.config.mode === 'strict') {
      antiDevtools.antiDevtools.enable({ onThreat: state.config.onThreatDetected, autoLock: true })
      antiDebug.antiDebug.enable({ onThreat: state.config.onThreatDetected })
    } else if (state.config.mode === 'balanced') {
      antiDevtools.antiDevtools.enable({ onThreat: state.config.onThreatDetected })
    }
    if (state.config.enableWatermark) addWatermark(state.config.appName)
    log('initialized', state.config)
  },
  setMode(mode: 'dev' | 'balanced' | 'strict') {
    state.config.mode = mode
  },
  enableAll() {
    state.enabled = true
  },
  disableAll() {
    state.enabled = false
    antiDevtools.antiDevtools.disable()
    antiDebug.antiDebug.disable()
    antiCopy.antiCopy.disable()
    antiContextMenu.antiContextMenu.disable()
    antiPrint.antiPrint.disable()
    tabGuard.disable()
    antiScreenCapture.disable()
  },
  toast(msg: string) {
    try {
      // minimal toast
      const el = document.createElement('div')
      el.style.position = 'fixed'
      el.style.bottom = '12px'
      el.style.left = '12px'
      el.style.padding = '8px 12px'
      el.style.background = '#222'
      el.style.color = '#fff'
      el.style.zIndex = '999999'
      el.style.borderRadius = '4px'
      el.innerText = msg
      document.body.appendChild(el)
      setTimeout(() => el.remove(), 3000)
    } catch (e) { }
  },
  lockScreen(reason?: string) {
    antiDevtools.antiDevtools.lockScreen(reason)
  },
  unlockScreen() {
    antiDevtools.antiDevtools.unlockScreen()
  },
  encryptText(text: string, key?: string) {
    return encryption.encryption.encrypt(text, key)
  },
  decryptText(cipher: string, key?: string) {
    return encryption.encryption.decrypt(cipher, key)
  },
  safeHTML(s: string) {
    return sanitize.sanitize.html(s)
  },
  checkPassword(password: string) {
    return passwordStrength.check(password)
  },
  detectBot() {
    return antiBot.detectHeadless()
  },
  protectElement(selector: string) {
    return domGuard.domGuard.protect(selector, () => {
      state.config.onThreatDetected && state.config.onThreatDetected({ id: 'tamper', type: 'tamper', severity: 'critical', timestamp: Date.now() })
    })
  },
  protectInput(selector: string) {
    const el = document.querySelector(selector) as HTMLInputElement | null
    if (!el) return null
    const handler = (e: Event) => e.preventDefault()
    el.addEventListener('paste', handler)
    return () => el.removeEventListener('paste', handler)
  },
  modules: {
    antiDevtools: antiDevtools.antiDevtools,
    antiDebug: antiDebug.antiDebug,
    antiCopy: antiCopy.antiCopy,
    antiContextMenu: antiContextMenu.antiContextMenu,
    antiPrint: antiPrint.antiPrint,
    antiIframe: antiIframe.antiIframe,
    sanitize: sanitize.sanitize,
    encryption: encryption.encryption,
    storage: storage.storage,
    cookie: cookie.cookie,
    session: session.session,
    rateLimiter: { makeRateLimited: rateLimiter.makeRateLimited },
    forms,
    network,
    fingerprint,
    device,
    domGuard: domGuard.domGuard,
    routerGuard: routerGuard.routerGuard,
    watermark: { addWatermark },
    antiBot,
    passwordStrength,
    honeypot: { createHoneypot },
    integrity,
    headers: { setupAxios },
    tabGuard,
    obfuscator,
    antiScreenCapture
  }
}

// attach to window
if (typeof window !== 'undefined') {
  ; (window as any).HydeSecurity = API
}

export const HydeSecurity = API

export default HydeSecurity
