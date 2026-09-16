import { describe, expect, it } from "bun:test";
import { checkTiming, type BeatTiming } from "#shared/chart-video/timing.ts";
import { LINE_VIDEO_TIMING as T } from "./timing-contract";

const broken = (patch: Partial<BeatTiming>): BeatTiming => ({ ...T, ...patch });

describe("the shipped line video timing", () => {
  it("should pass every structural rule of the motion grammar", () => {
    expect(checkTiming(T)).toEqual([]);
  });

  it("should hold the title card no longer than a second and a half, and the final frame at least 60 frames", () => {
    expect(T.establish.duration).toBeLessThanOrEqual(T.fps * 1.5);
    expect(T.hold.duration).toBeGreaterThanOrEqual(60);
  });

  it("should give each year at least three frames of the trace", () => {
    expect((T.reveal.duration * 0.92) / 75).toBeGreaterThanOrEqual(2.9);
  });

  it("should refuse a subject that starts before the reveal has finished", () => {
    expect(checkTiming(broken({ subject: { start: 320, duration: 150 } })).join(" ")).toContain("subject starts at 320");
  });
});
