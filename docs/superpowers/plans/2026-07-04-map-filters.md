# Interactive Map Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reader-facing filters (category toggle, value range slider, time step slider) to interactive web maps in `map-native`, shared across all applicable map types.

**Architecture:** A `filters` block on the map config declares filterable fields. A pure core (`map-filter.ts`) turns filter state into a MapLibre filter expression; a shared `MapFilterBar` renders the controls under the title; each map component applies the state via `setFilter` (category/range) or the `progress`/frame model (time). Interactive-web only; static/video render the default. The bar reserves a band in `resolveMapFrame` and is covered by the occlusion guardrail.

**Tech Stack:** React 19, MapTiler/MapLibre SDK, TypeScript, bun:test, Playwright (snaps).

## Global Constraints

- Bun always (never npm/node). TypeScript. English code/comments/commits.
- No Claude/Anthropic mention anywhere in code, comments, or commits.
- `.tsx` files must be NUL-byte-free.
- Every task ends with a guardrail (a test/check that fails on recurrence) and, for render changes, a render-verify.
- Data must ALWAYS be visible: the filter bar reserves its own band; `dataNotUnderFurnitureOk` must cover it.
- Filters render ONLY in the interactive build; static PNG and video ignore `filters`.
- `filters` compose with AND; ≤ 2 filters per map.
- Layer ids for `setFilter`: choropleth `choropleth-fill`, symbol `symbol-circles`, locator `locator-glyphs`, dot-density `dot-density-dots`, hex-grid `hex-grid-cells`, cartogram `cartogram-cells`. Route is excluded (no data field).

---

### Task 1: Pure filter core (`map-filter.ts`)

**Files:**
- Create: `skills/map-native/src/core/map-filter.ts`
- Test: `skills/map-native/tests/map-filter.test.ts`

**Interfaces:**
- Produces: `MapFilter`, `FilterState`, `FilterOption`, `deriveFilterOptions(filters, rows)`, `filterStateToExpression(state, filters)`, `activeTimeStep(state, filters)`, `validateMapFilters(filters, rows)`.

- [ ] **Step 1: Write the failing test**

```ts
// skills/map-native/tests/map-filter.test.ts
import { describe, it, expect } from "bun:test";
import {
  deriveFilterOptions,
  filterStateToExpression,
  activeTimeStep,
  validateMapFilters,
  type MapFilter,
} from "../src/core/map-filter";

const rows = [
  { name: "A", kind: "city", pop: 10, year: 2000 },
  { name: "B", kind: "port", pop: 40, year: 2010 },
  { name: "C", kind: "city", pop: 25, year: 2020 },
];

describe("deriveFilterOptions", () => {
  it("category → sorted distinct values; range → [min,max]+step; time → sorted steps", () => {
    const opts = deriveFilterOptions(
      [
        { kind: "category", field: "kind" },
        { kind: "range", field: "pop" },
        { kind: "time", field: "year" },
      ],
      rows,
    );
    expect(opts[0]).toMatchObject({ kind: "category", field: "kind", values: ["city", "port"] });
    expect(opts[1]).toMatchObject({ kind: "range", field: "pop", min: 10, max: 40 });
    expect(opts[1].step).toBeGreaterThan(0);
    expect(opts[2]).toMatchObject({ kind: "time", field: "year", steps: [2000, 2010, 2020] });
  });
});

describe("filterStateToExpression", () => {
  const filters: MapFilter[] = [
    { kind: "category", field: "kind" },
    { kind: "range", field: "pop", mode: "atLeast" },
  ];
  it("no constraint (all cats, threshold at min) → show-all ['all']", () => {
    const expr = filterStateToExpression(
      { kind: ["city", "port"], pop: 10 },
      deriveFilterOptions(filters, rows),
    );
    expect(expr).toEqual(["all"]);
  });
  it("a hidden category → an 'in' clause over the visible ones only", () => {
    const expr = filterStateToExpression(
      { kind: ["city"], pop: 10 },
      deriveFilterOptions(filters, rows),
    );
    expect(expr).toEqual(["all", ["in", ["get", "kind"], ["literal", ["city"]]]]);
  });
  it("a raised atLeast threshold → a >= clause", () => {
    const expr = filterStateToExpression(
      { kind: ["city", "port"], pop: 25 },
      deriveFilterOptions(filters, rows),
    );
    expect(expr).toEqual(["all", [">=", ["get", "pop"], 25]]);
  });
});

describe("validateMapFilters", () => {
  it("accepts a valid set", () => {
    expect(validateMapFilters([{ kind: "category", field: "kind" }], rows).ok).toBe(true);
  });
  it("rejects an absent field, bad cardinality, >2 filters, non-numeric range", () => {
    expect(validateMapFilters([{ kind: "category", field: "nope" }], rows).ok).toBe(false);
    expect(validateMapFilters([{ kind: "range", field: "name" }], rows).ok).toBe(false);
    expect(
      validateMapFilters(
        [
          { kind: "category", field: "kind" },
          { kind: "range", field: "pop" },
          { kind: "time", field: "year" },
        ],
        rows,
      ).ok,
    ).toBe(false); // > 2
  });
  it("rejects a category with cardinality outside 2–8", () => {
    const one = [{ name: "A", kind: "x" }];
    expect(validateMapFilters([{ kind: "category", field: "kind" }], one).ok).toBe(false);
  });
});

describe("activeTimeStep", () => {
  it("returns the selected step, or the latest when unset", () => {
    const opts = deriveFilterOptions([{ kind: "time", field: "year" }], rows);
    expect(activeTimeStep({ year: 2010 }, opts)).toBe(2010);
    expect(activeTimeStep({}, opts)).toBe(2020); // default = latest
  });
});
```

