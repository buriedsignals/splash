import { test, expect } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadTypology } from "./typology";

function fixture(sheets: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "brain-kb-"));
  mkdirSync(join(root, "chart", "types"), { recursive: true });
  for (const [name, content] of Object.entries(sheets))
    writeFileSync(join(root, "chart", "types", name), content);
  return root;
}

const SLOPE = `---
id: slope
engines:
  chart-native: slope
intent: [change-over-time, ranking]
shape: wide
limits: { points: 2, maxSeries: 12 }
formats: [static, interactive, video]
bestFor:
  - "a before/after across a handful of categories"
notFor:
  - "more than two points in time — that is a line"
---

Body.
`;

test("it loads a sheet into typed facets and keeps the body for grounding", () => {
  const [sheet] = loadTypology(fixture({ "slope.md": SLOPE }));
  expect(sheet.id).toBe("slope");
  expect(sheet.engines["chart-native"]).toEqual(["slope"]);
  expect(sheet.intent).toEqual(["change-over-time", "ranking"]);
  expect(sheet.limits.maxSeries).toBe(12);
  expect(sheet.body).toContain("Body.");
  expect(sheet.sheetPath.endsWith("chart/types/slope.md")).toBe(true);
});

test("a scalar engine value normalises to a single-element list", () => {
  const [sheet] = loadTypology(fixture({ "slope.md": SLOPE }));
  expect(Array.isArray(sheet.engines["chart-native"])).toBe(true);
});

test("a list-valued engine loads, preferred key first", () => {
  const twoKeys = SLOPE.replace(
    "  chart-native: slope",
    "  chart-native: slope\n  dw-chart: [d3-range-plot, d3-arrow-plot]",
  );
  const [sheet] = loadTypology(fixture({ "slope.md": twoKeys }));
  expect(sheet.engines["dw-chart"]).toEqual(["d3-range-plot", "d3-arrow-plot"]);
});

test("an empty engines list is a hard error", () => {
  const bad = SLOPE.replace(
    "  chart-native: slope",
    "  chart-native: slope\n  dw-chart: []",
  );
  expect(() => loadTypology(fixture({ "slope.md": bad }))).toThrow();
});

test("an intent outside the closed vocabulary is a hard error", () => {
  const bad = SLOPE.replace("[change-over-time, ranking]", "[pretty]");
  expect(() => loadTypology(fixture({ "slope.md": bad }))).toThrow(/intent/);
});

test("an unknown format is a hard error", () => {
  const bad = SLOPE.replace("[static, interactive, video]", "[hologram]");
  expect(() => loadTypology(fixture({ "slope.md": bad }))).toThrow(/format/i);
});

test("a sheet whose id disagrees with its filename is a hard error", () => {
  const bad = SLOPE.replace("id: slope", "id: dumbbell");
  expect(() => loadTypology(fixture({ "slope.md": bad }))).toThrow(/filename/);
});

test("a sheet with no bestFor is a hard error — an option with no why is not offerable", () => {
  const bad = SLOPE.replace(
    'bestFor:\n  - "a before/after across a handful of categories"\n',
    "",
  );
  expect(() => loadTypology(fixture({ "slope.md": bad }))).toThrow();
});
