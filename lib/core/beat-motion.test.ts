import { test, expect } from "bun:test";
import { beatMotionErrors } from "./beat-motion";
import "../loop/engines"; // self-registers every engine manifest — without this import
// allProducers() is empty and every case below (bar the scrolly-duration one, which never
// looks a type up) passes vacuously, guarding nothing.

test("a movement the target engine does not declare is refused, naming the alternative", () => {
  const errs = beatMotionErrors(
    { movement: "fly" },
    { producer: "chart-native", type: "pie", kind: "reveal" },
  );
  expect(errs.length).toBe(1);
  // The refusal must tell the journalist what they CAN have — a bare "invalid" leaves them
  // guessing.
  expect(errs[0]).toContain("fly");
  expect(errs[0]).toContain("pie");
});

test("a movement the engine declares is accepted", () => {
  expect(
    beatMotionErrors(
      { movement: "jump" },
      { producer: "map-native", type: "choropleth", kind: "story" },
    ),
  ).toEqual([]);
});

test("a duration on a scrolly is refused — the reader advances it, not time", () => {
  const errs = beatMotionErrors(
    { durationMs: 2000 },
    { producer: "scrolly", type: "choropleth", kind: "scrolly" },
  );
  expect(errs.length).toBe(1);
  expect(errs[0]).toContain("reader");
});

test("a beat with no motion at all is valid — the fields are optional", () => {
  expect(
    beatMotionErrors(
      {},
      { producer: "map-native", type: "choropleth", kind: "story" },
    ),
  ).toEqual([]);
});

test("an animation the engine does not declare is refused the same as a movement", () => {
  const errs = beatMotionErrors(
    { animation: "crossfade" },
    { producer: "chart-native", type: "pie", kind: "reveal" },
  );
  expect(errs.length).toBe(1);
  expect(errs[0]).toContain("crossfade");
  expect(errs[0]).toContain("pie");
});

test("dw-chart declares no motion on any type — any movement asked of it is refused, naming that it declares nothing", () => {
  const errs = beatMotionErrors(
    { movement: "grow" },
    { producer: "dw-chart", type: "d3-bars", kind: "reveal" },
  );
  expect(errs.length).toBe(1);
  expect(errs[0]).toContain("grow");
  expect(errs[0]).toContain("no motion at all");
});

test("both movement and duration can be refused on the same beat", () => {
  // "grow" is a real gesture, but not one scrolly's choropleth declares for the scrolly
  // kind (it declares only fly/highlight) — so both this AND the duration below refuse.
  const errs = beatMotionErrors(
    { movement: "grow", durationMs: 500 },
    { producer: "scrolly", type: "choropleth", kind: "scrolly" },
  );
  expect(errs.length).toBe(2);
});
