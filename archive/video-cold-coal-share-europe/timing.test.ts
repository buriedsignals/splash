import { describe, expect, it } from "bun:test";
import { checkTiming } from "#shared/chart-video/timing.ts";
import { COAL_VIDEO_TIMING as T } from "./timing-contract";

describe("the coal video's timing", () => {
  it("should pass every structural rule of the motion grammar", () => {
    expect(checkTiming(T)).toEqual([]);
  });

  it("should run between twelve and twenty-two seconds", () => {
    expect([T.total >= T.fps * 12, T.total <= T.fps * 22]).toEqual([true, true]);
  });

  it("should hold the final map at least 60 frames and the title card no longer than 1.5 s", () => {
    expect([T.hold.duration >= 60, T.establish.duration <= T.fps * 1.5]).toEqual([true, true]);
  });

  it("should give every year of 2010 → 2024 at least ten frames of reveal", () => {
    expect(T.reveal.duration / 14).toBeGreaterThanOrEqual(10);
  });
});
