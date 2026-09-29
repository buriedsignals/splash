import { describe, expect, it } from "bun:test";
import { endOf } from "#shared/chart-video/timing.ts";
import { CHOROPLETH_VIDEO_TIMING as T } from "./timing-contract";

describe("the shipped choropleth video timing", () => {
  it("should run at least twelve seconds", () => {
    expect(T.total).toBeGreaterThanOrEqual(T.fps * 12);
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
