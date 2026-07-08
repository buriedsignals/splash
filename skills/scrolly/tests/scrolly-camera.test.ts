import { describe, it, expect } from "bun:test";
import { peakFlightZoom, PEAK_ZOOM_MARGIN } from "../src/scrolly-camera";

// The scrolly camera flies from one focused beat to the next. maplibre's default
// flyTo curve zooms OUT to a wide "peak" between the two endpoints; for reveals
// far apart on the map that peak pulls all the way back to the full data extent,
// so the reader loses the focused region mid-scroll. peakFlightZoom caps the
// flight's most-zoomed-out point to a small margin below the TIGHTER endpoint, so
// a reveal→reveal transition never widens past its own framing.
describe("peakFlightZoom (bounded flyTo peak — stay tight between steps)", () => {
  it("caps the peak just below the tighter of the two endpoints", () => {
    // Far-apart reveals both at city zoom (~6.6) must stay near city zoom, not
    // dip to the full-extent zoom (~4.7). Peak = min(6.9, 6.58) - margin.
    expect(peakFlightZoom(6.9, 6.58)).toBeCloseTo(6.58 - PEAK_ZOOM_MARGIN, 6);
  });

  it("uses the FROM zoom when it is the tighter endpoint", () => {
    expect(peakFlightZoom(6.58, 6.9)).toBeCloseTo(6.58 - PEAK_ZOOM_MARGIN, 6);
  });

  it("never lets a reveal→reveal transition reach the full extent", () => {
    // Establish/full-extent zoom ~4.74; two tight reveals ~6.6. The peak must
    // stay well ABOVE (tighter than) the full extent.
    const fullExtentZoom = 4.74;
    expect(peakFlightZoom(6.6, 6.7)).toBeGreaterThan(fullExtentZoom);
  });

  it("lets an establish/takeaway transition widen fully (endpoint IS the extent)", () => {
    // Reveal (6.6) → takeaway/full (4.74): the tighter endpoint is the extent, so
    // the peak is allowed down to the extent (minus the small margin).
    expect(peakFlightZoom(6.6, 4.74)).toBeCloseTo(4.74 - PEAK_ZOOM_MARGIN, 6);
  });

  it("accepts a custom margin", () => {
    expect(peakFlightZoom(6.0, 7.0, 1.5)).toBeCloseTo(4.5, 6);
  });
});
