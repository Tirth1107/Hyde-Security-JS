// Demos send their own log lines to the Live Logger with this
export const emitLog = (source: string, msg: string, level: 'info' | 'success' | 'warning' | 'error' = 'info') => {
  window.dispatchEvent(new CustomEvent('demo:log', { detail: { source, msg, level } }))
}
