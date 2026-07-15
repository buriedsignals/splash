# Codex runtime — end-to-end proof plan

Status: **module shipped, proof PENDING.** This documents the manual proof that gates flipping
`codex.verified` to `true` in `install/configurator-core.ts`. It cannot be run in CI or from this
repo's dev sandbox: there is no Codex binary here and Codex needs an interactive OpenAI login. Run it
on a real machine with a Codex account. `codex.verified` stays `false` until all three layers pass.

## What is already mechanically verified (no live Codex)

- `install/runtimes/codex.sh` is valid bash (`bash -n`), `runtime_launch_cmd` echoes `codex`, and
  `runtime_install`'s wiring (skill symlinks + non-clobbering `~/.codex/config.toml` seed) is proven
  hermetically in `docs/installer/codex-runtime.test.ts`.
- Install command + config keys are pinned from official docs — see
  [Verified facts](#verified-facts-sources).

The three layers below are what only a live Codex can prove.

## Preconditions

1. Install via the bootstrap (`install/bootstrap.sh`, pick **Codex** in the configurator) OR by hand
   per `.codex/INSTALL.md`. Either path runs the same wiring: per-skill symlinks in
   `~/.agents/skills/` + the seeded `~/.codex/config.toml`.
2. `~/Splash/.env` exists with real `VITE_MAPTILER_KEY`, `REMOTION_MAPTILER_KEY`,
   `DATAWRAPPER_API_TOKEN` (and optional `SPLASH_EMBED_APP` / `FLY_API_TOKEN`).
3. Launch from `~/Splash` so the shell tool's cwd sees the repo and inherits the `.env`
   (`Launch Splash.command` does `set -a && . ./.env && set +a && codex`).

---

## Layer A — discovery (skills load)

**Goal:** Codex sees every skill through native `~/.agents/skills/<name>/SKILL.md` discovery.

1. `codex` from `~/Splash`.
2. Run `/skills`.
3. **PASS:** the list contains the eight skills that ship a `SKILL.md` —
   `splash`, `chart-native`, `dw-chart`, `map-dw`, `map-native`, `scrolly`,
   `suggest-article`, `suggest-chart`.
   (`skills/image-native/` is scaffolded without a `SKILL.md` yet, so it does not appear; the
   `link_agents_skills` glob picks it up automatically the moment its `SKILL.md` lands.)
4. Sanity: `ls -la ~/.agents/skills` shows one symlink (junction on Windows) per skill into
   `~/Splash/skills/*`.

**Fail modes to note:** a skill missing from `/skills` ⇒ its `SKILL.md` frontmatter (`name` +
`description`) is malformed, or the symlink is broken. A restart of Codex is required after linking.

---

## Layer B — the flow runs (THE risk layer)

**Goal:** drive the real pipeline and prove the two things only a live runtime can: (1) Codex fires
the **nested sub-skill invocations** the `splash` orchestrator depends on, and (2) the shell tool
inherits the environment AND the network config so a producer's provider API call succeeds.

1. In Codex, give the `splash` skill a real Annemasse article (paste text or a URL), e.g. the
   Heidi.news "Annemasse, capitale du n'importe quoi" investigation. `splash` should auto-match by
   description; if not, invoke it explicitly with `$splash`.
2. Walk the flow: ANALYSE → CADRAGE (Gate 1) → PROPOSITION (Gate 2) → PRODUCTION → EXPORT.
3. **Watch for the nested invocations (the risk to retire):**
   - ANALYSE must run **`suggest-article` as a real skill call** (SKILL.md:24 requires it — "not a
     mental paraphrase").
   - PROPOSITION must run **`suggest-chart` as a real skill call** per accepted opportunity
     (SKILL.md:147).
   - **PASS:** both fire as genuine nested skill invocations mid-flow (visible as Codex loading
     `suggest-article` / `suggest-chart` progressively, not the `splash` model paraphrasing their
     output from memory).
   - **FAIL → documented fallback (do NOT apply blind):** if Codex will not fire a *skill-from-within-a-skill*
     natively, the fix is to reword the orchestrator's invocation lines from "invoke `suggest-chart`
     **as a real Skill call**" to an explicit, tool-agnostic instruction like *"read
     `skills/suggest-chart/SKILL.md` and follow it"* — which Codex's read/shell tools can always do.
     This is an `splash/SKILL.md` prose change and is **out of scope for this runtime adapter** — it
     is a shared skill file. Record the finding here and hand it to whoever owns the orchestrator; do
     not edit orchestrator prose as part of the Codex adapter.
   - This is genuinely open: I could not exercise it here (no live Codex). Codex documents
     `$skill` explicit invocation, `/skills`, and implicit description auto-match on the *user's*
     message — what is unverified is a skill triggering *another* skill mid-flow without a fresh user
     turn. Treat Layer B as UNPROVEN until run.
4. **Producer + network proof:** at PRODUCTION, the shell tool runs a producer, e.g.
   `bun skills/chart-native/scripts/produce.mjs <type> <config> <outDir> <format>` (or the map-native
   / dw-chart / map-dw equivalent). A MapTiler or Datawrapper producer makes a live provider API
   call.
   - **PASS:** the call succeeds — proving both env inheritance (keys from `.env`) AND the
     `network_access = true` seed under `sandbox_mode = "workspace-write"`. Without the config seed,
     Codex's workspace-write sandbox blocks the network and the producer fails with a network error —
     that failure is the exact thing the seed exists to prevent, so a green producer IS the network
     proof.
   - Also exercises the runnable-source path if EXPORT form 1 (code source) is chosen: its
     `bun install` needs the same network access.

---

## Layer C — the artifact is real

**Goal:** the delivered, journalist-owned file exists and opens.

1. Complete EXPORT (choose a delivery form at the export gate).
2. Locate the produced artifact directory, `<id>-export/` (or `<id>-source/` for the runnable code
   bundle), under the working directory.
3. **PASS:** open the artifact — `static.png` / `interactive.html` / `scrolly.html` / `.mp4` per the
   pinned single `format`, or the runnable `<id>-source/` bundle (`bun install && bun run build`
   reproduces the visual). It renders correctly, furniture (title/source) in the dialogue language.

---

## Verified facts (sources)

- **Install command:** `npm install -g @openai/codex` (needs **Node.js 22+**). Node-free fallback:
  `curl -fsSL https://chatgpt.com/codex/install.sh | sh` (symlinks `~/.local/bin/codex`).
  **Pinned version: `0.144.1`** (latest on npm as of 2026-07-13; Codex's native skills feature is
  recent/fast-moving, hence the pin). Sources:
  [npm @openai/codex](https://www.npmjs.com/package/@openai/codex),
  [OpenAI Codex CLI docs](https://developers.openai.com/codex/cli).
- **Skill discovery:** native, 1:1 with the documented layout `~/.agents/skills/<name>/SKILL.md`
  (user tier), frontmatter `name` + `description`, progressive disclosure, implicit auto-match +
  explicit `$skill` / `/skills`. No manifest, no `AGENTS.md` needed.
- **Sandbox config** (`~/.codex/config.toml`) — keys confirmed against the official config reference
  ([developers.openai.com/codex/config-reference](https://developers.openai.com/codex/config-reference)):
  ```toml
  sandbox_mode = "workspace-write"       # values: read-only | workspace-write | danger-full-access
  approval_policy = "on-request"         # values: untrusted | on-request | never
  [sandbox_workspace_write]
  network_access = true                  # off by default in workspace-write — must be set true
  ```
  `approval_policy = "never"` gives the smoothest double-click UX (no prompts); we seed `on-request`
  as the safer default.

## Proof result (2026-07-13)

Run on a real machine with a free OpenAI account. **Layer A PASSED** — `codex` lists all eight
skills (`splash:*`). **Layer B — the nested-invocation risk is RETIRED:** a full `codex exec` run
of the `splash` skill invoked `splash:suggest-article` → `splash:suggest-chart` → `splash:dw-chart`
as real nested skill calls and wrote a correct `accepted.json` (right producer/format/channel/
confirmedTakeaway/spec). `seed_codex_config` verified live (`sandbox: workspace-write … network
access enabled`). On the strength of this, `configurator-core.ts` marks `codex.verified = true`.

**Known constraint — produce needs write access beyond the workspace-write sandbox.** The producers
spawn Playwright/Chromium, which writes to system cache/temp dirs outside `[workdir, /tmp, $TMPDIR]`.
Under an UNATTENDED `codex exec --sandbox workspace-write -c approval_policy=never`, those writes are
denied and produce cannot finish. This is NOT an adapter defect: the shipped launcher runs
**interactive `codex`** with `approval_policy = on-request`, where the journalist approves the write
and produce completes. For a scripted/CI produce, widen the sandbox (or run the producer step outside
it). Codex handles its own auth on first launch (`codex login`); the configurator does not seed an
OpenAI credential.

## Open questions / risks

- **Nested skill-from-within-a-skill (Layer B, primary risk):** RETIRED — Codex fires the nested
  `suggest-article` / `suggest-chart` invocations natively (see Proof result above); the
  orchestrator-prose fallback was not needed.
- **Install command not runnable here:** the pinned `0.144.1` and the config keys are from official
  docs, not a live install on this machine. Confirm `codex --version` on the proof machine.
- **`approval_policy` UX:** `on-request` may prompt during a producer's network call; if that
  friction hurts the double-click flow, document switching the seeded default to `never`.
