# 🔥 HydeSecurityJS v1.0.0

**Client-side deterrence and security helpers** for web applications. Provides layered protection against common client-side threats: XSS, copy/paste abuse, DevTools interference, session hijacking, iframe injection, and more.

> ⚠️ **Important:** This is NOT a "hack-proof" system. Browser JavaScript cannot provide server-level security. HydeSecurityJS provides **deterrence**, **best-practice helpers**, and **hardening** layers with safe defaults.

## Why HydeSecurityJS?

Modern web apps face real threats:
- **Content theft** (copy, screenshot, print)
- **Debug/inspect abuse** (tampering, devtools)
- **Injection attacks** (XSS via user input)
- **Session stealing** (token exposure, replay attacks)
- **Automated abuse** (bots, fast-clicking)
- **Framing attacks** (clickjacking, invisible iframes)

HydeSecurityJS gives you ready-to-use defenses for all of these.

## What It Can / Cannot Do

### ✅ It CAN:
- Detect DevTools open and react (blur UI, warn, lock screen)
- Block/detect common shortcuts (F12, Ctrl+Shift+I, etc.)
- Sanitize user-generated HTML (XSS prevention)
- Encrypt sensitive data before storage
- Rate-limit actions (clicks, API calls)
- Detect session anomalies via fingerprinting
- Protect DOM nodes from tampering
- Add session timeout and multi-tab logout
- Block iframe framing
- Detect headless browsers and fast automation

### ❌ It CANNOT:
- Prevent determined attackers (browser is client-side)
- Enforce crypto on the wire (use HTTPS + server-side validation)
- Prevent all screen capture tools
- Replace server-side validation and security
- Protect against network-level interception

## Installation

```bash
npm install hyde-security-js
```

Or from CDN (when UMD build is available):
```html
<script src="https://cdn.example.com/hyde-security-js@1.0.0/dist/hyde-security-js.umd.js"></script>
<script>
  window.HydeSecurity.init({ appName: 'My App', mode: 'balanced' })
</script>
```

## Quick Start

### Vanilla HTML/JS

```html
<!DOCTYPE html>
<html>
<head>
  <title>My App</title>
</head>
<body>
  <h1>Protected Content</h1>
  <video id="protected" src="video.mp4"></video>

  <script type="module">
    import { HydeSecurity } from 'hyde-security-js'
    
    // Initialize with strict mode
    HydeSecurity.init({
      appName: 'My Streaming App',
      mode: 'strict',
      enableLogs: true,
      enableWatermark: true,
      onThreatDetected: (event) => {
        console.warn('🚨 Threat detected:', event)
      }
    })
    
    // Protect a specific element
    HydeSecurity.protectElement('#protected')
    
    // Show toast notification
    HydeSecurity.toast('Security initialized')
  </script>
</body>
</html>
```

### React

```jsx
import React from 'react'
import { HydeSecurityProvider } from 'hyde-security-js/react'

export default function App() {
  return (
    <HydeSecurityProvider
      config={{
        appName: 'Streaming Platform',
        mode: 'balanced',
        enableWatermark: true,
        onThreatDetected: (event) => console.warn(event)
      }}
    >
      <YourApp />
    </HydeSecurityProvider>
  )
}
```

### Next.js

Wrap your root layout with `HydeSecurityProvider`:

```jsx
// app/layout.tsx
import { HydeSecurityProvider } from 'hyde-security-js/react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <HydeSecurityProvider
          config={{
            appName: 'My SaaS',
            mode: 'balanced'
          }}
        >
          {children}
        </HydeSecurityProvider>
      </body>
    </html>
  )
}
```

### Vite (SPA)

Same as vanilla; import at app entry:

```js
// src/main.ts
import { HydeSecurity } from 'hyde-security-js'

HydeSecurity.init({
  appName: 'My Vite App',
  mode: 'balanced',
  enableLogs: false
})
```

## API Reference

### Core

#### `HydeSecurity.init(config?: HydeSecurityConfig)`
Initialize the security system.

**Config:**
```ts
interface HydeSecurityConfig {
  appName?: string              // App name for logging/watermark
  mode?: 'dev' | 'balanced' | 'strict'  // Security level
  enableLogs?: boolean          // Console logging
  enableWatermark?: boolean     // Add watermark overlay
  onThreatDetected?: (event) => void  // Threat callback
  allowedIframes?: string[]     // Allowed iframe origins
}
```

**Modes:**
- **dev**: Minimal blocking, logs only
- **balanced**: Blocks shortcuts, encrypts storage (recommended)
- **strict**: All features enabled, blocks most actions, locks UI

#### `HydeSecurity.setMode(mode)`
Change security mode at runtime.

#### `HydeSecurity.disableAll() / enableAll()`
Disable or re-enable all security features.

### UI & Notifications

#### `HydeSecurity.toast(message: string)`
Show a toast notification (auto-dismisses after 3s).

#### `HydeSecurity.lockScreen(reason?: string)`
Show a full-screen overlay with a message. Use after detecting threats.

