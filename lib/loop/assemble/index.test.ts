import { test, expect } from "bun:test";
import {
  ASSEMBLERS,
  assemblerFor,
  declineReason,
  heightPolicyFor,
} from "./index";
import {
  isLoopBuildable,
  LOOP_BUILDABLE_ENGINES,
  unbuildableEngineReason,
} from "../buildable";

test("the buildable list is exactly the table's keys — no hand-written second copy", () => {
  expect([...LOOP_BUILDABLE_ENGINES].sort()).toEqual(
    Object.keys(ASSEMBLERS).sort(),
  );
});

test("an engine with no per-type restriction builds any of its types", () => {
  expect(isLoopBuildable("chart-native", "line")).toBe(true);
  expect(isLoopBuildable("chart-native", "sankey")).toBe(true);
});

test("an unknown engine is not buildable, with or without a type", () => {
  expect(isLoopBuildable("crayon")).toBe(false);
  expect(isLoopBuildable("crayon", "line")).toBe(false);
});

test("no engine at all is the pre-brain default path, which is chart-native", () => {
  expect(isLoopBuildable(undefined)).toBe(true);
});

// THE FORMAT AXIS (task 12), and what closed it. dw-chart's static export is a PNG the loop
// records by path; its interactive is a hosted embed with NO file (skills/dw-chart/src/manifest.ts
// returns `files: []`, form "hosted"). The table used to decline the second, because the run
// manifest's artifact slot required a path and produce() dead-ended on a chart Datawrapper had
// published perfectly well. The slot now records a hosted delivery as the URL it is
// (ArtifactRecordSchema), so BOTH formats are buildable and the brain may offer either.
test("both of a hosted engine's formats are buildable — the file one and the URL one", () => {
  expect(isLoopBuildable("dw-chart", "column-chart", "static")).toBe(true);
  expect(isLoopBuildable("dw-chart", "column-chart", "interactive")).toBe(true);
  // The hosted MAP too — it never carried a format clause, and its interactive was blocked one
  // level down, in produce(), rather than in this table.
  expect(isLoopBuildable("map-dw", "choropleth", "interactive")).toBe(true);
});

test("asked without a format, a type-restricted engine still answers for itself", () => {
  // The engine-level question ("can the loop build through dw-chart at all") must not answer
  // "no" for an engine it does build — several callers ask it with no format in hand.
  expect(isLoopBuildable("dw-chart", "column-chart")).toBe(true);
  expect(isLoopBuildable("dw-chart")).toBe(true);
});

test("a type Datawrapper has no slug for is unbuildable in every format", () => {
  expect(isLoopBuildable("dw-chart", "beeswarm", "static")).toBe(false);
});

// A row-driven Datawrapper export ships the channel's WIDTH and a content-driven height (pinning
// the height crops rows — silent data loss). That cost the offer NINE of Datawrapper's twenty-two
// types while the capture layer could only measure a whole box. It can now measure a width against
// a content-driven height (lib/verify/types.ts HeightPolicy), so the nine are back — and the
// knowledge that justified excluding them now DECLARES their shape instead (heightPolicyFor).
test("the whole row-driven family is back in the offer, declaring its own shape", () => {
  for (const t of [
    "d3-bars",
    "d3-bars-grouped",
    "d3-bars-stacked",
    "d3-bars-split",
    "d3-bars-bullet",
    "d3-dot-plot",
    "d3-arrow-plot",
    "d3-range-plot",
    "tables",
  ]) {
    expect(isLoopBuildable("dw-chart", t, "static")).toBe(true);
    expect(declineReason("dw-chart", t, "static")).toBeUndefined();
    expect(heightPolicyFor("dw-chart", t)).toBe("content-driven");
  }
  // Its fixed-aspect sibling — the vertical column chart — exports AT the box, and stays pinned:
  // the relaxation is earned per type, not handed to the engine wholesale.
  expect(isLoopBuildable("dw-chart", "column-chart", "static")).toBe(true);
  expect(heightPolicyFor("dw-chart", "column-chart")).toBe("pinned");
});

// The default is the strict one, everywhere. A policy that leaked to another engine (or to an
// option carrying no engine at all — hand-authored manifests predating the brain) would relax a
// check for artifacts that never earned it.
test("every other engine, and an unset one, stays pinned", () => {
  expect(heightPolicyFor("chart-native", "d3-bars")).toBe("pinned");
  expect(heightPolicyFor("map-dw", "choropleth")).toBe("pinned");
  expect(heightPolicyFor(undefined, undefined)).toBe("pinned");
  expect(heightPolicyFor("dw-chart", undefined)).toBe("pinned");
  expect(heightPolicyFor("dw-chart", "not-a-real-type")).toBe("pinned");
});

// The refusal a journalist reads for a wired engine must not be the generic one: "nothing can
// build a dw-chart form yet — production is wired for …, dw-chart" contradicts itself.
test("the refusal for a declined pairing is the table's own sentence, not the engine fallback", () => {
  // A type Datawrapper has no slug for — the pairing dw-chart declines whatever the format, so
  // this reads the property (table sentence beats generic fallback) off a case that is about the
  // TYPE axis and cannot be confused with a format restriction.
  const reason = unbuildableEngineReason("dw-chart", "beeswarm", "static");
  expect(reason).toBe(declineReason("dw-chart", "beeswarm", "static"));
  expect(reason).toContain('Datawrapper does not build a "beeswarm" chart');
  expect(reason).not.toContain("nothing can build");
});

test("an engine nothing is wired for still gets the engine sentence", () => {
  expect(unbuildableEngineReason("map-dw", "choropleth", "static")).toContain(
    "nothing can build a map-dw form yet",
  );
});
