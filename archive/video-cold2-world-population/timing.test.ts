import { describe, expect, it } from "bun:test";
import { checkTiming } from "#shared/chart-video/timing.ts";
import { WORLD_POPULATION_VIDEO_TIMING as T } from "./timing-contract";
import { WINDOWS } from "./scene.mjs";

describe("the timing of video-cold2-world-population", () => {
  it("should pass every structural rule of the motion grammar", () => {
    expect(checkTiming(T)).toEqual([]);
  });

  it("should run no longer than twenty-two seconds", () => {
    expect(T.total).toBeLessThanOrEqual(T.fps * 22);
  });

  it("should hold the title card no longer than 1.5 s and the final frame at least 60 frames", () => {
    expect([T.establish.duration <= T.fps * 1.5, T.hold.duration >= 60]).toEqual([true, true]);
  });

  it("should give the fill at least six seconds and the stack at least five", () => {
    const seconds = (event: "reveal" | "subject", field: string) => {
      const [a, b] = (WINDOWS as any)[event][field];
      return ((b - a) * T[event].duration) / T.fps;
    };
    expect([seconds("reveal", "fill") >= 6, seconds("subject", "stack") >= 5]).toEqual([true, true]);
  });
});
