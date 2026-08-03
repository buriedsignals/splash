import { describe, it, expect } from "bun:test";
import { coordinateRangeVerdict, type TopoJsonTopology } from "./crs";

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

  it("rejects an out-of-range coordinate nested in a GeometryCollection", () => {
    // GeometryCollection has no .coordinates field — it has a .geometries array instead. The
    // guard must flatten the collection and walk its nested geometries to catch out-of-range
    // coordinates inside. This is the fixture proving the guard does not silently miss LV95
    // coordinates buried in a geometry collection.
    const geom: GeoJSON.GeometryCollection = {
      type: "GeometryCollection",
      geometries: [
        { type: "Point", coordinates: [7.4474, 46.9481] }, // valid Bern
        { type: "Point", coordinates: [2600000, 1200000] }, // LV95 mistaken for WGS84
      ],
    };
    const verdict = coordinateRangeVerdict(geom);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.code).toBe("coordinate-out-of-range");
      expect(verdict.message).toContain("2600000");
    }
  });

  // A Topology has no `.coordinates` field — its geometries reference `arcs` by index — so a
  // range walk written only for GeoJSON's `.coordinates` shape finds nothing on a Topology and
  // returns ok:true unconditionally, regardless of what CRS the file is actually in. These
  // fixtures are the same LV95-mistaken-for-WGS84 case the GeoJSON tests above use, re-encoded
  // as TopoJSON, once unquantized (no `transform`) and once quantized (`transform` present) —
  // both encodings TopoJSON files actually ship in.
  describe("TopoJSON topologies", () => {
    it("accepts a valid unquantized topology (no transform)", () => {
      const topo: TopoJsonTopology = {
        type: "Topology",
        arcs: [
          [
            [7.4474, 46.9481],
            [8.5417, 47.3769],
          ],
        ],
        objects: {
          geo: {
            type: "GeometryCollection",
            geometries: [{ type: "LineString", arcs: [0] }],
          },
        },
      };
      expect(coordinateRangeVerdict(topo)).toEqual({ ok: true });
    });

    it("rejects an out-of-range point in an unquantized arc (no transform)", () => {
      const topo: TopoJsonTopology = {
        type: "Topology",
        arcs: [
          [
            [7.4474, 46.9481], // valid Bern
            [2600000, 1200000], // LV95 mistaken for WGS84
          ],
        ],
        objects: {
          geo: {
            type: "GeometryCollection",
            geometries: [{ type: "LineString", arcs: [0] }],
          },
        },
      };
      const verdict = coordinateRangeVerdict(topo);
      expect(verdict.ok).toBe(false);
      if (!verdict.ok) {
        expect(verdict.code).toBe("coordinate-out-of-range");
        expect(verdict.message).toContain("2600000");
      }
    });

    it("rejects an out-of-range point in a quantized arc (transform present), decoding scale+translate", () => {
      // Chosen so the decoded point is exactly the LV95 pair: (60000000 * 0.01 + 2000000,
      // 20000000 * 0.01 + 1000000) = (2600000, 1200000).
      const topo: TopoJsonTopology = {
        type: "Topology",
        transform: { scale: [0.01, 0.01], translate: [2000000, 1000000] },
        arcs: [[[60000000, 20000000]]],
        objects: {
          geo: {
            type: "GeometryCollection",
            geometries: [{ type: "LineString", arcs: [0] }],
          },
        },
      };
      const verdict = coordinateRangeVerdict(topo);
      expect(verdict.ok).toBe(false);
      if (!verdict.ok) {
        expect(verdict.code).toBe("coordinate-out-of-range");
        expect(verdict.message).toContain("2600000");
        expect(verdict.message).toContain("1200000");
      }
    });

    it("accumulates deltas WITHIN an arc rather than reading each raw position independently", () => {
      // Position 0's delta [170, 80] decodes (running sum from 0) to the in-range point
      // (170, 80). Position 1's delta [20, 20] is relative to position 0, not to zero — the
      // correctly accumulated point is (190, 100), outside the globe. A decoder that read raw
      // deltas without accumulating (the bug this fixture pins) would see (20, 20) instead —
      // in-range — and miss the regression entirely.
      const topo: TopoJsonTopology = {
        type: "Topology",
        transform: { scale: [1, 1], translate: [0, 0] },
        arcs: [
          [
            [170, 80],
            [20, 20],
          ],
        ],
        objects: {
          geo: {
            type: "GeometryCollection",
            geometries: [{ type: "LineString", arcs: [0] }],
          },
        },
      };
      const verdict = coordinateRangeVerdict(topo);
      expect(verdict.ok).toBe(false);
      if (!verdict.ok) {
        expect(verdict.message).toContain("190");
        expect(verdict.message).toContain("100");
      }
    });

    it("resets the running delta sum at the start of each new arc", () => {
      // If the first arc's accumulated sum leaked into the second arc, the second arc's first
      // point (delta [170, 80], same as the first arc's) would decode to (340, 160) instead of
      // (170, 80) — still out of range, but for the wrong reason. Both arcs individually stay
      // in-range only if each starts its own sum at zero.
      const topo: TopoJsonTopology = {
        type: "Topology",
        transform: { scale: [1, 1], translate: [0, 0] },
        arcs: [[[170, 80]], [[170, 80]]],
        objects: {
          geo: {
            type: "GeometryCollection",
            geometries: [
              { type: "LineString", arcs: [0] },
              { type: "LineString", arcs: [1] },
            ],
          },
        },
      };
      expect(coordinateRangeVerdict(topo)).toEqual({ ok: true });
    });

    it("rejects an out-of-range Point object stored directly (not via arcs)", () => {
      const topo: TopoJsonTopology = {
        type: "Topology",
        arcs: [],
        objects: { geo: { type: "Point", coordinates: [2600000, 1200000] } },
      };
      const verdict = coordinateRangeVerdict(topo);
      expect(verdict.ok).toBe(false);
      if (!verdict.ok) expect(verdict.message).toContain("2600000");
    });
  });
});
