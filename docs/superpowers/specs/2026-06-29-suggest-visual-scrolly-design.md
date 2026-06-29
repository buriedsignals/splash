# suggest-visual — routing to the scrolly (slice 2) — design

**Date:** 2026-06-29
**Status:** approved (brainstorming)
**Scope:** the last format in the router — when the format ladder reaches **Gate 3 (scrollytelling)** for a
geographic story, route to the **scrolly** producer. Small: the scrolly reuses the choropleth config and
`validateChoroplethConfig` (both already exist), so this is mostly the routing + a producer discriminator.

## Why

Slice 1/1b route geographic stories to static (`map-dw`) or native interactive/video (`map-native`). The
remaining format is the **scrolly** — a guided, scroll-driven narrative. The scrolly engine (`skills/scrolly`)
already produces it from a choropleth config; this slice teaches the suggester to choose it when Gate 3
fires, and to emit + score + produce it.

## When the suggester picks scrolly (Gate 3, grounded)

Per `<repo-root>/knowledge/references/formats/format-selection.md` Gate 3, escalate to a scrolly ONLY when
the story is **irreducibly sequential** (a guided walk-through the author wants to pace), a **single visual
evolves across several states** (the mapStory: establish → reveal extremes → takeaway), it's **long-form**
(not breaking news — scrolly penalises skimming), and resources exist. For a GEOGRAPHIC story that meets
Gate 3, the producer is `scrolly` (v1 scrolly is map-based). A geographic story that is NOT a guided
sequence stays a map (static/native per slice 1/1b) or bars (Gate 5). The suggester judges this — grounded,
not a knob.

## Emission — the scrolly config (reuses the choropleth config)

The scrolly engine consumes the SAME choropleth config map-native uses (it reuses it). So the suggester
emits `{ producer: "scrolly", …ChoroplethConfig }`: `regionKey`, `valueField`, `rows` (objects),
`basemap:"world"` (ISO-A3), `title` (insight), `description`, `unit`, `valueUnit`, `source`. Region codes
MUST be ISO-A3 (else fall back to a map/bars). Self-check via map-native's `validateChoroplethConfig` (the
scrolly config IS a choropleth config). Produce with `bun skills/scrolly/scripts/produce.mjs <config.json>
<outDir>` → the self-contained `scrolly.html`.

## Scoring — `scoreSpec`

`Expectation.producer` gains `"scrolly"`. The scrolly emitted spec carries `producer:"scrolly"` and the
choropleth-config fields (it has `basemap`), so `isMap`-style detection must include it. Cleanest: treat
the producer set explicitly. When the emitted `producer` is `"scrolly"` → validate via
`validateChoroplethConfig` (reuse — the scrolly config is a choropleth config). The `expect.producer`
match check (from 1b) already enforces static-vs-native-vs-scrolly. So: add `scrolly` to the map-family
discrimination (`producer === "map-dw" | "map-native" | "scrolly"`), and route `map-native`/`scrolly` →
`validateChoroplethConfig`, `map-dw` → `validateMapSpec`.

## SKILL.md

In the map branch's format ladder, add the Gate-3 case: a geographic story that is an irreducibly
sequential guided narrative → `scrolly`. Document the emission (`producer:"scrolly"` + ChoroplethConfig),
the `validateChoroplethConfig` self-check, and the `skills/scrolly/scripts/produce.mjs` call. Keep the
static (`map-dw`) and native (`map-native`) paths + all chart paths intact.

## Eval

- A case: a geographic story that is an explicit guided narrative (e.g. "walk readers north-to-south
  through Europe's renewables divide, one country at a time") → routes to `scrolly`
  (`element:"map", producer:"scrolly"`).
- An e2e: emit a scrolly config from such a story → `produce.mjs` → `scrolly.html` (record in the proof;
  the controller eyeballs the scroll).

## Out of scope (later)

- **Chart scrolly** (a non-geographic story as a scroll narrative) — the scrolly v1 is map-based; chart
  scrolly is a future slice once chart-native plugs into the scrolly orchestrator.
- The full MapTiler map-type buildout (symbol, flow, dot-density, …) — the NEXT phase after routing.
- The deferred slice-1 items + the trailer scrub before the MIT release (logged).

## Testing

| Case | Expectation |
| --- | --- |
| `scoreSpec` a valid scrolly config, expect producer "scrolly" | pass (via validateChoroplethConfig) |
| `scoreSpec` a map-native config when expect producer "scrolly" | fail (wrong producer) |
| eval: geographic + guided-sequential intent | routes to `scrolly` (not static/native map) |
| e2e | scrolly.html produced from the emitted config |