- [ ] **Step 2: Run it — expect FAIL** (`bun test skills/map-native/tests/map-filter.test.ts`), "Cannot find module".

- [ ] **Step 3: Implement `map-filter.ts`**

```ts
// skills/map-native/src/core/map-filter.ts
// The PURE filter core (no React, no map). Declares the filter kinds, derives concrete control
// options from the data rows, and turns a filter STATE into a MapLibre filter expression.
// category/range → a setFilter expression; time is applied by the component via the frame model.

export type MapFilter =
  | { kind: "category"; field: string; label?: string }
  | { kind: "range"; field: string; label?: string; mode?: "atLeast" | "atMost" | "between" }
  | { kind: "time"; field: string; label?: string };

export type FilterOption =
  | { kind: "category"; field: string; label: string; values: string[] }
  | {
      kind: "range";
      field: string;
      label: string;
      min: number;
      max: number;
      step: number;
      mode: "atLeast" | "atMost" | "between";
    }
  | { kind: "time"; field: string; label: string; steps: number[] };

// field → value(s): category = the visible values; range = threshold (atLeast/atMost) or [lo,hi]
// (between); time = the selected step.
export type FilterState = Record<string, unknown>;

const humanise = (f: string) =>
  f.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const distinct = <T>(xs: T[]) => [...new Set(xs)];

function niceStep(min: number, max: number): number {
  const span = Math.max(1e-9, max - min);
  const raw = span / 20; // ~20 stops
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const nice = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
  return nice * mag;
}

export function deriveFilterOptions(
  filters: MapFilter[],
  rows: Record<string, unknown>[],
): FilterOption[] {
  return filters.map((f): FilterOption => {
    if (f.kind === "category") {
      const values = distinct(rows.map((r) => String(r[f.field]))).sort();
      return { kind: "category", field: f.field, label: f.label ?? humanise(f.field), values };
    }
    if (f.kind === "range") {
      const nums = rows.map((r) => Number(r[f.field])).filter((n) => Number.isFinite(n));
      const min = Math.min(...nums);
      const max = Math.max(...nums);
      return {
        kind: "range",
        field: f.field,
        label: f.label ?? humanise(f.field),
        min,
        max,
        step: niceStep(min, max),
        mode: f.mode ?? "atLeast",
      };
    }
    const steps = distinct(rows.map((r) => Number(r[f.field])))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b);
    return { kind: "time", field: f.field, label: f.label ?? humanise(f.field), steps };
  });
}

// A MapLibre FilterSpecification; typed loosely to avoid a hard SDK dependency in the core.
export type FilterExpression = unknown[];

export function filterStateToExpression(
  state: FilterState,
  options: FilterOption[],
): FilterExpression {
  const clauses: unknown[] = [];
  for (const o of options) {
    if (o.kind === "category") {
      const visible = (state[o.field] as string[] | undefined) ?? o.values;
      // constrain ONLY when something is hidden (fewer visible than the full set)
      if (visible.length < o.values.length)
        clauses.push(["in", ["get", o.field], ["literal", [...visible]]]);
    } else if (o.kind === "range") {
      if (o.mode === "between") {
        const [lo, hi] = (state[o.field] as [number, number] | undefined) ?? [o.min, o.max];
        if (lo > o.min) clauses.push([">=", ["get", o.field], lo]);
        if (hi < o.max) clauses.push(["<=", ["get", o.field], hi]);
      } else {
        const t = (state[o.field] as number | undefined) ?? (o.mode === "atMost" ? o.max : o.min);
        if (o.mode === "atMost") {
          if (t < o.max) clauses.push(["<=", ["get", o.field], t]);
        } else if (t > o.min) clauses.push([">=", ["get", o.field], t]);
      }
    }
    // time is NOT a setFilter clause — the component applies it via the frame model.
  }
  return ["all", ...clauses];
}

export function activeTimeStep(state: FilterState, options: FilterOption[]): number | null {
  const t = options.find((o) => o.kind === "time");
  if (!t || t.kind !== "time" || !t.steps.length) return null;
  const sel = state[t.field] as number | undefined;
  return sel != null ? sel : t.steps[t.steps.length - 1]; // default = latest
}

export function validateMapFilters(
  filters: MapFilter[] | undefined,
  rows: Record<string, unknown>[],
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!filters || filters.length === 0) return { ok: true };
  if (filters.length > 2) errors.push("at most 2 filters per map");
  const cols = new Set(rows.length ? Object.keys(rows[0]) : []);
  for (const f of filters) {
    if (!cols.has(f.field)) {
      errors.push(`filter field "${f.field}" is not a data column`);
      continue;
    }
    if (f.kind === "category") {
      const n = new Set(rows.map((r) => String(r[f.field]))).size;
      if (n < 2 || n > 8) errors.push(`category "${f.field}" needs 2–8 distinct values (has ${n})`);
    } else if (f.kind === "range") {
      if (!rows.every((r) => Number.isFinite(Number(r[f.field]))))
        errors.push(`range "${f.field}" must be numeric`);
    } else {
      const steps = new Set(rows.map((r) => Number(r[f.field]))).size;
      if (steps < 2) errors.push(`time "${f.field}" needs ≥2 steps`);
    }
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}
```

