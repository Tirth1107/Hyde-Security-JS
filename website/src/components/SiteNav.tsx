import { useState } from 'react'
import { Menu, X, Package } from 'lucide-react'
import { LINKS } from '../content'
import type { Route } from '../router'

export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="hyde-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <path d="M16 2.5 27 6.6v8.2c0 7-4.7 12.6-11 14.7C9.7 27.4 5 21.8 5 14.8V6.6L16 2.5z" fill="url(#hyde-g)" />
      <path d="M11.5 10.5v11M20.5 10.5v11M11.5 16h9" stroke="#060913" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}

export function GitHubMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.56-.29-5.25-1.28-5.25-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5z" />
    </svg>
  )
}

const ITEMS: { route: Route; label: string }[] = [
  { route: 'home', label: 'Overview' },
  { route: 'docs', label: 'Docs' },
  { route: 'changelog', label: "What's new" },
  { route: 'playground', label: 'Playground' }
]

export function SiteNav({ route }: { route: Route }) {
  const [open, setOpen] = useState(false)
  return (
    <header className="site-nav">
      <div className="site-nav-inner">
        <a className="brand" href="#/" onClick={() => setOpen(false)}>
          <Logo />
          <span>HydeSecurity</span>
          <span className="ver">v2</span>
        </a>
        <nav className={`nav-links ${open ? 'open' : ''}`} aria-label="Main">
          {ITEMS.map(i => (
            <a key={i.route} href={`#/${i.route === 'home' ? '' : i.route}`} className={route === i.route ? 'on' : ''} onClick={() => setOpen(false)}>
              {i.label}
            </a>
          ))}
          <a className="ext" href={LINKS.npm} target="_blank" rel="noopener noreferrer"><Package size={16} /> npm</a>
          <a className="ext" href={LINKS.github} target="_blank" rel="noopener noreferrer"><GitHubMark size={16} /> GitHub</a>
        </nav>
        <button className="icon-btn menu-btn" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(o => !o)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
    </header>
  )
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap footer-inner">
        <div className="brand"><Logo size={20} /> <span>HydeSecurity</span></div>
        <p>MIT licensed. Client-side code can be bypassed by whoever controls the browser. Use HydeSecurity as defense in depth, next to server-side checks and HTTP security headers.</p>
        <div className="footer-links">
          <a href={LINKS.github} target="_blank" rel="noopener noreferrer">GitHub</a>
          <a href={LINKS.npm} target="_blank" rel="noopener noreferrer">npm</a>
          <a href={LINKS.issues} target="_blank" rel="noopener noreferrer">Report an issue</a>
        </div>
      </div>
    </footer>
  )
}
