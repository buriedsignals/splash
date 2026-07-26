import { test, expect } from "bun:test";
import { splitFrontmatter } from "./frontmatter";

const SHEET = `---
id: slope
engines:
  chart-native: slope
intent: [change-over-time, ranking]
shape: wide
limits: { points: 2, maxSeries: 12 }
formats: [static, interactive, video]
bestFor:
  - "a before/after across a handful of categories"
  - "a rank change between two periods"
notFor:
  - "more than two points in time — that is a line"
---

# Slope chart

Body prose.
`;

test("it reads scalars, inline lists, dash lists, inline maps and nested maps", () => {
  const { data } = splitFrontmatter(SHEET);
  expect(data.id).toBe("slope");
  expect(data.engines).toEqual({ "chart-native": "slope" });
  expect(data.intent).toEqual(["change-over-time", "ranking"]);
  expect(data.limits).toEqual({ points: 2, maxSeries: 12 });
  expect((data.bestFor as string[])[0]).toBe(
    "a before/after across a handful of categories",
  );
});

test("the body survives untouched", () => {
  expect(splitFrontmatter(SHEET).body.trim().startsWith("# Slope chart")).toBe(
    true,
  );
});

test("a sheet with no header is a hard error, never an empty facet set", () => {
  expect(() => splitFrontmatter("# Just prose\n")).toThrow(/frontmatter/);
});

test("a construct outside the supported subset throws rather than being guessed", () => {
  expect(() =>
    splitFrontmatter("---\nnested:\n  - a: 1\n    b: 2\n---\nbody\n"),
  ).toThrow(/unsupported/);
});

test("a key that opens a block but never populates it is a hard error, never a silently dropped facet", () => {
  expect(() => splitFrontmatter("---\nid: x\nengines:\n---\nbody\n")).toThrow(
    /declares nothing/,
  );
});

test("a nested map value can itself be an inline list — a moteur naming several render keys", () => {
  const { data } = splitFrontmatter(
    "---\nid: bar\nengines:\n  chart-native: bar\n  dw-chart: [d3-bars, column-chart]\n---\nbody\n",
  );
  expect(data.engines).toEqual({
    "chart-native": "bar",
    "dw-chart": ["d3-bars", "column-chart"],
  });
});
