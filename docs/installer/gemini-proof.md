# Gemini CLI runtime adapter — end-to-end proof plan

This adapter surfaces Splash to **Gemini CLI** via its **native Agent Skills** system (the same
open standard Claude Code and Codex use), NOT the legacy `GEMINI.md` @-include context bridge that
the old viznews adapter used. The real end-to-end proof cannot be run in the build sandbox (no
Gemini CLI, no interactive TTY, no provider login), so this is the runbook to execute on a machine
with the CLI installed. The hermetic parts (module contract + symlink wiring + manifest validity)
ARE covered mechanically in `docs/installer/gemini-runtime.test.ts` and run in `bun run check`.

## Verified facts (research, July 2026)

- **Install command:** `npm install -g @google/gemini-cli` (official). This adapter installs it
  **Bun-first** — `bun add -g @google/gemini-cli@0.50.0` — to honour the never-npm toolchain rule;
  Bun installs the npm package and links the `gemini` bin into `~/.bun/bin` (already on PATH from
  bootstrap step 1). Source: <https://geminicli.com/docs/get-started/installation/>.
- **Pinned version:** `0.50.0` (latest on the npm registry at build time).
  `bin` = `{ "gemini": "bundle/gemini.js" }`, `engines` = `{ "node": ">=20" }`.
  Source: `https://registry.npmjs.org/@google/gemini-cli/latest`.
- **Skill discovery tiers (ascending precedence):** built-in → extension → **user
  (`~/.gemini/skills` OR `~/.agents/skills`)** → workspace (`.gemini/skills` OR `.agents/skills`).
  Gemini reads `~/.agents/skills` — the exact dir the shared `link_agents_skills` helper populates
  — so the shared symlink helper already serves Gemini. Within a tier, `.agents/skills` wins over
  `.gemini/skills`. Source: <https://geminicli.com/docs/cli/skills/>.
- **Skill management:** `/skills list [all] [nodesc] | link | disable | enable | reload`
  (terminal: `gemini skills list|install|uninstall`). Source: same page.
- **Extension manifest schema** (`gemini-extension.json`): required = `name`, `version`; optional =
  `description`, `contextFileName` (defaults to `GEMINI.md` if present), `mcpServers`,
  `excludeTools`, `settings`, `migratedTo`, `plan`, `themes`. `name` must be lowercase/digits/dashes
  and should match the directory name. Source:
  <https://geminicli.com/docs/extensions/reference/>. We ship `name`+`version`+`description` and
  deliberately OMIT `contextFileName` (see below).

## What ships in this adapter

| File | Role |
|---|---|
| `install/runtimes/gemini.sh` | macOS/Linux module — `runtime_install` (Bun-first CLI install → `link_agents_skills`) + `runtime_launch_cmd` → `gemini`. |
| `install/runtimes/gemini.ps1` | Windows mirror — `Runtime-Install` + `Runtime-LaunchCmd`. |
| `gemini-extension.json` | Distribution-parity manifest (name/version/description). |
| `docs/installer/gemini-runtime.test.ts` | Hermetic tests (bash-valid, launch cmd, mocked-install symlink wiring, manifest validity, ps1 parity). |