#### `HydeSecurity.unlockScreen()`
Remove the lock screen overlay.

### Encryption & Storage

#### `HydeSecurity.encryptText(text, key?) → string`
Encrypt a string using AES-256 (CryptoJS).

#### `HydeSecurity.decryptText(cipher, key?) → string`
Decrypt an encrypted string.

#### `HydeSecurity.modules.encryption.encryptObject(obj, key?) → string`
Encrypt a JSON object.

#### `HydeSecurity.modules.storage.set(key, value, {encrypt?: boolean})`
Store data with optional encryption.

#### `HydeSecurity.modules.storage.get(key, {decrypt?: boolean})`
Retrieve stored data, optionally decrypted.

#### `HydeSecurity.modules.storage.clear()`
Clear all storage.

### Content Protection

#### `HydeSecurity.protectElement(selector: string)`
Watch a DOM element for tampering via MutationObserver. Triggers `onThreatDetected` if modified.

#### `HydeSecurity.protectInput(selector: string)`
Block paste events on a password/sensitive input.

#### `HydeSecurity.safeHTML(html: string) → string`
Sanitize HTML using DOMPurify. Safe for `innerHTML`.

```js
const safe = HydeSecurity.safeHTML('<img src=x onerror=alert(1) />')
element.innerHTML = safe  // Safe!
```

### Anti-Devtools & Anti-Debug

#### `HydeSecurity.modules.antiDevtools.enable(config?)`
Enable DevTools detection. Detects window size changes and debugger traps.

```js
HydeSecurity.modules.antiDevtools.enable({
  onThreat: (event) => console.warn(event),
  autoLock: true  // Lock screen when detected
})
```

#### `HydeSecurity.modules.antiDevtools.disable()`
Disable anti-devtools.

### Anti-Copy / Anti-Print

#### `HydeSecurity.modules.antiCopy.enable()`
Block copy/cut/drag operations.

#### `HydeSecurity.modules.antiPrint.enable()`
Blur content on print preview.

#### `HydeSecurity.modules.antiContextMenu.enable()`
Block right-click context menu.

### Session Management

#### `HydeSecurity.modules.session.init(opts?)`
Initialize session timeout and multi-tab logout.

```js
HydeSecurity.modules.session.init({
  timeoutMinutes: 30,
  onExpire: () => location.href = '/login'
})
```

#### `HydeSecurity.modules.session.end()`
End session and clear all tabs.

### Forms & Sanitization

#### `HydeSecurity.modules.forms.attachSanitize(formElement)`
Auto-sanitize all form inputs on submit.

#### `HydeSecurity.modules.forms.addHoneypot(formElement)`
Add a hidden honeypot field to detect bots.

```js
const form = document.querySelector('form')
HydeSecurity.modules.forms.addHoneypot(form)
HydeSecurity.modules.forms.attachSanitize(form)
```

### Network & Integrity

#### `HydeSecurity.modules.network.createClient(opts?)`
Create an axios client with security headers.

```js
const client = HydeSecurity.modules.network.createClient({
  apiKey: 'your-api-key',
  sign: true
})
await client.get('/api/data')
```

#### `HydeSecurity.modules.headers.setupAxios(client?, opts?)`
Add security headers to an existing axios instance.

### Anti-Bot & Device Detection

#### `HydeSecurity.modules.antiBot.detectFastTyping(element, threshold?)`
Detect rapid keyboard input (automation).

```js
const check = HydeSecurity.modules.antiBot.detectFastTyping(passwordInput, 30)
// later: const { fast } = check()
```

#### `HydeSecurity.modules.antiBot.detectHeadless()`
Detect headless browser (navigator.webdriver, etc.).

#### `HydeSecurity.modules.device.detectDevice()`
Get device info (browser, OS, type) using Bowser.

### Advanced

#### `HydeSecurity.modules.fingerprint.getFingerprint() → Promise<string>`
Get a browser fingerprint ID for session replay detection.

#### `HydeSecurity.modules.domGuard.protect(selector, onTamper?)`
Watch a DOM node; call `onTamper` if modified.

#### `HydeSecurity.modules.routerGuard.protectHistory(onChange)`
Watch route changes.

## Feature List (60+ Features)

### Category A: Anti-DevTools + Anti-Debug (10)
✅ Detect DevTools open (size trap)  
✅ Detect DevTools (debugger timing)  
✅ Block F12  
✅ Block Ctrl+Shift+I  
✅ Block Ctrl+Shift+J  
✅ Block Ctrl+Shift+C  
✅ Block Ctrl+U  
✅ Console logging bait  
✅ Auto-lock UI on detection  
✅ Security warning overlay  

### Category B: Anti-Copy + Anti-Print (8)
✅ Block Ctrl+S  
✅ Block Ctrl+P  
✅ Blur on print  
✅ Disable copy on protected elements  
✅ Disable cut  
✅ Block paste in password fields  
✅ Prevent image drag  
✅ Watermark overlay  

