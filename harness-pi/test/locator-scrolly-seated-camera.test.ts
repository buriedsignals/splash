import { describe, expect, it } from "bun:test";
import { seatedCamera } from "../craft/scrolly/locator/plan.mjs";

// gx-locator scrolly (Qwen3.5-9B mvq144 and Gemma 12B mvg96, 2026-11-19): the close-up and the pull-back were
// centred on the station, and the prose card is centred on the stage — card 5 ("Zaporizhzhia … 6 000 MW") sat
// on the very ring and label it names, and card 6 on them again.

// Web Mercator in [0, 1], y growing south, as `mercatorOf` gives it.
const merc = (lon: number, lat: number) => [
  (lon + 180) / 360,
  (1 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / Math.PI) / 2,
];
const reference = { width: 1280, height: 900 };
const subject = merc(35.09, 47.51);
const places = [
  merc(30.52, 50.45),
  merc(26.1, 44.43),
  merc(36.23, 49.99),
  merc(39.7, 47.23),
];

function frame(cam: { center: number[]; zoom: number }) {
  const h = reference.height / (512 * 2 ** cam.zoom);
  const top = merc(cam.center[0], cam.center[1])[1] - h / 2;
  return { at: (y: number) => (y - top) / h };
}

describe("the locator scrolly's close cameras", () => {
  it("should seat the station below the centred prose card", () => {
    const cam = seatedCamera({ subject, places, zoom: 5, reference });
    expect(frame(cam).at(subject[1])).toBeGreaterThanOrEqual(0.68);
  });

  it("should keep every named place inside the frame, easing out from a camera too close to hold them", () => {
    const cam = seatedCamera({ subject, places, zoom: 6, reference });
    const f = frame(cam);
    expect(places.every(([, y]) => f.at(y) > 0 && f.at(y) < 1)).toBe(true);
  });

  it("should never zoom closer than the camera it was given", () => {
    expect(
      seatedCamera({ subject, places, zoom: 5, reference }).zoom,
    ).toBeLessThanOrEqual(5);
  });
});
