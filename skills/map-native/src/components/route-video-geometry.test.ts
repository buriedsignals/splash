// Task 9 (map-storyboard-and-video-geography): coverage for RouteReveal.tsx and
// RouteScrolly.tsx reading the injected config.geometry instead of the bundled
// assets/geo/world.geojson static import — the fix ChoroplethMap.tsx / RouteMap.tsx (the
// interactive sibling) already proved, per D5's "no bundled fallback geometry" contract.
//
// Two kinds of coverage, mirroring skills/scrolly/src/geometry-guard.test.tsx's own split
// (see that file's header for the fuller rationale):
//   (A) WIRING — behavioural, against the REAL exported code. Both components now export
//       `resolveWorldFromGeometry` (the same function the component's own `useMemo` calls) so
//       this exact wiring is importable and callable in a plain bun:test, without a live
//       Remotion/WebGL render context (RouteReveal/RouteScrolly are Remotion compositions bound
//       to useCurrentFrame/useVideoConfig, which a bare renderToStaticMarkup could not supply —
//       the same constraint already documented for this codebase's WebGL/Remotion-bound
//       components; no bun:test suite renders ChoroplethMap.tsx/RouteMap.tsx either). A source
//       import of each component module still works (proven below) because top-level side
//       effects — the MapTiler CSS import, `maptilersdk.config.apiKey = …` — are inert outside
//       a browser/render context.
//   (B) BEHAVIOUR (geometry layer) — the SHARED pure geometry layer both files call,
//       `computeRouteReveal`/`computeRoute` (route-geo.ts), exercised on the SAME decoded
//       FeatureCollection (A) produces. Proves an injected NON-WORLD geometry resolves its own
//       features (not the shipped world.geojson's — the actual production defect this task
//       closes), and that decoding the real world geometry through the SAME topojson round-trip
//       reproduces the identical territories the old direct-array (static-import) path already
//       produced — world-path parity, since the two components' watched Remotion renders are
//       deferred to Task 10.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "bun:test";
import type { Topology } from "topojson-specification";
import type { RouteConfig } from "../route-geo";
import { computeRoute, computeRouteReveal } from "../route-geo";
import { resolveWorldFromGeometry as resolveFromReveal } from "./RouteReveal";
import { resolveWorldFromGeometry as resolveFromScrolly } from "./RouteScrolly";

const COMPONENTS_DIR = import.meta.dir;
const ASSETS_GEO_DIR = join(COMPONENTS_DIR, "..", "..", "assets", "geo");
const WORLD_GEOJSON_PATH = join(ASSETS_GEO_DIR, "world.geojson");
const ROUTE_FIXTURE_PATH = join(
  COMPONENTS_DIR,
  "..",
  "..",
  "assets",
  "sample-data",
  "route.json",
);

// -----------------------------------------------------------------------------------------
// A hand-rolled GeoJSON → TopoJSON converter (no transform/quantization — arcs carry literal
// coordinates), scoped to Polygon/MultiPolygon, which is all a route's crossed territories
// ever are. Exists only so this test can build a real Topology the same shape produce.mjs's
// resolveGeometryForProduce (lib/geo/resolve-for-produce.ts) injects as `config.geometry`,
// without pulling in topojson-server (not a direct dependency of this package).
// -----------------------------------------------------------------------------------------

type PolyFC = GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon>;

function topologize(fc: PolyFC, objectName: string): Topology {
  const arcs: number[][][] = [];
  const arcIndexFor = (ring: number[][]): number => arcs.push(ring) - 1;

  const geometries = fc.features.map((f) => {
    const g = f.geometry;
    if (g.type === "Polygon") {
      return {
        type: "Polygon" as const,
        properties: f.properties ?? {},
        arcs: g.coordinates.map((ring) => [arcIndexFor(ring)]),
      };
    }
    return {
      type: "MultiPolygon" as const,
      properties: f.properties ?? {},
      arcs: g.coordinates.map((poly) =>
        poly.map((ring) => [arcIndexFor(ring)]),
      ),
    };
  });

  return {
    type: "Topology",
    arcs,
    objects: { [objectName]: { type: "GeometryCollection", geometries } },
  } as unknown as Topology;
}

// -----------------------------------------------------------------------------------------
// (A) WIRING — behavioural, against the real exported `resolveWorldFromGeometry`.
// -----------------------------------------------------------------------------------------

describe("RouteReveal.tsx / RouteScrolly.tsx no longer statically import the shipped world.geojson asset", () => {
  for (const file of ["RouteReveal.tsx", "RouteScrolly.tsx"] as const) {
    it(`${file}`, () => {
      const src = readFileSync(join(COMPONENTS_DIR, file), "utf8");
      expect(src).not.toMatch(
        /from\s+["']\.\.\/\.\.\/assets\/geo\/world\.geojson["']/,
      );
    });
  }
});

describe("resolveWorldFromGeometry (the exact function each component's own useMemo calls) throws a loud, named error when config.geometry is missing", () => {
  it("RouteReveal.tsx's export", () => {
    expect(() => resolveFromReveal(undefined)).toThrow(
      /route: config\.geometry is required.*D5/,
    );
  });

  it("RouteScrolly.tsx's export", () => {
    expect(() => resolveFromScrolly(undefined)).toThrow(
      /route: config\.geometry is required.*D5/,
    );
  });
});

describe("resolveWorldFromGeometry decodes an injected Topology into its own features, not the shipped world's", () => {
  const objectName = "territories";
  const injectedTopology = topologize(
    {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { iso_a3: "YY1", name: "Ypsilon One" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [40, 0],
                [50, 0],
                [50, 10],
                [40, 10],
                [40, 0],
              ],
            ],
          },
        },
      ],
    },
    objectName,
  );

  it("RouteReveal.tsx's export decodes the injected feature (iso_a3 YY1 — absent from the shipped world.geojson)", () => {
    const decoded = resolveFromReveal(injectedTopology);
    expect(decoded.features.map((f) => f.properties?.["iso_a3"])).toEqual([
      "YY1",
    ]);
  });

  it("RouteScrolly.tsx's export decodes the same injected feature", () => {
    const decoded = resolveFromScrolly(injectedTopology);
    expect(decoded.features.map((f) => f.properties?.["iso_a3"])).toEqual([
      "YY1",
    ]);
  });
});

