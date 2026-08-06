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

  it("a type this engine does not render offers only the reveal, and says why", () => {
    const kinds = narrativeKindsFor("chart-native", "no-such-chart");
    expect(kinds.map((k) => k.kind)).toEqual(["reveal"]);
    expect(kinds[0]!.owesStoryboard).toBe(false);
    // The absence is EXPLAINED, not silent — a journalist reads why the steps are not offered.
    expect(kinds[0]!.why).toMatch(/not a chart type this engine renders/);
  });

  // ★ A SEQUENCED TYPE OFFERS THE CHOICE TOO — this is the hole that closed. A pie used to offer
  // one kind, and one offer is not a question, so nobody was ever asked and no storyboard was
  // ever proposed. Its stepped grain is named in the offer rather than glossed: the sentences
  // follow the order written, they do not pin to a subject.
  it("a sequenced type offers both kinds, and says which grain its stepped is", () => {
    const kinds = narrativeKindsFor("chart-native", "pie");
    expect(kinds.map((k) => k.kind).sort()).toEqual(["reveal", "stepped"]);
    const stepped = kinds.find((k) => k.kind === "stepped")!;
    expect(stepped.owesStoryboard).toBe(true);
    expect(stepped.why).toMatch(/order written/);
    expect(stepped.why).not.toMatch(/subject it is about/);
  });

  it("an anchored type says its stepped pins each sentence to its subject", () => {
    const stepped = narrativeKindsFor("chart-native", "lollipop").find(
      (k) => k.kind === "stepped",
    )!;
    expect(stepped.why).toMatch(/each subject enters at the moment of its own sentence/);
  });

  // These two narrate like any other map — their Story family paints the beats' words — so a
  // narrating kind OWES a walk here as it does everywhere. What they cannot do is have one
  // DRAFTED: their anchors only exist once the map is built. Owing and being proposable are two
  // questions, and this file once answered the first with the second (see the matrix sweep below).
  it("route and hex-grid owe a walk when they narrate — written by hand, but owed", () => {
    for (const t of ["route", "hex-grid"]) {
      const kinds = narrativeKindsFor("map-native", t);
      const narrating = kinds.filter((k) => k.kind !== "reveal");
      expect(narrating.length).toBe(2);
      for (const k of narrating) {
        expect(k.owesStoryboard).toBe(true);
        // …and the journalist is told they write them themselves, not offered a draft.
        expect(k.why).toMatch(/BY HAND/);
      }
      expect(kinds.find((k) => k.kind === "reveal")!.owesStoryboard).toBe(
        false,
      );
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

// ★ THE OFFER AND THE GUARD ARE ONE ANSWER — swept, not spot-checked.
//
// This test exists because the two disagreed. `owesStoryboard` was first written as "can a walk be
// DRAFTED for this type", so a route's guided tour advertised that it owed nothing while the guard
// refused it for exactly that missing walk. A journalist would have been told "nothing to write",
// then blocked at produce with "write it" — two truths about the same product, which is the whole
// disease this line of work exists to close.
//
// Spot-checking the pair could not have caught it: choropleth agreed. Only sweeping the matrix
// does, so the sweep is the test.
import { narrativeWalkError } from "./narrative-walk-gate";
import type { AcceptedProposal } from "./producer-spec";

const videoProposal = (
  producer: string,
  type: string,
  kind: string,
  cameraMode?: string,
): AcceptedProposal =>
  ({
    id: "e1",
    producer,
    format: "video",
    confirmedTakeaway: "t",
    narrativeKind: kind,
    spec: { type, nativeType: type, ...(cameraMode ? { cameraMode } : {}) },
  }) as unknown as AcceptedProposal;

describe("what an offer PROMISES is what the guard DEMANDS", () => {
  const MATRIX: readonly [string, string][] = [
    ["map-native", "choropleth"],
    ["map-native", "symbol"],
    // The two whose anchors only exist once the map is built — they narrate, so they owe.
    ["map-native", "route"],
    ["map-native", "hex-grid"],
    ["chart-native", "bar"],
    // …and the two grains of chart video, which used to offer nothing to choose from.
    ["chart-native", "lollipop"],
    ["chart-native", "line"],
    ["chart-native", "pie"],
    ["chart-native", "sankey"],
  ];

  for (const [producer, type] of MATRIX)
    it(`${producer}/${type}: every offered kind is judged as it was advertised`, () => {
      const offers = narrativeKindsFor(producer, type);
      expect(offers.length).toBeGreaterThan(0);
      for (const o of offers) {
        const demanded =
          narrativeWalkError(
            videoProposal(producer, type, o.kind, o.cameraMode),
          ) !== null;
        expect({ kind: o.kind, demanded }).toEqual({
          kind: o.kind,
          demanded: o.owesStoryboard,
        });
      }
    });
});
