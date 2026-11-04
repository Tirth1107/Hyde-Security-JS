import { useEffect, useState } from 'react'
import { ArrowRight, BookOpen, FlaskConical, ShieldCheck, TriangleAlert, Check } from 'lucide-react'
import { HydeSecurity, useThreats } from 'hyde-security-js/react'
import type { AuditResult } from 'hyde-security-js'
import { Code, Tabs } from '../components/Code'
import { GuardIcon } from '../components/GuardIcon'
import { GUARDS, MODE_LABEL, PKG, LINKS } from '../content'

const QUICK = `import { HydeSecurity } from '${PKG}'

HydeSecurity.init({
  mode: 'balanced',                       // 'dev' | 'balanced' | 'strict'
  encryptionKey: 'a-long-app-passphrase',
  scriptGuard: { allow: ['js.stripe.com'] },
  networkFirewall: { allow: ['api.myapp.com', 'js.stripe.com'] },
  reporting: { endpoint: '/api/security-events' },
  onThreatDetected: ev => console.warn(ev.source, ev.type, ev.details)
})

const { grade, findings } = await HydeSecurity.audit()`

const REACT = `'use client'
import { HydeSecurityProvider, useThreats } from '${PKG}/react'

export default function RootLayout({ children }) {
  return (
    <HydeSecurityProvider config={{ mode: 'balanced', skimmerGuard: true }}>
      {children}
    </HydeSecurityProvider>
  )
}

function SecurityBadge() {
  const threats = useThreats('*', 20)
  return <span>{threats.length} threats blocked</span>
}`

const CDN = `<script src="${LINKS.unpkg}"></script>
<script>
  HydeSecurity.init({ mode: 'balanced' })
  HydeSecurity.on('*', ev => console.log(ev.type))
</script>`

function LivePanel() {
  const [audit, setAudit] = useState<AuditResult | null>(null)
  const threats = useThreats('*', 50)
  useEffect(() => {
    let live = true
    HydeSecurity.audit().then(r => { if (live) setAudit(r) }).catch(() => {})
    return () => { live = false }
  }, [])
  const top = audit?.findings.slice(0, 3) ?? []
  return (
    <div className="live-panel glass-panel" aria-live="polite">
      <div className="live-head">
        <span className="dot" /> This page, right now
      </div>
      <div className="live-grade">
        <div className={`grade grade-${audit ? audit.grade.replace('+', 'p') : 'x'}`}>{audit?.grade ?? '...'}</div>
        <div>
          <div className="live-score">{audit ? `${audit.score}/100` : 'Auditing'}</div>
          <div className="muted small">HydeSecurity.audit() on this site</div>
        </div>
      </div>
      <ul className="live-list">
        {top.map(f => (
          <li key={f.id}><TriangleAlert size={14} className={`sev-${f.severity}`} /> {f.title}</li>
        ))}
        {audit && top.length === 0 && <li><Check size={14} className="sev-ok" /> No findings</li>}
      </ul>
      <div className="live-foot">
        <span>Guards running: balanced mode</span>
        <span>{threats.length} events</span>
      </div>
    </div>
  )
}

