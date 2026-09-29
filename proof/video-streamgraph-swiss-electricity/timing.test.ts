import { describe, expect, it } from "bun:test";
import { WINDOWS } from "./scene.mjs";
import { STREAM_VIDEO_TIMING as T } from "./timing-contract";
const framesOf = (event: "reveal" | "subject", [a, b]: number[]) =>
  T[event].duration * (b - a);

describe("the shipped streamgraph video timing", () => {
  it("should give each year at least six frames of the flow and four of the race", () => {
    expect(framesOf("reveal", WINDOWS.reveal.flow) / 24).toBeGreaterThanOrEqual(
      6,
    );
    expect(
      framesOf("subject", WINDOWS.subject.race) / 24,
    ).toBeGreaterThanOrEqual(4);
  });
});
