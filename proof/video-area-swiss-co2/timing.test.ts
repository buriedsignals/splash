import { describe, expect, it } from "bun:test";
import { checkTiming, type BeatTiming } from "#shared/chart-video/timing.ts";
import { WINDOWS } from "./scene.mjs";
import { AREA_VIDEO_TIMING as T } from "./timing-contract";

const broken = (patch: Partial<BeatTiming>): BeatTiming => ({ ...T, ...patch });
const framesOf = (event: "reveal" | "subject", [a, b]: number[]) =>
  T[event].duration * (b - a);

describe("the shipped area video timing", () => {
  it("should pass every structural rule of the motion grammar", () => {
    expect(checkTiming(T)).toEqual([]);
  });

  it("should hold the title card no longer than a second and a half, and the final frame at least 60 frames", () => {
    expect(T.establish.duration).toBeLessThanOrEqual(T.fps * 1.5);
    expect(T.hold.duration).toBeGreaterThanOrEqual(60);
  });

  it("should give the fill at least six seconds and the sweep at least two, and run no longer than 22 seconds", () => {
    expect(framesOf("reveal", WINDOWS.reveal.fill)).toBeGreaterThanOrEqual(
      T.fps * 6,
    );
    expect(framesOf("subject", WINDOWS.subject.sweep)).toBeGreaterThanOrEqual(
      T.fps * 2,
    );
    expect(T.total).toBeLessThanOrEqual(T.fps * 22);
  });

  it("should refuse a subject that starts before the reveal has finished", () => {
    expect(
      checkTiming(broken({ subject: { start: 200, duration: 186 } })).join(" "),
    ).toContain("subject starts at 200");
  });
});
