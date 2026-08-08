import { test, expect } from "bun:test";
import { engineTypes, isRenderable } from "./registry";
import "../loop/engines"; // populates the registry
import type { EngineType } from "./registry";

test("an EngineType may declare what it makes move, per narrative kind", () => {
  const t: EngineType = {
    id: "choropleth",
    gestures: { story: ["fly", "hold"], reveal: ["appear"] },
  };
  expect(t.gestures?.story).toContain("fly");
  // `gestures` is OPTIONAL: an engine that owns no motion (a hosted embed) declares nothing,
  // and that is a legitimate answer rather than an empty promise.
  const hosted: EngineType = { id: "d3-range-plot" };
  expect(hosted.gestures).toBeUndefined();
});

// The deferred witness is READ FROM THE REGISTRY, never named by hand. Both tests below
// pinned "sankey", and both went red the day the flow family graduated — a failure about the
// world rather than about `engineTypes`/`isRenderable`, which is the one failure a witness
// must not have. Deriving it keeps them meaningful as types graduate, and the day the last one
// does they say so out loud instead of passing on a stale name.
const firstDeferred = () => engineTypes("chart-native").find((t) => t.deferred);

test("chart-native declares its canonical catalogue, deferred types included", () => {
  const ids = engineTypes("chart-native").map((t) => t.id);
  expect(ids).toContain("slope");
  const deferred = firstDeferred();
  expect(
    deferred,
    "every chart-native type is reachable — this test needs a new witness",
  ).toBeTruthy();
  expect(ids).toContain(deferred!.id); // declared…
  expect(isRenderable("chart-native", deferred!.id)).toBe(false); // …but deferred
  expect(isRenderable("chart-native", "slope")).toBe(true);
});

test("a deferred type carries the reason it is deferred", () => {
  const deferred = firstDeferred();
  expect(deferred).toBeTruthy();
  expect(deferred?.deferred).toBeTruthy();
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
