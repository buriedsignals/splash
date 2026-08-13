import { describe, expect, it } from "bun:test";
import {
  CO2_TIMING,
  EVENT_ORDER,
  checkTiming,
  endOf,
  progressOf,
  type BeatTiming,
} from "../assets/timing";
import { drawnSoFar } from "../assets/EmissionsVideo";

/**
 * These tests pin the timing contract, and nothing else. The drawing is verified by looking at
 * four extracted frames, which is the discipline of the video format; what a test can carry is the
 * structural half of the motion grammar — that the conclusion cannot precede its evidence, that
 * the subject is not the tail of the reveal, and that the video does not end on a transition.
 *
 * Each rule is asserted twice: once green on the shipped timing, once RED on a timing mutated to
 * break exactly that rule. A check that never fails is not a check.
 */

const broken = (patch: Partial<BeatTiming>): BeatTiming => ({
  ...CO2_TIMING,
  ...patch,
});

describe("the shipped timing", () => {
  it("should pass every structural rule of the motion grammar", () => {
    expect(checkTiming(CO2_TIMING)).toEqual([]);
  });

  it("should be eight seconds at thirty frames per second", () => {
    expect(CO2_TIMING.fps).toBe(30);
    expect(CO2_TIMING.total).toBe(CO2_TIMING.fps * 8);
  });

  it("should name its six events in editorial order", () => {
    const starts = EVENT_ORDER.map((name) => CO2_TIMING[name].start);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });

  it("should leave a real pause between the baseline and the data", () => {
    // The gap is the pause. Half a second is the motion grammar's floor for reading a baseline.
    const pause = CO2_TIMING.reveal.start - endOf(CO2_TIMING.reference);
    expect(pause).toBeGreaterThanOrEqual(CO2_TIMING.fps / 2);
  });
});

describe("checkTiming", () => {
  it("should refuse a conclusion that lands before its evidence has finished", () => {
    const errors = checkTiming(
      broken({ conclusion: { start: 140, duration: 24 } }),
    );
    expect(errors.join(" ")).toContain("conclusion starts at 140");
  });

  it("should refuse a subject folded into the tail of the reveal", () => {
    const errors = checkTiming(
      broken({ subject: { start: 120, duration: 18 } }),
    );
    expect(errors.join(" ")).toContain("subject starts at 120");
  });

  it("should refuse a composition that ends on a transition instead of a hold", () => {
    const errors = checkTiming(broken({ hold: { start: 192, duration: 20 } }));
    expect(errors.join(" ")).toContain("hold ends at 212");
  });

  it("should refuse a hold shorter than half a second", () => {
    const errors = checkTiming(
      broken({ total: 206, hold: { start: 192, duration: 14 } }),
    );
    expect(errors.join(" ")).toContain("under the half-second floor");
  });

  it("should refuse an event with no frames in it", () => {
    const errors = checkTiming(
      broken({ reference: { start: 32, duration: 0 } }),
    );
    expect(errors.join(" ")).toContain(
      "reference: duration must be at least one frame",
    );
  });
});

describe("progressOf", () => {
  it("should clamp before its window, so nothing moves early", () => {
    expect(progressOf(0, CO2_TIMING.conclusion)).toBe(0);
  });

  it("should clamp after its window, so the hold is actually still", () => {
    expect(progressOf(CO2_TIMING.total, CO2_TIMING.conclusion)).toBe(1);
    expect(progressOf(CO2_TIMING.total, CO2_TIMING.reveal)).toBe(1);
  });

  it("should read the middle of its window as a half", () => {
    const { start, duration } = CO2_TIMING.reveal;
    expect(progressOf(start + duration / 2, CO2_TIMING.reveal)).toBeCloseTo(
      0.5,
      10,
    );
  });
});

describe("drawnSoFar", () => {
  const points = [
    { x: 0, y: 0 },
    { x: 10, y: 20 },
    { x: 20, y: 0 },
  ];

  it("should draw nothing before the reveal starts", () => {
    expect(drawnSoFar(points, 0)).toEqual([]);
  });

  it("should draw the whole series at the end of the reveal", () => {
    expect(drawnSoFar(points, 1)).toEqual(points);
  });

  it("should cut the last segment mid-way so the head moves smoothly", () => {
    // A quarter of a two-segment series is half-way along the first segment.
    expect(drawnSoFar(points, 0.25)).toEqual([
      { x: 0, y: 0 },
      { x: 5, y: 10 },
    ]);
  });

  it("should advance chronologically, never backwards", () => {
    const early = drawnSoFar(points, 0.3);
    const late = drawnSoFar(points, 0.8);
    expect(late.length).toBeGreaterThanOrEqual(early.length);
    expect(late[late.length - 1].x).toBeGreaterThan(early[early.length - 1].x);
  });
});
