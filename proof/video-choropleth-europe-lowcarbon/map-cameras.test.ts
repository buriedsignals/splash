import { describe, expect, it } from "bun:test";
import { viewOf } from "#shared/map-beat/scrolly.mjs";
import { loadBeat } from "./build.mjs";
import { camerasOf } from "./map-plan.mjs";

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
});
