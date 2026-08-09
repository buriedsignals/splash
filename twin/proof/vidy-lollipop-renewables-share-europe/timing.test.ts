import { describe, expect, it } from "bun:test";
import {
  EVENT_ORDER,
  checkTiming,
  endOf,
  progressOf,
  type BeatTiming,
} from "#shared/twin-chart-video/timing.ts";
import { LOLLIPOP_TIMING } from "./timing-contract";

/**
 * Pins this beat's own timing contract, the same discipline
 * `../video-population-growth-dumbbell/timing.test.ts` applies to its own — each rule asserted
 * green on the shipped timing and RED on a timing mutated to break exactly that rule.
 */

const broken = (patch: Partial<BeatTiming>): BeatTiming => ({
  ...LOLLIPOP_TIMING,
  ...patch,
});

describe("the shipped lollipop timing", () => {
  it("should pass every structural rule of the motion grammar", () => {
    expect(checkTiming(LOLLIPOP_TIMING)).toEqual([]);
  });

  it("should be ten seconds at thirty frames per second", () => {
    expect(LOLLIPOP_TIMING.fps).toBe(30);
    expect(LOLLIPOP_TIMING.total).toBe(LOLLIPOP_TIMING.fps * 10);
  });

  it("should name its six events in editorial order", () => {
    const starts = EVENT_ORDER.map((name) => LOLLIPOP_TIMING[name].start);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });

  it("should leave a real pause between the zero baseline and the rows arriving", () => {
    const pause =
      LOLLIPOP_TIMING.reveal.start - endOf(LOLLIPOP_TIMING.reference);
    expect(pause).toBeGreaterThanOrEqual(LOLLIPOP_TIMING.fps / 2);
  });

  it("should give reveal more room than the dumbbell's ten-row cascade, for fourteen rows", () => {
    expect(LOLLIPOP_TIMING.reveal.duration).toBeGreaterThan(96);
  });

  it("should not let the subject start before every row has landed", () => {
    expect(LOLLIPOP_TIMING.subject.start).toBeGreaterThanOrEqual(
      endOf(LOLLIPOP_TIMING.reveal),
    );
  });
});

describe("checkTiming on a mutated lollipop timing", () => {
  it("should refuse a subject that lands before the last row has arrived", () => {
    const errors = checkTiming(
      broken({ subject: { start: 160, duration: 26 } }),
    );
    expect(errors.join(" ")).toContain("subject starts at 160");
  });

  it("should refuse a composition that ends on a transition instead of a hold", () => {
    const errors = checkTiming(broken({ hold: { start: 240, duration: 20 } }));
    expect(errors.join(" ")).toContain("hold ends at 260");
  });

  it("should refuse a hold shorter than half a second", () => {
    const errors = checkTiming(
      broken({ total: 254, hold: { start: 240, duration: 14 } }),
    );
    expect(errors.join(" ")).toContain("under the half-second floor");
  });
});

describe("progressOf on the lollipop timing", () => {
  it("should clamp before its window, so nothing moves early", () => {
    expect(progressOf(0, LOLLIPOP_TIMING.subject)).toBe(0);
  });

  it("should clamp after its window, so the hold is actually still", () => {
    expect(progressOf(LOLLIPOP_TIMING.total, LOLLIPOP_TIMING.conclusion)).toBe(
      1,
    );
    expect(progressOf(LOLLIPOP_TIMING.total, LOLLIPOP_TIMING.reveal)).toBe(1);
  });
});
