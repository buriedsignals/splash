import { describe, expect, it } from "bun:test";
import { SYMBOL_VIDEO_TIMING as T } from "./timing-contract";

describe("the shipped proportional symbol video timing", () => {
  it("should give the hundred circles at least five seconds", () => {
    expect(T.reveal.duration * 0.85).toBeGreaterThanOrEqual(T.fps * 5);
  });
});
