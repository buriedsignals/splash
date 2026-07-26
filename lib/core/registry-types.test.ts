import { test, expect } from "bun:test";
import { engineTypes, isRenderable } from "./registry";
import "../loop/engines"; // populates the registry

test("chart-native declares its canonical catalogue, deferred types included", () => {
  const ids = engineTypes("chart-native").map((t) => t.id);
  expect(ids).toContain("slope");
  expect(ids).toContain("sankey"); // declared…
  expect(isRenderable("chart-native", "sankey")).toBe(false); // …but deferred
  expect(isRenderable("chart-native", "slope")).toBe(true);
});

test("a deferred type carries the reason it is deferred", () => {
  const sankey = engineTypes("chart-native").find((t) => t.id === "sankey");
  expect(sankey?.deferred).toBeTruthy();
});

test("every registered engine that renders types declares them", () => {
  for (const name of ["chart-native", "map-native", "dw-chart", "map-dw"])
    expect(engineTypes(name).length).toBeGreaterThan(0);
});

test("an unknown engine or type is simply not renderable", () => {
  expect(isRenderable("nope", "slope")).toBe(false);
  expect(isRenderable("chart-native", "nope")).toBe(false);
});

test("dw-chart uses ITS OWN render keys, which differ from the KB ids", () => {
  const ids = engineTypes("dw-chart").map((t) => t.id);
  expect(ids).toContain("d3-lines");
  expect(ids).not.toContain("line");
});

// map-dw's validateMapSpec pushes an unconditional error on its "symbol" branch (DW symbol
// maps are hover-only, no always-visible labels) — no path returns ok, so map-dw can never
// actually produce one. The manifest declares "symbol" but marks it deferred, the same shape
// as chart-native's "sankey" above, so isRenderable tells the truth instead of the registry
// lying about a type the validator always refuses.
test("map-dw declares symbol but it is deferred — never actually producible", () => {
  const symbol = engineTypes("map-dw").find((t) => t.id === "symbol");
  expect(symbol?.deferred).toBeTruthy();
  expect(isRenderable("map-dw", "symbol")).toBe(false);
  expect(isRenderable("map-dw", "choropleth")).toBe(true);
  expect(isRenderable("map-dw", "locator")).toBe(true);
});