- [ ] **Step 4: Run tests — expect PASS.** `bun test skills/map-native/tests/map-filter.test.ts`

- [ ] **Step 5: Commit**

```bash
git add skills/map-native/src/core/map-filter.ts skills/map-native/tests/map-filter.test.ts
git commit -m "feat(map): pure filter core — options, expression, validation"
```

---

### Task 2: Reserve the filter bar band in `resolveMapFrame`

**Files:**
- Modify: `skills/map-native/src/core/map-format.ts`
- Test: `skills/map-native/tests/map-format.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `resolveMapFrame(w, h, { …, filterBarHeight?: number })` — `pad.top` includes `filterBarHeight`.

- [ ] **Step 1: Write the failing test** (append to `map-format.test.ts`)

```ts
it("reserves a supplied filterBarHeight in the top band", () => {
  const without = resolveMapFrame(1280, 720, { titleHeightPx: 120 });
  const withBar = resolveMapFrame(1280, 720, { titleHeightPx: 120, filterBarHeight: 44 });
  expect(withBar.pad.top - without.pad.top).toBeGreaterThanOrEqual(44);
});
```

- [ ] **Step 2: Run it — expect FAIL** (`pad.top` equal, difference 0).

- [ ] **Step 3: Implement.** In `resolveMapFrame` add `filterBarHeight` to the opts and the top band. The `opts` destructure gains `const filterBarHeight = opts.filterBarHeight ?? 0;`, the interface gains `filterBarHeight?: number;`, and `topBand` becomes:

```ts
const topBand =
  gutter + Math.max(titleEstimate, titleHeightPx) + filterBarHeight + MARKER_CLEARANCE;
