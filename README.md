# 🔥 HydeSecurityJS v1.1.0

![npm](https://img.shields.io/npm/v/@tirth1107/hyde-security-js)
![license](https://img.shields.io/npm/l/@tirth1107/hyde-security-js)
![bundle size](https://img.shields.io/bundlephobia/minzip/@tirth1107/hyde-security-js)

**Client-side deterrence and security helpers** for modern web applications. Provides layered protection against common client-side threats: XSS, copy/paste abuse, DevTools interference, session hijacking, iframe injection, CSRF, and more.

> ⚠️ **Important:** Browser JavaScript cannot provide server-level security. HydeSecurityJS provides **deterrence**, **best-practice helpers**, and **hardening** layers with safe defaults. Always pair with server-side validation.

## Why HydeSecurityJS?

Modern web apps face real threats:
- **Content theft** (copy, screenshot, print)
- **Debug/inspect abuse** (tampering, devtools)
- **Injection attacks** (XSS, SQLi via user input)
- **Session stealing** (token exposure, replay attacks)
- **Automated abuse** (bots, fast-clicking, CSRF)
- **Framing attacks** (clickjacking, invisible iframes)

HydeSecurityJS gives you ready-to-use defenses for all of these in a single, lightweight package.

## Installation

```bash
npm install @tirth1107/hyde-security-js
```

## Quick Start

### React

Wrap your app or specific routes with `HydeSecurityProvider`:

```jsx
import React from 'react'
import { HydeSecurityProvider, useHydeSecurity } from '@tirth1107/hyde-security-js/react'

export default function App() {
  return (
    <HydeSecurityProvider
      config={{
        appName: 'My Secure App',
        mode: 'strict', // 'dev' | 'balanced' | 'strict'
        enableWatermark: true,
        onThreatDetected: (event) => console.warn('Threat detected:', event)
      }}
    >
      <YourApp />
    </HydeSecurityProvider>
  )
}
```

### Next.js

Use it in your root layout:

```jsx
// app/layout.tsx
'use client'
import { HydeSecurityProvider } from '@tirth1107/hyde-security-js/react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <HydeSecurityProvider config={{ appName: 'My SaaS', mode: 'balanced' }}>
          {children}
        </HydeSecurityProvider>
      </body>
    </html>
  )
}
```

### Vanilla HTML/JS or Vite (SPA)

```js
import { HydeSecurity } from '@tirth1107/hyde-security-js'

HydeSecurity.init({
  appName: 'My Vanilla App',
  mode: 'strict',
  enableWatermark: true,
  onThreatDetected: (event) => {
    // Send to your backend logging service
    fetch('/api/security-logs', { method: 'POST', body: JSON.stringify(event) })
  }
})

// Use specific modules
const secureKey = HydeSecurity.encryptText('secret-data', 'my-key')
```

## Configuration & Modes

Initialize with `HydeSecurity.init(config)` or via the React Provider:

```ts
interface HydeSecurityConfig {
  appName?: string              // Used for watermarks and logging
  mode?: 'dev' | 'balanced' | 'strict' // Overall security posture
  enableLogs?: boolean          // Show console logs
  enableWatermark?: boolean     // Tiled canvas watermark overlay
  onThreatDetected?: (ev: HydeSecurityEvent) => void
  
  // Granular Overrides (defaults depend on mode)
  enableAntiCopy?: boolean
  enableAntiPrint?: boolean
  enableAntiContextMenu?: boolean
  enableTabGuard?: boolean
  enableAntiScreenCapture?: boolean
  enableAntiIframe?: boolean
  allowedIframes?: string[]
}
```

## 🛡️ Core Features (v1.1.0)

### 1. Anti-DevTools & Anti-Debug
Detects when users open DevTools and optional UI locking.
- Detects size traps, debugger timing, console latency, and Firebug.
- Blocks F12, Ctrl+Shift+I/J/C, and Ctrl+U.

### 2. Content Protection (Anti-Copy, Print, Screen Capture)
- **Anti-Copy**: Blocks copy, cut, drag, and selection.
- **Anti-Print**: Blocks Ctrl+P and visually blurs the document if print dialog opens.
- **Anti-Screen Capture**: Deters screenshots using DRM APIs and Canvas overlays.
- **Watermarking**: Tiled, tamper-resistant canvas watermark over the entire screen.

### 3. Session Management & Storage
- **Session Timeout**: Auto-logout after inactivity, synchronized across tabs.
- **Secure Storage**: `storage.set(key, val, { encrypt: true, ttl: 3600 })` — encrypts data and adds auto-expiring TTLs.
- **Secure Cookies**: `cookie.setSecure(key, val)` defaults to `Secure` and `SameSite=Strict`.

### 4. Injection & XSS Prevention
- **HTML Sanitization**: `sanitize.html(input)` and `sanitize.safeSetHTML(el, input)` powered by DOMPurify.
- **URL & Text**: `sanitize.url(url)` ensures safe protocols; `sanitize.text(input)` escapes HTML.
- **CSP Helper**: `contentSecurityPolicy.build()` and `inject()` for easy Content Security Policy management.
- **Input Validation**: Detect SQLi, XSS, and validate emails/URLs with `inputValidation.validateField()`.

### 5. Bot & Abuse Deterrence
- **Honeypots**: `forms.addHoneypot(form)` adds invisible fields; `honeypot.isTriggered(form)` detects bots.
- **Fast Typing & Headless**: Detects superhuman typing speeds and headless browser artifacts.
- **CSRF Protection**: `csrfProtection.attachToAxios(client)` auto-injects CSRF tokens from meta tags.

### 6. Network & Integrity
- **Request Signing**: `network.createClient({ sign: true })` signs requests using HMAC-SHA256.
- **Auto-Retry**: Network client automatically retries 5xx errors with exponential backoff.
- **Script Integrity**: `integrity.checkScriptIntegrity(src, hash)` verifies external scripts via SHA-256.

## Advanced Usage

### Using the API directly

```js
import { HydeSecurity } from '@tirth1107/hyde-security-js'

// 1. Manually protect a specific element from DOM tampering
HydeSecurity.protectElement('#sensitive-data')

// 2. Encrypt/Decrypt
const encrypted = HydeSecurity.encryptText('Hello', 'passphrase')
const decrypted = HydeSecurity.decryptText(encrypted, 'passphrase')

// 3. Password Strength (zxcvbn)
const strength = HydeSecurity.checkPassword('P@ssw0rd123!')
console.log(strength.feedback)

// 4. Access individual modules
const { inputValidation, csrfProtection } = HydeSecurity.modules

if (inputValidation.isSQLInjection("SELECT * FROM users")) {
  HydeSecurity.lockScreen("Malicious input detected")
}
```

## Migration Guide: v1.0.0 to v1.1.0

- **Scoped Package:** We have moved to the scoped package `@tirth1107/hyde-security-js`. Please update your `package.json` and imports.
- **Module Improvements:** Many sub-modules were fixed for memory leaks, SSR compatibility, and proper security defaults (e.g., `cookie.set()` now defaults to Secure).
- **New Modules:** Explore `csrfProtection`, `contentSecurityPolicy`, and `inputValidation` in `HydeSecurity.modules`.

## License

MIT © [Tirth1107](https://github.com/Tirth1107)
