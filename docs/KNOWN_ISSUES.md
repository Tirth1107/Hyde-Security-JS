# Known Issues

Found while reviewing the code on 2026-10-19. Not yet fixed — each needs its own branch.

## Environment

- **Tests can't run on Linux right now.** `node_modules` came from Windows, so the
  native Rollup binary is missing (`@rollup/rollup-linux-x64-gnu`). Reinstall to fix.
- **`npm run lint` is broken** — ESLint isn't a dependency and there's no config.
- **Big uncommitted work on `main`** (as of this review): the v1.5.0 modules
  (`biometrics`, `antiClickjacking`, `networkFirewall`), the new React website,
  and edits to `domGuard`, `antiDevtools`, README, CHANGELOG. About 29 other files
  differ only by line endings.

## Bugs / risks in the library

- **`encryption` uses a hardcoded default key** (`'hyde_default_key'`). Anything
  encrypted without a key is effectively plaintext. Consider requiring a key or warning.
- **`antiDevtools` adds a new `devtools-detector` listener on every `enable()`** and never
  removes it; after `setMode()` or Provider re-mounts, listeners pile up and fire
  multiple times.
- **`antiDevtools` runs a `debugger` statement every 1.5s** — freezes the page for
  anyone with DevTools open, including the app's own developers in `balanced` mode.
- **`HydeSecurityProvider` re-inits whenever the `config` object changes identity.**
  An inline `config={{...}}` re-creates it every render → destroy/init loop.
  Also `useHydeSecurity().init` in the website calls `init` a second time.
- **`domGuard` self-healing** stores the parent and sibling once; if the parent is
  replaced, healing silently fails. The two observers can both fire on one removal.
- **`networkFirewall.enable()`** can be called twice and wraps `fetch` twice; the
  restore function from the first call then puts back the wrapper, not the original.
- **`session.broadcast()`** is an empty stub.
- **`getVersion()` is hardcoded** and must be bumped by hand alongside `package.json`.
- **`./react` export** is the same bundle as the main entry, so importing from
  `/react` doesn't tree-shake anything; fine but misleading.

## Repo hygiene

- `temp.html` (UTF-16) and `temp.js` are scratch files at the root.
- `website/README.md` is the default Vite template README.
- `vite.website.config.ts` is from the old static site; the new website has its own config.
- Test coverage is thin: only config, antiDevtools, encryption, sanitize, storage and the Provider.
