# HydeSecurity JS — Demo Website

Interactive dashboard that shows every HydeSecurity feature working live.
Built with Vite + React 19 + TypeScript.

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
| `npm run lint` | Lint with oxlint |

From the repo root, `npm run build:website` runs the same build.

## Layout

- `src/App.tsx` — dashboard shell, sidebar categories, `HydeSecurityProvider` setup
- `src/components/demos/` — one demo component per feature
- `src/components/LiveLogger.tsx` — shows `hyde:threat` events as they happen
- `src/components/FeatureCard.tsx` — card wrapper used by each demo
