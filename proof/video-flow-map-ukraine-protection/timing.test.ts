import { describe, expect, it } from "bun:test";
import { checkTiming } from "#shared/chart-video/timing.ts";
import { FLOW_VIDEO_TIMING as T } from "./timing-contract";

describe("the shipped flow map video timing", () => {
  it("should pass every structural rule of the motion grammar", () => {
    expect(checkTiming(T)).toEqual([]);
  });

  it("should hold the title card no longer than a second and a half, and the final frame at least 60 frames", () => {
    expect(T.establish.duration).toBeLessThanOrEqual(T.fps * 1.5);
    expect(T.hold.duration).toBeGreaterThanOrEqual(60);
  });

  it("should give the trace at least five seconds", () => {
    expect(T.reveal.duration * 0.85).toBeGreaterThanOrEqual(T.fps * 5);
  });
});
