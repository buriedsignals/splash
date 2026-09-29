import { describe, expect, it } from "bun:test";
import { LOCATOR_VIDEO_TIMING as T } from "./timing-contract";

describe("the shipped locator video timing", () => {
  it("should give the camera at least two seconds to travel", () => {
    expect(T.reveal.duration * 0.55).toBeGreaterThanOrEqual(T.fps * 2);
  });
});
