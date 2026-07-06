# Atelier

**Open-source visual storytelling for every newsroom.**

Atelier turns an article and/or a dataset into a finished, exported visual — a chart, a map, a scrollytelling piece, or a short video — and hands the newsroom a file it owns (a self-contained HTML page, an MP4, or an image).

It **orchestrates production**; it does not generate the text or the illustration. The editorial intention stays with the journalist: Atelier reads the article, proposes where a visual would serve the story, and — once the journalist confirms — produces it, following data-visualisation best practices wired into the tool as guardrails.

> Status: **v0.1.0 — developer preview.** Verified on Claude Code; other runtimes are planned. Not yet published for public install.

## How it works

Atelier is a set of composable **skills** for an AI coding agent. You install it once, then drive it from a single entry point: *"make me a visual from this article."* The agent runs six phases, each with an explicit human gate — nothing ships without your confirmation:

```
INPUT → ANALYSE → CADRAGE (framing) → PROPOSITION → PRODUCTION → EXPORT
```

- **ANALYSE** reads the article silently to find the data and the quantified claims.
- **CADRAGE** asks a few framing questions (the takeaway, the channel, the constraints).
- **PROPOSITION** proposes vetoable opportunities — *what to show, which visual, why.*
- **PRODUCTION** produces the chosen visual and shows you the real render.
- **EXPORT** hands over the owned file (or a hosted embed link).

## Architecture

Three layers, composed silently:

| Layer | What it is | Where |
|-------|-----------|-------|
| ① Knowledge base | Layered dataviz knowledge (global × type × format), grounded and wired to conformance checks | `knowledge/references/` |
| ② Suggester | Reads the article → vetoable proposals; routes each to the right element & format | `skills/suggest-article`, `skills/suggest-chart` |
| ③ Producers | Turn a validated spec into static / interactive / video output | `skills/{dw-chart,chart-native,map-dw,map-native,scrolly}` |

The whole flow is sequenced by the `atelier` skill (`skills/atelier/`).

**Engines.** Charts and maps each have a *thin* delegated-render path (Datawrapper: `dw-chart`, `map-dw`) and a *rich* native path (a pure geometric core → one component → static + interactive + video: `chart-native`, `map-native`). `scrolly` is the shared scroll-driven mechanism.

## For developers

Requirements: [Bun](https://bun.sh).

```bash
git clone <repo-url> atelier && cd atelier
bun run check        # typecheck + tests across all skills
```

Each skill is self-contained (`SKILL.md` + `src/` + `scripts/` + tests). Producer suites that hit the Datawrapper API need a `DATAWRAPPER_API_TOKEN` in `.env` (see `.env.example`); they are skipped without it.

To load Atelier into Claude Code:

```bash
claude --plugin-dir .
```

## License

[MIT](LICENSE) © Rémy Dumas. Funded by the Fondation pour le Journalisme (FJM).
