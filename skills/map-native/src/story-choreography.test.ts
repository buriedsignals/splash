import { describe, it, expect } from "bun:test";
import {
  stagedByKey,
  AREAL_TIMELINE_OPTS,
  makeStoryMeta,
} from "./story-choreography.ts";

describe("stagedByKey", () => {
  it("returns a staged entrance per key, keyed by trigger frame", () => {
    const triggers = new Map([
      ["A", 30],
      ["B", 120],
    ]);
    const m = stagedByKey(triggers, 30, 30, 0.9); // frame 30: A just triggered (ls=0), B not yet
    expect(m.get("A")!.borderProgress).toBe(0); // ls=0 → border not started
    expect(m.get("B")!.borderProgress).toBe(0); // ls<0 → clamped 0
    const later = stagedByKey(triggers, 30 + 30 * 5, 30, 0.9); // A at ls=5s → fully entered
    expect(later.get("A")!.borderProgress).toBeCloseTo(1, 5);
    expect(later.get("A")!.fillOpacity).toBeCloseTo(0.9, 5);
    expect(later.get("A")!.labelReveal).toBeCloseTo(1, 5);
  });
});

describe("AREAL_TIMELINE_OPTS", () => {
  it("carries the tuned revealHold + move", () => {
    expect(AREAL_TIMELINE_OPTS.revealHold).toBe(3.0);
    expect(AREAL_TIMELINE_OPTS.move).toBe(1.3);
  });
});

describe("makeStoryMeta", () => {
  it("builds a calculateMetadata fn from a frame computer", () => {
    const meta = makeStoryMeta(() => 456);
    expect(meta({ props: { config: {} } })).toEqual({ durationInFrames: 456 });
  });
});
