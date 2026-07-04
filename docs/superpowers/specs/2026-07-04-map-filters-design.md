# Interactive map filters — design

**Goal:** Give the reader of an interactive web map filter controls — toggle categories, threshold a
value with a slider, and step through time — so an interactive map earns its interactivity (the
"reader exploration" that Gate 2 promises). One shared, declarative filter system across all 7 map
types; static and video are unchanged.

**Architecture:** A `filters` block on the map config declares WHICH fields are filterable (never the
values). A shared `MapFilterBar` renders the controls, derives their options from the data, owns the
filter state, and emits `onChange(state)`. Each map component applies the state — category/range via
MapLibre `setFilter`, time via the existing `progress`/frame model. Filters render only in the
interactive HTML; static PNG and video render the deterministic default state.

**Tech stack:** React + MapTiler/MapLibre (existing map-native), TypeScript, bun:test.

## Global Constraints

- Bun always. TypeScript. English code/comments/commits. No Claude/Anthropic mention anywhere.
- `.tsx` files must be NUL-byte-free.
- Every defect/feature ships a guardrail (a check that fails on recurrence) and is render-verified.
- Data must ALWAYS be visible: the filter bar reserves its own band and is covered by the
  `dataNotUnderFurnitureOk` render guardrail.
- Interactive-web only: static and video ignore `filters`.

## Scope

**In scope — three filter kinds:**
1. **category** — toggle chips per distinct value of a categorical field (default: all on).
2. **range** — a slider over a numeric field; `mode` = `atLeast` (single thumb, default) | `atMost` |
   `between` (dual thumb). Shows only features passing the threshold.
3. **time** — a step slider over the distinct values of a temporal field; scrubs the `progress`/frame
   model to that time step.

**Out of scope (YAGNI):** search / find-your-area; more than 2 filters per map; cross-filter analytics
(brushing/linked views); filter state persisted to the URL. `filters` compose with **AND** only.

## Config schema

Add to the map config (choropleth/symbol/locator/hex-grid/dot-density/cartogram; route has no data
field to filter and is excluded):

```ts
filters?: MapFilter[]; // ≤ 2 entries — a filter must earn its place (like annotations)

type MapFilter =
  | { kind: "category"; field: string; label?: string }
  | { kind: "range"; field: string; label?: string; mode?: "atLeast" | "atMost" | "between" }
  | { kind: "time"; field: string; label?: string };
```

- `field` names a column present in the data. `label` overrides the control's caption (defaults to a
  humanised field name).
- The bar DERIVES options from the data: category → the distinct values (2–8, else the filter is
  rejected at validation); range → `[min, max]` and a sensible step; time → the sorted distinct time
  values.
- Validation (`validateMapFilters`, pure): each `field` exists in the data; category cardinality is
  2–8; range field is numeric; time field is temporal; at most 2 filters; unknown `kind` → error.

## Components & data flow

- **`core/MapFilterBar.tsx`** (new, shared): props `{ filters, data, onChange, frame, dark }`. Renders
  the top control bar (chips / slider / step slider) below the title band. Owns
  `state: FilterState` and calls `onChange(state)` on every change. Pure presentation + local state;
  no map knowledge.
- **`core/map-filter.ts`** (new, pure, unit-tested):
  - `deriveFilterOptions(filters, rows)` → the concrete options (categories, min/max/step, time steps).
  - `filterStateToExpression(state, filters)` → a MapLibre `FilterSpecification`
    (`["all", …]` composing `["in", …]` / `[">=", …]` / `["<=", …]`), or `["all"]` when nothing is
    constrained. This is the tested core.
  - `activeTimeStep(state, filters)` → the selected time value (or null).
- **Each `<Type>Map>`**: when `interactive && config.filters?.length`, render `<MapFilterBar>` and, on
  its `onChange`, (a) `map.setFilter(dataLayer, filterStateToExpression(...))` for category/range and
  (b) set the component's `progress`/active frame from `activeTimeStep(...)` for time. Non-interactive
  builds skip the bar and apply no filter (default state).

**Time filter reuses the frame model.** The video/story build already computes per-time-step values
(`cameraForFrame` / the story timeline). A time filter is the reader driving `progress` to a discrete
step; the component re-derives that frame's paint. No new rendering path.

## Placement & non-occlusion

- The bar is a full-width band directly BELOW the title/description (chosen layout), frosted pill
  styling consistent with `MapFrame`.
- `resolveMapFrame` gains a `filterBarHeight` option; `topBand` becomes
  `gutter + max(titleEstimate, titleHeightPx) + filterBarHeight + MARKER_CLEARANCE`, so the fit
  reserves the bar and no data sits under it.
- The `dataNotUnderFurnitureOk` render guardrail extends to include the `[data-testid="map-filterbar"]`
  rect at every width.

## ② routing (suggest-chart)

`suggest-chart` emits `filters` ONLY when Gate 2 (interactive) fired AND the data shape supports one:
- a categorical column with 2–8 distinct values → a `category` filter;
- a numeric column worth exploring by threshold → a `range` filter;
- a temporal column with ≥3 steps → a `time` filter.

② emits the filter(s) that serve the story's EXPLORATION intent, never "all possible filters" (≤2).
Guidance + the emitted-config shape go in `suggest-chart/SKILL.md`. If Gate 2 did not fire (static is
the default), no filters are emitted.

## Degradation

- Static PNG / video: `filters` is ignored. The render shows the deterministic default: all categories
  on, full range, the latest time step (or a config-named default). No control bar.

## Error handling

- `validateMapFilters` rejects: a field absent from the data; category cardinality outside 2–8; a
  non-numeric range field; a non-temporal time field; > 2 filters. A rejected filter set fails the
  produce loudly (never silently drops a filter).
- A category toggle that would hide EVERY feature is prevented (the last active chip can't be turned
  off) — the map never goes empty.

## Testing / guardrails

- **Unit (`map-filter.test.ts`):** `filterStateToExpression` for each kind + AND composition + the
  "nothing constrained → show all" case; `deriveFilterOptions` (distinct cats, min/max, time steps);
  `validateMapFilters` accept/reject cases.
- **Unit (`map-format.test.ts`):** `filterBarHeight` is reserved in `topBand` (data clears the bar).
- **Render/smoke (`snap-responsive` + a filter smoke):** in the interactive build, toggling a category
  drops the rendered-feature count; the range slider reduces visible features; the time slider changes
  the painted values; `dataNotUnderFurnitureOk` includes the filter bar at 360/768/1100/1600.
- **Static:** the static PNG renders the default state with no filter bar present.

## File structure

- Create: `skills/map-native/src/core/MapFilterBar.tsx`, `skills/map-native/src/core/map-filter.ts`,
  `skills/map-native/tests/map-filter.test.ts`.
- Modify: `skills/map-native/src/core/map-format.ts` (+`filterBarHeight`),
  `skills/map-native/scripts/snap-responsive.mjs` (occlusion includes the bar), each `<Type>Map>` that
  supports filters (wire the bar + apply state), the map config type (+`filters`),
  `skills/map-native/src/validate-config.ts` (+`validateMapFilters`),
  `skills/suggest-chart/SKILL.md` (② guidance + emitted shape).
