import { describe, expect, it } from "bun:test";
import { WINDOWS } from "./scene.mjs";
import { CARTOGRAM_VIDEO_TIMING as T } from "./timing-contract";

describe("the shipped cartogram video timing", () => {
  it("should give each of the five classes at least twelve frames of the reference event", () => {
    const [a, b] = WINDOWS.reference.classes;
    expect((T.reference.duration * (b - a)) / 5).toBeGreaterThanOrEqual(12);
  });

  it("should give the morph at least two and a half seconds", () => {
    const [a, b] = WINDOWS.subject.morph;
    expect(T.subject.duration * (b - a)).toBeGreaterThanOrEqual(T.fps * 2.5);
  });
});
