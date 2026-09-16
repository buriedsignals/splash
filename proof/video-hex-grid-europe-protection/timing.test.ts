import { describe, expect, it } from "bun:test";
import { checkTiming, type BeatTiming } from "#shared/chart-video/timing.ts";
import { HEX_VIDEO_TIMING as T } from "./timing-contract";

const broken = (patch: Partial<BeatTiming>): BeatTiming => ({ ...T, ...patch });

describe("the shipped hex grid video timing", () => {
  it("should pass every structural rule of the motion grammar", () => {
    expect(checkTiming(T)).toEqual([]);
  });

  it("should hold the title card no longer than a second and a half, and the final frame at least 60 frames", () => {
    expect(T.establish.duration).toBeLessThanOrEqual(T.fps * 1.5);
    expect(T.hold.duration).toBeGreaterThanOrEqual(60);
  });

  it("should give the re-classing at least two and a half seconds", () => {
    expect(T.subject.duration * 0.5).toBeGreaterThanOrEqual(T.fps * 2.5);
  });

  it("should give the countries at least two seconds to travel from the map into their cells", () => {
    expect(T.reference.duration * 0.5).toBeGreaterThanOrEqual(T.fps * 2);
  });

  it("should refuse a subject that starts before the reveal has finished", () => {
    expect(checkTiming(broken({ subject: { start: 300, duration: 180 } })).join(" ")).toContain("subject starts at 300");
  });
});
