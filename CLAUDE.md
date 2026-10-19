# CLAUDE.md

Context and rules for AI assistants working on this repo. Deeper docs live in `docs/`:

- `docs/ARCHITECTURE.md` — how the library is put together, module-by-module API map
- `docs/KNOWN_ISSUES.md` — bugs, risks and tech debt found so far

## Git workflow (must follow)

1. **Never commit directly to `main`.** Start every task on a new branch
   (`feature/...`, `fix/...`, `docs/...`, `chore/...`).
2. Commit and push work to that branch only.
3. **Do not merge into `main` until the owner explicitly says "merge to main".**
   The owner usually merges manually. Only when told, merge the branch into `main`.
4. Commit messages end with the attribution line from the session reminder.

## What this project is

**HydeSecurityJS** (`@tirth1107/hyde-security-js`, v1.5.0, MIT) — a client-side
deterrence and security-helper library for web apps. Anti-devtools, anti-copy/print/
screenshot, XSS sanitizing, AES encryption, secure storage/cookies, sessions, bot
detection, DOM tamper guard, CSRF/CSP helpers, network firewall, plus a React provider.

It is *deterrence*, not real security: everything runs in the browser and can be
bypassed. Docs and README must keep saying "pair with server-side validation".

## Layout

```
src/
  index.ts            # Public API object `HydeSecurity` (init/enableAll/disableAll/...)
  react.ts            # `/react` entry: Provider + hook (+ re-exports HydeSecurity)
  globals.d.ts        # `__HYDE_VERSION__`, injected from package.json at build time
  core/               # config.ts (types + defaults), logger.ts, utils.ts
  modules/            # One file per feature (33 modules) + react/ (Provider + hook)
  __tests__/          # Vitest + jsdom tests (core, modules, react)
examples/             # Manual test pages (full-test.html/js, vanilla, react)
website/              # Separate Vite + React 19 demo site (own package.json)
dist/                 # Build output (gitignored)
temp.html, temp.js    # Local scratch files, gitignored — not part of the lib
```

## Commands

| Task | Command |
|---|---|
| Build library (ESM/CJS + UMD + .d.ts) | `npm run build` |
| Lint | `npm run lint` (ESLint 9, `eslint.config.mjs`) |
| Dev server (opens `examples/full-test.html`) | `npm run dev` |
| Tests | `npm test` (watch) / `npx vitest run` (once) |
| Type-check | `npm run type-check` |
| Demo website | `cd website && npm run dev` (build: `npm run build:website`) |

Notes:
- The owner uses this repo from both Windows and Linux (same drive). `node_modules`
  holds native binaries for **both** (`@rollup/*`, `@esbuild/*`, and in `website/`
  `@rolldown/binding-*`, `lightningcss-*`). A plain `npm install` on one OS deletes
  the other OS's binaries — back them up and copy them back afterwards, or ask first.
- Before pushing: `npx vitest run`, `npm run type-check`, `npm run lint`, `npm run build`
  should all pass.

## Conventions

- TypeScript strict, target ES2019, React is an optional peer dependency.
- Modules export a plain object (`export const antiCopy = { enable, disable }`) or
  functions. Toggleable modules use module-level state and `enable()/disable()`.
- Threats are reported via `onThreat(ev: HydeSecurityEvent)` and/or a
  `document` `CustomEvent('hyde:threat')`.
- Guard browser APIs with `typeof window/document === 'undefined'` for SSR.
- New modules: add the file in `src/modules/`, import and register it in
  `HydeSecurity.modules` in `src/index.ts`, document it in README + CHANGELOG.
- Version: bump `package.json` (and the README title). `getVersion()` reads it
  automatically through the `__HYDE_VERSION__` define.
- `.gitattributes` stores text files with LF. Editors on Windows may still write CRLF;
  git normalizes on commit.
- ESM/CJS builds keep `dependencies` external; only the UMD bundle includes them.
  New runtime deps go in `dependencies`, not `devDependencies`.
- Add or update tests in `src/__tests__/` with every fix or new module.
