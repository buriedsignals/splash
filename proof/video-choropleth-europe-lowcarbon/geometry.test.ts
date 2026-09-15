import { describe, expect, it } from "bun:test";
import { clipRing } from "./geometry.mjs";

/** The clip the other video maps borrow: an edge running out of the box is cut where it really crosses. */

describe("clipRing", () => {
  it("should cut an edge that runs far out of the box where the edge crosses the box, not where its vertex is clamped to", () => {
    // One vertex far to the east and a little north: the true edge crosses x = 100 almost level with its
    // start; a clamp would drag the crossing to the box's corner.
    const ring = [
      [0, 50],
      [10000, 0],
      [0, 60],
    ];
    const clipped = clipRing(ring, { x0: -100, x1: 100, y0: -100, y1: 200 });
    const onEdge = clipped
      .filter((p) => Math.abs(p[0] - 100) < 1e-9)
      .map((p) => p[1]);
    expect(onEdge.length).toBe(2);
    expect(Math.min(...onEdge)).toBeGreaterThan(49);
  });
});
