# Atelier installer

Static, client-side page that generates, per OS, a copy-paste one-liner AND a downloadable
launcher — both fetch the hosted bootstrap. No backend, no keys stored.

## Pieces
- `index.html` / `generate.js` / `runtimes.js` — the page (collects keys, emits both modes).
- `install/bootstrap.sh` / `install/bootstrap.ps1` (repo root) — the install logic, no keys.

## Hosting
- Page: GitHub Pages serves `docs/` (Settings → Pages → main branch, `/docs`), URL
  `https://<org>.github.io/atelier/installer/`.
- Bootstraps: fetched over `raw.githubusercontent.com/<repo>/<ref>/install/bootstrap.{sh,ps1}`.
  `<repo>`/`<ref>` are set in `generate.js` (page side) and hardcoded in each bootstrap. Before
  the public release, confirm the real repo and pin `<ref>` to a release tag in BOTH places
  (`scripts/preflight-release.mjs` tracks the `REPO_URL`).

## Adding a runtime
1. Verify the Atelier plugin loads on that runtime.
2. Fill claude-style fields in `runtimes.js` + set `verified: true`.
3. Teach both bootstraps to install it.
4. `bun test docs/installer` must pass.

## Release smoke test (manual, required before announcing the URL)
On a clean macOS account AND a clean Windows VM, for BOTH modes:
1. Open the install URL, pick Claude Code, paste real Anthropic + MapTiler + Datawrapper keys.
2. **Copy-paste:** run the one-liner in Terminal (Mac) / PowerShell (Windows). **Download:**
   double-click `atelier-setup.command` (Mac) / `atelier-setup.cmd` (Windows); clear the OS
   warning per the on-page note.
3. Confirm: Bun (+ Node on Windows) + Claude Code install; `~/Atelier` is populated from zip;
   `~/Atelier/.env` holds the keys; a `Launch Atelier` file is created.
4. Double-click `Launch Atelier` → Atelier starts and reads the keys.
5. **Windows native render (validates the produce guard):** produce one native chart
   (chart-native) and one native map (map-native) → they render (do NOT hang). The guard runs
   the Chromium-launching snap steps under **`tsx`** on Windows (Node runtime — avoids the
   Bun+Playwright `chromium.launch()` hang, Bun #15679 — while resolving the snap scripts'
   `.ts`/extensionless imports, which bare `node` cannot), and Remotion under `npx`. `tsx` is a
   pinned devDep installed by the bootstrap's `bun install`. Watch-items to confirm on real
   Windows: (a) the `.cmd` shims (`npx`/`tsx`) resolve — the produce `run` helper uses
   `shell: true` on win32 for this; (b) a username with a space (e.g. `C:\Users\Jean Dupont`)
   doesn't break the Remotion `--props` temp path under `shell:true` — if it does, write props
   into a space-free dir. The Datawrapper path (map-dw / dw-chart) needs no local render and
   works on Windows regardless.
