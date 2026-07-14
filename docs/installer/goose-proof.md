# Goose runtime adapter — proof plan + result

This adapter surfaces Atelier to **Goose** (Block's open-source, model-agnostic CLI agent) via its
**native Agent Skills** system — the same `~/.agents/skills/<name>/SKILL.md` open standard Codex and
Gemini use. So the shared `link_agents_skills` helper (defined by `bootstrap.sh`) already serves
Goose with zero extra wiring. The hermetic parts (module contract + symlink wiring) are covered in
`docs/installer/goose-runtime.test.ts` and run in `bun run check`.

## Verified facts (research + live, July 2026)

- **Install:** `curl -fsSL https://github.com/block/goose/releases/download/stable/download_cli.sh | CONFIGURE=false bash`
  — a Rust binary, **no npm, no Node** (like Codex, unlike Gemini). Drops `goose` in `~/.local/bin`.
  `CONFIGURE=false` skips the interactive LLM-provider prompt during install.
  Source: <https://block.github.io/goose/docs/getting-started/installation>.
- **Skill discovery:** global `~/.agents/skills/<name>/SKILL.md` (also `.agents/skills/` per-project;
  backward-compat `.claude/skills`, `~/.claude/skills`, `.goose/skills`). Auto-discovered at startup;
  `goose skills list` lists them. Source: <https://goose-docs.ai/docs/guides/context-engineering/using-skills/>.
- **Launcher:** `goose session` (interactive chat; alias `goose s`). `goose run` is the
  non-interactive mode (for scripted Layer B). `goose configure` sets the LLM provider + key.
- **Model-agnostic:** Goose has no built-in provider; the journalist configures one (`goose
  configure`), so this adapter bakes no provider key.

## What ships

| File | Role |
|---|---|
| `install/runtimes/goose.sh` | macOS/Linux module — `runtime_install` (curl installer → `link_agents_skills`) + `runtime_launch_cmd` → `goose session`. |
| `install/runtimes/goose.ps1` | Windows mirror — requires a pre-installed goose (the curl installer is Unix-only) then wires discovery. |
| `docs/installer/goose-runtime.test.ts` | Hermetic tests (bash-valid, launch cmd, symlink wiring with the CLI install stubbed, ps1 parity). |

## Proof result (2026-07-14)

- **Layer A PASSED (live, auth-free).** Goose `1.43.0` installed via the curl installer; with the
  8 skills symlinked into `~/.agents/skills`, `goose skills list` lists all eight —
  `atelier, chart-native, dw-chart, map-dw, map-native, scrolly, suggest-article, suggest-chart`
  (`image-native` absent — no `SKILL.md` yet, as on Codex/Gemini).
- **FINDING — Goose recurses into `node_modules`.** Unlike Codex/Gemini, Goose's discovery walks
  *into* the symlinked skill dirs and surfaced two dependency-bundled skills as noise:
  `playwright-cli` and `playwright-trace` from `dw-chart/node_modules/playwright-core/.../skill/`.
  Not a blocker (all 8 real skills appear), but a journalist's `/skills` list carries 2 stray
  entries. Follow-up options: a `.gooseignore`, or keep the producers' `node_modules` out of the
  symlinked tree (relocate/ignore). Flagged, not fixed here.
- **Layer B — partial (see the dedicated section below).** Goose activated the `atelier` skill and
  drove the flow, but the free Gemini quota cut it before the nested invocation completed.

## Layer B — partial run (2026-07-14)

Configured Goose against the Google (Gemini) provider (`GOOSE_PROVIDER=google`,
`GOOSE_MODEL=gemini-flash-latest`; note `gemini-2.5-flash` 404s for new accounts, and `goose run`
needs a session `--name` or it panics on an uninitialised sqlite session DB). Goose **activated the
`atelier` skill** (`# Loaded Skill: atelier`), read its full flow, and **drove the orchestration** —
walking the skill tree toward `suggest-article`/`suggest-chart`. It was cut off by the **free Gemini
quota** (`free_tier_requests limit: 5`, already depleted that day) BEFORE the nested invocation
completed — a provider limit, not an adapter fault. So the mechanism works; the full nested-invoke +
produce is unproven only for lack of quota (a fresh/paid key would finish, as Codex did).

## Verdict

The adapter MECHANICS are proven live (install + discovery + Goose driving the flow). **`goose.verified`
is set to `true` by product decision (2026-07-14)** — a deliberate override ahead of a completed
Layer-B run, NOT a claim that the full nested-invoke + produce is proven (it was quota-cut). To retire
the gap, re-run Layer B on a fresh/paid provider key and confirm `suggest-article`→`suggest-chart`
fires + an artifact is produced. Node-free install + shared `~/.agents/skills` discovery make Goose
the cheapest of the three non-Claude adapters on the discovery axis.
