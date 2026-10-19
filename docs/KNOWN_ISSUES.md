# Known Issues

First review: 2026-10-19. Fixed on branch `fix/known-issues` (see CHANGELOG "Unreleased").

## Still open

These need a decision from the owner, usually because fixing them would break
existing users.

- **The main entry imports React.** `src/index.ts` re-exports `HydeSecurityProvider`,
  so the ESM/CJS bundle contains `import 'react'`. A vanilla app without React
  installed can fail to bundle. Fix: export React only from `/react` — a breaking
  change, so save it for v2.0.0.
- **Built-in fallback keys still exist** (`hyde_default_key` for encryption,
  `hyde-default-sign-key` for request signing). They now log a warning. Removing
  them (forcing a key) is a breaking change.
- **PBKDF2 defaults to 1000 iterations** in `encryption.deriveKey()`. Kept for
  compatibility; callers can pass a higher `iterations`. Raise the default in v2.
- **UMD default + named exports**: Rollup warns that UMD users may need
  `HydeSecurity.default`. `window.HydeSecurity` is set directly in `index.ts`, so
  browsers are unaffected.
- **Website bundle is ~1.5 MB** (one chunk). Code-splitting the demos would help.
- **Website lint (`oxlint`) is unchecked on Linux** — its native binary is Windows-only.

## Fixed

| Issue | Fix |
|---|---|
| Tests couldn't run on Linux (Windows-only native binaries) | Added Linux Rollup/esbuild binaries next to the Windows ones |
| `npm run lint` broken (no ESLint) | ESLint 9 + typescript-eslint, `eslint.config.mjs`; lint is clean |
| Uncommitted v1.5.0 work on `main` | Committed on `fix/known-issues` |
| Line-ending noise in ~29 files | `.gitattributes` (`* text=auto eol=lf`) |
| Encryption silently used a public default key | `encryptionKey` config, `setDefaultKey()`, one-time warning |
| `deriveKey()` used a random salt | Fixed default salt → deterministic |
| antiDevtools piled up detector listeners | Listener stored and removed in `disable()` |
| antiDevtools `debugger` trap ran in balanced mode | Strict mode only, or `enableDebuggerTrap` |
| antiDevtools `detect()` always `false` | Tracks the last detector result |
| Provider re-initialized on every render with inline config | Re-inits only when a setting changes; latest callback via ref |
| Website called `init()` twice | Config passed to the Provider only |
| Second `init()` didn't apply new config | `init()` disables first if already initialized |
| domGuard self-heal double-fired / failed silently | Rewritten with a snapshot + a document-wide removal observer |
| networkFirewall double-wrapped `fetch` | `enable()` replaces the old one; `disable()` added; `destroy()` calls it |
| `session.broadcast()` stub | Real method; works before `init()` |
| Network client retried POST/PATCH | Only safe methods retry by default |
| All dependencies bundled into ESM/CJS (1.25 MB) | Dependencies external (~35–50 KB) |
| ESM `.js` treated as CommonJS by Node | Renamed to `.esm.mjs` |
| `./react` export was the same bundle | Own entry `src/react.ts` → `dist/react.*` |
| `getVersion()` hardcoded | Injected from `package.json` |
| Overlay used `innerText` | `textContent` |
| Test setup's `localStorage` mock lacked `key()` | Added |
| `temp.html` / `temp.js` scratch files | Gitignored (kept on disk) |
| Website README was the Vite template | Rewritten |
| Stale `vite.website.config.ts` | Removed; `build:website` runs the website's own build |
| Thin test coverage (25 tests) | 62 tests |
