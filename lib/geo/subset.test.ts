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

  it("keeps a real fraction of Norway's coastline detail at 1200px — measured baseline 1238 vertices; floor set at 800 (~65%), well above the 44 vertices a reverted 40_075_000m placeholder produces on this exact fixture (measured, see Task 12 report for the mutation run). NOTE (Task 12 review, answered by Task 15): this baseline is tied to the shipped world.geojson's exact committed coastline geometry — if that asset is ever regenerated (a new Natural Earth pull, a different simplify pass), this number must be re-measured, not assumed to still hold.", async () => {
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

describe("subsetGeometry — the other shipped basemap (us-states) is readable at all (task-14-brief.md)", () => {
  // us-states.geojson's Aleutians run to −188.9°: Alaska is deliberately encoded past the
  // antimeridian so the state renders contiguous instead of splitting across the map. That
  // pushes the source outside ±180, so mapshaper refuses to read it as lat-long and rejects a
  // metre-denominated `-simplify interval=<N>m` ("[simplify] Unable to convert meters to
  // unknown coordinates") — this basemap could not be resolved AT ALL before this fix, on any
  // config, because every sample fixture in the repo uses basemap: "world" and nothing ever
  // exercised the other shipped asset.
  const dir = mkdtempSync(join(tmpdir(), "geo-subset-usstates-test-"));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  const usStatesPath = join(
    import.meta.dir,
    "../../skills/map-native/assets/geo/us-states.geojson",
  );

  it("subsets AK/CA/NY on the real join key (postal), zero null shapes, properties.name survives", async () => {
    const outPath = join(dir, "us-states.topojson");
    const result = await subsetGeometry({
      sourcePath: usStatesPath,
      outPath,
      featureIds: ["AK", "CA", "NY"],
      idProperty: "postal",
      keepProperties: ["postal", "name"],
      renderWidthPx: 1200,
    });
    expect(result.featureCount).toBe(3);

    const topo = JSON.parse(readFileSync(outPath, "utf8")) as {
      objects: Record<
        string,
        {
          geometries: {
            type?: string | null;
            properties: Record<string, unknown>;
          }[];
        }
      >;
    };
    const layerKey = Object.keys(topo.objects)[0]!;
    const geoms = topo.objects[layerKey]!.geometries;
    expect(geoms.length).toBe(3);
    // POST-CONDITION 2's own check, exercised on this source: nothing was simplified out of
    // existence — the whole point of Alaska's deliberate antimeridian encoding is that it stays
    // one contiguous shape, not annihilated by a tolerance mapshaper could not compute.
    expect(geoms.filter((g) => g.type == null)).toHaveLength(0);
    // us-states' real join key is "postal" — asserting properties.name survives here genuinely
    // breaks the joinKey: "name" coincidence world.geojson happened to share (routed in from
    // Task 6's review: only world.geojson had committed property-pruning coverage).
    const names = geoms.map((g) => g.properties.name).sort();
    expect(names).toEqual(["Alaska", "California", "New York"]);
  }, 30_000);

  // Task 14 split the tolerance into two paths (metres for a source mapshaper reads as
  // lat-long, degrees for one whose bbox falls outside +/-180, like this one) but only the
  // metre path got a vertex floor (the Norway test above) — the degrees path was defended by
  // nothing sharper than "zero null shapes", which a total-annihilation regression would still
  // trip but a silent coarsening would not (routed in from Task 14's review, Task 15's Step 4b).
  //
  // Measured baseline (this exact AK/CA/NY fixture, 1200px, current formula): 593 vertices.
  // Floor set at 385 (~65% of baseline — the same headroom ratio as the Norway floor above).
  // Headroom checked, not assumed: multiplying the real computed interval by 1.5x alone drops
  // this fixture to 348 vertices (measured) — already under the 385 floor — and 5x/10x drop it
  // to 85/30. A floor at 65% catches even a mild drift on the degrees path, the same way the
  // Norway floor catches one on the metres path.
  // NOTE: like the Norway floor, this baseline is tied to the shipped us-states.geojson's exact
  // committed geometry — re-measure it if that asset is ever regenerated.
  it("keeps a real fraction of Alaska/California/New York's coastline detail at 1200px on the degrees path — measured baseline 593 vertices; floor set at 385 (~65%)", async () => {
    const outPath = join(dir, "us-states-vertexfloor.topojson");
    const result = await subsetGeometry({
      sourcePath: usStatesPath,
      outPath,
      featureIds: ["AK", "CA", "NY"],
      idProperty: "postal",
      keepProperties: ["postal", "name"],
      renderWidthPx: 1200,
    });
    expect(result.featureCount).toBe(3);
    const topo = JSON.parse(readFileSync(outPath, "utf8")) as {
      arcs: unknown[][];
    };
    const vertices = topo.arcs.reduce((sum, arc) => sum + arc.length, 0);
    expect(vertices).toBeGreaterThan(385);
  }, 30_000);
});

describe("subsetGeometry — an admin-1 join is scoped to its country (Task 15)", () => {
  // The real bug, on the real committed asset (not a fixture — the whole defect was that
  // natural-earth-admin-1 is a WORLD-WIDE set, so a small hand-built fixture could not have
  // reproduced the collision at all). "Jura" names both a Swiss canton (adm0_a3 "CHE",
  // adm1_code "CHE-160") and a French département (adm0_a3 "FRA", adm1_code "FRA-5312") —
  // confirmed by direct inspection of the asset while implementing this task.
  const dir = mkdtempSync(join(tmpdir(), "geo-subset-scope-test-"));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  const adm1Path = join(
    import.meta.dir,
    "../../skills/map-native/assets/geo/natural-earth-admin-1.topojson",
  );

  it("retains exactly the Swiss Jura, not France's, when the request is scoped to CHE — asserts identity, not just count", async () => {
    const outPath = join(dir, "jura-scoped.topojson");
    const result = await subsetGeometry({
      sourcePath: adm1Path,
      outPath,
      featureIds: ["Jura"],
      idProperty: "name",
      keepProperties: ["name", "adm0_a3", "adm1_code"],
      renderWidthPx: 1200,
      scope: "CHE",
    });
    expect(result.featureCount).toBe(1);

    const topo = JSON.parse(readFileSync(outPath, "utf8")) as {
      objects: Record<
        string,
        { geometries: { properties: Record<string, unknown> }[] }
      >;
    };
    const layerKey = Object.keys(topo.objects)[0]!;
    const geoms = topo.objects[layerKey]!.geometries;
    expect(geoms).toHaveLength(1);
    // Identity, not just count: a count of 1 alone would pass just as well on the wrong
    // (French) feature — this checks it is specifically the Swiss one.
    expect(geoms[0]!.properties.adm0_a3).toBe("CHE");
    expect(geoms[0]!.properties.adm1_code).toBe("CHE-160");
  }, 30_000);

  it("throws — the general superset guard — when an unscoped request on a colliding name would return more features than asked for", async () => {
    const outPath = join(dir, "jura-unscoped.topojson");
    // No `scope` at all: the exact shape of the original bug — a bare name join against a
    // world-wide admin-1 set, with no country to disambiguate "Jura". Before this task, this
    // silently produced a 2-feature result for a 1-feature request; POST-CONDITION 3 in
    // subset.ts is what makes that a loud failure instead.
    await expect(
      subsetGeometry({
        sourcePath: adm1Path,
        outPath,
        featureIds: ["Jura"],
        idProperty: "name",
        keepProperties: ["name", "adm0_a3"],
        renderWidthPx: 1200,
      }),
    ).rejects.toThrow(/more|exceed|2 features/i);
  }, 30_000);
});

describe("subsetGeometry — POST-CONDITION 1's refusal names the applied scope, not just the join key (FIX 3)", () => {
  // The failure mode this closes: a legitimately cross-border request (e.g. a column resolved
  // to one country by majority vote elsewhere in the pipeline) asks for a region that is a REAL
  // feature in the source — just not in the scoped country. `scope` filters it out at the
  // mapshaper -filter step (subset.ts:128-132), so it comes back "absent" through the exact
  // same path as a genuine join-key typo, and before this fix the message blamed "join key
  // <idProperty>" unconditionally — false when the real cause is the scope, sending whoever
  // reads it investigating the wrong thing.
  const dir = mkdtempSync(join(tmpdir(), "geo-subset-scope-missing-test-"));
  const sourcePath = join(dir, "scope-missing-source.geojson");
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  const fixture: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { id: "Alpha", adm0_a3: "AAA" },
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
        properties: { id: "Beta", adm0_a3: "BBB" },
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
    ],
  };
  writeFileSync(sourcePath, JSON.stringify(fixture));

  it("names the scope in the refusal when the 'missing' region is a real feature that was scoped out of a different country, not a join-key mismatch", async () => {
    const outPath = join(dir, "scope-missing-out.topojson");
    // "Beta" is a real feature in the source (adm0_a3 "BBB") — it is absent only because the
    // request is scoped to "AAA", the same shape as an unrequested cross-border sibling being
    // filtered out by the majority-vote scope upstream.
    await expect(
      subsetGeometry({
        sourcePath,
        outPath,
        featureIds: ["Alpha", "Beta"],
        idProperty: "id",
        keepProperties: ["id", "adm0_a3"],
        renderWidthPx: 1200,
        scope: "AAA",
      }),
    ).rejects.toThrow(/scoping to "AAA"/);
  }, 30_000);
});

describe("subsetGeometry — the superset guard is general, not admin-1-specific (Task 15, POST-CONDITION 3)", () => {
  // A minimal, geography-agnostic fixture: two features that both carry the SAME join-key
  // value — a stand-in for ANY future name collision, not just "Jura" — proving the guard
  // fires on the shape of the defect (more retained than requested) rather than on anything
  // ADM1-specific.
  const dir = mkdtempSync(join(tmpdir(), "geo-subset-superset-test-"));
  const sourcePath = join(dir, "dup-source.geojson");
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  const fixture: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { id: "dup", name: "First" },
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
        properties: { id: "dup", name: "Second" },
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
    ],
  };
  writeFileSync(sourcePath, JSON.stringify(fixture));

  it("throws when 1 requested id matches 2 features — no scope involved, no admin-1 asset involved", async () => {
    const outPath = join(dir, "dup-out.topojson");
    await expect(
      subsetGeometry({
        sourcePath,
        outPath,
        featureIds: ["dup"],
        idProperty: "id",
        keepProperties: ["id", "name"],
        renderWidthPx: 1200,
      }),
    ).rejects.toThrow(/more|exceed|2 features/i);
  }, 30_000);
});
