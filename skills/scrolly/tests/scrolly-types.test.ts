import { test, expect } from "bun:test";
import { CHART_SCROLLY_TYPES, MAP_SCROLLY_TYPES } from "../src/scrolly-types";

test("the chart track hosts exactly the three narrative chart types", () => {
  expect([...CHART_SCROLLY_TYPES].sort()).toEqual(["bar", "line", "scatter"]);
});

test("the map track hosts exactly the types the dispatch has a branch for", () => {
  expect([...MAP_SCROLLY_TYPES].sort()).toEqual([
    "cartogram",
    "choropleth",
    "dot-density",
    "hex-grid",
    "locator",
    "route",
    "symbol",
  ]);
});

// ★ INVERTED 2026-08-04. This test used to read "route is NOT hosted — it has no branch and
// would be drawn as a choropleth", and it was right: route was the one arc-capable map type with
// no browser scrolly, so the set had to exclude it or Scrolly.tsx's final `else` would have
// rendered a trajectory as a choropleth. ScrollyRouteMap.tsx is that branch, so the invariant
// flips rather than disappears — the set and the dispatch must still agree, in the other
// direction now.
test("route IS hosted, and by its own branch — never the choropleth fallback", () => {
  expect(MAP_SCROLLY_TYPES.has("route")).toBe(true);
});
