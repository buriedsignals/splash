import { describe, expect, it } from "bun:test";
import {
  EVENT_ORDER,
  checkTiming,
  endOf,
  type BeatTiming,
} from "#shared/chart-video/timing.ts";
import { CUMULATIVE_CO2_AREA_TIMING } from "./timing-contract";

/**
 * Pins this beat's own timing contract, the same discipline `timing.test.ts` applies to
 * `CO2_TIMING` and the other proof workspaces apply to their own contracts — each rule asserted
 * green on the shipped timing and RED on a timing mutated to break exactly that rule.
 */

const broken = (patch: Partial<BeatTiming>): BeatTiming => ({
  ...CUMULATIVE_CO2_AREA_TIMING,
  ...patch,
});

describe("the shipped cumulative-co2-area timing", () => {
  it("should pass every structural rule of the motion grammar", () => {
    expect(checkTiming(CUMULATIVE_CO2_AREA_TIMING)).toEqual([]);
  });

  it("should be eight seconds at thirty frames per second", () => {
    expect(CUMULATIVE_CO2_AREA_TIMING.fps).toBe(30);
    expect(CUMULATIVE_CO2_AREA_TIMING.total).toBe(
      CUMULATIVE_CO2_AREA_TIMING.fps * 8,
    );
  });

  it("should name its six events in editorial order", () => {
    const starts = EVENT_ORDER.map(
      (name) => CUMULATIVE_CO2_AREA_TIMING[name].start,
    );
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });

  it("should leave a real pause between the baseline and the fill", () => {
    const pause =
      CUMULATIVE_CO2_AREA_TIMING.reveal.start -
      endOf(CUMULATIVE_CO2_AREA_TIMING.reference);
    expect(pause).toBeGreaterThanOrEqual(CUMULATIVE_CO2_AREA_TIMING.fps / 2);
  });

  it("should start the subject only once the whole fill has been drawn", () => {
    // The motion problem this beat solves: the subject (1986) sits interior to the series, so
    // `subject` may not begin before `reveal` — the full chronological fill — has finished.
    expect(CUMULATIVE_CO2_AREA_TIMING.subject.start).toBeGreaterThanOrEqual(
      endOf(CUMULATIVE_CO2_AREA_TIMING.reveal),
    );
  });
});

describe("checkTiming on a mutated cumulative-co2-area timing", () => {
  it("should refuse a conclusion that lands before its evidence has finished", () => {
    const errors = checkTiming(
      broken({ conclusion: { start: 160, duration: 24 } }),
    );
    expect(errors.join(" ")).toContain("conclusion starts at 160");
  });

  it("should refuse a hold that does not end exactly on the last frame", () => {
    const errors = checkTiming(broken({ hold: { start: 200, duration: 30 } }));
    expect(errors.join(" ")).toContain("hold ends at 230");
  });

  it("should refuse a subject that starts before the fill has finished drawing", () => {
    const errors = checkTiming(
      broken({ subject: { start: 140, duration: 20 } }),
    );
    expect(errors.join(" ")).toContain("subject starts at 140");
  });
});
