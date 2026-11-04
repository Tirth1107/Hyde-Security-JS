import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

// Tiny tokenizer for JS/TS/shell snippets. Builds React nodes, never HTML strings.
const TOKEN = /(\/\/.*$|#.*$|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`|\b(?:import|from|export|default|const|let|await|async|function|return|new|if|else|true|false|null)\b|\b\d+(?:_\d+)*\b)/gm

function highlight(code: string, lang: string) {
  const out: React.ReactNode[] = []
  let last = 0
  let i = 0
  for (const m of code.matchAll(TOKEN)) {
    const t = m[0]
    const at = m.index ?? 0
    if (t.startsWith('#') && lang !== 'sh') continue
    if (at > last) out.push(code.slice(last, at))
    const cls = t.startsWith('//') || t.startsWith('#') ? 'tk-c'
      : /^['"`]/.test(t) ? 'tk-s'
      : /^\d/.test(t) ? 'tk-n'
      : 'tk-k'
    out.push(<span key={i++} className={cls}>{t}</span>)
    last = at + t.length
  }
  out.push(code.slice(last))
  return out
}

export function Code({ code, lang = 'js', title }: { code: string; lang?: string; title?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* clipboard blocked */ }
  }
  return (
    <div className="code">
      <div className="code-bar">
        <span>{title ?? lang}</span>
        <button className="icon-btn" onClick={copy} aria-label="Copy code">
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      <pre><code>{highlight(code, lang)}</code></pre>
    </div>
  )
}

export function Tabs({ tabs }: { tabs: { label: string; code: string; lang?: string }[] }) {
  const [active, setActive] = useState(0)
  const t = tabs[active]
  return (
    <div className="tabs">
      <div className="tab-row" role="tablist">
        {tabs.map((x, i) => (
          <button key={x.label} role="tab" aria-selected={i === active} className={`tab ${i === active ? 'on' : ''}`} onClick={() => setActive(i)}>
            {x.label}
          </button>
        ))}
      </div>
      <Code code={t.code} lang={t.lang} title={t.label} />
    </div>
  )
}
