import { describe, expect, it } from "bun:test";
import { BUMP_VIDEO_TIMING as T } from "./timing-contract";

describe("the shipped bump video timing", () => {
  it("should give each year at least six frames of the clock", () => {
    expect((T.reveal.duration * 0.8) / 34).toBeGreaterThanOrEqual(6);
  });
});
