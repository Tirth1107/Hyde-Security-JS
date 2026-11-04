# HydeSecurity website

The project site: overview, docs, what's new in 2.0, and a playground with a live demo of
every feature. Built with Vite + React 19 + TypeScript.

It imports the library straight from `../src` (see the `hyde-security-js`
alias in `vite.config.ts`), so changes to the library show up right away —
no build or publish needed.

## Run it

```bash
cd website
npm install
npm run dev      # http://localhost:5173
```

Other scripts:

| Command | What it does |
|---|---|
| `npm run build` | Type-check and build to `website/dist` |
| `npm run preview` | Serve the built site |
| `npm run lint` | Lint with oxlint (Windows and Linux binaries are both installed) |

From the repo root, `npm run build:website` runs the same build.

## Layout

Hash routes: `#/` overview, `#/docs`, `#/changelog`, `#/playground`.

- `src/App.tsx` — site shell, routes, `HydeSecurityProvider` setup
- `src/pages/` — `Home`, `Docs`, `Changelog`, `Playground` (lazy-loaded)
- `src/content.ts` — shared copy (guard list, links). Keep in sync with the root README
- `src/site.css` — shell and page styles; `src/index.css` — playground styles
- `src/components/demos/` — one demo component per feature
- `src/components/LiveLogger.tsx` — shows threat events as they happen (`HydeSecurity.on('*')`)
- `src/components/FeatureCard.tsx` — card wrapper used by each demo
