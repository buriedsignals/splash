import { describe, expect, it } from "bun:test";
import {
  EVENT_ORDER,
  checkTiming,
  endOf,
  progressOf,
  type BeatTiming,
} from "#shared/twin-chart-video/timing.ts";
import { DUMBBELL_TIMING } from "./timing-contract";

/**
 * Pins this beat's own timing contract, the same discipline `../migration/timing.test.ts` and
 * `../life-expectancy/timing.test.ts` apply to their own — each rule asserted green on the shipped
 * timing and RED on a timing mutated to break exactly that rule.
 */

const broken = (patch: Partial<BeatTiming>): BeatTiming => ({
  ...DUMBBELL_TIMING,
  ...patch,
});

describe("the shipped dumbbell timing", () => {
  it("should pass every structural rule of the motion grammar", () => {
    expect(checkTiming(DUMBBELL_TIMING)).toEqual([]);
  });

  it("should be nine seconds at thirty frames per second", () => {
    expect(DUMBBELL_TIMING.fps).toBe(30);
    expect(DUMBBELL_TIMING.total).toBe(DUMBBELL_TIMING.fps * 9);
  });

  it("should name its six events in editorial order", () => {
    const starts = EVENT_ORDER.map((name) => DUMBBELL_TIMING[name].start);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });

  it("should leave a real pause between the reference rule and the rows arriving", () => {
    const pause =
      DUMBBELL_TIMING.reveal.start - endOf(DUMBBELL_TIMING.reference);
    expect(pause).toBeGreaterThanOrEqual(DUMBBELL_TIMING.fps / 2);
  });

  it("should give reveal more room than a single-line beat's, for ten rows to cascade", () => {
    expect(DUMBBELL_TIMING.reveal.duration).toBeGreaterThan(78);
  });

  it("should not let the subject start before every row has landed", () => {
    expect(DUMBBELL_TIMING.subject.start).toBeGreaterThanOrEqual(
      endOf(DUMBBELL_TIMING.reveal),
    );
  });
});

describe("checkTiming on a mutated dumbbell timing", () => {
  it("should refuse a subject that lands before the last row has arrived", () => {
    const errors = checkTiming(
      broken({ subject: { start: 150, duration: 26 } }),
    );
    expect(errors.join(" ")).toContain("subject starts at 150");
  });

  it("should refuse a composition that ends on a transition instead of a hold", () => {
    const errors = checkTiming(broken({ hold: { start: 224, duration: 20 } }));
    expect(errors.join(" ")).toContain("hold ends at 244");
  });

  it("should refuse a hold shorter than half a second", () => {
    const errors = checkTiming(
      broken({ total: 238, hold: { start: 224, duration: 14 } }),
    );
    expect(errors.join(" ")).toContain("under the half-second floor");
  });
});

describe("progressOf on the dumbbell timing", () => {
  it("should clamp before its window, so nothing moves early", () => {
    expect(progressOf(0, DUMBBELL_TIMING.subject)).toBe(0);
  });

  it("should clamp after its window, so the hold is actually still", () => {
    expect(progressOf(DUMBBELL_TIMING.total, DUMBBELL_TIMING.conclusion)).toBe(
      1,
    );
    expect(progressOf(DUMBBELL_TIMING.total, DUMBBELL_TIMING.reveal)).toBe(1);
  });
});
