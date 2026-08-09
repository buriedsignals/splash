import { describe, expect, it } from "bun:test";
import {
  EVENT_ORDER,
  checkTiming,
  endOf,
  progressOf,
  type BeatTiming,
} from "#shared/twin-chart-video/timing.ts";
import { SCATTER_TIMING } from "./timing-contract";

/**
 * Pins this beat's own timing contract, the same discipline every other proof workspace applies
 * to its own — each rule asserted green on the shipped timing and RED on a timing mutated to
 * break exactly that rule.
 */

const broken = (patch: Partial<BeatTiming>): BeatTiming => ({
  ...SCATTER_TIMING,
  ...patch,
});

describe("the shipped scatter timing", () => {
  it("should pass every structural rule of the motion grammar", () => {
    expect(checkTiming(SCATTER_TIMING)).toEqual([]);
  });

  it("should be about nine seconds at thirty frames per second", () => {
    expect(SCATTER_TIMING.fps).toBe(30);
    expect(SCATTER_TIMING.total).toBe(272);
  });

  it("should name its six events in editorial order", () => {
    const starts = EVENT_ORDER.map((name) => SCATTER_TIMING[name].start);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });

  it("should leave a real pause between the reference rule and the cloud arriving", () => {
    const pause = SCATTER_TIMING.reveal.start - endOf(SCATTER_TIMING.reference);
    expect(pause).toBeGreaterThanOrEqual(SCATTER_TIMING.fps / 2);
  });

  it("should give reveal more room than the dumbbell's ten-row cascade, for twenty points", () => {
    expect(SCATTER_TIMING.reveal.duration).toBeGreaterThan(96);
  });

  it("should not let the subject start before every point has landed", () => {
    expect(SCATTER_TIMING.subject.start).toBeGreaterThanOrEqual(
      endOf(SCATTER_TIMING.reveal),
    );
  });
});

describe("checkTiming on a mutated scatter timing", () => {
  it("should refuse a subject that lands before the last point has arrived", () => {
    const errors = checkTiming(
      broken({ subject: { start: 160, duration: 24 } }),
    );
    expect(errors.join(" ")).toContain("subject starts at 160");
  });

  it("should refuse a composition that ends on a transition instead of a hold", () => {
    const errors = checkTiming(broken({ hold: { start: 226, duration: 20 } }));
    expect(errors.join(" ")).toContain("hold ends at 246");
  });

  it("should refuse a hold shorter than half a second", () => {
    const errors = checkTiming(
      broken({ total: 240, hold: { start: 226, duration: 14 } }),
    );
    expect(errors.join(" ")).toContain("under the half-second floor");
  });
});

describe("progressOf on the scatter timing", () => {
  it("should clamp before its window, so nothing moves early", () => {
    expect(progressOf(0, SCATTER_TIMING.subject)).toBe(0);
  });

  it("should clamp after its window, so the hold is actually still", () => {
    expect(progressOf(SCATTER_TIMING.total, SCATTER_TIMING.conclusion)).toBe(1);
    expect(progressOf(SCATTER_TIMING.total, SCATTER_TIMING.reveal)).toBe(1);
  });
});
