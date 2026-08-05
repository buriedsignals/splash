# Pre-release checklist — public MIT

Gate for the Sept–Oct 2026 public GitHub release. Items are ordered blocker-first.

**Run `bun run release:check`** (`scripts/preflight-release.mjs`) — it mechanically verifies the
blockers below (LICENSE, README, REPO_URL confirmed, no session-URL trailers, `.env` untracked) and
exits non-zero until they're clear. It is deliberately NOT part of `bun run check` (that stays green
during dev; this one is expected to fail until release prep is done).

## Done
- [x] **LICENSE** — MIT at repo root (the manifest declared MIT but shipped no license text).
- [x] **README** — root README for newsrooms + developers.
- [x] **CI floor** — `bun run check` (typecheck + full test suite) runs on every push/PR (`.github/workflows/ci.yml`). Green on a clean checkout; Datawrapper producer tests self-skip without a token.

## Blockers still open
- [ ] **Scrub the session-URL commit trailers.** Run `scripts/scrub-trailers.sh --yes` on the release branch. DESTRUCTIVE (rewrites every commit hash); do it once, just before the public push. 32 commits affected as of 2026-07-06. Publication rule: no AI-assistant or vendor attribution in any published artifact.
- [ ] **Pin the installer repo URL.** `docs/installer/generate.js` `REPO_URL` still carries a `// confirm before public release` TODO. The generated installer's only code-download step is `git clone $REPO_URL`; if it's wrong or the repo is private at launch, the whole non-technical install dies. Set the real public URL and remove that note — `bun run release:check` fails until you do (it keys on the TODO marker, so the org name may legitimately stay as-is).
- [x] **Installer secret hygiene.** The installer no longer writes the API key to `~/.zshrc` (which leaked it into every shell/dotfile-backup). The key lives only in the gitignored `~/Splash/.env`; the launch command sources it per-session (`set -a && . ./.env && set +a`) — the runtime key still reaches `claude`, without a global-profile leak. (The `.env` export is NOT redundant for the *runtime* key — `claude` reads it from the shell env, not a `.env` — so sourcing at launch, not dropping, was the correct fix.) Installer tests now run in `bun run check`.

## Honesty / scoping
- [x] **Claims re-scoped to what is measured — and the item was wrong in BOTH directions.**
      It said "macOS + Claude Code in v1 (codex/gemini/goose are `verified:false` stubs)". Measured
      2026-08-04 in `install/configurator-core.ts`: **claude, codex, gemini and goose are all
      `verified: true`**; the two that are not are `goose-desktop` and `claude-desktop`. The item
      UNDERSOLD what works.
      It also said "consider shipping a double-clickable launcher `.command`" — **it exists**
      (`install/bootstrap.sh`, and a `.cmd` on Windows). What is true, and what the public claims
      must now say: **no command to type to USE it; one terminal moment to INSTALL it.**
      Windows reached payload parity the same day (E10/B6), so "runtime-agnostic" is no longer a
      macOS-only claim either.
- [x] **No assistant attribution in published artifacts — and it is now a RELEASE CHECK, not a sweep.**
      A sweep is true on the day it runs; the rule is permanent, so `bun run release:check` gained
      `no assistant attribution in tracked files`. It found what a sweep would have missed: **one
      real session URL in five plan files**, plus 26 quoted `Co-Authored-By` examples — 31 files in
      all, cleaned. The pattern is deliberately narrow: it hunts a claim about WHO WROTE THIS (a
      session URL, an authorship trailer, a "generated with" badge), never the mention of a runtime
      — "Claude Code" is a supported host with its own module and docs, and forbidding its name
      would forbid saying what the tool runs on.
      ⚠️ The checker excludes ITSELF by name, because its own regex necessarily contains the
      patterns it hunts. Without that it reports itself forever, and a guard that always fires is a
      guard that gets ignored.
