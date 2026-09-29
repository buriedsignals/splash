import { describe, expect, it } from "bun:test";
import { HEX_VIDEO_TIMING as T } from "./timing-contract";

describe("the shipped hex grid video timing", () => {
  it("should give the re-classing at least two and a half seconds", () => {
    expect(T.subject.duration * 0.5).toBeGreaterThanOrEqual(T.fps * 2.5);
  });

  it("should give the countries at least two seconds to travel from the map into their cells", () => {
    expect(T.reference.duration * 0.5).toBeGreaterThanOrEqual(T.fps * 2);
  });
});
