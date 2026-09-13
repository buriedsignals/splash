import { describe, expect, it } from "bun:test";
import {
  EVENT_ORDER,
  checkTiming,
  endOf,
  progressOf,
  type BeatTiming,
} from "#shared/chart-video/timing.ts";
import { CHOROPLETH_VIDEO_TIMING } from "./timing-contract";

/**
 * Pins this beat's own timing contract, the same discipline every other proof workspace applies to
 * its own — each rule asserted green on the shipped timing and RED on a timing mutated to break
 * exactly that rule.
 */

const broken = (patch: Partial<BeatTiming>): BeatTiming => ({
  ...CHOROPLETH_VIDEO_TIMING,
  ...patch,
});

describe("the shipped choropleth video timing", () => {
  it("should pass every structural rule of the motion grammar", () => {
    expect(checkTiming(CHOROPLETH_VIDEO_TIMING)).toEqual([]);
  });

  it("should be twelve seconds at thirty frames per second", () => {
    expect(CHOROPLETH_VIDEO_TIMING.fps).toBe(30);
    expect(CHOROPLETH_VIDEO_TIMING.total).toBe(
      CHOROPLETH_VIDEO_TIMING.fps * 12,
    );
  });

  it("should run at least ten seconds", () => {
    expect(CHOROPLETH_VIDEO_TIMING.total).toBeGreaterThanOrEqual(
      CHOROPLETH_VIDEO_TIMING.fps * 10,
    );
  });

  it("should name its six events in editorial order", () => {
    const starts = EVENT_ORDER.map(
      (name) => CHOROPLETH_VIDEO_TIMING[name].start,
    );
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });

  it("should leave a real pause between the reference mark and the classes revealing", () => {
    const pause =
      CHOROPLETH_VIDEO_TIMING.reveal.start -
      endOf(CHOROPLETH_VIDEO_TIMING.reference);
    expect(pause).toBeGreaterThanOrEqual(CHOROPLETH_VIDEO_TIMING.fps / 2);
  });

  it("should give the six-class reveal more room than a single continuous draw's 78 frames", () => {
    expect(CHOROPLETH_VIDEO_TIMING.reveal.duration).toBeGreaterThan(78);
  });

  it("should not let the camera start closing on the Balkans before every class has landed", () => {
    expect(CHOROPLETH_VIDEO_TIMING.subject.start).toBeGreaterThanOrEqual(
      endOf(CHOROPLETH_VIDEO_TIMING.reveal),
    );
  });

  it("should hold the finished frame at least two seconds — the conclusion is two clauses", () => {
    expect(CHOROPLETH_VIDEO_TIMING.hold.duration).toBeGreaterThanOrEqual(
      CHOROPLETH_VIDEO_TIMING.fps * 2,
    );
  });
});

describe("checkTiming on a mutated choropleth video timing", () => {
  it("should refuse a subject camera move that starts before the reveal has finished", () => {
    const errors = checkTiming(
      broken({ subject: { start: 140, duration: 72 } }),
    );
    expect(errors.join(" ")).toContain("subject starts at 140");
  });

  it("should refuse a composition that ends on a transition instead of a hold", () => {
    const errors = checkTiming(broken({ hold: { start: 288, duration: 40 } }));
    expect(errors.join(" ")).toContain("hold ends at 328");
  });

  it("should refuse a hold shorter than half a second", () => {
    const errors = checkTiming(
      broken({ total: 302, hold: { start: 288, duration: 14 } }),
    );
    expect(errors.join(" ")).toContain("under the half-second floor");
  });
});

describe("progressOf on the choropleth video timing", () => {
  it("should clamp before its window, so nothing moves early", () => {
    expect(progressOf(0, CHOROPLETH_VIDEO_TIMING.subject)).toBe(0);
  });

  it("should clamp after its window, so the hold is actually still", () => {
    expect(
      progressOf(
        CHOROPLETH_VIDEO_TIMING.total,
        CHOROPLETH_VIDEO_TIMING.conclusion,
      ),
    ).toBe(1);
    expect(
      progressOf(CHOROPLETH_VIDEO_TIMING.total, CHOROPLETH_VIDEO_TIMING.reveal),
    ).toBe(1);
  });
});
