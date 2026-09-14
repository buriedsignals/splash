import { describe, expect, it } from "bun:test";
import {
  checkTiming,
  endOf,
  type BeatTiming,
} from "#shared/chart-video/timing.ts";
import { CHOROPLETH_VIDEO_TIMING as T } from "./timing-contract";

const broken = (patch: Partial<BeatTiming>): BeatTiming => ({ ...T, ...patch });

describe("the shipped choropleth video timing", () => {
  it("should pass every structural rule of the motion grammar", () => {
    expect(checkTiming(T)).toEqual([]);
  });

  it("should run at least twelve seconds", () => {
    expect(T.total).toBeGreaterThanOrEqual(T.fps * 12);
  });

  it("should hold the final frame at least 60 frames", () => {
    expect(T.hold.duration).toBeGreaterThanOrEqual(60);
  });

  it("should give the callout at least four seconds once it is set", () => {
    expect(T.subject.duration * 0.5).toBeGreaterThanOrEqual(T.fps * 4);
  });

  it("should give each of the six classes at least ten frames of the reference event", () => {
    expect(T.reference.duration / 6).toBeGreaterThanOrEqual(10);
  });

  it("should give each of the five floor steps at least twenty frames of the reveal event", () => {
    expect((T.reveal.duration * 0.7) / 5).toBeGreaterThanOrEqual(20);
  });

  it("should not let the camera start closing on the Balkans before the six names have landed", () => {
    expect(T.subject.start).toBeGreaterThanOrEqual(endOf(T.reveal));
  });
});

describe("checkTiming on a mutated choropleth video timing", () => {
  it("should refuse a subject that starts before the reveal has finished", () => {
    expect(
      checkTiming(broken({ subject: { start: 300, duration: 240 } })).join(" "),
    ).toContain("subject starts at 300");
  });

  it("should refuse a composition that ends on a transition instead of a hold", () => {
    expect(
      checkTiming(broken({ hold: { start: 770, duration: 40 } })).join(" "),
    ).toContain("hold ends at 810");
  });
});
