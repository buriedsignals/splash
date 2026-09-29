import { describe, expect, it } from "bun:test";
import { SLOPE_VIDEO_TIMING as T } from "./timing-contract";

describe("the shipped slope video timing", () => {
  it("should give the lines at least three seconds to travel", () => {
    expect(T.reveal.duration * 0.85).toBeGreaterThanOrEqual(T.fps * 3);
  });
});
