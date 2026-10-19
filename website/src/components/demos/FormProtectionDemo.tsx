import React, { useRef, useState, useEffect } from 'react'
import { useHydeSecurity } from 'hyde-security-js'
import { emitLog } from '../LiveLogger'

const FormProtectionDemo = () => {
  const security = useHydeSecurity()
  const formRef = useRef<HTMLFormElement>(null)
  const [val, setVal] = useState('<img src=x onerror=alert(1)>')
  const [result, setResult] = useState<string | null>(null)

  useEffect(() => {
    const forms = (security as any).modules?.forms
    if (forms && formRef.current) {
      forms.attachSanitize(formRef.current)
      emitLog('forms', 'Form auto-sanitization attached', 'success')
    }
  }, [security])

  const testForm = (e: React.FormEvent) => {
    e.preventDefault()
    // By the time we reach here, if the attachSanitize worked, the input value is sanitized.
    // However, React controlled components might fight with direct DOM mutations.
    // To demo this properly with the library, we will read from the DOM directly.
    const inputEl = formRef.current?.querySelector('input')
    const sanitizedVal = inputEl ? inputEl.value : val
    setResult(`Sanitized value: "${sanitizedVal}"`)
    emitLog('forms', 'Form submitted — value sanitized', 'success')
  }

  const addHP = () => {
    const forms = (security as any).modules?.forms
    if (forms && formRef.current) {
      forms.addHoneypot(formRef.current)
      emitLog('forms', 'Honeypot field added to form (hidden)', 'success')
      security.toast('Honeypot trap deployed')
    }
  }

  return (
    <>
      <form ref={formRef} onSubmit={testForm} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input 
          value={val} 
          onChange={e => setVal(e.target.value)}
          placeholder="Enter HTML to test sanitization..." 
          style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '6px 10px', borderRadius: 4, outline: 'none' }}
        />
        <div className="btn-row">
          <button type="submit">Submit (Sanitized)</button>
          <button type="button" className="secondary" onClick={addHP}>Add Honeypot</button>
        </div>
      </form>
      <div style={{ 
        marginTop: 12, padding: 8, background: 'rgba(0,0,0,0.3)', borderRadius: 4, 
        border: '1px solid rgba(255,255,255,0.05)', fontSize: '13px', wordBreak: 'break-all',
        color: result ? '#22c55e' : '#94a3b8'
      }}>
        {result || '// Submit to see sanitized value'}
      </div>
    </>
  )
}

export default FormProtectionDemo