**Two surfacing routes, symlink is primary:** `link_agents_skills` symlinks each `skills/*/` dir
into `~/.agents/skills/<name>` — Gemini picks them up as user-tier skills with zero extra config.
The `gemini-extension.json` is the secondary route (for `gemini extensions install <repo>`, where
Gemini auto-discovers the extension's `skills/` subdir); we do NOT call `gemini extensions install`
at bootstrap time because it needs a published repo and a working CLI, whereas the symlink route
works locally with neither.

**Why no `contextFileName`:** the legacy viznews adapter set `contextFileName: GEMINI.md` with a
GEMINI.md that had a dangling `@`-include. Native Agent Skills make the context bridge unnecessary,
so we omit `contextFileName` entirely — no GEMINI.md, no dangling include.

---

## Proof runbook (run on a real machine with Gemini CLI)

### Layer A — discovery: `/skills list` shows Splash's skills

1. Run the bootstrap (or, minimally, `bun add -g @google/gemini-cli@0.50.0` then
   `link_agents_skills` with `DEST` = the Splash checkout).
2. Launch `gemini`; run `/skills list`.
3. **Expect:** the following skills appear (dir name == frontmatter `name`, verified):
   `splash, chart-native, dw-chart, map-dw, map-native, scrolly, suggest-article, suggest-chart`
   — **8 skills**.

   > ⚠️ **9-vs-8 note.** The task brief and the Splash CLAUDE.md reference **9** skills incl.
   > `image-native`. As of this branch (seam commit `b117007`) `skills/image-native/` is scaffolded
   > (`src/`, `tests/`, `package.json`) but has **no `SKILL.md` yet**, so Gemini will not list it.
   > `link_agents_skills` globs `skills/*/`, so it symlinks `image-native` too and the skill will
   > appear the moment its `SKILL.md` lands — no adapter change needed. Treat "shows all skills" as
   > "shows every skill that has a `SKILL.md`" (8 today, 9 once image-native ships one).

4. **RISK — unknown-frontmatter-key tolerance.** `skills/dw-chart/SKILL.md` and
   `skills/map-dw/SKILL.md` carry a non-standard frontmatter key `output_mode`
   (`interactive+static`, `single-format (static | interactive)`). Gemini's docs specify only
   `name`+`description`; the Agent Skills open standard ignores unknown keys, and the two values are
   valid YAML plain scalars, so the **expected** behaviour is that Gemini ignores `output_mode` and
   still lists both skills. **VERIFY at Layer A:** confirm `dw-chart` AND `map-dw` both appear in
   `/skills list`. Malformed frontmatter *silently skips* a skill in Gemini, so a missing dw-chart
   or map-dw here is the signal that the extra key was rejected. **Mitigation if rejected:** move
   `output_mode` out of frontmatter into the SKILL.md body (owned by the skills, not this adapter —
   flag it, don't edit here).

### Layer B — orchestration: real Annemasse article → produced artifact

1. In `gemini`, invoke the `splash` skill on a real Annemasse article (+ data).
2. It sequences ANALYSE → CADRAGE → PROPOSITION → PRODUCTION → EXPORT, invoking `suggest-article`
   then `suggest-chart` as **nested** skill calls, then shelling out to `bun scripts/produce.mjs`.
3. **Expect:** a provider API call succeeds; a `<id>-export/` artifact is produced.
4. Findings to record (the Gemini-specific risks to retire):

   - **RISK — nested skill invocation (THE risk to retire).** Gemini activates skills through the
     model-only `activate_skill` tool ("used exclusively by the Gemini agent. You cannot invoke
     this tool manually" — <https://geminicli.com/docs/tools/activate-skill/>). Whether the model,
     *while inside* the `splash` skill, fires a fresh `activate_skill` for `suggest-article` then
     `suggest-chart` is unproven on the real CLI. **Verify:** watch for two nested activations mid-
     flow. If Gemini does NOT auto-nest, the fallback is that `splash`'s SKILL.md instructs the
     model to activate the sub-skills by name (prose the orchestrator owns — out of scope here).

   - **RISK — consent-gated activation.** `activate_skill` runs in **ASK_USER mode**: every
     activation shows a confirmation prompt with the skill's **name, purpose, and the directory path
     it will gain access to** (issue #15688 / PR #15725; docs/cli/skills). In the **interactive**
     `gemini` session the launcher opens, this is answerable in the TUI — it does **not** block a
     double-click/zero-terminal flow, but it adds one approval click **per distinct skill**
     (`splash`, then `suggest-article`, then `suggest-chart`, then a producer skill). **Document
     the count of prompts** the real flow raises. To make it truly zero-touch (or for scripted
     runs) the launcher would need an auto-approve flag (see headless below) — a follow-up decision,
     not shipped here (the launcher runs plain interactive `gemini`).

   - **RISK — headless auto-activation.** Headless mode triggers on a non-TTY env or the
     `-p`/`--prompt` flag; auto-approval uses `-y` (e.g. `gemini --sandbox -y -p "…"`). Reliable
     autonomous skill activation in `-p` runs was a known gap (issue #15688, since implemented via
     PR #15725) — **verify** a `-y -p` run actually activates `splash` end-to-end before relying on
     headless. The Splash launcher uses **interactive** `gemini` (not `-p`), so this does not gate
     the primary flow, but record the result for any future scripted/CI path.

### Layer C — the delivered artifact

1. Open the real `<id>-export/` produced in Layer B.
2. **Expect:** the chosen export form is present and correct (e.g. runnable React source bundle /
   self-contained HTML / embed URL) — validate the *delivered* artifact, not the build proof.

---

## Risk register (summary)

| Risk | Status | Where retired |
|---|---|---|
| Gemini reads `~/.agents/skills` | ✅ confirmed (docs) | Layer A |
| Install command + pinned version | ✅ `bun add -g @google/gemini-cli@0.50.0` (npm equiv verified) | mechanical test |
| Symlink wiring populates `~/.agents/skills` | ✅ hermetic test (mocked install) | `gemini-runtime.test.ts` |
| Manifest schema (`gemini-extension.json`) | ✅ verified fields, no dangling include | `gemini-runtime.test.ts` |
| Unknown frontmatter key (`output_mode`) tolerated | ⏳ verify on real CLI | Layer A |
| Nested skill invocation (`splash` → sub-skills) | ⏳ verify on real CLI | Layer B |
| Consent-gated activation blocks zero-terminal flow | ⏳ verify prompt count (interactive: non-blocking, expected) | Layer B |
| Headless `-p` auto-activation | ⏳ verify (not on primary path) | Layer B |
| Node 20+ runtime dependency (bootstrap.sh installs only Bun on macOS/Linux) | ⏳ document / decide | see below |
| 9th skill (`image-native`) has no SKILL.md yet | ✅ self-correcting (helper globs `skills/*/`) | Layer A note |

**Node runtime dependency (macOS/Linux).** `gemini`'s bin has a `#!/usr/bin/env node` shebang and
requires **Node ≥20** to *run*, even when installed via `bun add -g`. `bootstrap.sh` installs only
Bun on macOS/Linux (it installs Node only on Windows, for Playwright/Remotion). So on a Node-less
mac the CLI installs but won't launch; the module's guidance names the Node requirement. This is an
inherent property of the Gemini runtime (not a bug in this adapter). It kept `gemini.verified`
false through the proof; the flag was later flipped to `true` by product decision (see the Verdict
below) — the Node requirement still holds, so a Node-less mac cannot run it.

## Proof result (2026-07-13) — Layer A PASS, Layer B blocked by the free tier

Run on a real mac (Node v20.19.0 present).

- **Layer A PASSED, auth-free:** `gemini skills list` shows all 8 skills `[Enabled]` from
  `~/.agents/skills`. This also RETIRES the `output_mode` risk — `dw-chart` and `map-dw` (which carry
  that non-standard frontmatter key) are both `[Enabled]`, so Gemini's parser tolerates unknown keys.
- **Auth is high-friction on a free Google account** (vs Codex, which just worked):
  1. The OAuth "Login with Google" is **dead for individuals** — `IneligibleTierError: … migrate to
     the Antigravity suite` (Google deprecated Code Assist for individuals).
  2. A free **AI Studio API key** works (new format `AQ.…`, not `AIza…`) but the Gemini API must be
     **enabled on its GCP project** first (`console.developers.google.com/apis/api/generativelanguage`).
  3. **Gotcha:** a stale `selectedType: "oauth-personal"` left in `~/.gemini/settings.json` by the
     failed login forces the deprecated Code Assist path even when `GEMINI_API_KEY` is set. Fix:
     `~/.gemini/settings.json` → `security.auth.selectedType = "gemini-api-key"` (+ `GEMINI_API_KEY`,
     `GOOGLE_CLOUD_PROJECT`). Only then does `gemini -p` authenticate (verified with a `PONG` probe).
- **Layer B BLOCKED — free-tier quota, not an adapter defect:** driving the full `splash` flow via
  `gemini -p … -y` died immediately with `TerminalQuotaError` — the free tier caps at **20
  requests/day** and 250k input tokens, and the splash flow (large SKILL.md + sub-skill bodies over
  many turns) needs far more. It never reached nested skill invocation. Proving Gemini's orchestration
  therefore needs a **paid Gemini API tier**.

**Verdict:** the adapter MECHANICS are proven (discovery + auth path). Gemini's orchestration
(Layer B) is NOT proven — the free tier's quota blocked it before nested invocation, unlike Codex
(proven end-to-end). For Splash's small-newsroom target, Codex is the working free runtime; Gemini
needs Node + a painful auth setup + a paid tier.

**`configurator-core.ts` sets `gemini.verified = true` by product decision (2026-07-13)**, ahead of
a Layer-B pass — a deliberate override, NOT a claim that the orchestration is proven. To retire the
gap, re-run Layer B on a paid Gemini key and confirm nested `suggest-article`→`suggest-chart`
invocation fires; until then Gemini is selectable but its end-to-end flow is unverified on the free
tier.
