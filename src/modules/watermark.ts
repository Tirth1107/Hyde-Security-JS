import { uid } from '../core/utils'

export function addWatermark(text?: string) {
  const t = text || `UID:${uid()}`
  const el = document.createElement('div')
  el.style.pointerEvents = 'none'
  el.style.position = 'fixed'
  el.style.bottom = '8px'
  el.style.right = '8px'
  el.style.opacity = '0.15'
  el.style.zIndex = '99999'
  el.style.fontSize = '12px'
  el.innerText = t
  document.body.appendChild(el)
  return () => el.remove()
}
