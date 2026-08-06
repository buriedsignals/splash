import { describe, it, expect } from "bun:test";
import { narrativeKindsFor } from "./narrative-kinds";

// ---------------------------------------------------------------------------
// WHICH NARRATIVE KINDS A VIDEO CAN BE — read from the registry, never recited.
//
// A video is not one thing. A map can be a guided tour, a run of steps, or a fixed-camera
// reveal — three component families that render three different objects. Nobody ever asked the
// journalist which one, so `cameraMode` sat at its default and nothing could honestly depend on
// it: the walk guard demanded a storyboard even for a reveal, which shows no words at all.
// ---------------------------------------------------------------------------
describe("narrativeKindsFor — what this type can actually be", () => {
  it("a map offers the three kinds, and only the narrating ones owe a storyboard", () => {
    const kinds = narrativeKindsFor("map-native", "choropleth");
    expect(kinds.map((k) => k.kind).sort()).toEqual([
      "reveal",
      "stepped",
      "story",
    ]);
    const owed = Object.fromEntries(
      kinds.map((k) => [k.kind, k.owesStoryboard]),
    );
    expect(owed).toEqual({ story: true, stepped: true, reveal: false });
  });

  it("a chart offers TWO — it has no camera to travel, so no story", () => {
    const kinds = narrativeKindsFor("chart-native", "bar");
    expect(kinds.map((k) => k.kind).sort()).toEqual(["reveal", "stepped"]);
    expect(kinds.find((k) => k.kind === "stepped")!.owesStoryboard).toBe(true);
    expect(kinds.find((k) => k.kind === "reveal")!.owesStoryboard).toBe(false);
  });

  it("a chart that can carry no walk offers only the reveal, and says why", () => {
    const kinds = narrativeKindsFor("chart-native", "pie");
    expect(kinds.map((k) => k.kind)).toEqual(["reveal"]);
    expect(kinds[0]!.owesStoryboard).toBe(false);
    // The absence is EXPLAINED, not silent — a journalist reads why the steps are not offered.
    expect(kinds[0]!.why).toMatch(/continuous scalar|per-subject entrance/);
  });

  it("route and hex-grid offer only the reveal too — their anchor exists at produce time", () => {
    for (const t of ["route", "hex-grid"]) {
      const kinds = narrativeKindsFor("map-native", t);
      expect(kinds.some((k) => k.owesStoryboard)).toBe(false);
    }
  });

  it("every kind carries a sentence a journalist can be shown as-is", () => {
    for (const k of narrativeKindsFor("map-native", "choropleth")) {
      expect(k.why.length).toBeGreaterThan(20);
      expect(k.why).not.toMatch(/unsupported|invalid|error/i);
    }
  });

  it("a producer that renders no video at all offers nothing", () => {
    expect(narrativeKindsFor("dw-chart", "d3-bars")).toEqual([]);
  });
});

// The kinds a caller can QUERY and the kinds the code offers must be one list — two truths about
// the same product is how a journalist gets told "impossible" about something that works.
import { CAMERA_MODE_FOR_KIND } from "./narrative-kinds";

describe("every offered kind can be expressed to the engines", () => {
  it("each map kind maps to the cameraMode that selects it", () => {
    for (const k of narrativeKindsFor("map-native", "choropleth"))
      expect(CAMERA_MODE_FOR_KIND[k.kind]).toBeTruthy();
  });

  // ★ THE OFFER CARRIES THE FIELD, not just the name. The engines select their family from
  // `cameraMode` and have never heard of `narrativeKind`, so an offer a caller cannot write down
  // is a choice that dies between the question and the render — and the walk gate refuses exactly
  // that. Answered from the registry so the two cannot drift.
  it("every map offer says which cameraMode writes it down", () => {
    expect(
      narrativeKindsFor("map-native", "choropleth").map((k) => [
        k.kind,
        k.cameraMode,
      ]),
    ).toEqual([
      ["story", "guided-tour"],
      ["stepped", "stepped"],
      ["reveal", "simple"],
    ]);
  });

  it("a route's reveal is its OWN animation, not a held camera", () => {
    const reveal = narrativeKindsFor("map-native", "route").find(
      (k) => k.kind === "reveal",
    );
    expect(reveal?.cameraMode).toBe("route-reveal");
  });

  it("a chart offer names no cameraMode — the chart track has no such field", () => {
    for (const k of narrativeKindsFor("chart-native", "bar"))
      expect(k.cameraMode).toBeUndefined();
  });

  it("the narrating kinds are exactly those that owe a storyboard", () => {
    for (const [producer, type] of [
      ["map-native", "choropleth"],
      ["chart-native", "bar"],
      ["chart-native", "pie"],
    ] as const)
      for (const k of narrativeKindsFor(producer, type))
        expect(k.owesStoryboard).toBe(
          k.kind !== "reveal" ? k.owesStoryboard : false,
        );
  });
});
