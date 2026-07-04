---
name: atelier
description: Use to run the whole atelier pipeline end-to-end from an article and/or data to a finished, exported visual. Sequences ANALYSE → CADRAGE → PROPOSITION → PRODUCTION → EXPORT with human gates, invoking suggest-article, suggest-chart, and the producers. The single entry point for "make me a visual from this". Keywords atelier, flow, pipeline, orchestrate, end-to-end, article to chart, produce a visual, embed, export.
---

# atelier — the end-to-end flow

## Overview

The single entry point that turns an article and/or data into a finished, exported visual. It runs
six ordered phases with explicit human gates and never re-decides what a sub-skill already decides —
it sequences and gates. Conduct the ENTIRE dialogue in the journalist's language (detect it from
their first message).

## The flow (run in order; every gate is a hard stop)

### 1. INPUT

Accept: an article (URL / file / pasted text), data (CSV / file / pasted table), both, or a bare
topic. Normalise to `{ article?, data?, topic? }`. Do not proceed until you have at least one.

### 2. ANALYSE (silent)

Invoke `suggest-article` to read silently: identify the data, the quantified claims, and the
narrative structure. Produce NO output to the journalist yet — this primes CADRAGE. For a bare topic
(no article/data), instead NAME the real dataset the topic needs (the honest sans-rien path) and
carry that forward.

### 3. CADRAGE — GATE 1 (questionnaire, journalist's language, ≤4 questions, one at a time)

1. Branch: "Do you already have a visual in mind, or should I guide you?"
2. Takeaway: "What is the one thing a reader should leave with?" → the insight/angle.
3. Audience & channel: "Where does this publish — article embed, social, print?" → the format signal
   (feeds suggest-chart Gates 1–4: static / interactive / video / scrolly).
4. Constraint (only if relevant): mobile-first, deadline, house palette.

Branch:
- **DIRECT** (journalist names the visual, e.g. "a scrolly map"): skip PROPOSITION. Go to PRODUCTION,
  passing suggest-chart the (data, intent) PLUS the forced element/format — suggest-chart still emits
  a VALIDATED spec and applies its guardrails (obey the choice, but if it violates a hard guardrail,
  surface the warning to the journalist rather than shipping a broken visual). On DIRECT, the branch
  fires at Q1 — the remaining CADRAGE questions (Q2–Q4) are skipped; intent is inferred from the
  article + the named visual.
- **GUIDED**: go to PROPOSITION.

### 4. PROPOSITION — GATE 2 (guided path only)

Present the `suggest-article` ProposalSet × `suggest-chart` routing as plain-language lines — for each
opportunity: what it shows, which visual, why. The journalist accepts / edits / rejects each. Only
accepted proposals continue.

GATE 2b (data provenance): if an accepted proposal's figures are `provenance:"prose"`, show the
reconstructed table and get an explicit OK before producing. Never fabricate a dataset attribution.

### 5. PRODUCTION

For each validated visual, run the chosen producer with the suggest-chart spec (the produce commands
in suggest-chart/SKILL.md). The producer emits its self-contained artifact(s) and runs its own render
guardrails. Collect the output paths.

GATE 3 (render): show the ACTUAL render (open it / a screenshot) and get an explicit "ship it" before
EXPORT. Verify quality, not just that it built.

**Producer commands (from suggest-chart/SKILL.md):**
- `chart-native`: `bun skills/chart-native/scripts/produce-from-spec.mjs <nativeSpec.json> <outDir> [all|static]`
- `map-native`: run from `skills/map-native/` — `bun scripts/produce.mjs <config.json> <outDir> [static|reveal|story|scrolly|all]`
- `scrolly`: run from `skills/scrolly/` — `bun scripts/produce.mjs <config.json> <outDir>` → produces a single `scrolly.html` (no all|static flag)
- `dw-chart` / `map-dw`: via their producer entry (Datawrapper API — token from `.env`)

### 6. EXPORT — GATE 4 (code vs link)

Ask which the journalist wants:
- **CODE (technical):** run `bun skills/atelier/scripts/export-code.mjs <outDir> <exportDir>` to bundle the
  artifacts + an embed snippet + a short README; hand over the folder.
- **EMBED LINK (non-technical):** run `bun skills/atelier/scripts/deploy-embed.mjs <htmlFile> <slug>` →
  prints an iframe-ready URL. If the fly.io host is not set up yet, offer CODE now + say the embed
  link is pending setup.

  **One-time fly.io host setup** (run once from `skills/atelier/embed-host/`):
  ```bash
  flyctl launch --no-deploy          # creates the atelier-embeds app; commit fly.toml
  flyctl volumes create data --size 1
  flyctl deploy
  ```
  After that, `deploy-embed.mjs` uploads directly via `flyctl ssh sftp shell`. The `ATELIER_EMBED_APP`
  env var overrides the default app name `atelier-embeds` if needed.

## Gates

| Gate | Phase | Stop condition | Failure mode if skipped |
|------|-------|---------------|------------------------|
| 1 | CADRAGE | Journalist answers the ≤4 questions + branch chosen | Wrong format, misread intent |
| 2 | PROPOSITION | Journalist accepts / edits / rejects each proposal | Wrong claim visualised |
| 2b | PROPOSITION | Journalist confirms prose-extracted data table | Fabricated data attribution |
| 3 | PRODUCTION | Journalist says "ship it" after seeing the real render | Visual quality not verified |
| 4 | EXPORT | Journalist chooses code vs embed link | Wrong delivery format |

## Never

- Never skip a gate.
- Never auto-progress from one phase to the next without the journalist's explicit response.
- Never produce a visual before the PROPOSITION / provenance OK (gates 2 and 2b) on the guided path.
- Never export before the render OK (gate 3).
- Never invent data or fabricate a dataset attribution.
- Never conduct the dialogue in a language other than the journalist's (detect from first message).
- Never re-decide what a sub-skill (suggest-article, suggest-chart, a producer) already decides — only sequence and gate.
- Never name a chart type in the intent passed to suggest-article or suggest-chart (on the guided path).
