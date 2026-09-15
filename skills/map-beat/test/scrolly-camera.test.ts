import { describe, expect, it } from "bun:test";
import {
  cameraFields,
  lonLatOf,
  mercatorOf,
  stageViewOf,
  viewOf,
  zoomShiftFor,
} from "#shared/map-beat/scrolly.mjs";

describe("scrolly cameras as numbers", () => {
  it("should map the null island to the centre of the Mercator square", () => {
    expect(mercatorOf([0, 0])).toEqual([0.5, 0.5]);
  });

  it("should return the place it was given after a round trip", () => {
    const [lon, lat] = lonLatOf(mercatorOf([19.8, 41.3]));
    expect(lon).toBeCloseTo(19.8, 9);
    expect(lat).toBeCloseTo(41.3, 9);
  });

  it("should put the midpoint of two cards on the Mercator midpoint, not the latitude midpoint", () => {
    const a = cameraFields({ center: [10, 40], zoom: 3 });
    const b = cameraFields({ center: [10, 70], zoom: 5 });
    const mid = viewOf({
      camX: (a.camX + b.camX) / 2,
      camY: (a.camY + b.camY) / 2,
      camZoom: 4,
      camBearing: 0,
      camPitch: 0,
    });
    const expectedY = (mercatorOf([10, 40])[1] + mercatorOf([10, 70])[1]) / 2;
    expect(mercatorOf(mid.center)[1]).toBeCloseTo(expectedY, 9);
    expect(mid.center[1]).not.toBeCloseTo(55, 1);
    expect(mid.zoom).toBe(4);
  });

  it("should refuse a latitude beyond the Mercator limit", () => {
    expect(() => mercatorOf([0, 89])).toThrow(/85\.05/);
  });
});

describe("the zoom shift a stage applies to an authored camera", () => {
  it("should shift by the width ratio alone when the plan names only a referenceWidth", () => {
    expect(zoomShiftFor({ referenceWidth: 1280 }, 320, 100)).toBe(-2);
  });

  it("should shift by the tighter ratio when the plan names a referenceHeight too", () => {
    expect(zoomShiftFor({ referenceWidth: 1280, referenceHeight: 800 }, 1280, 200)).toBe(-2);
  });

  it("should not shift a camera when the plan names no reference stage", () => {
    expect(zoomShiftFor({}, 320, 100)).toBe(0);
  });

  it("should not shift a camera when the stage has no width or height yet", () => {
    // A hidden tab or a 0-size iframe reads clientWidth 0: log2(0) is -Infinity, and MapLibre clamps that to
    // its minZoom, so the map and the warm would be drawn for a world nobody is looking at.
    expect([
      zoomShiftFor({ referenceWidth: 1280 }, 0, 800),
      zoomShiftFor({ referenceWidth: 1280, referenceHeight: 800 }, 1280, 0),
      zoomShiftFor({ referenceWidth: 1280, referenceHeight: 800 }, -4, 800),
    ]).toEqual([0, 0, 0]);
  });
});

describe("the reference ground's place on a stage taller than it", () => {
  const plan = { referenceWidth: 1000, referenceHeight: 500 };
  const camera = { ...cameraFields({ center: [10, 50], zoom: 4 }) };

  it("should keep the camera's centre when the card names no alignment", () => {
    expect(stageViewOf(plan, camera, 500, 1000).center[1]).toBeCloseTo(50, 9);
  });

  it("should move the ground to the bottom of a tall stage, the centre north by half the spare height", () => {
    // 500 px wide: shift −1, ground 250 px tall on a 1000 px stage, 750 px spare; half is 375 px at zoom 3.
    const view = stageViewOf(plan, { ...camera, camAlignY: 1 }, 500, 1000);
    expect(mercatorOf(view.center)[1]).toBeCloseTo(camera.camY - 375 / (512 * 2 ** 3), 12);
  });

  it("should not move a camera on a stage wider than the reference, which is fitted by its height", () => {
    expect(stageViewOf(plan, { ...camera, camAlignY: 1 }, 2000, 500).center[1]).toBeCloseTo(50, 9);
  });

  it("should apply the zoom shift", () => {
    expect(stageViewOf(plan, camera, 500, 1000).zoom).toBe(3);
  });
});
