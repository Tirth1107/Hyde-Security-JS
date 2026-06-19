import { uid } from '../core/utils'

export function addWatermark(text?: string) {
  const t = text || `UID:${uid()} | ${new Date().toISOString().split('T')[0]}`
  
  const canvas = document.createElement('canvas')
  canvas.id = 'hyde-watermark'
  canvas.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; pointer-events: none; z-index: 99999;'
  
  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}

  function draw() {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    
    ctx!.clearRect(0, 0, canvas.width, canvas.height)
    ctx!.font = '16px system-ui, sans-serif'
    ctx!.fillStyle = 'rgba(100, 100, 100, 0.05)'
    
    ctx!.rotate(-25 * Math.PI / 180)
    
    // Draw in a grid
    for (let x = -canvas.width; x < canvas.width * 2; x += 200) {
      for (let y = -canvas.height; y < canvas.height * 2; y += 100) {
        ctx!.fillText(t, x, y)
      }
    }
  }

  draw()
  document.body.appendChild(canvas)
  
  window.addEventListener('resize', draw)
  
  // Protect against removal
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.removedNodes.forEach((node) => {
        if (node === canvas) {
          document.body.appendChild(canvas)
        }
      })
    })
  })
  
  observer.observe(document.body, { childList: true })

  return () => {
    window.removeEventListener('resize', draw)
    observer.disconnect()
    canvas.remove()
  }
}
