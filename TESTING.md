# HydeSecurityJS - Testing Guide

## Quick Start Testing

### 1. Automated Unit Tests

```bash
# Install dependencies and run tests
npm install
npm run test

# Watch mode (re-run on file changes)
npm run test -- --watch

# With UI dashboard
npm run test:ui

# Coverage report
npm run test:coverage
```

### 2. Manual Browser Testing

```bash
# Start dev server
npm run dev

# Opens http://localhost:5173/examples/test.html
```

Then use the interactive test interface to manually test all features.

---

## Testing Each Module

### Encryption Module ✓

**Automated Tests:** `src/__tests__/modules/encryption.test.ts`

**Manual Steps:**
1. Open dev console
2. Run:
   ```js
   const text = 'Secret Message'
   const encrypted = HydeSecurity.encryptText(text)
   const decrypted = HydeSecurity.decryptText(encrypted)
   console.log(decrypted === text) // true
   ```

**Test Cases:**
- ✓ Encrypt/decrypt text
- ✓ Handle special characters
- ✓ Encrypt/decrypt JSON objects
- ✓ Fail gracefully with wrong key
- ✓ Handle empty strings
- ✓ Handle large text (10KB+)

---

### Sanitization Module ✓

**Automated Tests:** `src/__tests__/modules/sanitize.test.ts`

**Manual Steps:**
1. Open browser dev console
2. Run:
   ```js
   const dirty = '<img src=x onerror="alert(1)">'
   const clean = HydeSecurity.safeHTML(dirty)
   document.body.innerHTML = clean // Safe to insert
   ```

**Test Cases:**
- ✓ Remove XSS script tags
- ✓ Allow safe HTML
- ✓ Remove event handlers (onclick, onerror, etc.)
- ✓ Remove dangerous protocols (javascript:, vbscript:, data:)

---

### Storage Module ✓

**Automated Tests:** `src/__tests__/modules/storage.test.ts`

**Manual Steps:**
```js
// Store data
HydeSecurity.modules.storage.set('user', { id: 123, name: 'John' })

// Retrieve data
const user = HydeSecurity.modules.storage.get('user')
console.log(user.name) // 'John'

// Clear all
HydeSecurity.modules.storage.clear()
```

**Test Cases:**
- ✓ Store and retrieve data
- ✓ Return null for non-existent keys
- ✓ Remove items
- ✓ Clear all storage
- ✓ Handle JSON objects

---

### Anti-DevTools Module ✓

**Automated Tests:** `src/__tests__/modules/antiDevtools.test.ts`

**Manual Steps:**
1. Run in console:
   ```js
   HydeSecurity.modules.antiDevtools.enable({
     onThreat: (ev) => console.warn('DevTools detected!', ev)
   })
   ```

2. Open DevTools (F12) - Should detect and log threat
3. Try keyboard shortcuts:
   - F12 → Blocked
   - Ctrl+Shift+I → Blocked
   - Ctrl+Shift+J → Blocked
   - Ctrl+Shift+C → Blocked
   - Ctrl+U → Blocked

**Test Cases:**
- ✓ Enable/disable
- ✓ Detect DevTools via size trap
- ✓ Detect debugger timing
- ✓ Block keyboard shortcuts
- ✓ Call threat callback
- ✓ Auto-lock UI option

---

### Session Management Module ✓

**Automated Tests:** `src/__tests__/modules/session.test.ts`

**Manual Steps:**
```js
// Initialize with 30-minute timeout
HydeSecurity.modules.session.init({
  timeoutMinutes: 30,
  onExpire: () => {
    console.log('Session expired - redirecting to login')
    location.href = '/login'
  }
})

// End session (logs out all tabs)
HydeSecurity.modules.session.end()
```

**Test Cases:**
- ✓ Idle timeout (reset on user activity)
- ✓ Multi-tab sync logout (BroadcastChannel API)
- ✓ Custom expiration callback
- ✓ localStorage/sessionStorage cleanup

---

### DOM Guard Module ✓

**Manual Steps:**
```js
// Protect an element
HydeSecurity.protectElement('#video-player')

// Open DevTools and try:
// document.querySelector('#video-player').innerHTML = 'hacked'
// Should trigger onThreatDetected
```

**Test Cases:**
- ✓ Detect DOM modifications
- ✓ Monitor child node changes
- ✓ Monitor attribute changes
- ✓ Trigger threat callback

---

### Anti-Copy / Anti-Print Modules ✓

**Manual Steps:**
```js
// Block copy/cut/drag
HydeSecurity.modules.antiCopy.enable()

// Try: Ctrl+C, Ctrl+X, or drag-select
// Should be blocked

// Block print
HydeSecurity.modules.antiPrint.enable()

// Try: Ctrl+P
// Content blurs in print preview
```

**Test Cases:**
- ✓ Block copy
- ✓ Block cut
- ✓ Block drag-select
- ✓ Blur on print
- ✓ Block print shortcuts

---

### Forms Module ✓

