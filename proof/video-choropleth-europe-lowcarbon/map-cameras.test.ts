import { describe, expect, it } from "bun:test";
import { mercatorOf, viewOf } from "#shared/map-beat/scrolly.mjs";
import { BEAT } from "../static-choropleth-europe-lowcarbon/bake.mjs";
import { loadBeat } from "./build.mjs";
import { camerasOf, REFERENCE } from "./map-plan.mjs";

/**
 * The cameras of `map-plan.test.ts`, on their own: that file reads `mapStateAt` (`scene.mjs`) and `props.mapPlan`
 * (`build.mjs`), which the frame's drive and the build's rewrite add, and a module whose import fails runs none of
 * its tests.
 */

const beat = loadBeat();

describe("the choropleth video's cameras", () => {
  it("should centre the close-up on Albania's seat, 2.3 zoom levels in from the whole map", () => {
    const { whole, closeUp } = camerasOf(beat.subject);
    const [lon, lat] = viewOf(closeUp).center;
    const seat = beat.mapSeats.ALB;
    expect(Math.abs(lon - seat[0])).toBeLessThan(1e-6);
    expect(Math.abs(lat - seat[1])).toBeLessThan(1e-6);
    expect(closeUp.camZoom - whole.camZoom).toBeCloseTo(2.3, 9);
  });

  it("should hold every corner of the static plate's bounds inside the reference stage at the whole-map camera", () => {
    const { whole } = camerasOf(beat.subject);
    const worldPx = 512 * 2 ** whole.camZoom;
    const halfX = REFERENCE.width / 2 / worldPx;
    const halfY = REFERENCE.height / 2 / worldPx;
    const [[west, south], [east, north]] = BEAT.bounds;
    const outside = [
      [west, south],
      [west, north],
      [east, south],
      [east, north],
    ].filter((corner) => {
      const [x, y] = mercatorOf(corner);
      return Math.abs(x - whole.camX) > halfX + 1e-9 || Math.abs(y - whole.camY) > halfY + 1e-9;
    });
    expect(outside).toEqual([]);
  });
});
