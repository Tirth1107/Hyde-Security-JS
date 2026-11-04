import { GuardIcon } from '../components/GuardIcon'
import { Code } from '../components/Code'
import { GUARDS, PKG, LINKS } from '../content'

const BREAKING = [
  ['Package name', `Now published as ${PKG}. The old @tirth1107/hyde-security-js stays at 1.1.0.`],
  ['Encryption', 'Web Crypto AES-256-GCM, PBKDF2 at 600,000 iterations. Async, key required, decrypt returns null on failure. decryptLegacy() reads v1 data.'],
  ['Encrypted storage', 'storage.setEncrypted() and getEncrypted().'],
  ['React', `Imported from ${PKG}/react only. The main entry has no React.`],
  ['Events', 'One shape with a source field. A few types were renamed.'],
  ['Modes', 'Anti-devtools is strict-only. Balanced turns on real guards.'],
  ['Request signing', 'Needs a signingKey and signs a SHA-256 of the body.'],
  ['Dependencies', 'Removed jose, nanoid, toastify-js, uuid and devtools-detector. DOMPurify 3.4.']
]

const CORE = [
  ['One event bus', "HydeSecurity.on(type | 'source:module' | '*') and history()."],
  ['Safe API patching', 'Guards that wrap fetch, appendChild or addEventListener can be layered and removed in any order.'],
  ['Call-site attribution', 'Finds which scripts are on the call stack, so a skimmer is told apart from your code.'],
  ['Clobbering-proof reads', 'Security checks read document.cookie through the original prototypes.'],
  ['Built-in DevTools detection', 'No eval, no Function(). The library loads under a strict CSP with no reports.']
]

const FIXES = [
  'Anti-devtools fired many times after setMode() or remounts, and ran its debugger trap in balanced mode.',
  'The React provider re-initialized on every render with an inline config.',
  'Calling init() again was ignored by running modules.',
  'The firewall wrapped fetch twice when enabled twice.',
  'The audit crashed when an injected element took over document.cookie.',
  'ESM/CJS builds bundled every dependency (1.25 MB). Now about 35 to 50 KB.',
  'The network client retried POST and PATCH, which could create duplicates.',
  'antiScreenCapture never restored getDisplayMedia.'
]

export default function Changelog() {
  return (
    <div className="wrap prose-page">
      <div className="eyebrow">Released 4 November 2026</div>
      <h1>What's new in HydeSecurity 2.0</h1>
      <p className="lead">
        Version 2 is a rebuild. Version 1 was mostly deterrents. Version 2 is a client-side security
        layer built around the attacks web apps face today, with a new core, thirteen guards, a new
        package name and a rebuilt website.
      </p>

      <h2>New package name</h2>
      <Code lang="sh" title="terminal" code={`npm uninstall @tirth1107/hyde-security-js\nnpm install ${PKG}`} />

      <h2>New guards</h2>
      <div className="mini-grid">
        {GUARDS.map(g => (
          <div key={g.name} className="mini glass-panel">
            <span className="guard-icon"><GuardIcon name={g.icon} size={18} /></span>
            <div>
              <strong>{g.title}</strong>
              <span className="muted small">{g.attack}</span>
            </div>
          </div>
        ))}
      </div>

      <h2>New core</h2>
      <dl className="deflist">
        {CORE.map(([t, d]) => <div key={t}><dt>{t}</dt><dd>{d}</dd></div>)}
      </dl>

      <h2>Breaking changes</h2>
      <dl className="deflist">
        {BREAKING.map(([t, d]) => <div key={t}><dt>{t}</dt><dd>{d}</dd></div>)}
      </dl>
      <p>Step-by-step guide: <a href={LINKS.migration} target="_blank" rel="noopener noreferrer">MIGRATION-v2.md</a>.</p>

      <h2>Notable fixes</h2>
      <ul>{FIXES.map(f => <li key={f}>{f}</li>)}</ul>

      <h2>Tests</h2>
      <p>151 unit tests, plus a real-browser suite that runs in Chrome and Firefox across two origins:
        cross-origin skimmer attribution, blocking an inline script before it runs, firewall channels, ClickFix,
        Trusted Types, the postMessage firewall, DOM clobbering, encryption and DevTools detection under a strict CSP.</p>

      <p className="muted">Full notes: <a href={LINKS.changelog} target="_blank" rel="noopener noreferrer">CHANGELOG.md</a></p>
    </div>
  )
}
