# Splash Installer — Design

**Date:** 2026-07-06
**Sub-chantier:** #5 Installeur (replaces the old "Website" sub-project)
**Status:** design approved, pending spec review → implementation plan

## Goal

Let a non-technical journalist install and configure Splash on their Mac with **zero
terminal-wrangling**, following the Mycroft (Buried Signals) distribution model: a static
install page generates a single self-contained script with the journalist's config baked in;
one double-click sets everything up.

## Model reference: Mycroft

`mycroft.buriedsignals.com` = Goose configured for journalism. Its installer is a **static,
client-side page** ("No backend. Your config never leaves the browser."). A form (cloud vs local
inference, API keys, plugins) generates a downloadable `.command` bash script (~204 KB, plain
text, reviewable) with the selections embedded. Double-click → Brew installs Goose + Obsidian,
clones the pack, configures the shell. ~5 minutes, no terminal knowledge.

Splash reuses the **procedure**, not Mycroft's page: Splash ships its **own standalone install
page**, because Splash is a Claude Code plugin (not a Goose pack) and we want full control.

## Non-goals (v1)

- Windows / Linux. `.command` is macOS-only. **Assumption: the Annemasse/Heidi.news pilot
  journalists are on macOS.** Windows/Linux is future scope, not this spec.
- Auto-updating an installed pack.
- Porting the Splash skill to non-Claude runtime formats (esp. Goose). Those are separate,
  gated tasks — see "Verification gates".
- Interactive OAuth login flows. v1 bakes a pasted API key into the script (decision below).

## Architecture

Three decoupled units, each independently understandable and testable:

1. **Install page** (`docs/installer/`) — static HTML/CSS/JS on GitHub Pages. Renders the form,
   holds no secrets, talks to no backend. Depends on the runtime registry.
2. **Runtime registry** (`docs/installer/runtimes.js`) — a plain data object describing each
   supported runtime. The single source of truth for both the form cards and the script
   generator. Adding a runtime = one entry.
3. **Script generator** (`docs/installer/generate.js`) — pure function: `(formConfig) → bash
   string`. Assembles a shared preamble + the chosen runtime's block + the baked config. No
   side effects, no network. This is the unit under test.

Data flow: journalist fills form → generator reads registry + form → emits `splash-setup.command`
→ browser triggers download → journalist double-clicks locally.

### Runtime registry shape

```js
// runtimes.js
export const RUNTIMES = {
  claude: {
    label: "Claude Code",
    verified: true,                      // Splash is built + tested on this
    brew: "claude",                      // brew formula / install command
    keyLabel: "Anthropic API key",
    keyUrl: "https://console.anthropic.com/settings/keys",
    keyEnv: "ANTHROPIC_API_KEY",
    register: (repoDir) => `...bash to register the plugin for this runtime...`,
  },
  codex:  { label: "Codex",      verified: false, /* ...verify before enabling... */ },
  gemini: { label: "Gemini CLI", verified: false, /* ...verify before enabling... */ },
  goose:  { label: "Goose",      verified: false, /* ...needs Goose format port... */ },
};
```

The page renders one card per entry. `verified: false` entries render with a "beta — verify
first" note and are visually distinct, so a non-technical journalist is steered to the working
path but the architecture already carries all four.

## The form (all client-side)

| Field | Notes |
|---|---|
| **Runtime** | Radio: Claude Code / Codex / Gemini CLI / Goose. Non-verified carry a "beta" note. |
| **AI API key** | Label + get-it link adapt to the chosen runtime (`keyLabel`/`keyUrl`). Baked into the script. |
| **MapTiler key** | For maps. Get-it link + "skip, add later". |
| **Datawrapper token** | For charts. Get-it link + "skip, add later". |
| **Embed host** (advanced, collapsed) | fly.io app name + `FLY_API_TOKEN`. Optional. |
| **Generate** | Produces and downloads `splash-setup.command`. |

## The generated `.command`

A bash script assembled from a shared preamble + one per-runtime block:

1. **Preamble** — friendly `echo` progress; install Homebrew if missing; install **Bun**
   (Splash producers run in Bun).
2. **Runtime install** — `brew install <formula>` for the chosen runtime.
3. **Clone** — clone the Splash repo → `~/Splash`.
4. **Write `.env`** — from the baked keys (mirrors `.env.example`).
5. **Register plugin** — the runtime's `register(repoDir)` snippet (Claude: plugin-dir config).
6. **Auth** — write the baked AI key into the runtime's config/env; no interactive login.
7. **Final message** — how to launch (e.g. `cd ~/Splash && claude --plugin-dir .`, then
   `/splash` or a natural-language brief).

The script starts with a header comment: what it does, that it contains the journalist's keys,
and a recommendation to delete it after a successful run.

## Auth decision

v1 collects the AI API key in the form and **bakes it into the script** (chosen over interactive
login). Rationale: one double-click fully configures the runtime; the journalist obtains one key.
Trade-off accepted: the journalist must first get a paid API key, and a plaintext key sits in the
downloaded file (mitigated by the delete-after-run warning + client-side-only generation).

## Verification gates (honesty rule)

The installer must never offer a non-technical journalist a runtime where Splash does not
actually load. Each non-Claude runtime has a gate before its card flips to `verified: true`:

- **Claude Code** — verified now (Splash's native format).
- **Codex** — verify the Splash skill/plugin loads (low risk; viznews already claims Codex).
- **Gemini CLI** — verify the skill loads (low risk; viznews already claims Gemini).
- **Goose** — **port** the Splash skill to Goose's extension format first (heaviest; separate task).

## Security

- Generation is 100% client-side; keys never transmitted. The page states "plain text ·
  reviewable · nothing hidden" (Mycroft-style), showing byte size.
- The script self-warns (header comment + final `echo`) to delete the file after running,
  because it embeds secrets.
- `.env` is gitignored in the cloned repo; keys land only in the local `.env` and runtime config.

## Testing

- **Unit (bun:test):** `generate(config)` per runtime → snapshot of the emitted bash; assert the
  baked keys, repo URL, and register-snippet appear; assert no key leaks into the wrong field.
- **Syntax:** every generated script passes `bash -n` (run inside the test).
- **Manual smoke:** run the Claude Code `.command` on a clean macOS user account → Splash
  launches end-to-end. Documented as a release checklist step (can't be fully automated).

## File layout

```
docs/installer/
  index.html        # the form + copy
  style.css
  runtimes.js       # RUNTIMES registry (source of truth)
  generate.js       # pure (config) → bash string
  generate.test.ts  # bun:test
  templates/        # shared preamble + per-runtime bash blocks (if extracted from generate.js)
```

GitHub Pages serves `docs/` (repo setting). The installer lives at `/installer/`.

## Open items to confirm during implementation

- Exact brew formula / install command for each runtime CLI (verify each exists on Homebrew or
  provide the fallback curl installer).
- The precise plugin-registration mechanism per runtime (Claude Code settings vs `--plugin-dir`;
  the others discovered during their verification gate).
- Repo clone target: public HTTPS clone URL of the Splash GitHub repo (must be public by the
  MIT release, Sept–Oct 2026).
