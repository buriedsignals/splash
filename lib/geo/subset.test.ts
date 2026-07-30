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

describe("subsetGeometry — the join key is addressed, never interpolated as a bare identifier (I2, I3)", () => {
  const dir = mkdtempSync(join(tmpdir(), "geo-subset-joinkey-test-"));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("filters on a join-key field whose name contains a space, e.g. a French 'code insee' column — a bare `this.properties.code insee` is a mapshaper SyntaxError, which is exactly what the old interpolation produced", async () => {
    const sourcePath = join(dir, "code-insee-source.geojson");
    const outPath = join(dir, "code-insee-out.topojson");
    const fixture: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { "code insee": "01001", name: "Ambérieu-en-Bugey" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [10, 10],
                [10, 11],
                [11, 11],
                [11, 10],
                [10, 10],
              ],
            ],
          },
        },
        {
          type: "Feature",
          properties: { "code insee": "01002", name: "Ambronay" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [12, 10],
                [12, 11],
                [13, 11],
                [13, 10],
                [12, 10],
              ],
            ],
          },
        },
      ],
    };
    writeFileSync(sourcePath, JSON.stringify(fixture));

    const result = await subsetGeometry({
      sourcePath,
      outPath,
      featureIds: ["01002"],
      idProperty: "code insee",
      keepProperties: ["code insee", "name"],
      renderWidthPx: 1200,
    });
    expect(result.featureCount).toBe(1);

    const topo = JSON.parse(readFileSync(outPath, "utf8"));
    const layerKey = Object.keys(topo.objects)[0]!;
    const geoms = topo.objects[layerKey].geometries as {
      properties: Record<string, unknown>;
    }[];
    expect(geoms.length).toBe(1);
    expect(geoms[0]!.properties["code insee"]).toBe("01002");
  }, 30_000);

  it("retains features whose id is numeric in the source file when featureIds are strings — the old bare comparison (no String() coercion) never matched a number against a string and silently retained zero features", async () => {
    const sourcePath = join(dir, "numeric-id-source.geojson");
    const outPath = join(dir, "numeric-id-out.topojson");
    const fixture: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { id: 1, name: "One" }, // numeric id, not a string
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [20, 10],
                [20, 11],
                [21, 11],
                [21, 10],
                [20, 10],
              ],
            ],
          },
        },
        {
          type: "Feature",
          properties: { id: 2, name: "Two" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [22, 10],
                [22, 11],
                [23, 11],
                [23, 10],
                [22, 10],
              ],
            ],
          },
        },
        {
          type: "Feature",
          properties: { id: 3, name: "Three" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [24, 10],
                [24, 11],
                [25, 11],
                [25, 10],
                [24, 10],
              ],
            ],
          },
        },
      ],
    };
    writeFileSync(sourcePath, JSON.stringify(fixture));

    // featureIds are strings, as they always are on the caller's side (KB/config JSON has no
    // number-vs-string distinction the journalist controls) — the source's ids are numbers.
    const result = await subsetGeometry({
      sourcePath,
      outPath,
      featureIds: ["2", "3"],
      idProperty: "id",
      keepProperties: ["id", "name"],
      renderWidthPx: 1200,
    });
    expect(result.featureCount).toBe(2); // used to be 0 — every id was numeric, every filter miss

    const topo = JSON.parse(readFileSync(outPath, "utf8"));
    const layerKey = Object.keys(topo.objects)[0]!;
    const geoms = topo.objects[layerKey].geometries as {
      properties: Record<string, unknown>;
    }[];
    const names = geoms.map((g) => g.properties.name).sort();
    expect(names).toEqual(["Three", "Two"]);
  }, 30_000);
});

describe("subsetGeometry — a vertex floor defends the MEASURED tolerance, not just keep-shapes' null-guard (I1)", () => {
  // keep-shapes stops a placeholder-tolerance drift from ever producing a null geometry, so
  // POST-CONDITION 2 above stays green under a 10-80x tolerance drift — measured, not
  // suspected: reverting the measured extent to the old 40_075_000m placeholder constant does
  // NOT redden any existing test in this file. A drift that coarse still deletes almost all of
  // a shape's detail; keep-shapes only guarantees *a* shape survives, not a recognizable one.
  // This floor catches that: it counts emitted TopoJSON vertices (arcs, not features —
  // `featureCount` is a geometry count and does not move under simplification) and fails when
  // there are dramatically fewer than a correct tolerance would leave behind.
  const dir = mkdtempSync(join(tmpdir(), "geo-subset-vertexfloor-test-"));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  const worldPath = join(
    import.meta.dir,
    "../../skills/map-native/assets/geo/world.geojson",
  );

  function countVertices(topoPath: string): number {
    const topo = JSON.parse(readFileSync(topoPath, "utf8")) as {
      arcs: unknown[][];
    };
    return topo.arcs.reduce((sum, arc) => sum + arc.length, 0);
  }

  it("keeps a real fraction of Norway's coastline detail at 1200px — measured baseline 1238 vertices; floor set at 800 (~65%), well above the 44 vertices a reverted 40_075_000m placeholder produces on this exact fixture (measured, see Task 12 report for the mutation run)", async () => {
    const outPath = join(dir, "norway.topojson");
    const result = await subsetGeometry({
      sourcePath: worldPath,
      outPath,
      featureIds: ["NOR"],
      idProperty: "adm0_a3",
      keepProperties: ["adm0_a3", "name"],
      renderWidthPx: 1200,
    });
    expect(result.featureCount).toBe(1);
    expect(countVertices(outPath)).toBeGreaterThan(800);
  }, 30_000);
});
