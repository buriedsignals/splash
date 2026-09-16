import { describe, expect, it } from "bun:test";
import {
  EVENT_ORDER,
  checkTiming,
  endOf,
  progressOf,
  type BeatTiming,
} from "#shared/chart-video/timing.ts";
import { COLUMN_RANKING_TIMING } from "./timing-contract";

/**
 * Pins this beat's own timing contract, the same discipline
 * `../vidy-lollipop-renewables-share-europe/timing.test.ts` applies to its own — each rule asserted
 * green on the shipped timing AND red on a timing mutated to break exactly that rule, so a test
 * that stopped testing anything would be visible.
 */

const broken = (patch: Partial<BeatTiming>): BeatTiming => ({
  ...COLUMN_RANKING_TIMING,
  ...patch,
});

describe("the shipped column-ranking timing", () => {
  it("should pass every structural rule of the motion grammar", () => {
    expect(checkTiming(COLUMN_RANKING_TIMING)).toEqual([]);
  });

  it("should be ten seconds at thirty frames per second", () => {
    expect(COLUMN_RANKING_TIMING.fps).toBe(30);
    expect(COLUMN_RANKING_TIMING.total).toBe(COLUMN_RANKING_TIMING.fps * 10);
  });

  it("should name its six events in editorial order", () => {
    const starts = EVENT_ORDER.map((name) => COLUMN_RANKING_TIMING[name].start);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });

  it("should leave a real pause between the zero baseline and the columns arriving", () => {
    const pause =
      COLUMN_RANKING_TIMING.reveal.start -
      endOf(COLUMN_RANKING_TIMING.reference);
    expect(pause).toBeGreaterThanOrEqual(COLUMN_RANKING_TIMING.fps / 2);
  });

  it("should not pick out one column before the whole ranking has arrived", () => {
    expect(COLUMN_RANKING_TIMING.subject.start).toBeGreaterThanOrEqual(
      endOf(COLUMN_RANKING_TIMING.reveal),
    );
  });

  it("should give the conclusion longer than a single label's fade, because it is two marks and a sentence", () => {
    expect(COLUMN_RANKING_TIMING.conclusion.duration).toBeGreaterThan(
      COLUMN_RANKING_TIMING.fps,
    );
  });

  it("should hold the closing frame for more than a second", () => {
    expect(COLUMN_RANKING_TIMING.hold.duration).toBeGreaterThan(
      COLUMN_RANKING_TIMING.fps,
    );
  });
});

describe("checkTiming on a mutated column-ranking timing", () => {
  it("should refuse a subject that lands before the last column has arrived", () => {
    const errors = checkTiming(
      broken({ subject: { start: 160, duration: 26 } }),
    );
    expect(errors.join(" ")).toContain("subject starts at 160");
  });

  it("should refuse a conclusion that precedes the evidence it sums", () => {
    const errors = checkTiming(
      broken({ conclusion: { start: 100, duration: 40 } }),
    );
    expect(errors.join(" ")).toContain("conclusion starts at 100");
  });

  it("should refuse a composition that ends on a transition instead of a hold", () => {
    const errors = checkTiming(broken({ hold: { start: 250, duration: 20 } }));
    expect(errors.join(" ")).toContain("hold ends at 270");
  });
});

describe("progressOf on the column-ranking timing", () => {
  it("should clamp before its window, so nothing moves early", () => {
    expect(progressOf(0, COLUMN_RANKING_TIMING.conclusion)).toBe(0);
  });

  it("should clamp after its window, so the hold is actually still", () => {
    expect(
      progressOf(COLUMN_RANKING_TIMING.total, COLUMN_RANKING_TIMING.conclusion),
    ).toBe(1);
    expect(
      progressOf(COLUMN_RANKING_TIMING.total, COLUMN_RANKING_TIMING.reveal),
    ).toBe(1);
  });
});
