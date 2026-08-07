# Splash

**Open-source visual storytelling for every newsroom.**

Splash turns an article and/or a dataset into a finished, exported visual — a chart, a map, a scrollytelling piece, or a short video — and hands the newsroom a file it owns (a self-contained HTML page, an MP4, or an image).

It **orchestrates production**; it does not generate the text or the illustration. The editorial intention stays with the journalist: Splash reads the article, proposes where a visual would serve the story, and — once the journalist confirms — produces it, following data-visualisation best practices wired into the tool as guardrails.

> Status: **v0.1.0 — developer preview.** Verified on Claude Code; other runtimes are planned. Not yet published for public install.

## How it works

Splash is a set of composable **skills** for an AI coding agent. You install it once, then drive it from a single entry point: *"make me a visual from this article."* The agent runs six phases, each with an explicit human gate — nothing ships without your confirmation:

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
| ③ Producers | Turn a validated spec into static / interactive / video output | `skills/{dw-chart,chart-native,map-dw,map-native,scrolly,image-native}` |

The whole flow is sequenced by the `splash` skill (`skills/splash/`).

**Engines.** Charts and maps each have a *thin* delegated-render path (Datawrapper: `dw-chart`, `map-dw`) and a *rich* native path (a pure geometric core → one component → static + interactive + video: `chart-native`, `map-native`). `scrolly` is the shared scroll-driven mechanism.

## For developers

Requirements: [Bun](https://bun.sh).

```bash
git clone <repo-url> splash && cd splash
bun run check        # typecheck + tests across all skills
```

Each skill is self-contained (`SKILL.md` + `src/` + `scripts/` + tests). Producer suites that hit the Datawrapper API need a `DATAWRAPPER_API_TOKEN` in `.env` (see `.env.example`); they are skipped without it.

### Fresh clone / fresh worktree checklist

A worktree that skips any of these steps fails in ways that look like a code regression but
aren't. Each step below states what it prevents — run them in order:

1. **`bun install` at the repo root.** Without it, `cd lib && bun test` fails with ~48 phantom
   errors ("Cannot find package 'zod'", `@noble/hashes`, `fflate`) that have nothing to do with
   whatever you changed.
2. **`bun install` in each skill you'll touch or test**: `skills/chart-native`,
   `skills/map-native`, `skills/dw-chart` — and additionally `skills/scrolly`,
   `skills/image-native`, `skills/map-dw` and `skills/cesium-flyover` if you're running the full
   `bun run check`, which typechecks and tests all of them. Each skill has its own `node_modules`;
   the root install does not cascade into them. Skipping one does not read as a missing install —
   the suites fail on `Cannot find package 'd3-scale'` / `Cannot find module '@turf/turf'`, which
   looks like broken code in a fresh worktree.
3. **A root `.env`** (gitignored — copy `.env.example`) if you'll run `skills/image-native`'s
   suite: its test drives a real scrolly build and fails without one.
4. **`bunx remotion browser ensure`** in `skills/chart-native` and `skills/map-native` (and
   `skills/cesium-flyover` if you render its flyover). These
   engines render video through Remotion, which needs its own downloaded Chrome Headless Shell
   (tens of MB, separate from anything `bun install` fetches). Skipping this doesn't fail fast —
   the first test that renders a video triggers the download **mid-suite**, and on a flaky
   network it can stall partway through, leaving a corrupt half-extracted browser behind. Every
   video render after that dies with an unreadable subprocess dump that looks like a regression
   in whatever you just changed, not a networking hiccup from two steps ago. Running this command
   up front turns that failure mode into a normal, retriable download you see happen.

To load Splash into Claude Code:

```bash
claude --plugin-dir .
```

## License

[MIT](LICENSE) © Rémy Dumas. Funded by the Fondation pour le Journalisme (FJM).
