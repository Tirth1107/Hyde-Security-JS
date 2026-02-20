import { storage } from './storage'

let idleTimer: ReturnType<typeof setTimeout> | null = null
let timeout = 30 * 60 * 1000 // 30 minutes
let onExpire: (() => void) | null = null

function reset() {
  if (idleTimer) clearTimeout(idleTimer)
  idleTimer = setTimeout(() => {
    storage.clear()
    onExpire?.()
  }, timeout)
}

export const session = {
  init(opts?: { timeoutMinutes?: number; onExpire?: () => void }) {
    if (opts?.timeoutMinutes) timeout = opts.timeoutMinutes * 60 * 1000
    if (opts?.onExpire) onExpire = opts.onExpire
    const events: (keyof WindowEventMap)[] = ['click', 'keydown', 'mousemove', 'scroll']
    events.forEach(ev => window.addEventListener(ev, reset))
    reset()
    // multi-tab logout
    try {
      const channel = new BroadcastChannel('hyde_security_channel')
      channel.onmessage = (m) => {
        if (m.data === 'logout') storage.clear()
      }
      this.broadcast = (msg: string) => channel.postMessage(msg)
    } catch (e) {
      this.broadcast = (msg: string) => localStorage.setItem('hyde_msg', msg)
      window.addEventListener('storage', (e: StorageEvent) => {
        if (e.key === 'hyde_msg' && e.newValue === 'logout') storage.clear()
      })
    }
  },
  broadcast(msg: string) {},
  end() {
    storage.clear()
    this.broadcast('logout')
  }
}