// -----------------------------------------------------------------------------------------
// (B) BEHAVIOUR — the shared pure geometry layer, exercised the same way the fixed
// components now call it.
// -----------------------------------------------------------------------------------------

describe("computeRouteReveal / computeRoute resolve territories from an injected NON-WORLD geometry", () => {
  const objectName = "territories";
  const injectedTopology = topologize(
    {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { iso_a3: "ZZ1", name: "Zeta One" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [0, 0],
                [10, 0],
                [10, 10],
                [0, 10],
                [0, 0],
              ],
            ],
          },
        },
        {
          type: "Feature",
          properties: { iso_a3: "ZZ2", name: "Zeta Two" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [20, 0],
                [30, 0],
                [30, 10],
                [20, 10],
                [20, 0],
              ],
            ],
          },
        },
      ],
    },
    objectName,
  );
  // Decoded through RouteReveal.tsx's own exported function — the real production wiring, not
  // a parallel reimplementation.
  const injectedWorld = resolveFromReveal(injectedTopology);

  const routeConfig: RouteConfig = {
    type: "route",
    route: [
      [-5, 5],
      [15, 5],
      [35, 5],
    ],
  };

  it("the fixture is genuinely non-world: the shipped world.geojson carries neither synthetic territory code", () => {
    const world = JSON.parse(
      readFileSync(WORLD_GEOJSON_PATH, "utf8"),
    ) as GeoJSON.FeatureCollection;
    const worldCodes = new Set(
      world.features.map((f) => String(f.properties?.["iso_a3"] ?? "")),
    );
    expect(worldCodes.has("ZZ1")).toBe(false);
    expect(worldCodes.has("ZZ2")).toBe(false);
  });

  it("computeRouteReveal (RouteReveal.tsx / RouteScrolly.tsx's own layout call) resolves the territories crossed IN THE INJECTED geometry", () => {
    const layout = computeRouteReveal(routeConfig, injectedWorld);
    expect(layout.territories.map((t) => t.key).sort()).toEqual(["ZZ1", "ZZ2"]);
    expect(layout.territories.map((t) => t.label).sort()).toEqual([
      "Zeta One",
      "Zeta Two",
    ]);
  });

  it("computeRoute (the interactive RouteMap.tsx sibling's own call) resolves the same injected territories", () => {
    const layout = computeRoute(routeConfig, injectedWorld);
    expect(layout.territories.map((t) => t.key).sort()).toEqual(["ZZ1", "ZZ2"]);
  });
});

describe("decoding the injected world Topology reproduces the same territories as the old static-import world.geojson path (world-path parity)", () => {
  const world = JSON.parse(readFileSync(WORLD_GEOJSON_PATH, "utf8")) as PolyFC;

  // The real route this skill already ships (assets/sample-data/route.json, the Yarlung
  // Tsangpo) crosses a small, known handful of South Asian countries. Narrowed to that
  // allow-list so building a Topology from real Natural Earth geometry stays fast in a unit
  // test — the two paths below still decode the SAME real ring coordinates for every
  // territory the route actually crosses, so the parity this proves is real, not narrowed
  // away.
  const routeConfig = JSON.parse(
    readFileSync(ROUTE_FIXTURE_PATH, "utf8"),
  ) as RouteConfig;
  const NEARBY_ISO_A3 = new Set(["CHN", "IND", "BGD", "NPL", "BTN", "MMR"]);
  const nearby: PolyFC = {
    type: "FeatureCollection",
    features: world.features.filter((f) =>
      NEARBY_ISO_A3.has(String(f.properties?.["iso_a3"] ?? "")),
    ),
  };

  it("sanity check: the allow-list actually covers every territory the real route crosses", () => {
    const direct = computeRouteReveal(routeConfig, world);
    expect(direct.territories.length).toBeGreaterThan(0);
    for (const t of direct.territories) {
      expect(NEARBY_ISO_A3.has(t.key)).toBe(true);
    }
  });

  it("old path (raw world.geojson feature array) and new path (topojson-decoded injected geometry, via RouteScrolly.tsx's own export) resolve identical territories", () => {
    const oldPath = computeRouteReveal(routeConfig, nearby);
    const topology = topologize(nearby, "world");
    const viaInjectedGeometry = resolveFromScrolly(topology);
    const newPath = computeRouteReveal(routeConfig, viaInjectedGeometry);

    expect(newPath.territories.map((t) => t.key)).toEqual(
      oldPath.territories.map((t) => t.key),
    );
    expect(newPath.territories.map((t) => t.label)).toEqual(
      oldPath.territories.map((t) => t.label),
    );
    expect(newPath.totalLengthKm).toBeCloseTo(oldPath.totalLengthKm, 6);
    expect(newPath.bounds).toEqual(oldPath.bounds);
  });
});
