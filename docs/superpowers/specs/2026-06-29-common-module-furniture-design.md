# common module furniture — align all engines to title + description + source — design

**Date:** 2026-06-29
**Status:** approved (brainstorming)
**Scope:** bring every visual module to the shared furniture standard — **insight title + description +
source, each once + responsive**. The survey shows the only real gap is **map-native**; chart-native and
dw-chart already carry the furniture. This implements it where missing and documents conformance for the rest.

## The shared contract (already written)

The standard lives in `docs/splash/embeddable-module-best-practices.md`: every module carries an insight
title (the finding), a description (what/when/where + units), and a visible linked source — each shown
once — and is responsive (the `min()/clamp()/vw` recipe). Engines stay **independent** (no shared
conformance module — consistent with how they're built today); the reference is the single source of truth.

## Taxonomy first (do not mislevel scrolly)

The **engines** are `chart-native` and `map-native` (+ `dw-chart` for the static/Datawrapper path). Each
engine produces three **formats**: **static** (image), **interactive** (web), **video**. The interactive
format has two **sub-formats**: *free-explore* (pan/zoom/hover) and **scrolly** (scroll-driven).
`skills/scrolly` is only the shared **mechanism** (an orchestrator that drives an engine's renderer); the
format "interactive-scrolly" belongs to the host engine, and its furniture is **inherited from the engine**
(the scrolly already reuses map-native's choropleth config). So furniture is defined **per engine**, and
the scrolly is NOT a fourth peer — it inherits whatever its host engine carries.

## Survey — where each engine stands (furniture is per-engine)

| Element | chart-native | map-native | dw-chart |
| --- | --- | --- | --- |
| insight title | ✓ | ✓ | ✓ |
| description | ✓ (ChartFrame `subtitle` ← `unit`) | ✗ | ✓ (`intro`) |
| source | ✓ | ✓ | ✓ |
| responsive | ✓ (ChartFrame `responsive`) | ✗ (fixed 320px overlay) | ✓ (DW embed) |

So: **chart-native and dw-chart already conform.** The work is **map-native**: add the description
furniture and make its overlays responsive. **The scrolly inherits this automatically** — it reuses
map-native's choropleth config, so once `ChoroplethConfig` carries `description`, the scrolly shows it too.

## The work — map-native

### 1. Description field
Add `description?: string` to the config (`ChoroplethConfig` in `ChoroplethMap.tsx`, and the
`ChoroplethStory` config type). The description is the what/when/where line (e.g. "Share of electricity
from renewables, by country, 2024") — distinct from the long `unit` (the legend label) and the short
`valueUnit`.

### 2. Render the description (each format)
- **Interactive / static** (`ChoroplethMap.tsx`): the top-left title card gains a **subtitle line** under
  the title — `config.description`, smaller, grey (`#555`). Only rendered when present.
- **Video** (`ChoroplethStory.tsx`): the **title card** shows the title (as now) with the description as a
  smaller subtitle beneath it; the establish/reveal beats are unchanged.

### 3. Responsive overlays (the map's furniture)
Apply the grounded recipe to `ChoroplethMap.tsx`'s overlays (currently fixed px):
- Title card: `maxWidth: "min(320px, calc(100vw - 32px))"`, title `fontSize: "clamp(13px, 3.6vw, 14px)"`,
  description `clamp(11px, 3vw, 12px)`.
- Legend: `maxWidth: "min(160px, 42vw)"` so it never eats a phone screen; keep it readable.
- Source: already small/anchored; ensure it stays within the viewport.
- (The video is fixed-canvas — no responsive needed there.)

### 4. Conformance
`checkChoroplethConformance` already requires title + source + WCAG + legend + CVD scale. Add: a
**non-empty `description`** is required (a module must state what/when/where). Extend the input with
`description` and push a violation when it is missing.

### 5. Sample
`assets/sample-data/choropleth.json` gains `"description": "Share of electricity from renewables, by
country, 2024"` (matching the scrolly sample, which reuses this config shape).

### 6. SKILL.md
A short "Module furniture" note in `map-native/SKILL.md` pointing at the shared reference: title +
description + source, each once, responsive overlays.

## The others — confirm conformance (light)

- **chart-native:** already renders title + subtitle + source responsively via `core/ChartFrame`. Today
  the subtitle is `config.unit`; route it as `config.description ?? config.unit` at the **ChartFrame**
  level if a single choke point exists, OR leave as-is (the subtitle furniture already shows). **Decision:**
  leave the 41 chart components untouched (each passes `subtitle={config.unit}`); the furniture is present.
  A dedicated `description` field for charts is a future codemod, not this pass — documented, not silent.
- **dw-chart:** `intro` (= description) + title + source already validated by `validateChartSpec`. Confirm
  the validator at least warns when `intro` is absent (a Minor add if missing); no structural change.
- **scrolly (interactive sub-format, not an engine):** inherits map-native's furniture via the shared
  choropleth config — no separate work. Once map-native carries `description`, the scrolly renders it
  (the persistent header = title, the intro caption = description, the footer = source: already wired).

## Out of scope

- A shared cross-engine conformance/furniture module (the engines stay independent; the reference is the
  contract).
- A dedicated `description` field replacing chart-native's `unit`-as-subtitle (future codemod over 41 types).
- Re-uniforming field NAMES (dw-chart keeps `intro`, the DW term; map-native/scrolly use `description`) —
  the CONCEPT is what's standardised, not the identifier.

## Testing

| Case | Expectation |
| --- | --- |
| `checkChoroplethConformance` without description | flagged |
| `checkChoroplethConformance` with description | passes (with the other furniture) |
| Interactive render (sample) | title + description subtitle + legend + source; overlays fit at ~390px |
| Video still (title card) | title + description subtitle visible |
| chart-native / dw-chart | unchanged; documented as already conformant |
