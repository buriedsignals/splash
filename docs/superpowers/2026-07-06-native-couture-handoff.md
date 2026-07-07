# Native couture — handoff for the remaining chart types (2026-07-06)

> **Purpose:** durable capture of the SCOUT grounding for the 10 remaining Family-A native chart types
> (the scouts ran in ephemeral workflow transcripts — this doc is the portable record) + the systemic
> a11y finding + one open design decision + the resume procedure. Read this + `CLAUDE.md` (current-state
> section) + `git log --oneline -20` to resume. All recipes below are grounded (file:line); a type can be
> re-scouted for exact code, but the SHAPE + gotchas + a11y status are captured here.

## Where we are

`main` at the end of 2026-07-06: **14 native chart types reachable end-to-end** (article → suggester →
mapper → conformant produce → render), `bun run check` **14/14**. Done: bar, line, scatter, pie, grouped,
histogram, lollipop, connected-scatter, beeswarm, stacked, stacked-area, dot-strip, waffle, radial-bar.

The proven recipe to productionize a native type (per `docs/.../specs/2026-07-06-native-engine-end-to-end-design.md`):
**mapper (`spec-to-config.ts`) + produce-time guard (`produce-conformance.ts`, inline case reusing the
type's existing `checkXConformance`) + family entry (`native-family-types.ts`) + flip off `deferred`
(`native-types.ts`) + advertise in `suggest-chart/SKILL.md` + KB ref (author if missing) + render-verify
(produce `static`, Read the PNG)**. The completeness invariant (`chart-native/tests/completeness.test.ts`
+ `suggest-chart/eval/tests/native-family-types.test.ts`) enforces it. Extract a module-private palette
ARRAY to `core/tokens.ts` (so the guard paints the SAME colours the component renders); a palette that is
just an `OKABE_ITO.<x>` alias needs no extraction. Each guard case must land BEFORE its mapper (guarded-
but-unreachable keeps the gate green; reachable-but-unguarded fails the HARD invariant). Each new type
task must land the flip + family + SKILL.md together (the family-coverage test rejects a deferred type in
the family table).

## ★ Systemic a11y finding (the biggest thing for the next session)

Scouting the remaining types surfaced that **many components paint their VALUE LABELS in the mark colour**
(vermillion/orange < 4.5:1 on white) — the same WCAG class as the stacked-area bug fixed this session.
Affected: **diverging, dumbbell, waterfall, bullet** (single) + **slope** (highlighted end-labels in the
accent). Each needs a **component fix: paint value labels in `COLORS.ink`, keep the sign/role/series via
the mark colour** (the established rule "le label porte la valeur, le mark porte la teinte"; precedent:
vermillion + stacked-area). A truthfully-grounded guard (textColors including the mark colours) will
CORRECTLY FAIL until the component is fixed — so the guard exposes the bug; the component fix makes it pass.

**Open design decision to settle (→ brainstorming) before/at the a11y batch:** the seriesColors-family
checks WCAG-check only the `textColors` the guard-wiring passes — so a future edit reintroducing a mark-
coloured label passes the guard silently (caught only by render-verify). Decide: (a) keep the discipline
(guard-wiring grounded per component + render-verify), or (b) a **mechanical enhancement** — have each
component export its painted label-fill set, feed it into the guard, so label-in-mark-colour is caught
mechanically for ALL types. (b) is the more robust "grave au niveau système" move but is a broader change.

## Group A — the a11y batch (RECOMMENDED NEXT — highest value: fixes real WCAG bugs)

Each: a `label→ink` component fix + a bespoke-inline guard (the check exists) + mapper + family + flip +
SKILL.md. All KB refs EXIST (no authoring). Guard `textColors` becomes `[ink,muted]` and honest AFTER the
component fix.

- **diverging** (single, family `deviation`; KB `diverging-bar.md` ✓). Config `{title,source,unit,catField,valField,rows}` (no sort/highlight). Palette module-private `POS=OKABE_ITO.blue`, `NEG=OKABE_ITO.vermillion` (`DivergingBarChart.tsx:44-45`) → extract `DIVERGING_SIGN_COLORS=[blue,vermillion]`. ★ a11y: signed value label painted `fill={fill}` at `DivergingBarChart.tsx:236` (NEG vermillion 3.87:1) → fix to `COLORS.ink`. Check `checkDivergingBarConformance(input{title,source,valueDomain,signColors}, textColors)` (`conformance.ts:153`). Guard: `computeDivergingLayout(...,"desc")` → valueDomain; signColors=[blue,vermillion]. Mapper: pie-style (catField=col0, valField=last numeric). Data precondition: values must span 0 (check requires it) — ② routes diverging only when they cross zero. Simplest of Group A.
- **dumbbell** (paired, family `magnitude`/`ranking`; KB `dumbbell.md` ✓). Config paired (category + 2 values start/end). Palette module-private `LEFT_COLOR=OKABE_ITO.orange`, `RIGHT_COLOR=OKABE_ITO.blue`, `CONNECTOR=COLORS.muted` (`DumbbellChart.tsx:49-51`) → extract `DUMBBELL_DOT_COLORS`. ★ a11y WORST: value labels in mark colour, orange 2.25:1 (`DumbbellChart.tsx:297,308`) → fix to `COLORS.ink`. Check `checkDumbbellConformance` (`conformance.ts:607`). Mapper: paired (labelCol=col0, 2 numeric = start/end).
- **waterfall** (single/ordered, family `deviation`; KB `waterfall.md` ✓). Palette module-private `UP=blue`, `DOWN=vermillion`, `TOTAL=…` (`WaterfallChart.tsx:43-44`) → extract roleColors. ★ a11y: signed value label in vermillion decrease-role colour 3.87:1 (`WaterfallChart.tsx:282-292`) → fix to ink. Check `checkWaterfallConformance(input{…roleColors[],rows[]}, textColors)` (`conformance.ts:190`). `computeWaterfallLayout` for valueDomain. Mapper: `label,value[,total]` — CSV may carry a `total` column (running-total marker); synthesize the cumulative.
- **bullet** (single, family `magnitude`; KB `bullet.md` ✓). Palette `HIT=blue`, `MISS=vermillion` (`BulletChart.tsx:50-51`). ★ a11y: value label in measure mark colour (vermillion 3.87:1) → fix to ink. Check `checkBulletConformance` (`conformance.ts:352`), no compute-layout (baseline-0 per-row [0,max] by construction). ★ MAPPER is the hard part: `NativeSpec` has NO target/max/bands fields → the mapper must SYNTHESIZE per-row max + qualitative bands from a `category,value,target` CSV (a small design choice: derive bands as fractions of max, target from a column). Consider deferring bullet within Group A (heaviest mapper).
- **slope** (wide=2 time points, family `change-over-time`; KB `slope.md` ✓). Config SPECIAL: exactly 2 time points, a neutral context + one accent. Check `checkSlopeConformance(input{…leftPeriod,rightPeriod,accentColor,lineColors[]}, textColors)` (`conformance.ts:568`) — accentColor + lineColors (≤2), NO valueDomain (position encoding). ★ a11y: when a highlight is present the component paints highlighted end-labels in ACCENT (vermillion risk) → textColors must include accent OR fix labels to ink. Mapper SPECIAL: 2 time-point columns → left/right; a highlight hint. Heaviest of Group A after bullet.

**Suggested Group-A order:** diverging → waterfall → dumbbell (clean-ish label fixes, roleColors/signColors) then slope, bullet (heavier mappers). Or split into two batches.

## Group B — treemap (near-clean, no a11y fix for the reachable path)

- **treemap** (flat single, family `part-to-whole`; KB `treemap.md` ✓). Palette module-private `GROUP_COLORS=[blue,orange,green,purple,vermillion]` (`TreemapChart.tsx:45-51`) → extract `TREEMAP_GROUP_COLORS`. Check `checkTreemapConformance` (`conformance.ts:1315`), pie-style inline (NO layout). ★ a11y nuance: the component's in-cell label colour is luminance-chosen (mark→label), a LATENT WCAG defect ONLY for GROUPED (hierarchical) treemaps. The **reachable FLAT path is WCAG-safe** (all cells `OKABE_ITO.blue` → white in-cell labels stay legible), so the mapper should build a FLAT treemap (`items[]`, no grouping) and NO component fix is needed for this slice. Mapper: pie-style building `items[]`. Could ride alongside Group A or a clean batch.

## Group C — bespoke structural (wide/structural mappers; no a11y label bug flagged)

All KB refs EXIST. Each needs a bespoke mapper (NOT the plain grouped "every numeric col = a series" sweep) + a bespoke-inline guard.

- **bump** (wide rank-over-time, family `change-over-time`; KB `bump.md` ✓). Check `checkBumpConformance(input{title,source,periodCount,maxRank,highlightCount,accentColors[]}, textColors)`. Palette `BUMP_ACCENT_COLORS`. Guard twist: **maxRank = `Math.max` over ranks INLINE, NOT via computeBumpLayout** (the geometry throws on the <2-periods/mismatched-length edge cases the check flags). Mapper: wide (period col0 + item columns). textColors [ink,muted]. Closest to clean of Group C.
- **pyramid** (population-pyramid, family `distribution`; KB `population-pyramid.md` ✓). Check `checkPopulationPyramidConformance` (`conformance.ts:245`). Palette FIXED 2-element `LEFT_COLOR`/`RIGHT_COLOR` module-private → extract `PYRAMID_GROUP_COLORS`. NO layout. Mapper SPECIAL: `age,male,female` (age + two mirrored measures), NOT the grouped sweep.
- **diverging-stacked** (wide Likert, family `part-to-whole`/`deviation`; KB `diverging-stacked.md` ✓). Check `checkDivergingStackedConformance` (`conformance.ts:1230`). Palette: two-sided sentiment RAMP by depth-from-neutral via a bespoke `colorOf()` (NOT `PALETTE[i%len]`); ★ the neutral `#BFBFBF` is deliberately non-Okabe-Ito and MUST be EXCLUDED from `sentimentColors` passed to the check. NO layout. Mapper: item col + one numeric col per ordered response.
- **fan** (wide uncertainty, family `change-over-time`; KB `fan.md` ✓). Check `checkFanConformance(input{…levels[],forecast,hue}, textColors)` (`conformance.ts:1022`) — single `hue`, NO layout. Mapper SPECIAL: `xField=col0`; DERIVE `levels` + a `forecast` array reshaped from `lo{level}`/`hi{level}` DATA columns (nesting bounds). Heaviest data reshape.

## Family B — deferred by design (structural data an article rarely yields)

Leave `deferred(reason)`: sankey, chord, heatmap (matrices), gantt (intervals), candlestick (OHLC),
calendar (dense date grid), marimekko (2D), streamgraph/radar/parallel (rare-newsroom), lorenz
(specialist), arc (hierarchy), pictogram (stylistic variant of waffle). Wire one only if a real story needs it.

## Backlog (non-blocking, from the whole-branch reviews)

- **Guard robustness:** the layout-computing guards (grouped/stacked/stacked-area/radial-bar) `throw` (uncaught) instead of returning a violation when `compute*Layout` fails a precondition (e.g. non-numeric first column). Mirrors the render (mis-produces nothing), but noisy. Fix ONCE at the `runProduceConformance` boundary (try/catch → violation).
- **DotStripChart** hardcodes "Individual pupil"/"pupil" in legend/tooltip/aria (leftover school sample) → generic wording for newsroom reuse.
- **parseCsv** drops a leading zero ("00"→0) — cosmetic (radial-bar hour labels).
- Single-`dataColor` checks (radial-bar, dot-strip) don't verify the secondary/peak colour — latent (both are Okabe-Ito). Inherent to those check signatures.
- **Satellites** (separate tracks): map-native conformance parity (maps produce with NO conformance guard — extract `resolveMapConformanceColors` + wire `map-native/produce.mjs`); export-time hash enforcement (`approvedHash` exists, not enforced at export); release MIT (confirm `REPO_URL` in `docs/installer/generate.js` + run `scripts/scrub-trailers.sh --yes`); split this CLAUDE.md (state vs changelog).

## Resume procedure

1. Read `CLAUDE.md` (the `★ État` blocks at the end) + this doc + `git log --oneline -20`.
2. Pick a batch (recommended: **Group A a11y** — settle the design decision above via `superpowers:brainstorming` first, since it's design-bearing; then `writing-plans` + `subagent-driven-development`).
3. Follow the recipe (mapper + guard + family + flip + SKILL.md + KB + render-verify), guard-before-mapper, green-after-each-task. Extract module-private palettes to `tokens.ts`. Fix any label-in-mark-colour to ink BEFORE wiring the guard. **Render-verify every type at the PNG yourself** — the repeated lesson.
4. Per-task review + whole-branch review (opus) before merge — they have caught the real defects this whole effort relied on (SKILL.md over-claim, the a11y bugs, drift). merge `--no-ff`; record in CLAUDE.md.

`.superpowers/sdd/progress.md` is the SDD ledger (gitignored, not portable) — a fresh session starts a new one per batch.
