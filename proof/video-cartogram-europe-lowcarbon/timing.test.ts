import { describe, expect, it } from "bun:test";
import { checkTiming, type BeatTiming } from "#shared/chart-video/timing.ts";
import { WINDOWS } from "./scene.mjs";
import { CARTOGRAM_VIDEO_TIMING as T } from "./timing-contract";

const broken = (patch: Partial<BeatTiming>): BeatTiming => ({ ...T, ...patch });

describe("the shipped cartogram video timing", () => {
  it("should pass every structural rule of the motion grammar", () => {
    expect(checkTiming(T)).toEqual([]);
  });

  it("should hold the title card no longer than a second and a half", () => {
    expect(T.establish.duration).toBeLessThanOrEqual(T.fps * 1.5);
  });

  it("should hold the final frame at least 60 frames, and run no longer than 22 seconds", () => {
    expect(T.hold.duration).toBeGreaterThanOrEqual(60);
    expect(T.total).toBeLessThanOrEqual(T.fps * 22);
  });

  it("should give each of the five classes at least twelve frames of the reference event", () => {
    const [a, b] = WINDOWS.reference.classes;
    expect((T.reference.duration * (b - a)) / 5).toBeGreaterThanOrEqual(12);
  });

  it("should give the morph at least two and a half seconds", () => {
    const [a, b] = WINDOWS.subject.morph;
    expect(T.subject.duration * (b - a)).toBeGreaterThanOrEqual(T.fps * 2.5);
  });
});

describe("checkTiming on a mutated cartogram video timing", () => {
  it("should refuse a subject that starts before the reveal has finished", () => {
    expect(checkTiming(broken({ subject: { start: 200, duration: 180 } })).join(" ")).toContain("subject starts at 200");
  });

  it("should refuse a composition that ends on a transition instead of a hold", () => {
    expect(checkTiming(broken({ hold: { start: T.hold.start, duration: 40 } })).join(" ")).toContain(`hold ends at ${T.hold.start + 40}`);
  });
});
