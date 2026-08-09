import { describe, expect, it } from "bun:test";
import {
  EVENT_ORDER,
  checkTiming,
  endOf,
  progressOf,
  type BeatTiming,
} from "#shared/twin-chart-video/timing.ts";
import { HISTOGRAM_TIMING } from "./timing-contract";

/**
 * Pins this beat's own timing contract, the same discipline
 * `../video-population-growth-dumbbell/timing.test.ts` applies to its own — each rule asserted
 * green on the shipped timing and RED on a timing mutated to break exactly that rule.
 */

const broken = (patch: Partial<BeatTiming>): BeatTiming => ({
  ...HISTOGRAM_TIMING,
  ...patch,
});

describe("the shipped histogram timing", () => {
  it("should pass every structural rule of the motion grammar", () => {
    expect(checkTiming(HISTOGRAM_TIMING)).toEqual([]);
  });

  it("should be 7.6 seconds at thirty frames per second", () => {
    expect(HISTOGRAM_TIMING.fps).toBe(30);
    expect(HISTOGRAM_TIMING.total).toBe(228);
  });

  it("should name its six events in editorial order", () => {
    const starts = EVENT_ORDER.map((name) => HISTOGRAM_TIMING[name].start);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });

  it("should leave a real pause between the median line and the bars arriving", () => {
    const pause =
      HISTOGRAM_TIMING.reveal.start - endOf(HISTOGRAM_TIMING.reference);
    expect(pause).toBeGreaterThanOrEqual(HISTOGRAM_TIMING.fps / 2);
  });

  it("should not let the subject bin land before every bar has fully risen", () => {
    expect(HISTOGRAM_TIMING.subject.start).toBeGreaterThanOrEqual(
      endOf(HISTOGRAM_TIMING.reveal),
    );
  });

  it("should hold the finished chart at least half a second", () => {
    expect(HISTOGRAM_TIMING.hold.duration).toBeGreaterThanOrEqual(
      HISTOGRAM_TIMING.fps / 2,
    );
  });
});

describe("checkTiming on a mutated histogram timing", () => {
  it("should refuse a subject that lands before every bar has risen", () => {
    const errors = checkTiming(
      broken({ subject: { start: 100, duration: 22 } }),
    );
    expect(errors.join(" ")).toContain("subject starts at 100");
  });

  it("should refuse a composition that ends on a transition instead of a hold", () => {
    const errors = checkTiming(broken({ hold: { start: 180, duration: 20 } }));
    expect(errors.join(" ")).toContain("hold ends at 200");
  });

  it("should refuse a hold shorter than half a second", () => {
    const errors = checkTiming(
      broken({ total: 194, hold: { start: 180, duration: 14 } }),
    );
    expect(errors.join(" ")).toContain("under the half-second floor");
  });

  it("should refuse a reveal that starts before the reference line has finished", () => {
    const errors = checkTiming(broken({ reveal: { start: 40, duration: 60 } }));
    expect(errors.join(" ")).toContain("reveal starts at 40");
  });
});

describe("progressOf on the histogram timing", () => {
  it("should clamp before its window, so nothing moves early", () => {
    expect(progressOf(0, HISTOGRAM_TIMING.subject)).toBe(0);
  });

  it("should clamp after its window, so the hold is actually still", () => {
    expect(
      progressOf(HISTOGRAM_TIMING.total, HISTOGRAM_TIMING.conclusion),
    ).toBe(1);
    expect(progressOf(HISTOGRAM_TIMING.total, HISTOGRAM_TIMING.reveal)).toBe(1);
  });
});
