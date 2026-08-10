import { describe, expect, it } from "bun:test";
import {
  EVENT_ORDER,
  checkTiming,
  endOf,
  progressOf,
  type BeatTiming,
} from "#shared/chart-video/timing.ts";
import { PYRAMID_TIMING } from "./timing-contract";

/**
 * Pins this beat's own timing contract, the same discipline
 * `../video-population-growth-dumbbell/timing.test.ts` applies to its own — each rule asserted
 * green on the shipped timing and RED on a timing mutated to break exactly that rule.
 */

const broken = (patch: Partial<BeatTiming>): BeatTiming => ({
  ...PYRAMID_TIMING,
  ...patch,
});

describe("the shipped pyramid timing", () => {
  it("should pass every structural rule of the motion grammar", () => {
    expect(checkTiming(PYRAMID_TIMING)).toEqual([]);
  });

  it("should be 336 frames at thirty frames per second", () => {
    expect(PYRAMID_TIMING.fps).toBe(30);
    expect(PYRAMID_TIMING.total).toBe(336);
  });

  it("should name its six events in editorial order", () => {
    const starts = EVENT_ORDER.map((name) => PYRAMID_TIMING[name].start);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });

  it("should leave a real pause between the reference spine and the bands arriving", () => {
    const pause = PYRAMID_TIMING.reveal.start - endOf(PYRAMID_TIMING.reference);
    expect(pause).toBeGreaterThanOrEqual(PYRAMID_TIMING.fps / 2);
  });

  it("should give reveal more room than the dumbbell's ten-row cascade, for 21 bands", () => {
    expect(PYRAMID_TIMING.reveal.duration).toBeGreaterThan(96);
  });

  it("should not let the subject start before every band has landed", () => {
    expect(PYRAMID_TIMING.subject.start).toBeGreaterThanOrEqual(
      endOf(PYRAMID_TIMING.reveal),
    );
  });
});

describe("checkTiming on a mutated pyramid timing", () => {
  it("should refuse a subject that lands before the last band has arrived", () => {
    const errors = checkTiming(
      broken({ subject: { start: 200, duration: 28 } }),
    );
    expect(errors.join(" ")).toContain("subject starts at 200");
  });

  it("should refuse a composition that ends on a transition instead of a hold", () => {
    const errors = checkTiming(broken({ hold: { start: 286, duration: 30 } }));
    expect(errors.join(" ")).toContain("hold ends at 316");
  });

  it("should refuse a hold shorter than half a second", () => {
    const errors = checkTiming(
      broken({ total: 300, hold: { start: 286, duration: 14 } }),
    );
    expect(errors.join(" ")).toContain("under the half-second floor");
  });

  it("should refuse a reference that starts before establish has finished", () => {
    const errors = checkTiming(
      broken({ reference: { start: 20, duration: 22 } }),
    );
    expect(errors.join(" ")).toContain("reference starts at 20");
  });
});

describe("progressOf on the pyramid timing", () => {
  it("should clamp before its window, so nothing moves early", () => {
    expect(progressOf(0, PYRAMID_TIMING.subject)).toBe(0);
  });

  it("should clamp after its window, so the hold is actually still", () => {
    expect(progressOf(PYRAMID_TIMING.total, PYRAMID_TIMING.conclusion)).toBe(1);
    expect(progressOf(PYRAMID_TIMING.total, PYRAMID_TIMING.reveal)).toBe(1);
  });
});