### Category C: DOM & Injection Protection (10)
✅ HTML sanitization (DOMPurify)  
✅ Safe innerHTML setter  
✅ URL sanitizer  
✅ Form input sanitization  
✅ Suspicious DOM injection detection  
✅ MutationObserver guard  
✅ Remove inline event handlers  
✅ Block script tag injection  
✅ CSP helper  
✅ Clickjacking prevention (frame busting)  

### Category D: Storage & Encryption (10)
✅ AES encrypt/decrypt  
✅ Encrypt JSON objects  
✅ Secure localStorage wrapper  
✅ Secure sessionStorage wrapper  
✅ localforage fallback  
✅ Token vault with expiry  
✅ Auto-wipe on tamper  
✅ Mask sensitive values  
✅ Prevent raw secrets  
✅ PBKDF2 key derivation  

### Category E: Session & Auth (6)
✅ Session idle timeout  
✅ Tab close cleanup  
✅ Multi-tab sync logout  
✅ JWT decode helper  
✅ Session replay detection  
✅ Login attempt limiter  

### Category F: Bot & Abuse Detection (6)
✅ Honeypot fields  
✅ Fast typing detection  
✅ Rate limiter for clicks  
✅ Headless browser detection  
✅ Suspicious repeat action detection  
✅ Device trust score  

### Category G: Network Protection (5)
✅ Axios wrapper with signing  
✅ Integrity headers  
✅ Auto-retry with backoff  
✅ Block if integrity fails  
✅ API error sanitizer  

### Category H: Integrity & Tamper (5)
✅ Script integrity check  
✅ DOM watermark overlay  
✅ Source mod detection  
✅ Iframe detection  
✅ Lock UI on tamper  

## Configuration Examples

### Video Streaming App (Strict)
```js
HydeSecurity.init({
  appName: 'FlixPro',
  mode: 'strict',
  enableWatermark: true,
  enableLogs: false,
  onThreatDetected: (event) => {
    if (event.severity === 'critical') {
      HydeSecurity.lockScreen('Your session has been secured.')
    }
    // Send to backend for logging
    fetch('/api/security/event', { method: 'POST', body: JSON.stringify(event) })
  }
})

// Protect video element
HydeSecurity.protectElement('#video-player')

// Encrypt sensitive tokens before storage
const token = HydeSecurity.encryptText(authToken, 'secret')
localStorage.setItem('auth', token)
```

### SaaS Dashboard (Balanced)
```js
HydeSecurity.init({
  appName: 'DataDash',
  mode: 'balanced',
  enableLogs: true,
  onThreatDetected: console.warn
})

// Protect forms
const form = document.querySelector('form')
HydeSecurity.modules.forms.attachSanitize(form)
HydeSecurity.modules.forms.addHoneypot(form)

// Protect password input
HydeSecurity.protectInput('#password')

// Session timeout
HydeSecurity.modules.session.init({
  timeoutMinutes: 15,
  onExpire: () => location.href = '/login'
})
```

### Development Site (Dev Mode)
```js
HydeSecurity.init({
  appName: 'DevSite',
  mode: 'dev',
  enableLogs: true
})
// Minimal blocking, inspect as needed
```

## Security Best Practices

1. **Always use HTTPS**: Client-side security is worthless without transport security.
2. **Validate on the server**: Never trust client-side validation alone.
3. **Use CSP headers**: Set `Content-Security-Policy` headers server-side.
4. **Monitor events**: Send `onThreatDetected` events to your backend for analysis.
5. **Combine layers**: Use HydeSecurityJS with server-side protections.
6. **Test regularly**: Verify your security configuration works as expected.
7. **Keep dependencies updated**: Run `npm audit` and update regularly.

## Troubleshooting

**Q: DevTools detection not working?**  
A: Some browsers may bypass size-based detection. HydeSecurityJS uses multiple methods (size, debugger trap, timing). For guaranteed prevention, use CSP and server-side validation.

**Q: Encryption keys are in client-side code?**  
A: For client-side encryption, keys must be in code (or fetched). This is **not secure for sensitive data**. Use server-side encryption for real secrets.

**Q: Does this stop screenshots?**  
A: No. Screenshots are OS-level and cannot be blocked from the browser. Watermarks add a deterrent.

**Q: Can I use this with my framework?**  
A: Yes! Import and use in any React, Vue, Angular, Svelte app. For React, use `HydeSecurityProvider`. For others, call `HydeSecurity.init()` in your root component/entry.

## Limitations

- **Not hack-proof**: This is client-side; determined attackers can bypass anything.
- **Browser-dependent**: Features vary by browser and can be disabled by users.
- **Performance**: Some features (fingerprinting, encryption) add overhead.
- **Privacy**: Watermarks and logging may impact user privacy; inform users.

## Contributing

Contributions welcome! Please:
1. Fork the repo
2. Create a feature branch
3. Add tests if applicable
4. Submit a PR

## License

MIT — See [LICENSE](LICENSE)

## Support

- **Docs**: See examples in `examples/` folder
- **Issues**: Open a GitHub issue
- **Questions**: Check the FAQ above

---

**Made with 🔥 by Hyde Team**

