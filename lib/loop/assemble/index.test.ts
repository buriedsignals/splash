import { test, expect } from "bun:test";
import { ASSEMBLERS, assemblerFor, declineReason } from "./index";
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

// THE FORMAT AXIS (task 12). dw-chart's static export is a PNG the loop records by path; its
// interactive is a hosted embed with NO file (skills/dw-chart/src/manifest.ts returns
// `files: []`, form "hosted"), and the run manifest's artifact slot requires a path. The two
// answers must differ, or the offer promises a form production dead-ends on.
test("an engine wired in one format is not buildable in another", () => {
  expect(isLoopBuildable("dw-chart", "column-chart", "static")).toBe(true);
  expect(isLoopBuildable("dw-chart", "column-chart", "interactive")).toBe(
    false,
  );
});

test("asked without a format, a format-restricted engine still answers for itself", () => {
  // The engine-level question ("can the loop build through dw-chart at all") must not answer
  // "no" for an engine it does build — several callers ask it with no format in hand.
  expect(isLoopBuildable("dw-chart", "column-chart")).toBe(true);
  expect(isLoopBuildable("dw-chart")).toBe(true);
});

test("a type Datawrapper has no slug for is unbuildable in every format", () => {
  expect(isLoopBuildable("dw-chart", "beeswarm", "static")).toBe(false);
});

// A row-driven Datawrapper export ships the channel's WIDTH and a content-driven height (pinning
// the height crops rows — silent data loss). The loop's capture layer measures the delivered image
// against the destination's whole box, so that correct artifact reads as a size mismatch. Marked,
// not offered clean, until the two can agree.
test("a Datawrapper export whose height follows the row count is not offered by the loop", () => {
  expect(isLoopBuildable("dw-chart", "d3-bars", "static")).toBe(false);
  expect(declineReason("dw-chart", "d3-bars", "static")).toContain(
    "grows its height with the row count",
  );
  // Its fixed-aspect sibling — the vertical column chart — exports AT the box, and is offered.
  expect(isLoopBuildable("dw-chart", "column-chart", "static")).toBe(true);
});

// The refusal a journalist reads for a wired engine must not be the generic one: "nothing can
// build a dw-chart form yet — production is wired for …, dw-chart" contradicts itself.
test("the refusal for a declined pairing is the table's own sentence, not the engine fallback", () => {
  const reason = unbuildableEngineReason(
    "dw-chart",
    "column-chart",
    "interactive",
  );
  expect(reason).toBe(declineReason("dw-chart", "column-chart", "interactive"));
  expect(reason).toContain("HOSTED");
  expect(reason).not.toContain("nothing can build");
});

test("an engine nothing is wired for still gets the engine sentence", () => {
  expect(unbuildableEngineReason("map-dw", "choropleth", "static")).toContain(
    "nothing can build a map-dw form yet",
  );
});
