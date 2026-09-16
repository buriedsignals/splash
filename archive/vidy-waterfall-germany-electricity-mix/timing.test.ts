import { describe, expect, it } from "bun:test";
import {
  EVENT_ORDER,
  checkTiming,
  endOf,
  progressOf,
  type BeatTiming,
} from "#shared/chart-video/timing.ts";
import { WATERFALL_TIMING } from "./timing-contract";

/**
 * Pins this beat's own timing contract, the same discipline
 * `../video-population-growth-dumbbell/timing.test.ts` applies to its own — each rule asserted
 * green on the shipped timing and RED on a timing mutated to break exactly that rule.
 */

const broken = (patch: Partial<BeatTiming>): BeatTiming => ({
  ...WATERFALL_TIMING,
  ...patch,
});

describe("the shipped waterfall timing", () => {
  it("should pass every structural rule of the motion grammar", () => {
    expect(checkTiming(WATERFALL_TIMING)).toEqual([]);
  });

  it("should run just over ten and a half seconds at thirty frames per second", () => {
    expect(WATERFALL_TIMING.fps).toBe(30);
    expect(WATERFALL_TIMING.total).toBe(314);
  });

  it("should name its six events in editorial order", () => {
    const starts = EVENT_ORDER.map((name) => WATERFALL_TIMING[name].start);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });

  it("should leave a real pause between the opening total and the first step arriving", () => {
    const pause =
      WATERFALL_TIMING.reveal.start - endOf(WATERFALL_TIMING.reference);
    expect(pause).toBeGreaterThanOrEqual(WATERFALL_TIMING.fps / 2);
  });

  it("should give reveal enough room for eight discrete step-arrivals to cascade", () => {
    expect(WATERFALL_TIMING.reveal.duration).toBeGreaterThan(78);
  });

  it("should not let the subject (closing total) land before every step has arrived", () => {
    expect(WATERFALL_TIMING.subject.start).toBeGreaterThanOrEqual(
      endOf(WATERFALL_TIMING.reveal),
    );
  });

  it("should not let the conclusion appear before the closing total has landed", () => {
    expect(WATERFALL_TIMING.conclusion.start).toBeGreaterThanOrEqual(
      endOf(WATERFALL_TIMING.subject),
    );
  });
});

describe("checkTiming on a mutated waterfall timing", () => {
  it("should refuse a subject that lands before the last step has arrived", () => {
    const errors = checkTiming(
      broken({ subject: { start: 190, duration: 26 } }),
    );
    expect(errors.join(" ")).toContain("subject starts at 190");
  });

  it("should refuse a composition that ends on a transition instead of a hold", () => {
    const errors = checkTiming(broken({ hold: { start: 264, duration: 20 } }));
    expect(errors.join(" ")).toContain("hold ends at 284");
  });

  it("should refuse a hold shorter than half a second", () => {
    const errors = checkTiming(
      broken({ total: 278, hold: { start: 264, duration: 14 } }),
    );
    expect(errors.join(" ")).toContain("under the half-second floor");
  });
});

describe("progressOf on the waterfall timing", () => {
  it("should clamp before its window, so nothing moves early", () => {
    expect(progressOf(0, WATERFALL_TIMING.subject)).toBe(0);
  });

  it("should clamp after its window, so the hold is actually still", () => {
    expect(
      progressOf(WATERFALL_TIMING.total, WATERFALL_TIMING.conclusion),
    ).toBe(1);
    expect(progressOf(WATERFALL_TIMING.total, WATERFALL_TIMING.reveal)).toBe(1);
  });
});
