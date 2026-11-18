import { describe, expect, it } from "bun:test";
import { leaderTo } from "../craft/video/locator/leader.mjs";

// gx-locator video (Gemma 12B, mvg92, 2026-11-19): the block carrying the claim (« Zaporizhzhia / 6 000 MW
// installés ») found no clear seat beside its ring — Dnipro's name and Rostov's dot took that ground — and stood
// ~220 px up and to the right with nothing leading back to the ring, level with « Dnipro » as if it named that city.
const ring = { centre: { x: 960, y: 540 }, radius: 22 };
const reach = 30;

describe("the line from the station's ring to its block", () => {
  it("should be drawn when the block stands away from its ring", () => {
    expect(leaderTo(ring.centre, ring.radius, { x: 1183, y: 400, width: 410, height: 110 }, reach)).not.toBeNull();
  });

  it("should not be drawn when the block stands against its ring", () => {
    expect(leaderTo(ring.centre, ring.radius, { x: 960 + 22 + 20, y: 485, width: 410, height: 110 }, reach)).toBeNull();
  });

  it("should run from the ring's edge to the block's nearest edge", () => {
    const line = leaderTo(ring.centre, ring.radius, { x: 1183, y: 400, width: 410, height: 110 }, reach)!;
    expect([Math.round(Math.hypot(line.x1 - 960, line.y1 - 540)), Math.round(line.x2), Math.round(line.y2)]).toEqual([22 + 4, 1183 - 4, 510 + 4]);
  });
});
