import { describe, expect, it } from "bun:test";
import {
  EVENT_ORDER,
  checkTiming,
  endOf,
  progressOf,
  type BeatTiming,
} from "#shared/twin-chart-video/timing.ts";
import { SLOPE_TIMING } from "./timing-contract";

/**
 * Pins this beat's own timing contract, the same discipline every other proof workspace applies
 * to its own — each rule asserted green on the shipped timing and RED on a timing mutated to
 * break exactly that rule.
 */

const broken = (patch: Partial<BeatTiming>): BeatTiming => ({
  ...SLOPE_TIMING,
  ...patch,
});

describe("the shipped slope timing", () => {
  it("should pass every structural rule of the motion grammar", () => {
    expect(checkTiming(SLOPE_TIMING)).toEqual([]);
  });

  it("should be about nine seconds at thirty frames per second", () => {
    expect(SLOPE_TIMING.fps).toBe(30);
    expect(SLOPE_TIMING.total).toBe(259);
  });

  it("should name its six events in editorial order", () => {
    const starts = EVENT_ORDER.map((name) => SLOPE_TIMING[name].start);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });

  it("should leave a real pause between the reference rule and the lines arriving", () => {
    const pause = SLOPE_TIMING.reveal.start - endOf(SLOPE_TIMING.reference);
    expect(pause).toBeGreaterThanOrEqual(SLOPE_TIMING.fps / 2);
  });

  it("should not let the subject start before every line has finished drawing", () => {
    expect(SLOPE_TIMING.subject.start).toBeGreaterThanOrEqual(
      endOf(SLOPE_TIMING.reveal),
    );
  });
});

describe("checkTiming on a mutated slope timing", () => {
  it("should refuse a subject that lands before the last line has arrived", () => {
    const errors = checkTiming(
      broken({ subject: { start: 145, duration: 24 } }),
    );
    expect(errors.join(" ")).toContain("subject starts at 145");
  });

  it("should refuse a composition that ends on a transition instead of a hold", () => {
    const errors = checkTiming(broken({ hold: { start: 213, duration: 20 } }));
    expect(errors.join(" ")).toContain("hold ends at 233");
  });

  it("should refuse a hold shorter than half a second", () => {
    const errors = checkTiming(
      broken({ total: 227, hold: { start: 213, duration: 14 } }),
    );
    expect(errors.join(" ")).toContain("under the half-second floor");
  });
});

describe("progressOf on the slope timing", () => {
  it("should clamp before its window, so nothing moves early", () => {
    expect(progressOf(0, SLOPE_TIMING.subject)).toBe(0);
  });

  it("should clamp after its window, so the hold is actually still", () => {
    expect(progressOf(SLOPE_TIMING.total, SLOPE_TIMING.conclusion)).toBe(1);
    expect(progressOf(SLOPE_TIMING.total, SLOPE_TIMING.reveal)).toBe(1);
  });
});
