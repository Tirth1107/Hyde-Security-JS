import React, { useState, useEffect, useRef } from 'react'
import { X, Terminal } from 'lucide-react'

interface LogEntry {
  id: string
  time: string
  source: string
  type: string
  msg: string
  level: 'info' | 'success' | 'warning' | 'error'
}

const LiveLogger = ({ open, onClose }: { open: boolean, onClose: () => void }) => {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleLog = (e: any) => {
      const { source, type, detail, severity } = e.detail || {}
      
      let level = 'info'
      if (severity === 'high' || severity === 'critical' || type === 'error') level = 'error'
      if (severity === 'low' || type === 'success') level = 'success'

      const newLog: LogEntry = {
        id: Math.random().toString(36).substr(2, 9),
        time: new Date().toLocaleTimeString(),
        source: source || 'system',
        type: type || 'event',
        msg: detail?.msg || JSON.stringify(detail) || 'Event triggered',
        level: level as any
      }

      setLogs(prev => [...prev, newLog])
    }

    // A custom listener for our internal demo logs (since the actual library uses log() we'll dispatch custom events from demos)
    const handleDemoLog = (e: any) => {
      setLogs(prev => [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        time: new Date().toLocaleTimeString(),
        source: e.detail.source,
        type: 'log',
        msg: e.detail.msg,
        level: e.detail.level || 'info'
      }])
    }

    window.addEventListener('hyde:threat', handleLog)
    window.addEventListener('demo:log', handleDemoLog)
    return () => {
      window.removeEventListener('hyde:threat', handleLog)
      window.removeEventListener('demo:log', handleDemoLog)
    }
  }, [])

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [logs])

  return (
    <div className={`logger-panel ${open ? 'open' : ''}`}>
      <div className="logger-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Terminal size={16} />
          <span>Live Security Events</span>
        </div>
        <button className="secondary" style={{ padding: '4px', background: 'transparent', border: 'none' }} onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <div className="logger-content" ref={contentRef}>
        {logs.length === 0 ? (
          <div style={{ color: '#64748b', fontStyle: 'italic' }}>Listening for events...</div>
        ) : (
          logs.map(log => (
            <div key={log.id} className="log-entry">
              <span className="log-time">[{log.time}]</span>
              <span style={{ color: '#0ea5e9' }}>[{log.source}]</span>
              <span className={`log-type ${log.level}`}>{log.msg}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// Helper utility for components to dispatch logs to the terminal
export const emitLog = (source: string, msg: string, level: 'info' | 'success' | 'warning' | 'error' = 'info') => {
  window.dispatchEvent(new CustomEvent('demo:log', { detail: { source, msg, level } }))
}

export default LiveLogger
