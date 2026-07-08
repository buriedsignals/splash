import { describe, it, expect } from "bun:test";
import { peakFlightZoom } from "../src/scrolly-camera";

// The scrolly camera flies from one focused beat to the next. maplibre's default
// flyTo curve zooms OUT to a wide "peak" between the two endpoints; for reveals
// far apart on the map that peak pulls all the way back to the full data extent,
// so the reader loses the focused region mid-scroll. peakFlightZoom caps the
// flight's most-zoomed-out point to the TIGHTER endpoint — never wider — so a
// reveal→reveal transition never widens past its own framing.
//
// The peak MUST NOT dip BELOW the tighter endpoint: an earlier version subtracted
// a "gentle" margin (min(from,to) − 0.5). That was the bug. On a reveal, which is a
// zoom-IN (to > from), subtracting a margin forces the flight to first zoom OUT
// below the CURRENT zoom, then back in — a visible pull-back. Worse, because the
// live map zoom is read on every step and the reader scrolls faster than the
// flight settles, each interrupted flight re-subtracts the margin from an already
// dipped zoom → the camera RATCHETS wider and wider, staying at (or below) the
// full extent and never zooming into the focused feature. Capping the peak to the
// tighter endpoint (no margin) makes a zoom-in monotonic (floor = the current
// zoom) so it can never drift wider than where it already is.
describe("peakFlightZoom (bounded flyTo peak — stay tight between steps)", () => {
  it("caps the peak AT the tighter of the two endpoints (never wider)", () => {
    // Far-apart reveals both at city zoom must stay at the tighter city zoom, not
    // dip to the full-extent zoom.
    expect(peakFlightZoom(6.9, 6.58)).toBeCloseTo(6.58, 6);
    expect(peakFlightZoom(6.58, 6.9)).toBeCloseTo(6.58, 6);
  });

  it("never dips BELOW the current zoom on a zoom-IN reveal (no backwards pull-back / ratchet)", () => {
    // to > from is the common reveal case (establish/wider → tighter feature). The
    // peak must equal the FROM zoom, so the flight only zooms IN. If it were below
    // FROM the camera would pull back first — and ratchet under scroll interruption.
    for (const [from, to] of [
      [2.95, 3.99],
      [2.95, 5.71],
      [4.0, 4.05],
    ]) {
      expect(peakFlightZoom(from, to)).toBe(from);
      expect(peakFlightZoom(from, to)).toBeGreaterThanOrEqual(from);
    }
  });

  it("never lets a reveal→reveal transition reach the full extent", () => {
    // Establish/full-extent zoom ~4.74; two tight reveals ~6.6. The peak must
    // stay well ABOVE (tighter than) the full extent.
    expect(peakFlightZoom(6.6, 6.7)).toBeGreaterThan(4.74);
  });

  it("lets an establish/takeaway transition widen to the extent (endpoint IS the extent)", () => {
    // Reveal (6.6) → takeaway/full (4.74): the tighter endpoint is the extent, so
    // the peak is allowed down to the extent — but never below it.
    expect(peakFlightZoom(6.6, 4.74)).toBeCloseTo(4.74, 6);
  });
});
