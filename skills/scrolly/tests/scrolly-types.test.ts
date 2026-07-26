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
    "symbol",
  ]);
});

test("route is NOT hosted — it has no branch and would be drawn as a choropleth", () => {
  expect(MAP_SCROLLY_TYPES.has("route")).toBe(false);
});
