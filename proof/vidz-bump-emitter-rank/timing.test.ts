import { describe, expect, it } from "bun:test";
import {
  EVENT_ORDER,
  checkTiming,
  endOf,
  progressOf,
  type BeatTiming,
} from "#shared/chart-video/timing.ts";
import { BUMP_TIMING } from "./timing-contract";

/**
 * Pins this beat's own timing contract, the same discipline every other video beat here applies —
 * each rule asserted green on the shipped timing AND red on a timing mutated to break exactly that
 * rule, so a test that stopped testing anything would be visible.
 */

const broken = (patch: Partial<BeatTiming>): BeatTiming => ({
  ...BUMP_TIMING,
  ...patch,
});

describe("the shipped bump timing", () => {
  it("should pass every structural rule of the motion grammar", () => {
    expect(checkTiming(BUMP_TIMING)).toEqual([]);
  });

  it("should be ten seconds at thirty frames per second", () => {
    expect(BUMP_TIMING.fps).toBe(30);
    expect(BUMP_TIMING.total).toBe(BUMP_TIMING.fps * 10);
  });

  it("should name its six events in editorial order", () => {
    const starts = EVENT_ORDER.map((name) => BUMP_TIMING[name].start);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });

  it("should leave a real pause between the starting order and the race beginning", () => {
    const pause = BUMP_TIMING.reveal.start - endOf(BUMP_TIMING.reference);
    expect(pause).toBeGreaterThanOrEqual(BUMP_TIMING.fps / 2);
  });

  it("should give the race at least three seconds, because 34 years of crossings pass through it", () => {
    expect(BUMP_TIMING.reveal.duration).toBeGreaterThanOrEqual(
      BUMP_TIMING.fps * 3,
    );
  });

  it("should not accent one line before the whole race has run", () => {
    expect(BUMP_TIMING.subject.start).toBeGreaterThanOrEqual(
      endOf(BUMP_TIMING.reveal),
    );
  });

  it("should mark the crossings only after the subject has been picked out", () => {
    expect(BUMP_TIMING.conclusion.start).toBeGreaterThanOrEqual(
      endOf(BUMP_TIMING.subject),
    );
  });
});

describe("checkTiming on a mutated bump timing", () => {
  it("should refuse a subject accented while the race is still running", () => {
    const errors = checkTiming(
      broken({ subject: { start: 150, duration: 22 } }),
    );
    expect(errors.join(" ")).toContain("subject starts at 150");
  });

  it("should refuse crossings marked before the subject exists", () => {
    const errors = checkTiming(
      broken({ conclusion: { start: 120, duration: 46 } }),
    );
    expect(errors.join(" ")).toContain("conclusion starts at 120");
  });

  it("should refuse a composition that ends on a transition instead of a hold", () => {
    const errors = checkTiming(broken({ hold: { start: 256, duration: 20 } }));
    expect(errors.join(" ")).toContain("hold ends at 276");
  });
});

describe("progressOf on the bump timing", () => {
  it("should clamp before its window, so nothing moves early", () => {
    expect(progressOf(0, BUMP_TIMING.reveal)).toBe(0);
  });

  it("should clamp after its window, so the hold is actually still", () => {
    expect(progressOf(BUMP_TIMING.total, BUMP_TIMING.reveal)).toBe(1);
    expect(progressOf(BUMP_TIMING.total, BUMP_TIMING.conclusion)).toBe(1);
  });
});
