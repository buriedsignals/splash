// The carrier ORDERS the reveal beats and does nothing else — the whole of the map-explainer
// wiring for an areal story. Everything these tests pin is a defect that was measured on a real
// render before it was a test (see story-sweep-order.ts's header).

import { describe, it, expect } from "bun:test";
import { orderRevealBeatsBySweep } from "../src/story-sweep-order";
import { sweepStops } from "../src/sweep-carrier";
import { resolveRevealMode } from "../src/map-story";
import {
  subjectTrailColor,
  explainerCloseProgress,
  EXPLAINER_CLOSE_S,
} from "../src/story-choreography";
import { markTriggerFrames as symbolMarkTriggerFrames } from "../src/symbol-story";
import { markTriggerFrames as locatorMarkTriggerFrames } from "../src/locator-story";
import { buildDotOpacityExpression } from "../src/dot-density-story";

type B = { kind: string; highlight: string[]; authored?: true };

const story = (...regions: string[]): B[] => [
  { kind: "title", highlight: [] },
  { kind: "establish", highlight: [] },
  ...regions.map((r) => ({ kind: "reveal", highlight: [r] })),
  { kind: "takeaway", highlight: [] },
];

const revealed = (beats: B[]) =>
  beats.filter((b) => b.kind === "reveal").map((b) => b.highlight[0]);

describe("orderRevealBeatsBySweep — the carrier decides WHEN", () => {
  it("puts the reveals in the carrier's order", () => {
    // A `space` sweep west→east across four regions the deriver picked by value.
    const marks = [
      { name: "POL", lon: 19, lat: 52 },
      { name: "NOR", lon: 8, lat: 61 },
      { name: "DEU", lon: 10, lat: 51 },
    ];
    const out = orderRevealBeatsBySweep(
      story("DEU", "POL", "NOR"),
      sweepStops("space", marks),
    );
    expect(revealed(out)).toEqual(["NOR", "DEU", "POL"]);
  });

  it("leaves the title, establish and takeaway beats exactly where they are", () => {
    const out = orderRevealBeatsBySweep(story("B", "A"), { A: 0, B: 1 });
    expect(out.map((b) => b.kind)).toEqual([
      "title",
      "establish",
      "reveal",
      "reveal",
      "takeaway",
    ]);
    // The beat COUNT is what Root.tsx's calculateMetadata sizes the composition from, and it
    // does not know a carrier exists. A permutation that changed it would cut the mp4.
    expect(out.length).toBe(story("B", "A").length);
  });

  it("refuses to re-sort a journalist's CONFIRMED walk", () => {
    const arc = story("B", "A").map((b) =>
      b.kind === "reveal" ? { ...b, authored: true as const } : b,
    );
    expect(revealed(orderRevealBeatsBySweep(arc, { A: 0, B: 1 }))).toEqual([
      "B",
      "A",
    ]);
  });

  it("changes nothing when no carrier ran — the invariant that bounds the lot", () => {
    const beats = story("B", "A", "C");
    expect(orderRevealBeatsBySweep(beats, {})).toEqual(beats);
  });

  it("keeps the deriver's order for regions the carrier cannot separate", () => {
    // Every region shares one value: `threshold` lands them all at 0 and must not invent a rank.
    const stops = sweepStops("threshold", [
      { name: "A", value: 5 },
      { name: "B", value: 5 },
      { name: "C", value: 5 },
    ]);
    expect(
      revealed(orderRevealBeatsBySweep(story("C", "A", "B"), stops)),
    ).toEqual(["C", "A", "B"]);
  });

  it("never OPENS the walk on a region the carrier could not place", () => {
    // sweep-carrier lands an unplaceable mark at 1 (its own rule), so it can only ever share
    // the end of the walk with the last placed mark — never lead it with a rank nothing gave.
    const stops = sweepStops("time", [
      { name: "A", time: 2001 },
      { name: "B" },
      { name: "C", time: 2003 },
    ]);
    const out = revealed(orderRevealBeatsBySweep(story("B", "C", "A"), stops));
    expect(out[0]).toBe("A");
    expect(out.indexOf("B")).toBeGreaterThan(0);
  });
});

describe("a declared carrier is itself the reveal mode", () => {
  it("resolves to sequential, so the map is dark until the sweep reaches each subject", () => {
    expect(resolveRevealMode({ sweepCarrier: "threshold" })).toBe("sequential");
  });

  it("wins over an explicit context — there is nothing left to light up under context", () => {
    expect(
      resolveRevealMode({ sweepCarrier: "space", revealMode: "context" }),
    ).toBe("sequential");
  });

  it("without a carrier, nothing about the existing modes moves", () => {
    expect(resolveRevealMode({})).toBe("context");
    expect(resolveRevealMode({ revealMode: "sequential" })).toBe("sequential");
    expect(resolveRevealMode({ revealMode: "context" })).toBe("context");
  });
});

