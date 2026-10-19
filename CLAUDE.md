# CLAUDE.md

Context and rules for AI assistants working on this repo. Deeper docs live in `docs/`:

- `docs/ARCHITECTURE.md` — how the library is put together, module-by-module API map, how to write a module
- `docs/KNOWN_ISSUES.md` — open limits and what has been fixed
- `docs/V2_PLAN.md` — v2 design and the research behind each guard
- `docs/MIGRATION-v2.md` — v1 → v2 breaking changes

## Git workflow (must follow)

1. **Never commit directly to `main`.** Start every task on a new branch
   (`feature/...`, `fix/...`, `docs/...`, `chore/...`).
2. Commit and push work to that branch only.
3. **Do not merge into `main` until the owner explicitly says "merge to main".**
   The owner usually merges manually. Only when told, merge the branch into `main`.
4. Commit messages end with the attribution line from the session reminder.

## What this project is

**HydeSecurityJS** (`@tirth1107/hyde-security-js`, v2.0.0, MIT) — a client-side security
layer for web apps. v2 guards: scriptGuard (supply chain / PCI DSS 6.4.3 & 11.6.1),
skimmerGuard (Magecart), networkFirewall, clipboardGuard (ClickFix), agentShield (AI-agent
prompt injection), phishingGuard, messageGuard, prototypeGuard, Trusted Types, passkeys (PRF),
securityAudit, reporting, lockdown. Plus v1 helpers (Web Crypto encryption, storage,
sanitize, CSP, sessions...) and deterrents (anti-devtools/copy/print...). React lives in `/react`.

Client-side code can be bypassed by whoever controls the browser. The library defends the
page and its users against code that shouldn't be there. Docs must stay honest about limits.

## Layout

```
src/
  index.ts            # `HydeSecurity` API + named exports (no React)
  react.ts            # `/react` entry: Provider + hooks (+ re-exports HydeSecurity)
  globals.d.ts        # `__HYDE_VERSION__`, injected from package.json at build time
  core/               # events (threat bus), hooks (safe patching), callsite, dom, encoding, sha256, config
  modules/            # One file per feature (~45) + react/
  __tests__/          # Vitest + jsdom (core, modules, react, v2/)
tests/browser/        # Real-browser smoke test (puppeteer-core, Chrome/Firefox, two origins)
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
| Browser tests | `npm run build && npm run test:browser` (add `-- firefox`) |
| Type-check | `npm run type-check` |
| Demo website | `cd website && npm run dev` (build: `npm run build:website`) |

Notes:
- The owner uses this repo from both Windows and Linux (same drive). `node_modules`
  holds native binaries for **both** (`@rollup/*`, `@esbuild/*`, and in `website/`
  `@rolldown/binding-*`, `lightningcss-*`). A plain `npm install` on one OS deletes
  the other OS's binaries — back them up and copy them back afterwards, or ask first.
- Before pushing: `npx vitest run`, `npm run type-check`, `npm run lint`, `npm run build`,
  and `npm run test:browser` should all pass.
- Don't `pkill -f "<text>"` with text that appears in your own command line; it kills the
  shell. Use a bracket pattern like `pkill -f "node server[.]mjs"`.

## Conventions

- TypeScript strict, target ES2019, React is an optional peer dependency.
- Modules export a plain object with `enable(opts)` / `disable()` (and `isEnabled()`).
  `enable()` calls `disable()` first, so calling it again reconfigures.
- Report threats only through `createReporter('<module>')` from `core/events`. Never dispatch
  `hyde:threat` by hand.
- Wrap browser APIs only with `core/hooks` (`patchMethod`, `patchSetter`, `PatchGroup`).
- Read security-relevant `document.*` via `core/dom` `safeDom` (clobbering-proof).
- See "Writing a module" in `docs/ARCHITECTURE.md`.
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
