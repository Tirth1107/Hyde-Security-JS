import { Code } from '../components/Code'
import { PKG, LINKS } from '../content'

const SECTIONS = [
  ['install', 'Install'],
  ['quick-start', 'Quick start'],
  ['modes', 'Modes'],
  ['config', 'Configuration'],
  ['events', 'Events'],
  ['guards', 'Guards'],
  ['data', 'Data protection'],
  ['react', 'React'],
  ['upgrade', 'Upgrading from v1'],
  ['limits', 'Known limits']
] as const

const CONFIG: [string, string, string][] = [
  ['mode', "'dev' | 'balanced' | 'strict'", 'Which guards start automatically. Default balanced.'],
  ['encryptionKey', 'string | CryptoKey', 'Default key for encryptText, decryptText and encrypted storage. There is no built-in key.'],
  ['onThreatDetected', '(event) => void', 'Called for every threat from every module.'],
  ['scriptGuard', 'boolean | options', 'allow, allowInlineHashes, requireIntegrity, mode.'],
  ['skimmerGuard', 'boolean | options', 'trusted hosts, sensitive selector, mode.'],
  ['networkFirewall', 'false | options', 'allow list, mode, resources. Off unless configured.'],
  ['clipboardGuard', 'boolean | options', 'mode, address-swap detection.'],
  ['agentShield', 'boolean | options', 'ugcSelectors, action: report or neutralize.'],
  ['phishingGuard', 'boolean | options', 'expectedHosts, cloneBeaconUrl, credential-form checks.'],
  ['messageGuard', 'false | options', 'allowedOrigins, mode.'],
  ['prototypeGuard', 'boolean | options', "mode: 'monitor' | 'lock' | 'freeze'."],
  ['trustedTypes', 'boolean | options', 'Default policy: sanitize HTML, allowlist script hosts.'],
  ['reporting', 'options', 'endpoint, batch size, sampling, redaction.'],
  ['lockdown', 'false | options', 'on: event types that trigger lockdown automatically.'],
  ['enableAntiDevtools', 'boolean', 'Deterrent. On in strict mode only.'],
  ['enableAntiCopy, enableAntiPrint, ...', 'boolean', 'Deterrents. On in strict mode.']
]

