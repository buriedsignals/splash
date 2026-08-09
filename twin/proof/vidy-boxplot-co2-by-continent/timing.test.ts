import { describe, expect, it } from "bun:test";
import {
  EVENT_ORDER,
  checkTiming,
  endOf,
  progressOf,
  type BeatTiming,
} from "#shared/twin-chart-video/timing.ts";
import { BOXPLOT_TIMING } from "./timing-contract";

/**
 * Pins this beat's own timing contract, the same discipline
 * `../video-population-growth-dumbbell/timing.test.ts` applies to its own — each rule asserted
 * green on the shipped timing and RED on a timing mutated to break exactly that rule.
 */

const broken = (patch: Partial<BeatTiming>): BeatTiming => ({
  ...BOXPLOT_TIMING,
  ...patch,
});

describe("the shipped boxplot timing", () => {
  it("should pass every structural rule of the motion grammar", () => {
    expect(checkTiming(BOXPLOT_TIMING)).toEqual([]);
  });

  it("should be thirty frames per second", () => {
    expect(BOXPLOT_TIMING.fps).toBe(30);
  });

  it("should name its six events in editorial order", () => {
    const starts = EVENT_ORDER.map((name) => BOXPLOT_TIMING[name].start);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });

  it("should leave a real pause between the reference line and the boxes arriving", () => {
    const pause = BOXPLOT_TIMING.reveal.start - endOf(BOXPLOT_TIMING.reference);
    expect(pause).toBeGreaterThanOrEqual(BOXPLOT_TIMING.fps / 2);
  });

  it("should give reveal enough room for four discrete box arrivals", () => {
    // Four groups, each its own event — more room than a single continuous line-draw (78
    // frames), less than the dumbbell's ten-row cascade (96).
    expect(BOXPLOT_TIMING.reveal.duration).toBeGreaterThan(78);
    expect(BOXPLOT_TIMING.reveal.duration).toBeLessThan(96);
  });

  it("should not let the subject start before every box has landed", () => {
    expect(BOXPLOT_TIMING.subject.start).toBeGreaterThanOrEqual(
      endOf(BOXPLOT_TIMING.reveal),
    );
  });

  it("should not let the conclusion start before the subject's own emphasis has landed", () => {
    expect(BOXPLOT_TIMING.conclusion.start).toBeGreaterThanOrEqual(
      endOf(BOXPLOT_TIMING.subject),
    );
  });
});

describe("checkTiming on a mutated boxplot timing", () => {
  it("should refuse a subject that lands before the last box has arrived", () => {
    const errors = checkTiming(
      broken({ subject: { start: 140, duration: 30 } }),
    );
    expect(errors.join(" ")).toContain("subject starts at 140");
  });

  it("should refuse a composition that ends on a transition instead of a hold", () => {
    const errors = checkTiming(broken({ hold: { start: 216, duration: 20 } }));
    expect(errors.join(" ")).toContain("hold ends at 236");
  });

  it("should refuse a hold shorter than half a second", () => {
    const errors = checkTiming(
      broken({ total: 228, hold: { start: 216, duration: 12 } }),
    );
    expect(errors.join(" ")).toContain("under the half-second floor");
  });
});

describe("progressOf on the boxplot timing", () => {
  it("should clamp before its window, so nothing moves early", () => {
    expect(progressOf(0, BOXPLOT_TIMING.subject)).toBe(0);
  });

  it("should clamp after its window, so the hold is actually still", () => {
    expect(progressOf(BOXPLOT_TIMING.total, BOXPLOT_TIMING.conclusion)).toBe(1);
    expect(progressOf(BOXPLOT_TIMING.total, BOXPLOT_TIMING.reveal)).toBe(1);
  });
});
