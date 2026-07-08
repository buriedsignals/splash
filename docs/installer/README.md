# Atelier installer

Static, key-free public page → one command → a **local `127.0.0.1` configurator** (Bun) where the
journalist enters keys, verified live, written to `~/Atelier/.env` (chmod 600). No backend, no keys
in the page, the command, or the Downloads folder.

## Pieces
- `index.html` / `commands.js` — the public page (a static key-free command per OS + a key-free download).
- `install/bootstrap.{sh,ps1}` — install the toolchain, then run the configurator.
- `install/configurator.{ts,-core.ts}` — the Bun local server (form, live verification, writes `.env`).

## Flow
1. Public page shows `curl …/bootstrap.sh | bash` (mac) / `irm …/bootstrap.ps1 | iex` (win), or a key-free `.command`/`.cmd`.
2. The bootstrap installs Bun, fetches Atelier (zip), then runs `bun install/configurator.ts`.
3. The configurator opens on `127.0.0.1`, the journalist enters keys (MapTiler / Datawrapper / optional
   Anthropic — blank means the Claude subscription OAuth login). Keys are verified live, then written to
   `~/Atelier/.env` (chmod 600) with the chosen runtime.
4. The bootstrap installs the runtime + deps + Playwright, and drops a local `Launch Atelier` launcher.

## Hosting
- Page: GitHub Pages serves `docs/`. Bootstraps fetched over `raw.githubusercontent.com/<repo>/<ref>/install/`.
- Before public release: confirm the repo + pin `<ref>` to a tag in `commands.js` and both bootstraps.

## Auth
Works with a Claude **subscription** (leave the Anthropic key blank → `claude` does an OAuth browser
login on first launch) OR an **API key** (enter it → verified → written to `.env`).

## Windows
Native (no WSL): Bun + Node + Claude Code install natively; the configurator is Bun (cross-platform).
`chmod 600` is a no-op on NTFS — the `.env` lives in the protected user profile.

## Release smoke test (manual, before announcing the URL)
On a clean macOS account AND a clean Windows VM, both modes:
1. Run the command / double-click the file (clear the OS warning per the on-page note).
2. Confirm Bun (+ Node on Win) install; `~/Atelier` populated from zip; the **configurator opens**.
3. Enter keys → they verify live → `.env` (600) + `.atelier-runtime` written.
4. Claude Code + deps + Playwright install; `Launch Atelier` created; double-click → Atelier starts.
5. Windows native render (chart-native + map-native) does NOT hang (tsx guard, inherited).