**Manual Steps:**
```js
const form = document.querySelector('form')

// Add sanitization
HydeSecurity.modules.forms.attachSanitize(form)

// Add honeypot (hidden field for bot detection)
HydeSecurity.modules.forms.addHoneypot(form)

// Submit form - input values will be sanitized
```

**Test Cases:**
- ✓ Sanitize form inputs on submit
- ✓ Add hidden honeypot field
- ✓ Detect bot form fillers

---

## React Component Testing

**Automated Tests:** `src/__tests__/react/HydeSecurityProvider.test.tsx`

**Manual Test:**
```jsx
import { HydeSecurityProvider } from 'hyde-security-js/react'

function App() {
  return (
    <HydeSecurityProvider config={{ 
      appName: 'My App',
      mode: 'balanced',
      enableWatermark: true 
    }}>
      <YourComponent />
    </HydeSecurityProvider>
  )
}
```

**Verify:**
- ✓ Provider renders children
- ✓ Anti-DevTools enabled in strict mode
- ✓ Watermark displays (if enabled)
- ✓ Threat callbacks work
- ✓ Cleanup on unmount

---

## End-to-End Testing Checklist

### Video Streaming App (Strict Mode)

```js
HydeSecurity.init({
  appName: 'FlixPro',
  mode: 'strict',
  enableWatermark: true,
  onThreatDetected: (ev) => {
    if (ev.severity === 'critical') {
      HydeSecurity.lockScreen('Session secured')
    }
  }
})

// Protect video player
HydeSecurity.protectElement('#video-container')

// Try each attack:
// 1. F12 → DevTools detected ✓
// 2. Ctrl+Shift+I → Blocked ✓
// 3. Ctrl+C → Copy blocked ✓
// 4. Ctrl+P → Print blurred ✓
// 5. Right-click → Menu blocked ✓
// 6. <img onerror=...> → Sanitized ✓
```

### SaaS App (Balanced Mode)

```js
HydeSecurity.init({
  appName: 'DataDash',
  mode: 'balanced'
})

// Protect forms
const form = document.querySelector('form')
HydeSecurity.modules.forms.attachSanitize(form)
HydeSecurity.modules.forms.addHoneypot(form)

// Protect password input
HydeSecurity.protectInput('#password')

// Test:
// 1. Try Ctrl+Shift+I → Blocked ✓
// 2. Try paste in password → Blocked ✓
// 3. Fill form with XSS → Sanitized ✓
// 4. Check localStorage encryption ✓
```

---

## Performance Testing

### Bundle Size

```bash
npm run build

# Check dist/ files:
# - index.js (ESM): ~40KB
# - index.js.map: ~20KB (source map)
```

### Runtime Performance

```js
// Measure encryption speed
console.time('Encrypt')
for (let i = 0; i < 1000; i++) {
  HydeSecurity.encryptText('test')
}
console.timeEnd('Encrypt')

// Measure sanitization speed
console.time('Sanitize')
for (let i = 0; i < 1000; i++) {
  HydeSecurity.safeHTML('<b>test</b>')
}
console.timeEnd('Sanitize')
```

---

## Security Testing

### Test Attack Vectors

1. **XSS Injection**
   ```html
   <img src=x onerror="alert('XSS')">
   <script>alert('XSS')</script>
   <div onclick="alert('XSS')">Click</div>
   <a href="javascript:alert('XSS')">Link</a>
   ```
   → All should be blocked/sanitized ✓

2. **Storage Tampering**
   ```js
   // Enable storage encryption
   HydeSecurity.modules.storage.set('auth', token, { encrypt: true })
   
   // Check localStorage - should be encrypted
   console.log(localStorage.getItem('auth'))
   // → Not readable plaintext ✓
   ```

3. **Session Hijacking**
   ```js
   // Get fingerprint for session trust
   const fp = await HydeSecurity.modules.fingerprint.getFingerprint()
   // → Different fingerprint = different device/browser
   ```

4. **Bot Detection**
   ```js
   const isHeadless = HydeSecurity.modules.antiBot.detectHeadless()
   // → true if running in Puppeteer/Playwright ✓
   ```

---

## Debugging

### Enable Logs

```js
HydeSecurity.init({
  enableLogs: true // Console logs all events
})
```

### Inspect Threats

```js
HydeSecurity.init({
  onThreatDetected: (event) => {
    console.log({
      id: event.id,
      type: event.type,
      severity: event.severity,
      details: event.details,
      timestamp: event.timestamp
    })
  }
})
```

### Browser Console Commands

```js
// Access library
window.HydeSecurity

// Test encryption
HydeSecurity.encryptText('hello')

// Get config
HydeSecurity.modules

// Check storage
localStorage
sessionStorage

// Test security header
HydeSecurity.modules.headers.setupAxios()
```

---

## CI/CD Testing

Add to your CI pipeline:

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm run type-check
      - run: npm run test:coverage
      - run: npm run build
```

---

## Support

- **Test UI:** `npm run test:ui`
- **Coverage:** `npm run test:coverage`
- **Manual Testing:** Open `examples/test.html`
- **Console Access:** `window.HydeSecurity`

**All tests passing ✓**
