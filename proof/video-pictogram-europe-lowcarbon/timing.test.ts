import { describe, expect, it } from "bun:test";
import { checkTiming, type BeatTiming } from "#shared/chart-video/timing.ts";
import { PICTOGRAM_VIDEO_TIMING as T } from "./timing-contract";

const broken = (patch: Partial<BeatTiming>): BeatTiming => ({ ...T, ...patch });

describe("the shipped pictogram video timing", () => {
  it("should pass every structural rule of the motion grammar", () => {
    expect(checkTiming(T)).toEqual([]);
  });

  it("should hold the title card no longer than a second and a half, and the final frame at least 60 frames", () => {
    expect(T.establish.duration).toBeLessThanOrEqual(T.fps * 1.5);
    expect(T.hold.duration).toBeGreaterThanOrEqual(60);
  });

  it("should run no longer than 22 seconds", () => {
    expect(T.total).toBeLessThanOrEqual(T.fps * 22);
  });

  it("should refuse a subject that starts before the reveal has finished", () => {
    expect(
      checkTiming(
        broken({
          subject: { start: T.subject.start - 1, duration: T.subject.duration },
        }),
      ).join(" "),
    ).toContain(`subject starts at ${T.subject.start - 1}`);
  });
});
