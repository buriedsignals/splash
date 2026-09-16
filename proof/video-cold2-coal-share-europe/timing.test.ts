import { describe, expect, it } from "bun:test";
import { checkTiming } from "#shared/chart-video/timing.ts";
import { WINDOWS } from "./scene.mjs";
import { COLD2_COAL_SHARE_EUROPE_VIDEO_TIMING as T } from "./timing-contract";

describe("the timing of video-cold2-coal-share-europe", () => {
  it("should pass every structural rule of the motion grammar", () => {
    expect(checkTiming(T)).toEqual([]);
  });

  it("should run no longer than twenty-two seconds", () => {
    expect(T.total).toBeLessThanOrEqual(T.fps * 22);
  });

  it("should hold the title card no longer than 1.5 s and the final frame at least 60 frames", () => {
    expect([T.establish.duration <= T.fps * 1.5, T.hold.duration >= 60]).toEqual([true, true]);
  });

  it("should give every year at least eight frames, on the whole map and on the close-up's replay", () => {
    const share = (event: keyof typeof WINDOWS, field: string) => ((WINDOWS as any)[event][field][1] - (WINDOWS as any)[event][field][0]) * (T as any)[event].duration;
    expect([share("reveal", "year") / 15 >= 8, share("subject", "replay") / 15 >= 8]).toEqual([true, true]);
  });

  it("should let the camera settle before the close-up's names arrive, and the names leave before it departs", () => {
    expect([WINDOWS.subject.zoom[1] <= WINDOWS.subject.names[0], WINDOWS.conclusion.names[1] <= WINDOWS.conclusion.zoom[0]]).toEqual([true, true]);
  });
});