describe("the close rides the takeaway beat's OWN hold, never a clock of its own", () => {
  const fps = 30;
  // One beat: 39 frames of camera move, then a 90-frame hold.
  const phase = {
    beatIndex: 5,
    startFrame: 591,
    moveFrames: 39,
    holdFrames: 90,
  };
  const holdStart = phase.startFrame + phase.moveFrames;

  it("stays at 0 while the camera is still pulling back", () => {
    expect(explainerCloseProgress(phase.startFrame, phase, fps)).toBe(0);
    expect(explainerCloseProgress(holdStart - 1, phase, fps)).toBe(0);
    expect(explainerCloseProgress(holdStart, phase, fps)).toBe(0);
  });

  it("reaches full inside the hold, and holds there", () => {
    const closeFrames = Math.round(EXPLAINER_CLOSE_S * fps);
    // The whole ramp fits in the takeaway's own hold — otherwise the mp4 ends mid-wash.
    expect(closeFrames).toBeLessThan(phase.holdFrames);
    expect(explainerCloseProgress(holdStart + closeFrames, phase, fps)).toBe(1);
    expect(
      explainerCloseProgress(holdStart + phase.holdFrames, phase, fps),
    ).toBe(1);
  });
});

describe("the close hands a non-subject mark a TRIGGER FRAME, not a second opacity path", () => {
  const points = [
    { lon: 0, lat: 0, value: 9, label: "A" },
    { lon: 1, lat: 1, value: 1, label: "B" },
  ];
  const revealTriggers = new Map([["A", 100]]);

  it("symbol: leaves a mark past maxReveals hidden when no carrier passes a close frame", () => {
    const t = symbolMarkTriggerFrames(points, "sequential", 0, revealTriggers);
    expect(t.get("B")).toBe(Number.POSITIVE_INFINITY);
  });

  it("symbol: enters it on the takeaway's hold when the explainer passes one", () => {
    const t = symbolMarkTriggerFrames(
      points,
      "sequential",
      0,
      revealTriggers,
      630,
    );
    expect(t.get("A")).toBe(100); // a subject keeps its own beat
    expect(t.get("B")).toBe(630);
  });

  it("locator: same two answers, same default", () => {
    const markers = [{ label: "A" }, { label: "B" }];
    expect(
      locatorMarkTriggerFrames(markers, "sequential", 0, revealTriggers).get(
        "B",
      ),
    ).toBe(Number.POSITIVE_INFINITY);
    expect(
      locatorMarkTriggerFrames(
        markers,
        "sequential",
        0,
        revealTriggers,
        630,
      ).get("B"),
    ).toBe(630);
  });

  it("context mode never closes — every mark already entered together", () => {
    const t = symbolMarkTriggerFrames(
      points,
      "context",
      42,
      revealTriggers,
      630,
    );
    expect([t.get("A"), t.get("B")]).toEqual([42, 42]);
  });
});

describe("the dot-density close lands in the expression's EXISTING default branch", () => {
  const beat = { dim: true, highlight: ["FRA"] };

  it("defaults to the flat 0 every caller had before", () => {
    const expr = buildDotOpacityExpression(
      "sequential",
      beat,
      new Map(),
      0.25,
    ) as unknown[];
    expect(expr[expr.length - 1]).toBe(0);
  });

  it("carries the ramp when the takeaway passes one — no extra branch", () => {
    const bare = buildDotOpacityExpression(
      "sequential",
      beat,
      new Map(),
      0.25,
    ) as unknown[];
    const closing = buildDotOpacityExpression(
      "sequential",
      beat,
      new Map(),
      0.25,
      0.7,
    ) as unknown[];
    expect(closing.length).toBe(bare.length);
    expect(closing[closing.length - 1]).toBe(0.7);
  });
});

describe("subjectTrailColor — Map Explainer's border rule", () => {
  it("darkens the subject's own colour instead of flattening it to a neutral", () => {
    const fill = "#4A90D9";
    const trail = subjectTrailColor(fill);
    expect(trail).not.toBe(fill);
    // Same colour, lower lightness: a hex whose channels are all at or below the fill's.
    const ch = (h: string) =>
      [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const [fr, fg, fb] = ch(fill);
    const [tr, tg, tb] = ch(trail);
    expect(tr).toBeLessThan(fr!);
    expect(tg).toBeLessThan(fg!);
    expect(tb).toBeLessThan(fb!);
  });

  it("hands back anything that is not a #rrggbb untouched", () => {
    expect(subjectTrailColor("rgba(0,0,0,.2)")).toBe("rgba(0,0,0,.2)");
  });
});
