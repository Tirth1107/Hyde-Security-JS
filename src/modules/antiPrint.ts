let styleEl: HTMLStyleElement | null = null
let beforePrint: (() => void) | null = null
let afterPrint: (() => void) | null = null
let keydownHandler: ((e: KeyboardEvent) => void) | null = null

export const antiPrint = {
  enable(opts?: { onThreat?: (ev: any) => void }) {
    if (typeof window === 'undefined') return

    // Inject CSS to hide all content during printing
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.innerHTML = `@media print { body { display: none !important; } }`
      document.head.appendChild(styleEl)
    }

    beforePrint = () => {
      document.body.style.filter = 'blur(10px)'
      opts?.onThreat?.({ id: 'print', type: 'print', severity: 'warning', timestamp: Date.now() })
    }
    
    afterPrint = () => {
      document.body.style.filter = ''
    }

    keydownHandler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault()
        opts?.onThreat?.({ id: 'print_shortcut', type: 'print', severity: 'warning', timestamp: Date.now() })
      }
    }

    window.addEventListener('beforeprint', beforePrint)
    window.addEventListener('afterprint', afterPrint)
    window.addEventListener('keydown', keydownHandler)
  },

  disable() {
    if (typeof window === 'undefined') return

    if (styleEl && styleEl.parentNode) {
      styleEl.parentNode.removeChild(styleEl)
      styleEl = null
    }

    if (beforePrint) {
      window.removeEventListener('beforeprint', beforePrint)
      beforePrint = null
    }

    if (afterPrint) {
      window.removeEventListener('afterprint', afterPrint)
      afterPrint = null
    }
    
    if (keydownHandler) {
      window.removeEventListener('keydown', keydownHandler)
      keydownHandler = null
    }
  }
}
