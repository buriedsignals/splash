import { describe, expect, it } from "bun:test";
import {
  EVENT_ORDER,
  checkTiming,
  endOf,
  progressOf,
  type BeatTiming,
} from "#shared/twin-chart-video/timing.ts";
import { MIGRATION_TIMING } from "./timing-contract";

/**
 * Pins beat 3's own timing contract, the same discipline `test/timing.test.ts` applies to
 * `CO2_TIMING` — each rule asserted green on the shipped timing and RED on a timing mutated to
 * break exactly that rule.
 */

const broken = (patch: Partial<BeatTiming>): BeatTiming => ({
  ...MIGRATION_TIMING,
  ...patch,
});

describe("the shipped migration timing", () => {
  it("should pass every structural rule of the motion grammar", () => {
    expect(checkTiming(MIGRATION_TIMING)).toEqual([]);
  });

  it("should be eight seconds at thirty frames per second", () => {
    expect(MIGRATION_TIMING.fps).toBe(30);
    expect(MIGRATION_TIMING.total).toBe(MIGRATION_TIMING.fps * 8);
  });

  it("should name its six events in editorial order", () => {
    const starts = EVENT_ORDER.map((name) => MIGRATION_TIMING[name].start);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });

  it("should leave a real pause between the baseline and the data", () => {
    const pause =
      MIGRATION_TIMING.reveal.start - endOf(MIGRATION_TIMING.reference);
    expect(pause).toBeGreaterThanOrEqual(MIGRATION_TIMING.fps / 2);
  });

  it("should give the subject more room than beat 1's, for the band and two dots to land", () => {
    expect(MIGRATION_TIMING.subject.duration).toBeGreaterThan(18);
  });
});

describe("checkTiming on a mutated migration timing", () => {
  it("should refuse a subject folded into the tail of the reveal", () => {
    const errors = checkTiming(
      broken({ subject: { start: 120, duration: 24 } }),
    );
    expect(errors.join(" ")).toContain("subject starts at 120");
  });

  it("should refuse a composition that ends on a transition instead of a hold", () => {
    const errors = checkTiming(broken({ hold: { start: 200, duration: 20 } }));
    expect(errors.join(" ")).toContain("hold ends at 220");
  });

  it("should refuse a hold shorter than half a second", () => {
    const errors = checkTiming(
      broken({ total: 214, hold: { start: 200, duration: 14 } }),
    );
    expect(errors.join(" ")).toContain("under the half-second floor");
  });
});

describe("progressOf on the migration timing", () => {
  it("should clamp before its window, so nothing moves early", () => {
    expect(progressOf(0, MIGRATION_TIMING.subject)).toBe(0);
  });

  it("should clamp after its window, so the hold is actually still", () => {
    expect(
      progressOf(MIGRATION_TIMING.total, MIGRATION_TIMING.conclusion),
    ).toBe(1);
    expect(progressOf(MIGRATION_TIMING.total, MIGRATION_TIMING.reveal)).toBe(1);
  });
});
