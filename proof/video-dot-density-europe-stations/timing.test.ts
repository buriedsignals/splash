import { describe, expect, it } from "bun:test";
import { DOT_VIDEO_TIMING as T } from "./timing-contract";

describe("the shipped dot density video timing", () => {
  it("should give the growth into weight at least three seconds", () => {
    expect(T.subject.duration * 0.6).toBeGreaterThanOrEqual(T.fps * 3);
  });
});
