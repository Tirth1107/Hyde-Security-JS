import React, { useState } from 'react'
import { Shield, ShieldAlert, Activity, EyeOff, LayoutGrid, Terminal, Key, Ghost, Cpu, Sparkles } from 'lucide-react'
import { HydeSecurity, HydeSecurityProvider, useHydeSecurity } from 'hyde-security-js/react'
import LiveLogger from './components/LiveLogger'
import FeatureCard from './components/FeatureCard'

// Feature Demos
import DOMGuardDemo from './components/demos/DOMGuardDemo'
import ClickjackDemo from './components/demos/ClickjackDemo'
import NetworkFirewallDemo from './components/demos/NetworkFirewallDemo'
import BiometricsDemo from './components/demos/BiometricsDemo'
import BotDetectionDemo from './components/demos/BotDetectionDemo'
import AntiDevToolsDemo from './components/demos/AntiDevToolsDemo'
import AntiDebugDemo from './components/demos/AntiDebugDemo'
import AntiIframeDemo from './components/demos/AntiIframeDemo'
import EncryptionDemo from './components/demos/EncryptionDemo'
import StorageDemo from './components/demos/StorageDemo'
import CookieDemo from './components/demos/CookieDemo'
import SessionDemo from './components/demos/SessionDemo'
import PasswordDemo from './components/demos/PasswordDemo'
import AntiCopyDemo from './components/demos/AntiCopyDemo'
import ContextMenuDemo from './components/demos/ContextMenuDemo'
import AntiPrintDemo from './components/demos/AntiPrintDemo'
import TabGuardDemo from './components/demos/TabGuardDemo'
import AntiScreenCaptureDemo from './components/demos/AntiScreenCaptureDemo'
import XSSDemo from './components/demos/XSSDemo'
import RateLimiterDemo from './components/demos/RateLimiterDemo'
import FormProtectionDemo from './components/demos/FormProtectionDemo'
import RouterGuardDemo from './components/demos/RouterGuardDemo'
import ObfuscatorDemo from './components/demos/ObfuscatorDemo'
import DeviceDemo from './components/demos/DeviceDemo'
import FingerprintDemo from './components/demos/FingerprintDemo'
import WatermarkDemo from './components/demos/WatermarkDemo'
import {
  SecurityAuditDemo, ScriptGuardDemo, SkimmerDemo, ClickFixDemo, AgentShieldDemo,
  PhishingDemo, PrototypeDemo, MessageGuardDemo, PasskeyDemo, LockdownDemo
} from './components/demos/GuardDemos'

