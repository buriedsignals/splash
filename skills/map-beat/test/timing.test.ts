import { describe, expect, it } from "bun:test";
import {
  EVENT_ORDER,
  checkTiming,
  endOf,
  type BeatTiming,
} from "../../chart-video/assets/timing";
import { MAP_TIMING } from "../assets/timing";
import { arrivalProgress } from "../assets/Co2MapVideo";

/**
 * The structural half of the motion grammar, for a map beat. The drawing itself is verified by
 * looking at four extracted frames — that is the discipline of the video format — and what a test
 * can carry is the arithmetic: the conclusion cannot precede its evidence, the subject is not the
 * tail of the reveal, and the video does not end on a transition.
 *
 * Every rule is asserted twice: green on the shipped timing, RED on a timing mutated to break
 * exactly that rule. A check that never fails is not a check.
 */

const broken = (patch: Partial<BeatTiming>): BeatTiming => ({
  ...MAP_TIMING,
  ...patch,
});

describe("the shipped timing", () => {
  it("should pass every structural rule of the motion grammar", () => {
    expect(checkTiming(MAP_TIMING)).toEqual([]);
  });

  it("should be eight seconds at thirty frames per second", () => {
    expect(MAP_TIMING.fps).toBe(30);
    expect(MAP_TIMING.total).toBe(240);
  });

  it("should name its six events in editorial order", () => {
    const starts = EVENT_ORDER.map((name) => MAP_TIMING[name].start);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });

  it("should leave the reader time to read the comparison before the data arrives", () => {
    // The pause IS the gap. Half a second at least, or the reader is still reading the level the
    // argument is measured against when the field starts filling in behind it.
    const pause = MAP_TIMING.reveal.start - endOf(MAP_TIMING.reference);
    expect(pause).toBeGreaterThanOrEqual(MAP_TIMING.fps / 2);
  });
});

describe("checkTiming, on a timing mutated to break one rule", () => {
  it("should reject a conclusion that lands before its subject has finished", () => {
    const errors = checkTiming(
      broken({ conclusion: { start: MAP_TIMING.subject.start, duration: 22 } }),
    );
    expect(errors.join(" ")).toContain("conclusion");
  });

  it("should reject a subject that is only the tail of the reveal", () => {
    const errors = checkTiming(
      broken({ subject: { start: MAP_TIMING.reveal.start + 4, duration: 20 } }),
    );
    expect(errors.join(" ")).toContain("subject");
  });

  it("should reject a video that ends on a transition instead of a hold", () => {
    const errors = checkTiming(broken({ hold: { start: 202, duration: 10 } }));
    expect(errors.join(" ")).toContain("hold");
  });

  it("should reject a hold under the half-second floor", () => {
    const errors = checkTiming(
      broken({ total: 216, hold: { start: 202, duration: 14 } }),
    );
    expect(errors.join(" ")).toContain("half-second");
  });
});

describe("arrivalProgress — the reveal's own order", () => {
  const count = 10;

  it("should hand the first region its window before the last one", () => {
    expect(arrivalProgress(0, count, 0.5)).toBeGreaterThan(
      arrivalProgress(9, count, 0.5),
    );
  });

  it("should show nothing at all before the reveal starts", () => {
    for (let i = 0; i < count; i++)
      expect(arrivalProgress(i, count, 0)).toBe(0);
  });

  it("should have every region fully arrived by the end of the reveal", () => {
    for (let i = 0; i < count; i++)
      expect(arrivalProgress(i, count, 1)).toBe(1);
  });

  it("should never run outside 0..1, so nothing keeps fading during the hold", () => {
    for (const p of [-1, 0.3, 0.77, 2])
      for (let i = 0; i < count; i++) {
        expect(arrivalProgress(i, count, p)).toBeGreaterThanOrEqual(0);
        expect(arrivalProgress(i, count, p)).toBeLessThanOrEqual(1);
      }
  });
});
