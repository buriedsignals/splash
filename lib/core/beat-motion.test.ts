import { test, expect } from "bun:test";
import { beatMotionErrors, narrativeKindFor } from "./beat-motion";
import "../loop/engines"; // self-registers every engine manifest — without this import
// getProducer()/producerForFormat() answer nothing and every case below (bar the
// scrolly-duration one, which never looks a type up) passes vacuously, guarding nothing.

test("a movement the target engine does not declare is refused, naming the alternative", () => {
  const errs = beatMotionErrors(
    { movement: "fly" },
    { engine: "chart-native", nativeType: "pie", format: "video" },
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
      { engine: "map-native", nativeType: "choropleth", format: "video" },
    ),
  ).toEqual([]);
});

test("a duration on a map-track scrolly is refused — the reader advances it, not time", () => {
  const errs = beatMotionErrors(
    { durationMs: 2000 },
    { engine: "map-native", nativeType: "choropleth", format: "scrolly" },
  );
  expect(errs.length).toBe(1);
  expect(errs[0]).toContain("reader");
});

test("a beat with no motion at all is valid — the fields are optional", () => {
  expect(
    beatMotionErrors(
      {},
      { engine: "map-native", nativeType: "choropleth", format: "video" },
    ),
  ).toEqual([]);
});

test("an animation the engine does not declare is refused the same as a movement", () => {
  const errs = beatMotionErrors(
    { animation: "crossfade" },
    { engine: "chart-native", nativeType: "pie", format: "video" },
  );
  expect(errs.length).toBe(1);
  expect(errs[0]).toContain("crossfade");
  expect(errs[0]).toContain("pie");
});

test("dw-chart declares no motion on any format — any movement asked of it is refused, naming that it makes nothing move", () => {
  const errs = beatMotionErrors(
    { movement: "grow" },
    { engine: "dw-chart", nativeType: "d3-bars", format: "static" },
  );
  expect(errs.length).toBe(1);
  expect(errs[0]).toContain("grow");
  expect(errs[0]).toContain("no narrative kind");
});

test("both movement and duration can be refused on the same beat", () => {
  // "grow" is a real gesture, but not one scrolly's choropleth declares for the scrolly
  // kind (it declares only fly/highlight) — so both this AND the duration below refuse.
  const errs = beatMotionErrors(
    { movement: "grow", durationMs: 500 },
    { engine: "map-native", nativeType: "choropleth", format: "scrolly" },
  );
  expect(errs.length).toBe(2);
});

// ── C1 regression coverage — the combination that exposed the split vocabulary ──────────
//
// Before this fix, `beatMotionErrors` took a single `producer` string. Resolved as the
// RENDER builder ("scrolly", the same producer for both tracks once format is "scrolly"),
// a chart-track lookup found scrolly's own `types` (six map ids only, no "line") and read as
// "declares no motion" — a false refusal, because chart-native's OWN manifest declares
// `scrolly: ["draw"]` for `line` right there. Resolved as the engine name ("chart-native"),
// the SAME target string then falsely ACCEPTED a map-track type never declared on that
// engine's manifest at all. Neither single string could serve both tracks; {engine, format}
// resolves the correct owner for each internally (see beat-motion.ts's own header).

test("chart-native line scrolly declares draw — the combination no producer string could serve for both tracks", () => {
  expect(
    beatMotionErrors(
      { movement: "draw" },
      { engine: "chart-native", nativeType: "line", format: "scrolly" },
    ),
  ).toEqual([]);
});

test("chart-native line scrolly refuses a movement it does not declare, naming chart-native (not scrolly) as the owner", () => {
  const errs = beatMotionErrors(
    { movement: "jump" },
    { engine: "chart-native", nativeType: "line", format: "scrolly" },
  );
  expect(errs.length).toBe(1);
  // The message must name the TRUE owner (chart-native) — asserting "scrolly" here would
  // repeat the falsehood this fix closes (scrolly's own manifest owns no "line" type at all).
  expect(errs[0]).toContain("chart-native");
  expect(errs[0]).toContain("scrolly");
  expect(errs[0]).not.toContain("no motion at all");
});

test("map-native choropleth scrolly declares fly — the map track resolves through the scrolly producer, not map-native's own manifest", () => {
  expect(
    beatMotionErrors(
      { movement: "fly" },
      { engine: "map-native", nativeType: "choropleth", format: "scrolly" },
    ),
  ).toEqual([]);
});

// ── narrativeKindFor — the C2 resolver ───────────────────────────────────────────────────

test("narrativeKindFor resolves scrolly unconditionally on format", () => {
  expect(narrativeKindFor("chart-native", "scrolly")).toBe("scrolly");
  expect(narrativeKindFor("map-native", "scrolly")).toBe("scrolly");
});

test("narrativeKindFor resolves chart-native's one architecture (reveal) for every non-scrolly format", () => {
  expect(narrativeKindFor("chart-native", "static")).toBe("reveal");
  expect(narrativeKindFor("chart-native", "interactive")).toBe("reveal");
  expect(narrativeKindFor("chart-native", "video")).toBe("reveal");
});

test("narrativeKindFor resolves map-native video to story, and static/interactive to no kind at all", () => {
  expect(narrativeKindFor("map-native", "video")).toBe("story");
  expect(narrativeKindFor("map-native", "static")).toBeUndefined();
  expect(narrativeKindFor("map-native", "interactive")).toBeUndefined();
});

test("a movement on a map-native static beat is refused — static has no narrative kind for motion to draw from", () => {
  const errs = beatMotionErrors(
    { movement: "hold" },
    { engine: "map-native", nativeType: "choropleth", format: "static" },
  );
  expect(errs.length).toBe(1);
  expect(errs[0]).toContain("no narrative kind");
});
