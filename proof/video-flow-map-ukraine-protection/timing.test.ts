import { describe, expect, it } from "bun:test";
import { FLOW_VIDEO_TIMING as T } from "./timing-contract";

describe("the shipped flow map video timing", () => {
  it("should give the trace at least five seconds", () => {
    expect(T.reveal.duration * 0.85).toBeGreaterThanOrEqual(T.fps * 5);
  });
});
