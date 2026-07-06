# Pre-release checklist — public MIT

Gate for the Sept–Oct 2026 public GitHub release. Items are ordered blocker-first.

## Done
- [x] **LICENSE** — MIT at repo root (the manifest declared MIT but shipped no license text).
- [x] **README** — root README for newsrooms + developers.
- [x] **CI floor** — `bun run check` (typecheck + full test suite) runs on every push/PR (`.github/workflows/ci.yml`). Green on a clean checkout; Datawrapper producer tests self-skip without a token.

## Blockers still open
- [ ] **Scrub the session-URL commit trailers.** Run `scripts/scrub-trailers.sh --yes` on the release branch. DESTRUCTIVE (rewrites every commit hash); do it once, just before the public push. 32 commits affected as of 2026-07-06. Publication rule: no AI-assistant or vendor attribution in any published artifact.
- [ ] **Pin the installer repo URL.** `docs/installer/generate.js` `REPO_URL` is a placeholder (`https://github.com/buriedsignals/atelier.git`) with a `// confirm before public release` TODO. The generated installer's only code-download step is `git clone $REPO_URL`; if it's wrong or the repo is private at launch, the whole non-technical install dies. Confirm the real public URL and add a test that fails on the placeholder.
- [x] **Installer secret hygiene.** The installer no longer writes the API key to `~/.zshrc` (which leaked it into every shell/dotfile-backup). The key lives only in the gitignored `~/Atelier/.env`; the launch command sources it per-session (`set -a && . ./.env && set +a`) — the runtime key still reaches `claude`, without a global-profile leak. (The `.env` export is NOT redundant for the *runtime* key — `claude` reads it from the shell env, not a `.env` — so sourcing at launch, not dropping, was the correct fix.) Installer tests now run in `bun run check`.

## Honesty / scoping
- [ ] Scope the installer's "No terminal needed" and "runtime-agnostic" claims to what is verified: macOS + Claude Code in v1 (codex/gemini/goose are `verified:false` stubs). Recurring launch still needs a terminal — consider shipping a double-clickable launcher `.command`.
- [ ] Confirm no other AI-assistant or vendor attribution in published artifacts (docs, code comments, sample data).
