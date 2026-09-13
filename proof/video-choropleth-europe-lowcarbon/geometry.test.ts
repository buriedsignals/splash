import { describe, expect, it } from "bun:test";
import { join } from "node:path";
import { loadSubject } from "../static-choropleth-europe-lowcarbon/beat.mjs";
import {
  CLAMP_MARGIN,
  FRAME,
  clipRing,
  unmeasuredNeighboursOf,
  videoGeometry,
} from "./geometry.mjs";

/**
 * The video draws the scrolly's vector geometry on CLIPPED rings: no drawn vertex is one the scrolly's
 * clamp moved onto its margin, an edge running out of the box is cut where it really crosses, and Kosovo is
 * seated on Kosovo rather than on a group keyed `-99`.
 */

const subject = loadSubject({
  dir: join(import.meta.dirname, "..", "static-choropleth-europe-lowcarbon"),
});
const geometry = videoGeometry(subject);
const verticesOf = (path: string) =>
  path
    .split("Z")
    .filter(Boolean)
    .flatMap((ring) =>
      ring
        .replace(/^M/, "")
        .split("L")
        .map((p) => p.split(" ").map(Number)),
    );

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

describe("the video's geometry", () => {
  it("should leave no drawn vertex on the clamp's margin — every ring was clipped before it could be clamped", () => {
    const onMargin = geometry.shapes.flatMap((s: any) =>
      verticesOf(s.path)
        .filter(
          ([x, y]) =>
            x <= -CLAMP_MARGIN.x ||
            x >= FRAME.width + CLAMP_MARGIN.x ||
            y <= -CLAMP_MARGIN.y ||
            y >= FRAME.height + CLAMP_MARGIN.y,
        )
        .map(() => s.iso),
    );
    expect([...new Set(onMargin)]).toEqual([]);
  });

  it("should still draw Russia, Norway and Greenland, the three shapes that run past the margin", () => {
    for (const iso of ["RUS", "NOR", "GRL"])
      expect(geometry.shapes.some((s: any) => s.iso === iso)).toBe(true);
  });

  it("should seat Kosovo on Kosovo, not on a shape shared with Northern Cyprus", () => {
    const kosovo = geometry.shapes.find((s: any) => s.iso === "-99:Kosovo");
    const albania = geometry.shapes.find((s: any) => s.iso === "ALB");
    expect(kosovo).toBeDefined();
    // Kosovo borders Albania to the north-east: its whole box is within a few tens of units of Albania's.
    expect(kosovo.box.w).toBeLessThan(40);
    expect(Math.abs(kosovo.seat.x - albania.seat.x)).toBeLessThan(40);
    expect(Math.abs(kosovo.seat.y - albania.seat.y)).toBeLessThan(60);
  });

  it("should find Kosovo as Albania's one ring-neighbour with no row in the data", () => {
    expect(unmeasuredNeighboursOf(subject, "ALB")).toEqual([
      { key: "-99:Kosovo", name: "Kosovo" },
    ]);
  });
});
