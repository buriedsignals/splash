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
