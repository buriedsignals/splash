import { describe, expect, it } from "bun:test";
import {
  EVENT_ORDER,
  checkTiming,
  endOf,
  progressOf,
  type BeatTiming,
} from "#shared/chart-video/timing.ts";
import { LINE_TIMING } from "./timing-contract";

/**
 * Pins this beat's own timing contract, the same discipline every other proof workspace applies
 * to its own — each rule asserted green on the shipped timing and RED on a timing mutated to
 * break exactly that rule.
 */

const broken = (patch: Partial<BeatTiming>): BeatTiming => ({
  ...LINE_TIMING,
  ...patch,
});

describe("the shipped line timing", () => {
  it("should pass every structural rule of the motion grammar", () => {
    expect(checkTiming(LINE_TIMING)).toEqual([]);
  });

  it("should be eight seconds at thirty frames per second", () => {
    expect(LINE_TIMING.fps).toBe(30);
    expect(LINE_TIMING.total).toBe(LINE_TIMING.fps * 8);
  });

  it("should name its six events in editorial order", () => {
    const starts = EVENT_ORDER.map((name) => LINE_TIMING[name].start);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });

  it("should leave a real pause between the reference rule and the lines drawing", () => {
    const pause = LINE_TIMING.reveal.start - endOf(LINE_TIMING.reference);
    expect(pause).toBeGreaterThanOrEqual(LINE_TIMING.fps / 2);
  });

  it("should not let the subject start before both lines have finished drawing", () => {
    expect(LINE_TIMING.subject.start).toBeGreaterThanOrEqual(
      endOf(LINE_TIMING.reveal),
    );
  });
});

describe("checkTiming on a mutated line timing", () => {
  it("should refuse a subject ring that lands before both lines have finished", () => {
    const errors = checkTiming(
      broken({ subject: { start: 140, duration: 20 } }),
    );
    expect(errors.join(" ")).toContain("subject starts at 140");
  });

  it("should refuse a composition that ends on a transition instead of a hold", () => {
    const errors = checkTiming(broken({ hold: { start: 196, duration: 20 } }));
    expect(errors.join(" ")).toContain("hold ends at 216");
  });

  it("should refuse a hold shorter than half a second", () => {
    const errors = checkTiming(
      broken({ total: 210, hold: { start: 196, duration: 14 } }),
    );
    expect(errors.join(" ")).toContain("under the half-second floor");
  });
});

describe("progressOf on the line timing", () => {
  it("should clamp before its window, so nothing moves early", () => {
    expect(progressOf(0, LINE_TIMING.subject)).toBe(0);
  });

  it("should clamp after its window, so the hold is actually still", () => {
    expect(progressOf(LINE_TIMING.total, LINE_TIMING.conclusion)).toBe(1);
    expect(progressOf(LINE_TIMING.total, LINE_TIMING.reveal)).toBe(1);
  });
});
