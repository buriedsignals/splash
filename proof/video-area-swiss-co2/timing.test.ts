import { describe, expect, it } from "bun:test";
import { WINDOWS } from "./scene.mjs";
import { AREA_VIDEO_TIMING as T } from "./timing-contract";
const framesOf = (event: "reveal" | "subject", [a, b]: number[]) =>
  T[event].duration * (b - a);

describe("the shipped area video timing", () => {
  it("should give the fill at least six seconds and the sweep at least two", () => {
    expect(framesOf("reveal", WINDOWS.reveal.fill)).toBeGreaterThanOrEqual(
      T.fps * 6,
    );
    expect(framesOf("subject", WINDOWS.subject.sweep)).toBeGreaterThanOrEqual(
      T.fps * 2,
    );
  });
});
