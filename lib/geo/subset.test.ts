import { describe, it, expect, afterAll } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  toleranceMetersFor,
  extentMetersFor,
  bboxOf,
  subsetGeometry,
} from "./subset";

describe("toleranceMetersFor", () => {
  it("derives an absolute metre tolerance from extent/width — the spec's Swiss-cantons fixture: ~288 m/px at 1200px gives ~100m (measured 1.3px deviation, spec D5)", () => {
    // 345,600 m extent (Switzerland's rough east-west span) at a 1200px render width.
    expect(toleranceMetersFor(345_600, 1200)).toBeCloseTo(288, 0);
  });

  it("is never expressed as a percentage — this function has no percentage branch at all", () => {
    // The point of this test is structural, not numeric: confirm the function's return type is
    // always a plain metre number, so nothing downstream can be handed "5%" instead of "100".
    expect(typeof toleranceMetersFor(100_000, 1000)).toBe("number");
  });
});

describe("extentMetersFor", () => {
  it("returns the larger side of the bbox, scaling longitude by cos(mid-latitude): a 1°×1° box is ~111km tall everywhere, but only ~111km wide at the equator versus ~56km wide at 60°N — so at 60°N the height wins", () => {
    const atEquator = extentMetersFor({
      minLon: 0,
      maxLon: 1,
      minLat: 0,
      maxLat: 1,
    });
    expect(atEquator).toBeCloseTo(111_320, -3);

    const at60N = extentMetersFor({
      minLon: 0,
      maxLon: 1,
      minLat: 60,
      maxLat: 61,
    });
    expect(at60N).toBeCloseTo(111_320, -3); // the ~111km height, not the ~56km width
  });
});

describe("bboxOf", () => {
  it("throws on a coordinate-free input rather than silently returning an empty bbox — an empty extent would produce a nonsense tolerance", () => {
    expect(() =>
      bboxOf([{ type: "GeometryCollection", geometries: [] }]),
    ).toThrow(/no coordinate/);
  });
});

describe("subsetGeometry — real bunx mapshaper invocation, no mock (repo convention)", () => {
  const dir = mkdtempSync(join(tmpdir(), "geo-subset-test-"));
  const sourcePath = join(dir, "source.geojson");
  const outPath = join(dir, "out.topojson");

  // Three features, deliberately distinguishable: only "b" and "c" get kept by the filter, and
  // only "keepMe" survives the property prune — "dropMe" is the fixture element that PROVES
  // pruning ran (spec D5's biggest, cheapest win: 253kB → 93kB from property pruning alone).
  const fixture: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { id: "a", keepMe: "A", dropMe: "verbose-a" },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [0, 1],
              [1, 1],
              [1, 0],
              [0, 0],
            ],
          ],
        },
      },
      {
        type: "Feature",
        properties: { id: "b", keepMe: "B", dropMe: "verbose-b" },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [2, 0],
              [2, 1],
              [3, 1],
              [3, 0],
              [2, 0],
            ],
          ],
        },
      },
      {
        type: "Feature",
        properties: { id: "c", keepMe: "C", dropMe: "verbose-c" },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [4, 0],
              [4, 1],
              [5, 1],
              [5, 0],
              [4, 0],
            ],
          ],
        },
      },
    ],
  };
  writeFileSync(sourcePath, JSON.stringify(fixture));

  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("filters to only the drawn features, prunes to only the kept property, and encodes TopoJSON", async () => {
    const result = await subsetGeometry({
      sourcePath,
      outPath,
      featureIds: ["b", "c"],
      idProperty: "id",
      keepProperties: ["id", "keepMe"],
      renderWidthPx: 1200,
    });
    expect(result.bytes).toBeGreaterThan(0);
    expect(result.featureCount).toBe(2);

    const topo = JSON.parse(readFileSync(outPath, "utf8"));
    expect(topo.type).toBe("Topology");
    const layerKey = Object.keys(topo.objects)[0]!;
    const geoms = topo.objects[layerKey].geometries as {
      properties: Record<string, unknown>;
    }[];
    expect(geoms.length).toBe(2); // only "b" and "c" — "a" was filtered out
    for (const g of geoms) {
      expect(g.properties.keepMe).toBeDefined();
      expect(g.properties.dropMe).toBeUndefined(); // pruned — the fixture element under test
    }
  }, 30_000);
});
