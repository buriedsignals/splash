import { describe, it, expect } from "bun:test";
import { coordinateRangeVerdict } from "./crs";

describe("coordinateRangeVerdict", () => {
  it("accepts a valid WGS84 point (Bern)", () => {
    const geom: GeoJSON.Point = {
      type: "Point",
      coordinates: [7.4474, 46.9481],
    };
    expect(coordinateRangeVerdict(geom)).toEqual({ ok: true });
  });

  it("rejects a Swiss LV95 pair mistaken for WGS84 — the fixture the spec measures", () => {
    // spec D4's own measured case: Bern in LV95 is (2600000, 1200000). Fed as if it were
    // lon/lat, |x| and |y| are both wildly out of range — this is the exact pair that, left
    // unguarded, aliases via sin() periodicity to a plausible-looking ~57°N.
    const geom: GeoJSON.Point = {
      type: "Point",
      coordinates: [2600000, 1200000],
    };
    const verdict = coordinateRangeVerdict(geom);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.code).toBe("coordinate-out-of-range");
      expect(verdict.message).toContain("2600000");
      expect(verdict.message).toContain("re-export");
      expect(verdict.message).toContain("EPSG:4326");
    }
  });

  it("does not flag an antimeridian-crossing polygon (Fiji-shaped) via its bbox", () => {
    // Every individual coordinate is in-range; the bbox alone (minX=-179.9 > maxX=179.5 if
    // computed naively) would look inverted. The guard must walk coordinates, not the bbox.
    const geom: GeoJSON.Polygon = {
      type: "Polygon",
      coordinates: [
        [
          [179.5, -17],
          [179.9, -16],
          [-179.9, -16],
          [-179.5, -17],
          [179.5, -17],
        ],
      ],
    };
    expect(coordinateRangeVerdict(geom)).toEqual({ ok: true });
  });

  it("does not reject a clockwise (reversed) ring — no winding-order guard", () => {
    // Same ring as a normal square, wound the OTHER way. RFC 7946 §3.1.6: parsers SHOULD NOT
    // reject on ring direction. This fixture is the one a future contributor is most likely to
    // "fix" by adding a signed-area check — that would be the regression this test exists for.
    const geom: GeoJSON.Polygon = {
      type: "Polygon",
      coordinates: [
        [
          [7.0, 46.0],
          [7.0, 47.0],
          [8.0, 47.0],
          [8.0, 46.0],
          [7.0, 46.0],
        ],
      ],
    };
    expect(coordinateRangeVerdict(geom)).toEqual({ ok: true });
  });
});
