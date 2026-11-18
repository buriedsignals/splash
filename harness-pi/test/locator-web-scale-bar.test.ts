import { describe, expect, it } from "bun:test";
import { barKmFor, frameRemoves } from "../craft/web/locator/removes.mjs";

// gx-locator web (12B, mvg91, 2026-11-18): the region remove drew Zaporizhzhia and one peer 470 km due north, so
// its window was tall and narrow; the bar was sized from the window's WIDTH (~70 km) and read "20 km" — a 20 px
// tick on a map the reader sees ~1 900 km wide, because the live camera fits that tall box into a wide frame.
const subject = { name: "S", kind: "k", lon: 34.59, lat: 47.51, priority: 6000 };
const peerNorth = { name: "P", kind: "k", lon: 35.31, lat: 51.68, priority: 4000 };
const beat = { others: [peerNorth], places: [], removes: [{ key: "region", radius: 500, places: false }] };
const PLATE_ASPECT = 1600 / 1216;

describe("the scale bar a remove prints", () => {
  it("should be sized from the ground the frame shows, not from the width of what it draws", () => {
    const framed = frameRemoves(beat, subject, PLATE_ASPECT);
    expect(barKmFor(framed.removes[0].spanKm)).toBeGreaterThanOrEqual(100);
  });

  it("should never be longer than the ground the frame shows", () => {
    const framed = frameRemoves(beat, subject, PLATE_ASPECT);
    expect(barKmFor(framed.removes[0].spanKm)).toBeLessThan(framed.removes[0].spanKm);
  });

  it("should still take a wide window's own width", () => {
    const wide = { others: [{ ...peerNorth, lon: 44.0, lat: 47.6 }], places: [], removes: [{ key: "region", radius: 800, places: false }] };
    const framed = frameRemoves(wide, subject, PLATE_ASPECT);
    expect(barKmFor(framed.removes[0].spanKm)).toBe(200);
  });
});
