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
  core/               # config.ts (types + defaults), logger.ts, utils.ts
  modules/            # One file per feature (33 modules) + react/ (Provider + hook)
  __tests__/          # Vitest + jsdom tests (core, modules, react)
examples/             # Manual test pages (full-test.html/js, vanilla, react)
website/              # Separate Vite + React 19 demo site (own package.json)
dist/                 # Build output (gitignored)
temp.html, temp.js    # Untracked scratch files (temp.html is UTF-16) — not part of the lib
```

## Commands

| Task | Command |
|---|---|
| Build library (ESM/UMD/CJS + .d.ts) | `npm run build` |
| Dev server (opens `examples/full-test.html`) | `npm run dev` |
| Tests | `npm test` (watch) / `npx vitest run` (once) |
| Type-check | `npm run type-check` |
| Demo website | `cd website && npm install && npm run dev` |

Notes:
- `node_modules` was installed on Windows. On Linux, Vite/Vitest fail with
  `Cannot find module '@rollup/rollup-linux-x64-gnu'`. Fix by reinstalling
  (`rm -rf node_modules && npm install`) — ask the owner first.
- `npm run lint` references ESLint, but ESLint is not installed or configured.
- Type-check currently passes.

## Conventions

- TypeScript strict, target ES2019, React is an optional peer dependency.
- Modules export a plain object (`export const antiCopy = { enable, disable }`) or
  functions. Toggleable modules use module-level state and `enable()/disable()`.
- Threats are reported via `onThreat(ev: HydeSecurityEvent)` and/or a
  `document` `CustomEvent('hyde:threat')`.
- Guard browser APIs with `typeof window/document === 'undefined'` for SSR.
- New modules: add the file in `src/modules/`, import and register it in
  `HydeSecurity.modules` in `src/index.ts`, document it in README + CHANGELOG.
- Version number lives in three places: `package.json`, `getVersion()` in
  `src/index.ts`, and the README title. Keep them in sync.
- Line endings are mixed (CRLF in the working copy, LF in git); many files show
  as "modified" only because of this. Use `git diff --ignore-cr-at-eol` to see real changes.