export default function Docs() {
  return (
    <div className="wrap docs">
      <aside className="docs-toc" aria-label="On this page">
        <div className="toc-title">Documentation</div>
        {SECTIONS.map(([id, label]) => <a key={id} href={`#/docs/${id}`}>{label}</a>)}
      </aside>

      <article className="docs-body">
        <h1>Documentation</h1>
        <p className="lead">Everything you need to add HydeSecurity 2.0 to a web app. The full API reference is in the README on GitHub.</p>

        <h2 id="install">Install</h2>
        <Code lang="sh" title="terminal" code={`npm install ${PKG}`} />
        <p>Or load the UMD build from a CDN. It sets <code>window.HydeSecurity</code>.</p>
        <Code lang="html" title="html" code={`<script src="${LINKS.unpkg}"></script>`} />
        <p className="note">The package was published as <code>@tirth1107/hyde-security-js</code> up to version 1.1.0. Version 2.0 and later are published as <code>{PKG}</code>.</p>

        <h2 id="quick-start">Quick start</h2>
        <Code code={`import { HydeSecurity } from '${PKG}'

HydeSecurity.init({
  mode: 'balanced',
  encryptionKey: 'a-long-app-passphrase',
  scriptGuard: { allow: ['js.stripe.com', '*.googletagmanager.com'] },
  networkFirewall: { allow: ['api.myapp.com', 'js.stripe.com'] },
  phishingGuard: { expectedHosts: ['myapp.com', '*.myapp.com'] },
  reporting: { endpoint: '/api/security-events' },
  lockdown: { on: ['sensitive_field_read', 'script_blocked'] }
})

// Grade the page and get concrete fixes
const { grade, score, findings } = await HydeSecurity.audit()`} />
        <p>Load HydeSecurity as early as you can, before third-party scripts. Guards can only block what is added after they start.</p>

        <h2 id="modes">Modes</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Turns on</th><th>dev</th><th>balanced</th><th>strict</th></tr></thead>
            <tbody>
              <tr><td>clipboardGuard, phishingGuard, prototypeGuard (monitor), messageGuard (report, same-origin), antiIframe</td><td>-</td><td>Yes</td><td>Yes</td></tr>
              <tr><td>scriptGuard, skimmerGuard, agentShield (report-only)</td><td>-</td><td>-</td><td>Yes</td></tr>
              <tr><td>Deterrents: anti-devtools, anti-debug, anti-copy, anti-print, context menu, tab guard, screenshot</td><td>-</td><td>-</td><td>Yes</td></tr>
              <tr><td>networkFirewall, trustedTypes, reporting, lockdown</td><td colSpan={3}>Only when you configure them</td></tr>
            </tbody>
          </table>
        </div>
        <p>Switch a guard from report to enforce once its reports look clean: <code>{"skimmerGuard: { mode: 'enforce' }"}</code>. Change the mode at runtime with <code>HydeSecurity.setMode('strict')</code>.</p>

        <h2 id="config">Configuration</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Key</th><th>Type</th><th>What it does</th></tr></thead>
            <tbody>{CONFIG.map(([k, t, d]) => <tr key={k}><td><code>{k}</code></td><td><code>{t}</code></td><td>{d}</td></tr>)}</tbody>
          </table>
        </div>

        <h2 id="events">Events</h2>
        <p>Every module reports through one event bus, with one event shape.</p>
        <Code code={`const off = HydeSecurity.on('script_blocked', ev => { /* one type */ })
HydeSecurity.on('source:skimmerGuard', ev => { /* one module */ })
HydeSecurity.on('*', ev => { /* everything */ })
document.addEventListener('hyde:threat', e => e.detail)   // DOM event

// { id, type, severity: 'info' | 'warning' | 'critical', source, details, timestamp }
HydeSecurity.history()   // recent events`} />

        <h2 id="guards">Guards</h2>
        <h3>scriptGuard: supply-chain protection</h3>
        <p>Inventories every script (origin, SRI, SHA-256 of inline code). In enforce mode it neutralizes unauthorized scripts before the browser runs them. It compares the inventory with earlier visits and reports changes. <code>exportReport()</code> gives you JSON for a PCI DSS assessor.</p>
        <Code code={`scriptGuard.enable({
  mode: 'enforce',
  allow: ['js.stripe.com'],              // same-origin is always allowed
  allowInlineHashes: ['sha256-...'],     // scriptGuard.hashInline(code)
  requireIntegrity: true                 // third-party scripts need SRI
})
scriptGuard.exportReport()`} />
        <h3>skimmerGuard: card skimmers</h3>
        <p>Every read of a card, password or OTP field and every key listener on it is traced to the script on the call stack. Third-party callers are reported, and in enforce mode they get an empty value or no listener. A changed form <code>action</code> is reverted.</p>
        <Code code={`skimmerGuard.enable({ mode: 'enforce', trusted: ['js.stripe.com'] })`} />
        <h3>networkFirewall: exfiltration allowlist</h3>
        <Code code={`networkFirewall.enable({ allow: ['api.myapp.com', '*.stripe.com'], mode: 'enforce' })
networkFirewall.getStats()`} />
        <h3>clipboardGuard: ClickFix</h3>
        <p>Blocks script clipboard writes that contain PowerShell, mshta, <code>curl | sh</code>, encoded commands and similar, and catches crypto-address swaps.</p>
        <Code code={`clipboardGuard.analyze(text)   // { malicious, score, reasons }`} />
        <h3>agentShield: prompt injection</h3>
        <p>Finds instruction-like text hidden with display:none, tiny fonts, same-color text, off-screen positioning, comments or attributes. <code>detectAgent()</code> spots AI agents and automated browsers.</p>
        <Code code={`agentShield.enable({ ugcSelectors: ['.comments', '.reviews'], action: 'neutralize' })`} />
        <h3>phishingGuard, messageGuard, prototypeGuard</h3>
        <Code code={`phishingGuard.checkLookalike('paypa1-secure.com', ['paypal.com'])
messageGuard.listen({ origins: ['https://app.example.com'], handler })
messageGuard.send(frame.contentWindow, data, 'https://app.example.com')   // refuses '*'
prototypeGuard.safeMerge(target, JSON.parse(input))`} />
        <h3>Trusted Types and CSP</h3>
        <Code code={`trustedTypes.enableDefaultPolicy({ scriptHosts: ['js.stripe.com'] })
const nonce = contentSecurityPolicy.generateNonce()
contentSecurityPolicy.build(contentSecurityPolicy.strict(nonce))`} />
        <h3>passkeys</h3>
        <Code code={`const { key } = await passkeys.deriveEncryptionKey({ options: serverRequestOptions, salt: 'notes-v1' })
const secret = await encryption.encrypt('my notes', key)`} />

        <h2 id="data">Data protection</h2>
        <Code code={`// AES-256-GCM, PBKDF2-SHA256 with 600,000 iterations. Async, key required.
const c = await encryption.encrypt('secret', 'passphrase')
await encryption.decrypt(c, 'passphrase')          // null on wrong key or tampering

await storage.setEncrypted('profile', data, { ttl: 3600 })
await storage.getEncrypted('profile')

sanitize.safeSetHTML(el, userHtml)   // native setHTML when available, else DOMPurify 3`} />

        <h2 id="react">React</h2>
        <Code lang="tsx" code={`import { HydeSecurityProvider, useThreats, useSecurityAudit } from '${PKG}/react'

<HydeSecurityProvider config={{ mode: 'balanced' }}>{children}</HydeSecurityProvider>

const threats = useThreats('*', 20)
const { result, loading, rerun } = useSecurityAudit()`} />

        <h2 id="upgrade">Upgrading from v1</h2>
        <ul>
          <li>Install the new package name: <code>npm uninstall @tirth1107/hyde-security-js && npm install {PKG}</code>.</li>
          <li>Encryption is async and needs a key. Convert stored v1 data once with <code>encryption.decryptLegacy()</code>.</li>
          <li>React imports moved to <code>{PKG}/react</code>.</li>
          <li>Encrypted storage uses <code>setEncrypted</code> and <code>getEncrypted</code>.</li>
          <li>Request signing needs a <code>signingKey</code> and signs a hash of the body. Update your server check.</li>
          <li>Anti-devtools is strict-only now.</li>
        </ul>
        <p>Step-by-step guide: <a href={LINKS.migration} target="_blank" rel="noopener noreferrer">docs/MIGRATION-v2.md</a>.</p>

        <h2 id="limits">Known limits</h2>
        <ul>
          <li>Scripts that are already in the HTML before HydeSecurity loads can be reported, not blocked. Load it first and pair it with a CSP.</li>
          <li>Skimmer attribution uses stack traces. Code run from eval has no script URL. Use a CSP without <code>'unsafe-eval'</code>.</li>
          <li>clipboardGuard sees script clipboard writes only, not what the user copies elsewhere.</li>
          <li>agentShield is pattern-based. Treat it as a filter, not a guarantee.</li>
          <li>Phishing clone detection works only if the phishing kit copies your JavaScript.</li>
          <li>Deterrents (anti-devtools, anti-copy and so on) slow people down. They cannot stop someone who controls the browser.</li>
        </ul>
      </article>
    </div>
  )
}
