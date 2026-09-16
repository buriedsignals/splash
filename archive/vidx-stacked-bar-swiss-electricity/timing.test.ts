import { describe, expect, it } from "bun:test";
import {
  EVENT_ORDER,
  checkTiming,
  endOf,
  progressOf,
  type BeatTiming,
} from "#shared/chart-video/timing.ts";
import { STACKED_BAR_TIMING } from "./timing-contract";

/**
 * Pins this beat's own timing contract, the same discipline every other proof workspace applies
 * to its own — each rule asserted green on the shipped timing and RED on a timing mutated to
 * break exactly that rule.
 */

const broken = (patch: Partial<BeatTiming>): BeatTiming => ({
  ...STACKED_BAR_TIMING,
  ...patch,
});

describe("the shipped stacked-bar timing", () => {
  it("should pass every structural rule of the motion grammar", () => {
    expect(checkTiming(STACKED_BAR_TIMING)).toEqual([]);
  });

  it("should be about eight seconds at thirty frames per second", () => {
    expect(STACKED_BAR_TIMING.fps).toBe(30);
    expect(STACKED_BAR_TIMING.total).toBe(248);
  });

  it("should name its six events in editorial order", () => {
    const starts = EVENT_ORDER.map((name) => STACKED_BAR_TIMING[name].start);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });

  it("should leave a real pause between the reference rule and the columns rising", () => {
    const pause =
      STACKED_BAR_TIMING.reveal.start - endOf(STACKED_BAR_TIMING.reference);
    expect(pause).toBeGreaterThanOrEqual(STACKED_BAR_TIMING.fps / 2);
  });

  it("should not let the subject start before every column has finished stacking", () => {
    expect(STACKED_BAR_TIMING.subject.start).toBeGreaterThanOrEqual(
      endOf(STACKED_BAR_TIMING.reveal),
    );
  });
});

describe("checkTiming on a mutated stacked-bar timing", () => {
  it("should refuse a subject that lands before the last column has arrived", () => {
    const errors = checkTiming(
      broken({ subject: { start: 140, duration: 22 } }),
    );
    expect(errors.join(" ")).toContain("subject starts at 140");
  });

  it("should refuse a composition that ends on a transition instead of a hold", () => {
    const errors = checkTiming(broken({ hold: { start: 202, duration: 20 } }));
    expect(errors.join(" ")).toContain("hold ends at 222");
  });

  it("should refuse a hold shorter than half a second", () => {
    const errors = checkTiming(
      broken({ total: 216, hold: { start: 202, duration: 14 } }),
    );
    expect(errors.join(" ")).toContain("under the half-second floor");
  });
});

describe("progressOf on the stacked-bar timing", () => {
  it("should clamp before its window, so nothing moves early", () => {
    expect(progressOf(0, STACKED_BAR_TIMING.subject)).toBe(0);
  });

  it("should clamp after its window, so the hold is actually still", () => {
    expect(
      progressOf(STACKED_BAR_TIMING.total, STACKED_BAR_TIMING.conclusion),
    ).toBe(1);
    expect(
      progressOf(STACKED_BAR_TIMING.total, STACKED_BAR_TIMING.reveal),
    ).toBe(1);
  });
});
