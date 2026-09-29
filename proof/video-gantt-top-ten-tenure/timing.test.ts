import { describe, expect, it } from "bun:test";
import { GANTT_VIDEO_TIMING as T } from "./timing-contract";

describe("the shipped gantt video timing", () => {
  it("should give each year at least six frames of the clock", () => {
    expect((T.reveal.duration * 0.88) / 34).toBeGreaterThanOrEqual(6);
  });
});
