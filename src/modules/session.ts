import { storage } from './storage'

let idleTimer: ReturnType<typeof setTimeout> | null = null
let timeout = 30 * 60 * 1000 // 30 minutes
let onExpire: (() => void) | null = null
let channel: BroadcastChannel | null = null
let active = false

const events: (keyof WindowEventMap)[] = ['click', 'keydown', 'mousemove', 'scroll']

const CHANNEL_NAME = 'hyde_security_channel'
const MSG_KEY = 'hyde_msg'

function handleMessage(msg: unknown) {
  if (msg === 'logout') {
    storage.remove('hyde_session_active')
    onExpire?.()
  }
}

function storageListener(e: StorageEvent) {
  if (e.key !== MSG_KEY || !e.newValue) return
  try {
    handleMessage(JSON.parse(e.newValue).msg)
  } catch (err) {
    handleMessage(e.newValue)
  }
}

function reset() {
  if (idleTimer) clearTimeout(idleTimer)
  idleTimer = setTimeout(() => {
    storage.remove('hyde_session_active')
    onExpire?.()
  }, timeout)
}

export const session = {
  init(opts?: { timeoutMinutes?: number; onExpire?: () => void }) {
    if (active || typeof window === 'undefined') return
    active = true
    
    if (opts?.timeoutMinutes) timeout = opts.timeoutMinutes * 60 * 1000
    if (opts?.onExpire) onExpire = opts.onExpire
    
    events.forEach(ev => window.addEventListener(ev, reset))
    reset()
    
    storage.set('hyde_session_active', '1')

    // multi-tab logout
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(CHANNEL_NAME)
      channel.onmessage = (m) => handleMessage(m.data)
    } else {
      window.addEventListener('storage', storageListener)
    }
  },

  /** Send a message to the other tabs (e.g. 'logout') */
  broadcast(msg: string) {
    if (typeof window === 'undefined') return
    if (channel) {
      channel.postMessage(msg)
      return
    }
    if (typeof BroadcastChannel !== 'undefined') {
      // Not initialised yet: open a short-lived channel just to send
      const tmp = new BroadcastChannel(CHANNEL_NAME)
      tmp.postMessage(msg)
      tmp.close()
      return
    }
    try {
      // Fallback: storage events fire in other tabs. Value includes a timestamp
      // so sending the same message twice still triggers an event.
      localStorage.setItem(MSG_KEY, JSON.stringify({ msg, t: Date.now() }))
      localStorage.removeItem(MSG_KEY)
    } catch (e) { }
  },

  end() {
    storage.remove('hyde_session_active')
    this.broadcast('logout')
  },

  destroy() {
    active = false
    if (idleTimer) clearTimeout(idleTimer)
    idleTimer = null
    if (typeof window === 'undefined') return

    events.forEach(ev => window.removeEventListener(ev, reset))
    
    if (channel) {
      channel.close()
      channel = null
    }
    window.removeEventListener('storage', storageListener)
  },

  isActive() {
    return active && storage.get('hyde_session_active') === '1'
  }
}
