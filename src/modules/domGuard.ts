export const domGuard = {
  protect(selector: string, onTamper?: () => void) {
    const el = document.querySelector(selector)
    if (!el) return
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(m => {
        if (m.type === 'childList' || m.type === 'attributes') {
          onTamper && onTamper()
        }
      })
    })
    observer.observe(el, { childList: true, subtree: true, attributes: true })
    return () => observer.disconnect()
  }
}