```

- [ ] **Step 4: Run tests — expect PASS.** `bun test skills/map-native/tests/map-format.test.ts`

- [ ] **Step 5: Commit**

```bash
git add skills/map-native/src/core/map-format.ts skills/map-native/tests/map-format.test.ts
git commit -m "feat(map): resolveMapFrame reserves a filter-bar band"
```

---

### Task 3: Shared `MapFilterBar` component

**Files:**
- Create: `skills/map-native/src/core/MapFilterBar.tsx`
- Test: `skills/map-native/tests/map-filterbar.test.tsx`

**Interfaces:**
- Consumes: `FilterOption`, `FilterState`, `deriveFilterOptions` (Task 1).
- Produces: `MapFilterBar` (React.FC) with props `{ options: FilterOption[]; state: FilterState; onChange: (s: FilterState) => void; dark?: boolean; onHeight?: (px: number) => void }`, rendered with `data-testid="map-filterbar"`. Category chips have `data-testid="filter-chip"`; the last visible chip cannot be turned off.

- [ ] **Step 1: Write the failing test** (renders chips; toggling emits new state; keeps ≥1 visible)

```tsx
// skills/map-native/tests/map-filterbar.test.tsx
import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MapFilterBar } from "../src/core/MapFilterBar";
import type { FilterOption } from "../src/core/map-filter";

const opts: FilterOption[] = [
  { kind: "category", field: "kind", label: "Kind", values: ["city", "port"] },
];

describe("MapFilterBar", () => {
  it("renders a testid bar and a chip per category value", () => {
    const html = renderToStaticMarkup(
      <MapFilterBar options={opts} state={{ kind: ["city", "port"] }} onChange={() => {}} />,
    );
    expect(html).toContain('data-testid="map-filterbar"');
    expect((html.match(/data-testid="filter-chip"/g) ?? []).length).toBe(2);
  });
});
```

- [ ] **Step 2: Run it — expect FAIL** (module missing). `bun test skills/map-native/tests/map-filterbar.test.tsx`

- [ ] **Step 3: Implement `MapFilterBar.tsx`.** A frosted full-width bar. Category → toggle chips (a chip in `state[field]` is "on"; clicking toggles, but if it's the last "on" chip, ignore — the map never empties). Range → an `<input type="range" min max step>` bound to `state[field]`; `between` renders two thumbs. Time → an `<input type="range">` snapped to `steps` indices, showing the current step label. On any change, call `onChange({ ...state, [field]: next })`. Measure the bar height via a `ResizeObserver` and call `onHeight(px)`. Use `FRAME_COLORS`/`FRAME_COLORS_DARK`/`FRAME_FONT` from `../theme/map-tokens` for styling. Full component:

```tsx
// skills/map-native/src/core/MapFilterBar.tsx
import { useEffect, useRef } from "react";
import { FRAME_COLORS, FRAME_COLORS_DARK, FRAME_FONT } from "../theme/map-tokens";
import type { FilterOption, FilterState } from "./map-filter";

export interface MapFilterBarProps {
  options: FilterOption[];
  state: FilterState;
  onChange: (s: FilterState) => void;
  dark?: boolean;
  onHeight?: (px: number) => void;
}

