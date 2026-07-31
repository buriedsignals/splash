// Pure sibling of choropleth-geo.ts/choropleth-paint.ts — kept out of ChoroplethMap.tsx
// specifically so it is unit-testable without pulling in @maptiler/sdk's module-load-time
// `VITE_MAPTILER_KEY missing` throw (ChoroplethMap.tsx throws at import time when the env var
// is unset, which every test environment here deliberately leaves unset — see
// tests/produce-single-format.test.ts's own skip-when-absent guard for the same reason).
//
// filterStateToExpression (core/map-filter.ts) compiles ["get", field] against the geojson
// SOURCE's `properties`. The choropleth's joined value never lands there anymore (D8 —
// feature-state only, see choropleth-geo.ts's applyChoroplethJoin) and MapLibre's style-spec
// explicitly restricts `["feature-state", ...]` to paint/layout properties — it is NOT valid
// inside a `setFilter` expression. Without this, a filter whose field equals `valueField`
// (real, shipped, exercised live by assets/sample-data/filter-choropleth.json +
// scripts/smoke-filters.mjs) would silently match nothing once the properties merge is
// removed. Resolved here in JS against the caller's own join table (`states`), then applied
// as an id-membership filter on the geometry's OWN join-key property (e.g. "iso_a3") — never
// the journalist's value itself, so D8 still holds.
import { filterStateToExpression } from "./core/map-filter";
import type { FilterState, FilterOption } from "./core/map-filter";
import type { ChoroplethFeatureState } from "./choropleth-geo";

export function resolveChoroplethFilterExpression(
  filterState: FilterState,
  filterOptions: FilterOption[],
  states: ChoroplethFeatureState,
  valueField: string,
  joinKey: string,
): unknown[] {
  const valueOption = filterOptions.find(
    (o): o is Extract<FilterOption, { kind: "category" | "range" }> =>
      o.field === valueField && o.kind !== "time",
  );
  const otherOptions = filterOptions.filter((o) => o.field !== valueField);
  // Reuse the shared expression builder for every field EXCEPT valueField — those still read
  // properties correctly (unaffected by this task; unrelated to the D8 join).
  const baseClauses = (
    filterStateToExpression(filterState, otherOptions) as unknown[]
  ).slice(1); // drop the leading "all"

  if (!valueOption) return ["all", ...baseClauses];

  const passingKeys = Object.entries(states)
    .filter(([, s]) => {
      if (s.value === null) return false;
      const v = s.value;
      if (valueOption.kind === "category") {
        const visible =
          (filterState[valueOption.field] as string[] | undefined) ??
          valueOption.values;
        return visible.includes(String(v));
      }
      // range
      if (valueOption.mode === "between") {
        const [lo, hi] = (filterState[valueOption.field] as
          [number, number] | undefined) ?? [valueOption.min, valueOption.max];
        return v >= lo && v <= hi;
      }
      const t =
        (filterState[valueOption.field] as number | undefined) ??
        (valueOption.mode === "atMost" ? valueOption.max : valueOption.min);
      return valueOption.mode === "atMost" ? v <= t : v >= t;
    })
    .map(([key]) => key);

  return [
    "all",
    ...baseClauses,
    ["in", ["get", joinKey], ["literal", passingKeys]],
  ];
}
