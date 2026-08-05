# Map KB Parity (map-native slice 4, final) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fill the two missing map KB layers — a global map `design-conformance.md` and a `choropleth.md` type reference — so the maps KB reaches chart parity.

**Architecture:** Two new Markdown references under `knowledge/references/map/`, mirroring the existing chart `design-conformance.md` (terse global checklist) and `map/types/proportional-symbol.md` (detailed type ref). Every rule is sourced and cross-referenced to the real code that enforces it. Pure docs.

**Tech Stack:** Markdown. No code, no tests, no renders.

## Global Constraints

- **No Claude/Anthropic mention** in any file OR commit message — NO `Claude-Session:` trailer, NO an authorship trailer naming an assistant.
- **English.**
- **No fabricated URLs / no invented conformance rules** — every code cross-ref must name a rule that actually exists in `skills/map-native/src/conformance.ts`; cite sources by name, include a URL ONLY for well-known ones you are confident about (`data-to-viz.com`, the FT chart-doctor GitHub `github.com/Financial-Times/chart-doctor`, `academy.datawrapper.de`).
- **Mirror the existing docs** — `knowledge/references/design-conformance.md` (terse global checklist style) and `knowledge/references/map/types/proportional-symbol.md` (type-ref structure).
- **Pure docs** — no code, no renders, no test changes.

All paths are relative to the repo root `/Users/rmdms/Sites/Professional/splash`.

---

### Task 1: `map/design-conformance.md` — the global map checklist

**Files:**
- Create: `knowledge/references/map/design-conformance.md`

- [ ] **Step 1: Read the mirror + the code to cross-reference**

Read `knowledge/references/design-conformance.md` (the chart global checklist — match its terse, numbered style) and `skills/map-native/src/conformance.ts` (confirm the exact rule names: `checkGlobalMapConformance`, `checkMapFraming`; what each emits). Also note `MapFrame`/`resolveMapFrame` in `src/core/` and the `snap-responsive.mjs`/`snap-a11y.mjs` harness.

- [ ] **Step 2: Write the checklist**

Create `knowledge/references/map/design-conformance.md` — ≤ ~60 lines, a numbered list of the rules every produced map must satisfy across static / interactive / video, each with its source and the code that enforces it. Cover exactly these (and only these — no invented rules):

1. **Title = the insight**, sentence case (not a label, not a bare year range, not ALL CAPS) — enforced by `checkGlobalMapConformance`.
2. **Description present** (what/when/where) — `checkGlobalMapConformance`.
3. **Source cited** — name + url — `checkGlobalMapConformance`; rendered in every format by `MapFrame` (incl. video).
4. **Contrast** WCAG ≥ 4.5:1 for furniture text — `checkGlobalMapConformance` (WCAG 1.4.3).
5. **Legend required** — a map is undecodable without its colour/size key — `checkChoroplethConformance`/`checkSymbolConformance`.
6. **No-data colour distinct** from the data ramp (neutral grey, never a ramp colour).
7. **Framing / safe-area** — title in a reserved band (never over data), nothing off-frame, furniture scaled per format — guaranteed by `MapFrame`/`resolveMapFrame`, asserted by `checkMapFraming` + the `snap-responsive` harness.
8. **Direct labels** where the type supports them (proportional symbols carry name + value) — `checkSymbolConformance` `labeled`.

Sources to credit by name: data-to-viz, FT Visual Vocabulary, Datawrapper Academy, WCAG. Open with a one-line `> Source:` credit like the chart file. End with a pointer line: the guard lives in `skills/map-native/src/conformance.ts`; the frame in `src/core/MapFrame.tsx` + `map-format.ts`; the harness in `scripts/snap-responsive.mjs` + `snap-a11y.mjs`.

- [ ] **Step 3: Cross-check + budget**

Re-read `conformance.ts` and confirm EVERY code name cited (`checkGlobalMapConformance`, `checkMapFraming`, `checkChoroplethConformance`, `checkSymbolConformance`, `MapFrame`, `resolveMapFrame`) is real — fix or drop any that isn't. Confirm no fabricated URLs. Confirm ≤ ~60 lines.

- [ ] **Step 4: Commit**