export function MapFilterBar({ options, state, onChange, dark = false, onHeight }: MapFilterBarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const colors = dark ? FRAME_COLORS_DARK : FRAME_COLORS;

  useEffect(() => {
    const el = ref.current;
    if (!el || !onHeight) return;
    const notify = () => onHeight(el.offsetHeight);
    notify();
    const ro = new ResizeObserver(notify);
    ro.observe(el);
    return () => ro.disconnect();
  }, [onHeight]);

  const set = (field: string, value: unknown) => onChange({ ...state, [field]: value });

  return (
    <div
      ref={ref}
      data-testid="map-filterbar"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        alignItems: "center",
        background: colors.pill,
        borderRadius: 6,
        padding: "6px 10px",
        fontFamily: FRAME_FONT,
        fontSize: 12,
        color: colors.ink,
        pointerEvents: "auto",
      }}
    >
      {options.map((o) => {
        if (o.kind === "category") {
          const visible = (state[o.field] as string[] | undefined) ?? o.values;
          return (
            <div key={o.field} style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ color: colors.muted }}>{o.label}:</span>
              {o.values.map((v) => {
                const on = visible.includes(v);
                return (
                  <button
                    key={v}
                    type="button"
                    data-testid="filter-chip"
                    aria-pressed={on}
                    onClick={() => {
                      const next = on ? visible.filter((x) => x !== v) : [...visible, v];
                      if (next.length === 0) return; // never empty the map
                      set(o.field, next);
                    }}
                    style={{
                      cursor: "pointer",
                      borderRadius: 999,
                      border: `1px solid ${colors.muted}`,
                      padding: "2px 10px",
                      background: on ? colors.ink : "transparent",
                      color: on ? colors.pill : colors.ink,
                    }}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
          );
        }
        if (o.kind === "range") {
          const t = (state[o.field] as number | undefined) ?? (o.mode === "atMost" ? o.max : o.min);
          return (
            <label key={o.field} style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ color: colors.muted }}>{o.label}</span>
              <input
                type="range"
                min={o.min}
                max={o.max}
                step={o.step}
                value={t}
                data-testid="filter-range"
                onChange={(e) => set(o.field, Number(e.target.value))}
              />
              <span>{o.mode === "atMost" ? `≤ ${t}` : `≥ ${t}`}</span>
            </label>
          );
        }
        // time
        const sel = (state[o.field] as number | undefined) ?? o.steps[o.steps.length - 1];
        const idx = Math.max(0, o.steps.indexOf(sel));
        return (
          <label key={o.field} style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ color: colors.muted }}>{o.label}</span>
            <input
              type="range"
              min={0}
              max={o.steps.length - 1}
              step={1}
              value={idx}
              data-testid="filter-time"
              onChange={(e) => set(o.field, o.steps[Number(e.target.value)])}
            />
            <span>{sel}</span>
          </label>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run tests — expect PASS.** If `react-dom/server` is unavailable in this workspace, assert via a shallow render helper already used in the repo; otherwise keep the SSR assertion.

- [ ] **Step 5: Commit**

```bash
git add skills/map-native/src/core/MapFilterBar.tsx skills/map-native/tests/map-filterbar.test.tsx
git commit -m "feat(map): shared MapFilterBar (category chips / range + time sliders)"
```

---

### Task 4: Config type + `validateMapFilters` wired into produce-time validation

**Files:**
- Modify: `skills/map-native/src/validate-config.ts` (add `filters?: MapFilter[]` to the config types; call `validateMapFilters` inside each `validate*Config`)
- Test: `skills/map-native/tests/validate-config.test.ts` (or the existing config test file)

**Interfaces:**
- Consumes: `validateMapFilters`, `MapFilter` (Task 1).
- Produces: config validation rejects a bad `filters` block with the core's errors.

- [ ] **Step 1: Write the failing test** — a choropleth config with `filters:[{kind:"range",field:"missing"}]` fails validation with a filter error; a valid `filters:[{kind:"range",field:"<valueField>"}]` passes.

```ts
it("rejects an invalid filters block and accepts a valid one", () => {
  const base = { regionKey: "iso", valueField: "v", basemap: "world",
    rows: [{ iso: "FRA", v: 5 }, { iso: "DEU", v: 9 }], title: "T", source: { name: "s" } };
  expect(validateChoroplethConfig({ ...base, filters: [{ kind: "range", field: "nope" }] }).ok).toBe(false);
  expect(validateChoroplethConfig({ ...base, filters: [{ kind: "range", field: "v" }] }).ok).toBe(true);
});
```

- [ ] **Step 2: Run it — expect FAIL** (filters ignored → both pass).

- [ ] **Step 3: Implement.** Import `validateMapFilters` + `MapFilter` into `validate-config.ts`. Add `filters?: MapFilter[]` to each config interface (choropleth/symbol/locator/dot-density/hex-grid/cartogram). In each `validate*Config`, after `rows`/`points` are known, do:

```ts
const rowsForFilters = (s.rows as Record<string, unknown>[]) ?? (s.points as Record<string, unknown>[]) ?? [];
const fr = validateMapFilters(s.filters as MapFilter[] | undefined, rowsForFilters);
if (!fr.ok) errors.push(...fr.errors);
```

- [ ] **Step 4: Run tests — expect PASS.** `bun test skills/map-native/tests/validate-config.test.ts`

- [ ] **Step 5: Commit**

```bash
git add skills/map-native/src/validate-config.ts skills/map-native/tests/validate-config.test.ts
git commit -m "feat(map): validate the filters block at produce time"
```

---

### Task 5: Wire filters into ChoroplethMap (the reference integration — range + time)

**Files:**
- Modify: `skills/map-native/src/ChoroplethMap.tsx`
- Test: (render smoke in Task 7; this task's gate is manual render-verify + typecheck)

**Interfaces:**
- Consumes: `MapFilterBar`, `deriveFilterOptions`, `filterStateToExpression`, `activeTimeStep`.
- Produces: the wiring pattern Task 6 replicates: render `<MapFilterBar>` inside `<MapFrame>` (below the title), pass `filterBarHeight` (measured) to `resolveMapFrame`, and on `onChange` call `map.setFilter("choropleth-fill", expr)` + (if a time filter) re-derive the frame for `activeTimeStep`.

- [ ] **Step 1** — verify the fill layer's features expose the filter fields as `properties`. In `choropleth-geo.ts`, the joined GeoJSON feature must carry `properties[valueField]` (and any category field). If absent, add them so `setFilter` can read `["get", field]`. Confirm by logging one feature's properties in a scratch build.

- [ ] **Step 2: Implement the wiring.** In `ChoroplethMap.tsx`:
  1. `import { MapFilterBar } from "./core/MapFilterBar"; import { deriveFilterOptions, filterStateToExpression, activeTimeStep } from "./core/map-filter";`
  2. `const filterOptions = useMemo(() => config.filters ? deriveFilterOptions(config.filters, config.rows) : [], [config]);`
  3. `const [filterState, setFilterState] = useState<FilterState>({});`
  4. `const [barHeightPx, setBarHeightPx] = useState(0);`
  5. Pass `filterBarHeight: interactive && filterOptions.length ? barHeightPx : 0` into every `resolveMapFrame(...)` opts (init + resize + the render-time `frame`).
  6. In an effect keyed on `filterState`: when `interactive && filterOptions.length`, `map.setFilter("choropleth-fill", filterStateToExpression(filterState, filterOptions) as never)`; if `activeTimeStep(...)` is non-null, set the component's active time (re-derive the choropleth values for that step — reuse the story/timeline value lookup).
  7. Render the bar inside `<MapFrame>` as a child positioned under the title (MapFrame gains a `belowTitle` slot — see Step 3), only when `interactive && filterOptions.length`.

- [ ] **Step 3: Add a `belowTitle` slot to `MapFrame`.** `MapFrame` renders `props.belowTitle` (a `ReactNode`) directly under the title/description block inside the title band container. This keeps the bar in the reserved top band. Wire `onHeight` from `MapFilterBar` → `setBarHeightPx` → `resolveMapFrame`.

- [ ] **Step 4: Render-verify.** Build a choropleth config with `filters:[{kind:"range",field:"<value>"}]`, produce interactive, load headless: assert the range slider reduces `queryRenderedFeatures("choropleth-fill").length` when raised, and `dataNotUnderFurnitureOk` still passes with the bar present. Command: `bun scripts/produce.mjs <cfg> /tmp/f-choro static` then a Playwright probe.

- [ ] **Step 5: Commit**

```bash
git add skills/map-native/src/ChoroplethMap.tsx skills/map-native/src/core/MapFrame.tsx skills/map-native/src/choropleth-geo.ts
git commit -m "feat(map): filters in ChoroplethMap (range + time) via the shared bar"
```

---

### Task 6: Roll the wiring out to symbol / locator / dot-density / hex-grid / cartogram

**Files:**
- Modify: `SymbolMap.tsx`, `LocatorMap.tsx`, `DotDensityMap.tsx`, `HexGridMap.tsx`, `CartogramMap.tsx`

**Interfaces:**
- Consumes: the Task 5 pattern (identical, changing only the layer id and the rows source).

- [ ] **Step 1** — for EACH component, apply the same 7-point wiring from Task 5 Step 2, with:
  - the layer id for `setFilter`: symbol `symbol-circles`, locator `locator-glyphs`, dot-density `dot-density-dots`, hex-grid `hex-grid-cells`, cartogram `cartogram-cells`;
  - the rows source: symbol `config.points`, others `config.rows`;
  - ensure the layer's features carry the filter fields in `properties` (add in the matching `*-geo.ts` if absent), same as Task 5 Step 1.
  Category filters are most relevant for locator/dot-density (they have a category field); range for symbol/hex-grid/cartogram (numeric value).

- [ ] **Step 2: Typecheck + per-type render-verify.** `bunx tsc --noEmit -p skills/map-native`. For locator with `filters:[{kind:"category",field:"category"}]`, toggling a chip drops the visible `locator-glyphs` feature count. For symbol with a range filter, raising the threshold drops `symbol-circles`.

- [ ] **Step 3: Commit**

```bash
git add skills/map-native/src/SymbolMap.tsx skills/map-native/src/LocatorMap.tsx skills/map-native/src/DotDensityMap.tsx skills/map-native/src/HexGridMap.tsx skills/map-native/src/CartogramMap.tsx skills/map-native/src/*-geo.ts
git commit -m "feat(map): filters across symbol/locator/dot-density/hex-grid/cartogram"
```

---

### Task 7: Occlusion guardrail covers the bar + a filter smoke

**Files:**
- Modify: `skills/map-native/scripts/snap-responsive.mjs`
- Create: `skills/map-native/scripts/smoke-filters.mjs`
- Create: `skills/map-native/assets/sample-data/filter-choropleth.json`, `filter-locator.json`

**Interfaces:**
- Consumes: the wired components.
- Produces: `dataNotUnderFurnitureOk` includes `[data-testid="map-filterbar"]`; a smoke that toggles a filter and asserts the feature count changes + no occlusion.

- [ ] **Step 1: Extend `dataNotUnderFurnitureOk`.** In `snap-responsive.mjs`, add the filter bar to the furniture rects tested:

```js
const filterbar = rectOf('[data-testid="map-filterbar"]');
// …
if (hit(p, title) || hit(p, legend) || hit(p, filterbar)) return false;
```

- [ ] **Step 2: Write `smoke-filters.mjs`.** Build `filter-choropleth.json` (interactive), load headless at 1000px: read `queryRenderedFeatures("choropleth-fill").length` at the slider min, drag the range input to a higher value, re-read — assert the second count is strictly smaller; assert no page errors; assert the filter bar is present. Repeat for `filter-locator.json` (category chip toggle drops `locator-glyphs`). Exit non-zero on any failure. Wire a `smoke:filters` script in `skills/map-native/package.json`.

- [ ] **Step 3: Run the smoke — expect OK.** `cd skills/map-native && bun scripts/smoke-filters.mjs`

- [ ] **Step 4: Run the full produce for a filtered config and confirm `dataNotUnderFurnitureOk:true` at 360/768/1100/1600.**

- [ ] **Step 5: Commit**

```bash
git add skills/map-native/scripts/snap-responsive.mjs skills/map-native/scripts/smoke-filters.mjs skills/map-native/assets/sample-data/filter-*.json skills/map-native/package.json
git commit -m "test(map): filter smoke + occlusion guardrail covers the filter bar"
```

---

### Task 8: ② emission guidance (suggest-chart)

**Files:**
- Modify: `skills/suggest-chart/SKILL.md`

**Interfaces:**
- Consumes: the config `filters` shape.
- Produces: guidance so ② emits `filters` only when Gate 2 fired and the data shape supports one.

- [ ] **Step 1: Add a "Filters (interactive maps)" note** to the map-native producer section: emit a `filters` array ONLY when the interactive format was chosen (Gate 2) AND the data supports it — a categorical column (2–8 values) → `{kind:"category",field}`, a numeric column worth exploring by threshold → `{kind:"range",field}`, a temporal column (≥3 steps) → `{kind:"time",field}`. At most 2. A filter must serve the story's exploration intent, never "all possible filters." Static/video ignore it. Include the JSON shape.

- [ ] **Step 2: Commit**

```bash
git add skills/suggest-chart/SKILL.md
git commit -m "docs(suggest-chart): emit interactive-map filters when Gate 2 fires"
```

---

## Self-review notes

- **Spec coverage:** category/range/time (Tasks 1,3,5,6); config+validation (Tasks 1,4); reservation+occlusion (Tasks 2,7); ② logic (Task 8); interactive-only + AND + ≤2 (Tasks 1,4); non-occlusion (Tasks 2,7). All covered.
- **Type consistency:** `MapFilter`/`FilterOption`/`FilterState` defined in Task 1 and consumed unchanged in 3–6; layer ids fixed in Global Constraints and reused in 5–7.
- **Open detail for the implementer:** Task 5 Step 1 / Task 6 Step 1 must confirm each layer's features expose the filter fields as `properties` (add in the `*-geo.ts` if missing) — flagged explicitly rather than assumed.
