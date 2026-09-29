import { describe, expect, it } from "bun:test";
import { LINE_VIDEO_TIMING as T } from "./timing-contract";

describe("the shipped line video timing", () => {
  it("should give each year at least three frames of the trace", () => {
    expect((T.reveal.duration * 0.92) / 75).toBeGreaterThanOrEqual(2.9);
  });
});
