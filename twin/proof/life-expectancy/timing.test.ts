import { describe, expect, it } from "bun:test";
import {
  EVENT_ORDER,
  checkTiming,
  endOf,
  progressOf,
  type BeatTiming,
} from "#shared/twin-chart-video/timing.ts";
import { LIFE_EXPECTANCY_TIMING } from "./timing-contract";

/**
 * Pins beat 2's own timing contract, the same discipline `test/timing.test.ts` applies to
 * `CO2_TIMING` — each rule asserted green on the shipped timing and RED on a timing mutated to
 * break exactly that rule.
 */

const broken = (patch: Partial<BeatTiming>): BeatTiming => ({
  ...LIFE_EXPECTANCY_TIMING,
  ...patch,
});

describe("the shipped life-expectancy timing", () => {
  it("should pass every structural rule of the motion grammar", () => {
    expect(checkTiming(LIFE_EXPECTANCY_TIMING)).toEqual([]);
  });

  it("should be eight seconds at thirty frames per second", () => {
    expect(LIFE_EXPECTANCY_TIMING.fps).toBe(30);
    expect(LIFE_EXPECTANCY_TIMING.total).toBe(LIFE_EXPECTANCY_TIMING.fps * 8);
  });

  it("should name its six events in editorial order", () => {
    const starts = EVENT_ORDER.map(
      (name) => LIFE_EXPECTANCY_TIMING[name].start,
    );
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });

  it("should leave a real pause between the baseline and the data", () => {
    const pause =
      LIFE_EXPECTANCY_TIMING.reveal.start -
      endOf(LIFE_EXPECTANCY_TIMING.reference);
    expect(pause).toBeGreaterThanOrEqual(LIFE_EXPECTANCY_TIMING.fps / 2);
  });

  it("should start the subject only once the whole series has been drawn", () => {
    // The motion problem this beat solves: the subject (2020) is interior to the series, so
    // `subject` may not begin before `reveal` — the full chronological draw — has finished.
    expect(LIFE_EXPECTANCY_TIMING.subject.start).toBeGreaterThanOrEqual(
      endOf(LIFE_EXPECTANCY_TIMING.reveal),
    );
  });
});

describe("checkTiming on a mutated life-expectancy timing", () => {
  it("should refuse a conclusion that lands before its evidence has finished", () => {
    const errors = checkTiming(
      broken({ conclusion: { start: 140, duration: 30 } }),
    );
    expect(errors.join(" ")).toContain("conclusion starts at 140");
  });

  it("should refuse a composition that ends on a transition instead of a hold", () => {
    const errors = checkTiming(broken({ hold: { start: 198, duration: 20 } }));
    expect(errors.join(" ")).toContain("hold ends at 218");
  });

  it("should refuse a hold shorter than half a second", () => {
    const errors = checkTiming(
      broken({ total: 212, hold: { start: 198, duration: 14 } }),
    );
    expect(errors.join(" ")).toContain("under the half-second floor");
  });
});

describe("progressOf on the life-expectancy timing", () => {
  it("should clamp before its window, so nothing moves early", () => {
    expect(progressOf(0, LIFE_EXPECTANCY_TIMING.conclusion)).toBe(0);
  });

  it("should clamp after its window, so the hold is actually still", () => {
    expect(
      progressOf(
        LIFE_EXPECTANCY_TIMING.total,
        LIFE_EXPECTANCY_TIMING.conclusion,
      ),
    ).toBe(1);
    expect(
      progressOf(LIFE_EXPECTANCY_TIMING.total, LIFE_EXPECTANCY_TIMING.reveal),
    ).toBe(1);
  });
});