const DashboardContent = () => {
  const security = useHydeSecurity()
  const [activeTab, setActiveTab] = useState('all')
  const [loggerOpen, setLoggerOpen] = useState(false)


  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <Shield size={28} className="text-accent" color="#38bdf8" />
          <h1>HydeSecurity JS</h1>
        </div>
        <div className="sidebar-nav">
          <div className={`nav-item ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
            <LayoutGrid size={18} /> All Features
          </div>
          <div className={`nav-item ${activeTab === 'v2' ? 'active' : ''}`} onClick={() => setActiveTab('v2')}>
            <Sparkles size={18} /> v2 Guards
          </div>
          <div className={`nav-item ${activeTab === 'core' ? 'active' : ''}`} onClick={() => setActiveTab('core')}>
            <Shield size={18} /> Core
          </div>
          <div className={`nav-item ${activeTab === 'tamper' ? 'active' : ''}`} onClick={() => setActiveTab('tamper')}>
            <ShieldAlert size={18} /> Anti-Tamper
          </div>
          <div className={`nav-item ${activeTab === 'detect' ? 'active' : ''}`} onClick={() => setActiveTab('detect')}>
            <Activity size={18} /> Detection
          </div>
          <div className={`nav-item ${activeTab === 'data' ? 'active' : ''}`} onClick={() => setActiveTab('data')}>
            <EyeOff size={18} /> Data Protection
          </div>
          <div className={`nav-item ${activeTab === 'auth' ? 'active' : ''}`} onClick={() => setActiveTab('auth')}>
            <Key size={18} /> Auth
          </div>
          <div className={`nav-item ${activeTab === 'privacy' ? 'active' : ''}`} onClick={() => setActiveTab('privacy')}>
            <Ghost size={18} /> Privacy
          </div>
          <div className={`nav-item ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')}>
            <Cpu size={18} /> Info & Tracing
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Interactive Test Suite</h2>
            <p className="card-desc">v{HydeSecurity.getVersion()} — try every feature safely</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="secondary" onClick={() => security.setMode?.('dev')}>Dev Mode</button>
            <button className="secondary" onClick={() => security.setMode?.('strict')}>Strict Mode</button>
          </div>
        </header>

        <div className="dashboard-scroll">
          <div className="grid-features">
            {/* V2 GUARDS */}
            {(activeTab === 'all' || activeTab === 'v2') && (
              <>
                <FeatureCard title="Security Audit" desc="Grade this page's security posture with fixes." badge="v2" badgeType="core"><SecurityAuditDemo /></FeatureCard>
                <FeatureCard title="Script Guard" desc="Supply-chain script inventory & blocking (PCI DSS 6.4.3 / 11.6.1)." badge="v2" badgeType="tamper"><ScriptGuardDemo /></FeatureCard>
                <FeatureCard title="Skimmer Guard" desc="Magecart / formjacking defense for card & password fields." badge="v2" badgeType="data"><SkimmerDemo /></FeatureCard>
                <FeatureCard title="ClickFix Guard" desc="Blocks fake-CAPTCHA clipboard command payloads." badge="v2" badgeType="detect"><ClickFixDemo /></FeatureCard>
                <FeatureCard title="AI Agent Shield" desc="Finds hidden prompt injections aimed at AI browser agents." badge="v2" badgeType="detect"><AgentShieldDemo /></FeatureCard>
                <FeatureCard title="Phishing Guard" desc="Lookalike domains, site clones, Browser-in-the-Browser overlays." badge="v2" badgeType="auth"><PhishingDemo /></FeatureCard>
                <FeatureCard title="Prototype Guard" desc="Prototype pollution monitor + safe merge/parse." badge="v2" badgeType="tamper"><PrototypeDemo /></FeatureCard>
                <FeatureCard title="Message Guard" desc="postMessage with exact origins; refuses '*'." badge="v2" badgeType="core"><MessageGuardDemo /></FeatureCard>
                <FeatureCard title="Passkeys" desc="WebAuthn + PRF passkey-derived encryption keys." badge="v2" badgeType="auth"><PasskeyDemo /></FeatureCard>
                <FeatureCard title="Lockdown" desc="Emergency mode on critical threats." badge="v2" badgeType="privacy"><LockdownDemo /></FeatureCard>
              </>
            )}

            {/* CORE */}
            {(activeTab === 'all' || activeTab === 'core') && (
              <>
                <FeatureCard title="XSS Sanitization" desc="Strips malicious scripts and event handlers from HTML." badge="Core" badgeType="core"><XSSDemo /></FeatureCard>
                <FeatureCard title="Rate Limiter" desc="Throttle function calls to prevent rapid-fire abuse." badge="Core" badgeType="core"><RateLimiterDemo /></FeatureCard>
                <FeatureCard title="Form Protection" desc="Auto-sanitizes form inputs on submit + hidden honeypot." badge="Core" badgeType="core"><FormProtectionDemo /></FeatureCard>
                <FeatureCard title="Router Guard" desc="Monitors history for unauthorized navigation." badge="Core" badgeType="core"><RouterGuardDemo /></FeatureCard>
                <FeatureCard title="JS Obfuscator" desc="Runtime JS obfuscation: string encoding & protection." badge="Core" badgeType="core"><ObfuscatorDemo /></FeatureCard>
              </>
            )}

            {/* ANTI-TAMPER */}
            {(activeTab === 'all' || activeTab === 'tamper') && (
              <>
                <FeatureCard title="DOM Guard" desc="Self-healing DOM mutation tracking." badge="Anti-Tamper" badgeType="tamper"><DOMGuardDemo /></FeatureCard>
                <FeatureCard title="Anti-Clickjacking" desc="Detects invisible overlays/iframes." badge="Anti-Tamper" badgeType="tamper"><ClickjackDemo /></FeatureCard>
                <FeatureCard title="Content Protection" desc="Blocks copy, cut, drag, and selection." badge="Anti-Tamper" badgeType="tamper"><AntiCopyDemo /></FeatureCard>
                <FeatureCard title="Context Menu Block" desc="Prevents the browser right-click context menu." badge="Anti-Tamper" badgeType="tamper"><ContextMenuDemo /></FeatureCard>
                <FeatureCard title="Anti-Print" desc="Blurs page content when print dialog is triggered." badge="Anti-Tamper" badgeType="tamper"><AntiPrintDemo /></FeatureCard>
              </>
            )}

            {/* DETECTION */}
            {(activeTab === 'all' || activeTab === 'detect') && (
              <>
                <FeatureCard title="Behavioral Biometrics" desc="Score human probability based on mouse/keys." badge="Detection" badgeType="detect"><BiometricsDemo /></FeatureCard>
                <FeatureCard title="Bot Detection" desc="Detects headless browsers and fast typing." badge="Detection" badgeType="detect"><BotDetectionDemo /></FeatureCard>
                <FeatureCard title="Anti-DevTools" desc="Detects DevTools via window size delta and traps." badge="Detection" badgeType="detect"><AntiDevToolsDemo /></FeatureCard>
                <FeatureCard title="Anti-Debug" desc="Timing traps to detect debugger breakpoints." badge="Detection" badgeType="detect"><AntiDebugDemo /></FeatureCard>
                <FeatureCard title="Anti-Iframe" desc="Detects if page is inside unauthorized iframe." badge="Detection" badgeType="detect"><AntiIframeDemo /></FeatureCard>
              </>
            )}

            {/* DATA */}
            {(activeTab === 'all' || activeTab === 'data') && (
              <>
                <FeatureCard title="Network Firewall" desc="Intercepts fetch/XHR to block exfiltration." badge="Data" badgeType="data"><NetworkFirewallDemo /></FeatureCard>
                <FeatureCard title="AES-GCM Encryption" desc="Web Crypto AES-256-GCM with PBKDF2 600k." badge="Data" badgeType="data"><EncryptionDemo /></FeatureCard>
                <FeatureCard title="Secure Storage" desc="AES-GCM encrypted localStorage with TTL." badge="Data" badgeType="data"><StorageDemo /></FeatureCard>
                <FeatureCard title="Cookie Management" desc="Secure cookie operations with SameSite." badge="Data" badgeType="data"><CookieDemo /></FeatureCard>
              </>
            )}

            {/* AUTH */}
            {(activeTab === 'all' || activeTab === 'auth') && (
              <>
                <FeatureCard title="Password Auditing" desc="Real-time entropy analysis & validation." badge="Auth" badgeType="auth"><PasswordDemo /></FeatureCard>
                <FeatureCard title="Session Manager" desc="Idle timeout detection with tab broadcast." badge="Auth" badgeType="auth"><SessionDemo /></FeatureCard>
              </>
            )}

            {/* PRIVACY */}
            {(activeTab === 'all' || activeTab === 'privacy') && (
              <>
                <FeatureCard title="Tab Guard" desc="Blurs the page when user switches tabs." badge="Privacy" badgeType="privacy"><TabGuardDemo /></FeatureCard>
                <FeatureCard title="Anti-Screen Capture" desc="Deters screenshot hotkeys." badge="Privacy" badgeType="privacy"><AntiScreenCaptureDemo /></FeatureCard>
              </>
            )}

            {/* INFO */}
            {(activeTab === 'all' || activeTab === 'info') && (
              <>
                <FeatureCard title="Device Detection" desc="Identifies browser, OS, platform." badge="Info" badgeType="info"><DeviceDemo /></FeatureCard>
                <FeatureCard title="Browser Fingerprint" desc="Generates unique visitor ID." badge="Info" badgeType="info"><FingerprintDemo /></FeatureCard>
                <FeatureCard title="Dynamic Watermark" desc="Injects watermarks for leak tracing." badge="Trace" badgeType="info"><WatermarkDemo /></FeatureCard>
              </>
            )}
          </div>
        </div>
      </main>

      <LiveLogger open={loggerOpen} onClose={() => setLoggerOpen(false)} />
      
      {!loggerOpen && (
        <div className="logger-toggle" onClick={() => setLoggerOpen(true)}>
          <Terminal size={24} color="#0ea5e9" />
        </div>
      )}
    </div>
  )
}

function App() {
  return (
    <HydeSecurityProvider config={{ mode: 'balanced', appName: 'HydeSecurity Test Suite' }}>
      <DashboardContent />
    </HydeSecurityProvider>
  )
}

export default App
