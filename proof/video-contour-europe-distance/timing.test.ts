import { describe, expect, it } from "bun:test";
import { CONTOUR_VIDEO_TIMING as T } from "./timing-contract";

describe("the shipped contour video timing", () => {
  it("should give the sweep to the median at least three seconds", () => {
    expect(T.reveal.duration * 0.75).toBeGreaterThanOrEqual(T.fps * 3);
  });
});