```bash
git add knowledge/references/map/design-conformance.md
git commit -m "docs(knowledge): global map design-conformance checklist (chart parity)"
```
(NO Claude-Session trailer.)

---

### Task 2: `map/types/choropleth.md` — the choropleth type reference

**Files:**
- Create: `knowledge/references/map/types/choropleth.md`

- [ ] **Step 1: Read the mirror + the code to cross-reference**

Read `knowledge/references/map/types/proportional-symbol.md` (match its structure: header `> Sources:` block → "When to use" → numbered encoding rules each ending with a `checkChoroplethConformance enforces:` line → "Known limits" → "Implementation pointer"). Read `skills/map-native/src/conformance.ts` `checkChoroplethConformance` (the exact rules: `hasLegend`, `scaleColors.length < 3`, `boundsNonEmpty`, `regionsWithData`, `storyBeats`, plus the shared L0) and `src/choropleth-geo.ts` (sequential/diverging ramp, binning).

- [ ] **Step 2: Write the reference**

Create `knowledge/references/map/types/choropleth.md` — ≤ ~110 lines, mirroring `proportional-symbol.md`. Content:

- **Sources block** (header): data-to-viz (choropleth — `https://www.data-to-viz.com/graph/choropleth.html`), FT Visual Vocabulary SPATIAL group (`https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary`), Datawrapper Academy (choropleth / classing — `https://academy.datawrapper.de/`). Use only URLs you are confident about; otherwise cite by name.
- **When to use:** a **rate / normalised value** over **areal regions** (share, density, per-capita index) — the region is the unit, colour encodes the value. **Not** raw counts (a count choropleth just redraws population/area — use a proportional symbol). **Not** point data.
- **Encoding rules** (numbered, each with a source + a `checkChoroplethConformance enforces:` cross-ref where one exists):
  1. **Sequential vs diverging ramp** — sequential for one-directional magnitude; diverging ONLY around a meaningful midpoint (above/below an average, gain/loss) with a neutral centre; CVD-safe, monotonic luminance. (`checkChoroplethConformance`: `scaleColors.length >= 3`.)
  2. **Bin count 3–7** + name the classing (quantile balances ink; equal-interval preserves true magnitude gaps) — classing changes the story, so state it.
  3. **No-data colour** a distinct neutral grey, never a ramp value, labelled in the legend.
  4. **Legend required** (`checkChoroplethConformance`: `hasLegend`).
  5. **Bounds / basemap-fit** — frame to the regions with data (`checkChoroplethConformance`: `boundsNonEmpty`, `regionsWithData`).
  6. **Furniture** — title-insight + description + source (shared L0).
- **Anti-patterns:** raw counts (population/area artefact); unlabelled classing; the **area/projection bias** (large sparse regions dominate the eye regardless of weight — mitigation: proportional symbol, or a cartogram, the latter deferred).
- **Known limits / Implementation pointer:** implemented by `skills/map-native/src/choropleth-geo.ts` + `ChoroplethMap.tsx` (+ `ChoroplethStory.tsx` for video), guarded by `checkChoroplethConformance` in `src/conformance.ts`.

- [ ] **Step 3: Cross-check + budget**

Re-read `checkChoroplethConformance` and confirm every `enforces:` cross-ref names a rule that actually exists (legend, ≥3 scale steps, bounds, regions-with-data, the L0). Drop/fix any that don't. Confirm no fabricated URLs (the three above are real and stable). Confirm ≤ ~110 lines.

- [ ] **Step 4: Commit**

```bash
git add knowledge/references/map/types/choropleth.md
git commit -m "docs(knowledge): choropleth map type reference (chart parity)"
```
(NO Claude-Session trailer.)

## Notes for the executor

- Pure documentation — no code, no tests, no renders, no env, no MapTiler key.
- The single hard requirement: every code cross-reference must name a rule that EXISTS in `skills/map-native/src/conformance.ts` — read it, do not guess. An invented rule name is a defect.
- Cite sources by name; only include a URL for the well-known ones listed; never fabricate a URL.
- Match the terseness of the mirror files — no padding, no marketing prose.
- NO `Claude-Session:` trailer or any Claude/Anthropic mention in commit messages.
- This is the final slice of the maps↔charts parity program.