export default function Home() {
  const [copied, setCopied] = useState(false)
  const install = `npm install ${PKG}`
  const copy = async () => {
    try { await navigator.clipboard.writeText(install); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* blocked */ }
  }

  return (
    <>
      <section className="hero wrap">
        <div className="hero-copy">
          <div className="eyebrow">Version 2.0 · MIT · no eval, strict-CSP safe</div>
          <h1>Client-side security for the attacks that actually hit web apps today.</h1>
          <p className="lead">
            HydeSecurity is a TypeScript library that defends your page and its users against code that
            should not be there: compromised third-party scripts, card skimmers, ClickFix lures, prompt
            injection aimed at AI agents, phishing clones and more.
          </p>
          <button className="install" onClick={copy} aria-label="Copy install command">
            <span className="prompt">$</span> {install}
            <span className="install-hint">{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <div className="hero-cta">
            <a className="btn" href="#/docs"><BookOpen size={16} /> Read the docs</a>
            <a className="btn ghost" href="#/playground"><FlaskConical size={16} /> Try it live</a>
          </div>
        </div>
        <LivePanel />
      </section>

      <section className="stats wrap">
        <div><strong>13</strong><span>security guards</span></div>
        <div><strong>0</strong><span>uses of eval</span></div>
        <div><strong>151</strong><span>unit tests</span></div>
        <div><strong>2</strong><span>real browsers in CI-style tests</span></div>
      </section>

      <section className="wrap section">
        <div className="section-head">
          <h2>What it defends against</h2>
          <p>Each guard maps to a real attack. Most start in report-only mode, so you can see what they would block before you switch them to enforce.</p>
        </div>
        <div className="guard-grid">
          {GUARDS.map(g => (
            <article key={g.name} className="guard glass-panel">
              <div className="guard-top">
                <span className="guard-icon"><GuardIcon name={g.icon} /></span>
                <span className={`pill pill-${g.mode}`}>{MODE_LABEL[g.mode]}</span>
              </div>
              <h3>{g.title}</h3>
              <div className="guard-attack">{g.attack}</div>
              <p>{g.what}</p>
              <code className="guard-name">{g.name}</code>
            </article>
          ))}
        </div>
      </section>

      <section className="wrap section split">
        <div className="section-head left">
          <h2>One call to set up</h2>
          <p>Pick a mode, list the hosts you trust, and say where reports should go. Every guard can also be switched on or off on its own.</p>
          <ul className="checks">
            <li><Check size={16} /> Works with any framework. React hooks in <code>{PKG}/react</code></li>
            <li><Check size={16} /> Tree-shakable named exports for every module</li>
            <li><Check size={16} /> SSR-safe: guards do nothing outside the browser</li>
            <li><Check size={16} /> All threats arrive on one event bus</li>
          </ul>
        </div>
        <Tabs tabs={[
          { label: 'JavaScript', code: QUICK },
          { label: 'React / Next.js', code: REACT, lang: 'tsx' },
          { label: 'CDN', code: CDN, lang: 'html' }
        ]} />
      </section>

      <section className="wrap section">
        <div className="section-head">
          <h2>Three modes</h2>
          <p>Start with balanced. Move to strict on pages that handle payments or logins.</p>
        </div>
        <div className="modes">
          <div className="mode glass-panel">
            <h3>dev</h3>
            <p>Nothing runs automatically. Use the modules directly while you build.</p>
          </div>
          <div className="mode glass-panel featured">
            <div className="pill pill-balanced">Default</div>
            <h3>balanced</h3>
            <p>Clipboard, phishing, prototype and message guards, plus frame protection. Safe for every page.</p>
          </div>
          <div className="mode glass-panel">
            <h3>strict</h3>
            <p>Balanced, plus script, skimmer and agent guards in report mode, and the deterrents (anti-devtools, anti-copy, and so on).</p>
          </div>
        </div>
      </section>

      <section className="wrap section">
        <div className="honest glass-panel">
          <ShieldCheck size={28} className="accent" />
          <div>
            <h2>Honest about limits</h2>
            <p>
              Code in the page can be bypassed by anyone who controls the browser. HydeSecurity protects the
              page and its users from code that should not be there. It does not replace server-side validation,
              HTTP security headers or a real Content Security Policy. Use it as defense in depth, and read the
              known limits for each guard in the docs.
            </p>
          </div>
        </div>
      </section>

      <section className="wrap section cta">
        <h2>Ready to try it?</h2>
        <p>Every guard has a live demo that runs the real library against a simulated attack on this page.</p>
        <div className="hero-cta center">
          <a className="btn" href="#/playground">Open the playground <ArrowRight size={16} /></a>
          <a className="btn ghost" href="#/changelog">What's new in 2.0</a>
        </div>
        <Code code={`npm install ${PKG}`} lang="sh" title="terminal" />
      </section>
    </>
  )
}
