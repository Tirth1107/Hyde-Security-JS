import React, { useEffect, useRef, useState } from 'react'
import { useHydeSecurity } from 'hyde-security-js/react'
import { emitLog } from '../LiveLogger'

const BotDetectionDemo = () => {
  const security = useHydeSecurity()
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<{ text: string, type: 'info' | 'success' | 'error' }>({ text: 'Waiting for interaction...', type: 'info' })
  const trackerRef = useRef<any>(null)

  useEffect(() => {
    const bot = (security as any).modules?.antiBot
    if (bot && inputRef.current) {
      trackerRef.current = bot.detectFastTyping(inputRef.current, 30)
      
      const onPaste = () => {
        setStatus({ text: '🤖 PASTE DETECTED', type: 'error' })
        emitLog('bot-detect', 'Paste event detected on input!', 'error')
      }
      bot.detectPaste(inputRef.current, onPaste)
    }
  }, [security])

  const handleKeyUp = () => {
    if (!trackerRef.current) return
    const stats = trackerRef.current.getStats()
    if (trackerRef.current.isBot()) {
      setStatus({ text: `🤖 BOT (${stats.fast}/${stats.total} fast keys)`, type: 'error' })
      emitLog('bot-detect', `Superhuman typing: ${stats.fast}/${stats.total} keystrokes too fast`, 'error')
    } else {
      setStatus({ text: `👤 Human (${stats.total} keys)`, type: 'success' })
    }
  }

  const simulatePaste = () => {
    if (inputRef.current) {
      inputRef.current.value = 'AutomatedBotInput12345'
      inputRef.current.dispatchEvent(new Event('paste', { bubbles: true }))
    }
  }

  const checkHeadless = () => {
    const bot = (security as any).modules?.antiBot
    if (bot) {
      const result = bot.detectHeadless()
      if (result.isBot) {
        emitLog('bot-detect', `Headless DETECTED — signals: ${result.signals.join(', ')}`, 'error')
        security.toast('Headless browser detected!')
      } else {
        emitLog('bot-detect', `No headless signals (${result.signals.length} weak signals)`, 'success')
      }
    }
  }

  return (
    <>
      <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8, marginBottom: 12 }}>
        <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase' }}>Typing Test</span>
        <input 
          ref={inputRef}
          onKeyUp={handleKeyUp}
          placeholder="Type here naturally..." 
          style={{ width: '100%', marginTop: 8, background: 'rgba(0,0,0,0.3)', border: `1px solid ${status.type === 'error' ? '#ef4444' : 'rgba(255,255,255,0.1)'}`, color: 'white', padding: '8px 10px', borderRadius: 4, outline: 'none' }}
        />
        <div style={{ marginTop: 8, fontSize: '11px', color: status.type === 'error' ? '#ef4444' : (status.type === 'success' ? '#22c55e' : '#94a3b8') }}>
          Status: {status.text}
        </div>
      </div>
      <div className="btn-row">
        <button className="secondary" onClick={simulatePaste}>Simulate Bot Paste</button>
        <button className="secondary" onClick={checkHeadless}>Check Headless</button>
      </div>
    </>
  )
}

export default BotDetectionDemo
