# Native Family A couture — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Makes the 7 DEFERRED
> Family A chart types reachable end-to-end (article→suggester→mapper→guarded produce→render). All 7 are DRAWN
> and each ALREADY has a `checkXConformance` in `conformance.ts` — but NONE are wired into produce, mapped,
> family-routed, or SKILL-listed. Recipe = the proven couture recipe (mapper + guard-wire + flip + family + SKILL
> + palette-extract where needed + render-verify).

**Goal:** 19 → 26 reachable native chart types (add treemap, boxplot, diverging-stacked, pyramid, fan, bump, violin).

**Worktree:** `/Users/rmdms/Sites/Professional/.atelier-wt/familya`, branch `feat/native-family-a` (base main
7652ff6). Runs in PARALLEL with the map dark-video lot (disjoint files: chart-native vs map-native). `bun run
check` green in this worktree.

## Global Constraints
- Bun; English; zero `any`/`@ts-ignore`; no vendor. `bun run check` green at end of EVERY task (the completeness
  invariant `chart-native/tests/completeness.test.ts` enforces reachable ⟹ guarded ∧ mapper ∧ family ∧ KB).
- **The full "reachable" recipe per type** (all required or the type isn't reachable): (1) **mapper** in
  `spec-to-config.ts` MAPPERS (mirror the named sibling); (2) **guard case** wired into `produce-conformance.ts`
  (import + `case` in the switch + add id to `PRODUCE_GUARDED_TYPES`) reusing the existing `checkXConformance`;
  (3) **palette extract** to `core/tokens.ts` for the category-palette types (+ teach
  `core/resolve-conformance-colors.ts` if it's a flat-triple type, else resolve inline in the guard case);
  (4) **flip** off `deferred` in `native-types.ts`; (5) **family entry** in
  `skills/suggest-chart/eval/native-family-types.ts` NATIVE_FAMILY_TYPES; (6) **SKILL.md** — add to the emittable
  nativeType key list + a CSV-shape note in `skills/suggest-chart/SKILL.md` (a type not in SKILL.md is NOT
  emittable from an article — the lesson from prior batches); (7) **verify KB ref** exists (author only violin);
  (8) **render-verify E2E** at the PNG via the real `produce-from-spec.mjs`, by the controller.
- **id→display-name KB mapping** (completeness test KB_FILENAME): `pyramid → population-pyramid.md` (component is
  `PopulationPyramidChart.tsx`, guard `checkPopulationPyramidConformance`); the other 6 = `<id>.md`.

**Grounding (verified file:line — from the Family A scout):** each guard lives in `conformance.ts`:
`checkPopulationPyramidConformance:245`, `checkBumpConformance:1385`, `checkDivergingStackedConformance:1230`,
`checkFanConformance:1022`, `checkTreemapConformance:1315`, `checkBoxplotConformance:1426`, `checkViolinConformance:674`.
Palettes to extract: pyramid `LEFT/RIGHT_COLOR:47-48`, bump `ACCENTS:45`, diverging-stacked `NEG/POS/NEUTRAL:49-51`,
treemap `GROUP_COLORS:45-51`. Single-hue (no extract): fan `HUE:45`, boxplot `BOX:44`, violin `FILL:46`.
Family (intent) assignment: treemap→part-to-whole; boxplot,violin→distribution; diverging-stacked→deviation
(Likert diverging); pyramid→distribution (paired age/sex); bump→ranking; fan→change-over-time. (Confirm against
each KB's stated intent.)

---

## Task 1: treemap + boxplot (2 cheap)
Both: guard+KB exist, clean a11y. **treemap** (part-to-whole, single/hierarchy) — palette extract
`GROUP_COLORS:45-51 → TREEMAP_GROUP_COLORS`; mapper mirror `waffle` + optional category like `beeswarm` cat
detection: `labelCol=columns[0]`, `valueCol=numericColumns[last]`, optional `catCol`=first non-value text col,
`items=rows.map(...)`, `categories`=distinct cats, `unit=spec.unit`. **boxplot** (distribution) — single
`BOX:44` palette (no extract; resolve inline), mapper mirror `dot-strip` but group raw rows into
`{label, values:number[]}` per category (do NOT aggregate). Wire both guards into produce-conformance,
flip, family (part-to-whole / distribution), SKILL.md (+ shape notes), verify KB. **Render-verify both at the PNG.**
Commit `feat(chart-native): productionize treemap + boxplot end-to-end`.

## Task 2: diverging-stacked + pyramid (2 cheap)
**diverging-stacked** (deviation, wide Likert) — palette extract `NEG/POS/NEUTRAL:49-51 →
DIVERGING_STACKED_COLORS`; mapper reshape wide→items: `responses=columns.slice(1).filter(numeric)`,
`items=rows.map(r=>({label:String(r[columns[0]]), values:responses.map(Number)}))`, omit neutralIndex (geometry
defaults). **pyramid** (distribution, paired) — palette extract `LEFT/RIGHT_COLOR:47-48 → PYRAMID_SIDE_COLORS`;
mapper mirror `dumbbell`: `bandField=columns[0]`, `[leftField,rightField]=numericColumns.slice(0,2)`,
`leftLabel/rightLabel`, `rows`. **KB mapping: pyramid→population-pyramid.md.** Guards wired, flip, family, SKILL,
verify KB. **Render-verify both.** Commit `feat(chart-native): productionize diverging-stacked + pyramid end-to-end`.

## Task 3: fan (convention-heavy mapper)
**fan** (change-over-time, forecast bands) — single `HUE:45` (no extract). Mapper is special: `xField=columns[0]`;
derive `levels` by scanning headers matching `/^lo(\d+)$/` paired with `hi{n}`; pass `rows` through numeric
(keys `actual`/`central`/`lo{n}`/`hi{n}` per `fan-geometry.ts:12,63-67`); `unit=spec.unit`. Guard
`checkFanConformance:1022` wired, flip, family (change-over-time), SKILL.md (+ a clear shape note: fan needs the
`actual,central,lo80,hi80,lo95,hi95`-style forecast columns). Verify `fan.md`. **Render-verify.** Commit
`feat(chart-native): productionize fan end-to-end (forecast-band mapper)`.

## Task 4: bump (needs a11y label→ink fix)
**bump** (ranking, wide) — palette extract `ACCENTS:45 → BUMP_ACCENT_COLORS`. **a11y FIX**: `BumpChart.tsx:288`
paints the end/direct label in the accent `color` when highlighted (orange/green fail WCAG on white) → move the
LABEL to `COLORS.ink` (keep the accent on the LINE/mark; emphasis via weight) — the "label carries the value,
mark carries the hue" rule from prior lots. Verify at the render + the snap-contrast harness (RED→GREEN). Then
mapper (wide→items: `periods=columns.slice(1).filter(numeric)`, `items=rows.map(r=>({label, ranks}))`,
`highlight`), guard `checkBumpConformance:1385` wired, flip, family (ranking), SKILL.md, verify `bump.md`.
**Render-verify (a11y RED→GREEN + reachable).** Commit `feat(chart-native): productionize bump end-to-end (+ label→ink a11y fix)`.

## Task 5: violin (needs KB authoring)
**violin** (distribution) — single `FILL:46` (no extract). **Author `knowledge/references/chart/types/violin.md`**
(mirror `boxplot.md`; sourced URLs only — FT Visual Vocabulary / data-to-viz distribution refs; cross-ref
`checkViolinConformance`). Mapper = identical shape to boxplot (group raw rows into `{label, values:number[]}`
per category; `catCol=columns[0]`, `valCol=numericColumns[last]`; optional `summaryLabel`). Guard
`checkViolinConformance:674` wired, flip, family (distribution), SKILL.md. **Render-verify.** Commit
`feat(chart-native): productionize violin end-to-end (+ author KB ref)`.

---

## Definition of done
- 7 types reachable end-to-end (mapper + guard-wired + flip + family + SKILL + KB), each render-verified at the
  PNG by the controller. `bun run check` green after every task (completeness invariant accepts all 7).
- bump: a11y label→ink fix verified RED→GREEN at snap-contrast. violin: KB authored (sourced). pyramid: KB
  id→display-name mapping (population-pyramid.md).
- Per-task review + whole-branch opus before merge `--no-ff`. Zero `any`/vendor. Record in CLAUDE.md.
- Sequencing: cheap first (T1-T2), then fan (T3), then bump a11y (T4), then violin KB (T5).

## Backlog (out of scope)
- Family B (15 types: heatmap/sankey/chord/gantt/etc.) — deferred by design (specialist data).
- If any guard's `checkXConformance` input needs a layout re-run (like bar/stacked), mirror the existing
  layout-DIMS pattern in produce-conformance.ts.
