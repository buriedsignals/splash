import { describe, expect, it } from "bun:test";
import { checkTiming, type BeatTiming } from "#shared/chart-video/timing.ts";
import { SLOPE_VIDEO_TIMING as T } from "./timing-contract";

const broken = (patch: Partial<BeatTiming>): BeatTiming => ({ ...T, ...patch });

describe("the shipped slope video timing", () => {
  it("should pass every structural rule of the motion grammar", () => {
    expect(checkTiming(T)).toEqual([]);
  });

  it("should hold the title card no longer than a second and a half, and the final frame at least 60 frames", () => {
    expect(T.establish.duration).toBeLessThanOrEqual(T.fps * 1.5);
    expect(T.hold.duration).toBeGreaterThanOrEqual(60);
  });

  it("should give the lines at least three seconds to travel", () => {
    expect(T.reveal.duration * 0.85).toBeGreaterThanOrEqual(T.fps * 3);
  });

  it("should refuse a subject that starts before the reveal has finished", () => {
    expect(checkTiming(broken({ subject: { start: 200, duration: 105 } })).join(" ")).toContain("subject starts at 200");
  });
});
