import { describe, expect, it } from "bun:test";
import {
  EVENT_ORDER,
  checkTiming,
  endOf,
  progressOf,
  type BeatTiming,
} from "#shared/twin-chart-video/timing.ts";
import { DIVERGING_TIMING } from "./timing-contract";

/**
 * Pins this beat's own timing contract, the same discipline every other video beat here applies —
 * each rule asserted green on the shipped timing AND red on a timing mutated to break exactly that
 * rule, so a test that stopped testing anything would be visible.
 */

const broken = (patch: Partial<BeatTiming>): BeatTiming => ({
  ...DIVERGING_TIMING,
  ...patch,
});

describe("the shipped diverging-bar timing", () => {
  it("should pass every structural rule of the motion grammar", () => {
    expect(checkTiming(DIVERGING_TIMING)).toEqual([]);
  });

  it("should be ten seconds at thirty frames per second", () => {
    expect(DIVERGING_TIMING.fps).toBe(30);
    expect(DIVERGING_TIMING.total).toBe(DIVERGING_TIMING.fps * 10);
  });

  it("should name its six events in editorial order", () => {
    const starts = EVENT_ORDER.map((name) => DIVERGING_TIMING[name].start);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });

  it("should leave a real pause between the zero line and the bars arriving", () => {
    const pause =
      DIVERGING_TIMING.reveal.start - endOf(DIVERGING_TIMING.reference);
    expect(pause).toBeGreaterThanOrEqual(DIVERGING_TIMING.fps / 2);
  });

  it("should give the reveal enough room for twenty-seven staggered rows", () => {
    expect(DIVERGING_TIMING.reveal.duration).toBeGreaterThan(112);
  });

  it("should not pick out the exception before every row has landed", () => {
    expect(DIVERGING_TIMING.subject.start).toBeGreaterThanOrEqual(
      endOf(DIVERGING_TIMING.reveal),
    );
  });

  it("should state the average only after the falls it averages are all drawn", () => {
    expect(DIVERGING_TIMING.conclusion.start).toBeGreaterThanOrEqual(
      endOf(DIVERGING_TIMING.reveal),
    );
  });
});

describe("checkTiming on a mutated diverging-bar timing", () => {
  it("should refuse a subject that lands before the last bar has arrived", () => {
    const errors = checkTiming(
      broken({ subject: { start: 170, duration: 18 } }),
    );
    expect(errors.join(" ")).toContain("subject starts at 170");
  });

  it("should refuse an average stated before its own evidence", () => {
    const errors = checkTiming(
      broken({ conclusion: { start: 140, duration: 44 } }),
    );
    expect(errors.join(" ")).toContain("conclusion starts at 140");
  });

  it("should refuse a composition that ends on a transition instead of a hold", () => {
    const errors = checkTiming(broken({ hold: { start: 252, duration: 20 } }));
    expect(errors.join(" ")).toContain("hold ends at 272");
  });
});

describe("progressOf on the diverging-bar timing", () => {
  it("should clamp before its window, so nothing moves early", () => {
    expect(progressOf(0, DIVERGING_TIMING.conclusion)).toBe(0);
  });

  it("should clamp after its window, so the hold is actually still", () => {
    expect(progressOf(DIVERGING_TIMING.total, DIVERGING_TIMING.reveal)).toBe(1);
    expect(
      progressOf(DIVERGING_TIMING.total, DIVERGING_TIMING.conclusion),
    ).toBe(1);
  });
});
