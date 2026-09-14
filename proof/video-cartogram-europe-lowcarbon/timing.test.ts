import { describe, expect, it } from "bun:test";
import { checkTiming, type BeatTiming } from "#shared/chart-video/timing.ts";
import { CARTOGRAM_VIDEO_TIMING as T } from "./timing-contract";

const broken = (patch: Partial<BeatTiming>): BeatTiming => ({ ...T, ...patch });

describe("the shipped cartogram video timing", () => {
  it("should pass every structural rule of the motion grammar", () => {
    expect(checkTiming(T)).toEqual([]);
  });

  it("should hold the title card no longer than a second and a half", () => {
    expect(T.establish.duration).toBeLessThanOrEqual(T.fps * 1.5);
  });

  it("should hold the final frame at least 60 frames", () => {
    expect(T.hold.duration).toBeGreaterThanOrEqual(60);
  });

  it("should give each of the five classes at least fifteen frames of the reference event", () => {
    expect((T.reference.duration * 0.8) / 5).toBeGreaterThanOrEqual(15);
  });

  it("should give the morph at least two and a half seconds", () => {
    expect(T.subject.duration * 0.65).toBeGreaterThanOrEqual(T.fps * 2.5);
  });
});

describe("checkTiming on a mutated cartogram video timing", () => {
  it("should refuse a subject that starts before the reveal has finished", () => {
    expect(checkTiming(broken({ subject: { start: 250, duration: 150 } })).join(" ")).toContain("subject starts at 250");
  });

  it("should refuse a composition that ends on a transition instead of a hold", () => {
    expect(checkTiming(broken({ hold: { start: 579, duration: 40 } })).join(" ")).toContain("hold ends at 619");
  });
});
