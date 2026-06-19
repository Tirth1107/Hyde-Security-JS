import { storage } from './storage'

let idleTimer: ReturnType<typeof setTimeout> | null = null
let timeout = 30 * 60 * 1000 // 30 minutes
let onExpire: (() => void) | null = null
let channel: BroadcastChannel | null = null
let active = false

const events: (keyof WindowEventMap)[] = ['click', 'keydown', 'mousemove', 'scroll']

function reset() {
  if (idleTimer) clearTimeout(idleTimer)
  idleTimer = setTimeout(() => {
    storage.remove('hyde_session_active')
    onExpire?.()
  }, timeout)
}

export const session = {
  init(opts?: { timeoutMinutes?: number; onExpire?: () => void }) {
    if (active) return
    active = true
    
    if (opts?.timeoutMinutes) timeout = opts.timeoutMinutes * 60 * 1000
    if (opts?.onExpire) onExpire = opts.onExpire
    
    events.forEach(ev => window.addEventListener(ev, reset))
    reset()
    
    storage.set('hyde_session_active', '1')

    // multi-tab logout
    try {
      channel = new BroadcastChannel('hyde_security_channel')
      channel.onmessage = (m) => {
        if (m.data === 'logout') {
          storage.remove('hyde_session_active')
          onExpire?.()
        }
      }
      this.broadcast = (msg: string) => channel?.postMessage(msg)
    } catch (e) {
      this.broadcast = (msg: string) => localStorage.setItem('hyde_msg', msg)
      window.addEventListener('storage', this._storageListener)
    }
  },
  
  _storageListener(e: StorageEvent) {
    if (e.key === 'hyde_msg' && e.newValue === 'logout') {
      storage.remove('hyde_session_active')
      onExpire?.()
    }
  },

  broadcast(msg: string) {},

  end() {
    storage.remove('hyde_session_active')
    this.broadcast('logout')
  },

  destroy() {
    active = false
    if (idleTimer) clearTimeout(idleTimer)
    idleTimer = null
    
    events.forEach(ev => window.removeEventListener(ev, reset))
    
    if (channel) {
      channel.close()
      channel = null
    }
    window.removeEventListener('storage', this._storageListener)
  },

  isActive() {
    return active && storage.get('hyde_session_active') === '1'
  }
}
