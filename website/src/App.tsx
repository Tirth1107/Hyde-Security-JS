import { lazy, Suspense } from 'react'
import { HydeSecurityProvider } from 'hyde-security-js/react'
import { SiteNav, Footer } from './components/SiteNav'
import { useRoute } from './router'
import Home from './pages/Home'
import Docs from './pages/Docs'
import Changelog from './pages/Changelog'
import './site.css'

// The playground pulls in every demo; load it only when someone opens it
const Playground = lazy(() => import('./pages/Playground'))

const TITLES = {
  home: 'HydeSecurity: client-side security for web apps',
  docs: 'Docs | HydeSecurity',
  changelog: "What's new in 2.0 | HydeSecurity",
  playground: 'Playground | HydeSecurity'
}

function Site() {
  const { route } = useRoute()
  document.title = TITLES[route]
  return (
    <div className={`site route-${route}`}>
      <SiteNav route={route} />
      <main id="main">
        {route === 'home' && <Home />}
        {route === 'docs' && <Docs />}
        {route === 'changelog' && <Changelog />}
        {route === 'playground' && (
          <Suspense fallback={<div className="wrap loading">Loading the playground...</div>}>
            <Playground />
          </Suspense>
        )}
      </main>
      {route !== 'playground' && <Footer />}
    </div>
  )
}

export default function App() {
  return (
    <HydeSecurityProvider config={{ mode: 'balanced', appName: 'HydeSecurity Website' }}>
      <Site />
    </HydeSecurityProvider>
  )
}
