export const domGuard = {
  protect(selector: string, onTamper: () => void) {
    if (typeof window === 'undefined') return () => {}

    const el = document.querySelector(selector)
    if (!el) return () => {}

    const observer = new MutationObserver((mutations) => {
      let tampered = false
      mutations.forEach(m => {
        if (m.type === 'childList' || m.type === 'attributes' || m.type === 'characterData') {
          tampered = true
          document.dispatchEvent(new CustomEvent('hyde:threat', { 
            detail: { source: 'domGuard', selector, type: m.type } 
          }))
        }
      })
      if (tampered) onTamper()
    })

    observer.observe(el, { 
      childList: true, 
      attributes: true, 
      subtree: true,
      characterData: true
    })

    return () => observer.disconnect()
  }
}
