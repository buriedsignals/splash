import { describe, expect, it } from "bun:test";
import {
  cameraFields,
  lonLatOf,
  mercatorOf,
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
});
