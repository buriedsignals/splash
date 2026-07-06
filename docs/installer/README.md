# Atelier installer

Static, client-side page that generates a config-baked `atelier-setup.command`. No backend.

## Hosting
GitHub Pages serves `docs/`. In repo Settings → Pages → set source to the `main` branch, `/docs`
folder. The installer is then at `https://<org>.github.io/atelier/installer/`.

## Adding a runtime
1. Verify the Atelier plugin/skill actually loads on that runtime.
2. Fill every field on its `runtimes.js` entry and set `verified: true`.
3. `bun test docs/installer` — the registry + generator tests must pass.

## Release smoke test (manual, required before announcing the URL)
On a clean macOS user account:
1. Open the install URL; confirm each runtime radio sits inline with its label (Claude Code
   selected, the others greyed "coming soon"). Pick Claude Code, paste a real Anthropic key +
   MapTiler + Datawrapper.
2. Download and double-click `atelier-setup.command`.
3. Confirm: Homebrew, Bun, and Claude Code install; `~/Atelier` is cloned; `~/Atelier/.env`
   holds the keys; the final message prints the launch command.
4. Run the launch command and confirm Atelier starts and reads the keys.
