// Task 9 (map-storyboard-and-video-geography): coverage for RouteReveal.tsx and
// RouteScrolly.tsx reading the injected config.geometry instead of the bundled
// assets/geo/world.geojson static import — the fix ChoroplethMap.tsx / RouteMap.tsx (the
// interactive sibling) already proved, per D5's "no bundled fallback geometry" contract.
//
// Round-1 review finding: an earlier version of this fix duplicated the decode logic as a
// byte-identical `resolveWorldFromGeometry` in each of the two files, instead of calling Task 7's
// already-extracted, already-reviewed `resolveVideoGeometry` (skills/map-native/src/core/
// video-geometry.ts, brought into this worktree/branch verbatim from
// repair/task-7-video-choro:skills/map-native/src/core/video-geometry.ts, since this branch was
// cut before Task 7 landed it). Both components now call that ONE shared function — its own
// behavioural coverage (non-world join key, legacy-config fallback, loud-throw, and a real
// produce-pipeline round-trip) lives in the materialised video-geometry.test.ts alongside it, so
// this file no longer re-tests that surface. What THIS file still owns:
//   (A) WIRING — that RouteReveal.tsx / RouteScrolly.tsx (i) no longer statically import the
//       shipped world.geojson asset, and (ii) both import and call the SHARED
//       `resolveVideoGeometry`, with their own distinct callSite name, rather than a
//       re-derived or route-local copy. Source-scan, not render: RouteReveal/RouteScrolly are
//       Remotion compositions bound to useCurrentFrame/useVideoConfig, which a bare
//       renderToStaticMarkup cannot supply — the same constraint already documented for this
//       codebase's WebGL/Remotion-bound components (no bun:test suite renders
//       ChoroplethMap.tsx/RouteMap.tsx either).
//   (B) BEHAVIOUR (route's own geometry layer) — `computeRouteReveal`/`computeRoute`
//       (route-geo.ts, unchanged pure functions — route never threads a join key; see
//       task-9-report.md's "Structural choice" for why that is route's own established shape,
//       not something this task changes), exercised on the FeatureCollection
//       `resolveVideoGeometry` itself produces. Proves an injected NON-WORLD geometry resolves
//       its own features (not the shipped world.geojson's), and that decoding the real world
//       geometry through the SAME shared function reproduces the identical territories the old
//       direct-array (static-import) path already produced — world-path parity, since the two
//       components' watched Remotion renders are deferred to Task 10.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "bun:test";
import type { Topology } from "topojson-specification";
import type { RouteConfig } from "../route-geo";
import { computeRoute, computeRouteReveal } from "../route-geo";
import { resolveVideoGeometry } from "../core/video-geometry";

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
// coordinates), scoped to Polygon/MultiPolygon, which is all a route's crossed territories ever
// are. Exists only to BUILD Topology test fixtures (mirrors how Task 7's own
// video-geometry.test.ts hand-builds its CANTON_TOPOLOGY literal) — the actual decode under test
// is always the shared `resolveVideoGeometry`, never a parallel decode here. Not a substitute
// for the real produce pipeline: no quantization/simplification, unlike mapshaper's real output
// (lib/geo/subset.ts). That gap is recorded, not fixed, in task-9-report.md's fix-report
// addendum — Task 10's watched render is what settles whether it matters.
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
// (A) WIRING — source-scan: one shared implementation, called by name, not re-derived.
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

describe("RouteReveal.tsx / RouteScrolly.tsx call the SHARED resolveVideoGeometry, not a route-local re-derivation", () => {
  const cases = [
    { file: "RouteReveal.tsx", callSite: "route-reveal" },
    { file: "RouteScrolly.tsx", callSite: "route-scrolly" },
  ] as const;

  for (const { file, callSite } of cases) {
    const src = readFileSync(join(COMPONENTS_DIR, file), "utf8");

    it(`${file}: imports resolveVideoGeometry from ../core/video-geometry`, () => {
      expect(src).toMatch(
        /import\s*\{\s*resolveVideoGeometry\s*\}\s*from\s*["']\.\.\/core\/video-geometry["']/,
      );
    });

    it(`${file}: calls resolveVideoGeometry with its own callSite name ("${callSite}")`, () => {
      expect(src).toMatch(
        new RegExp(
          `resolveVideoGeometry\\(\\s*config\\s*,\\s*["']${callSite}["']\\s*\\)`,
        ),
      );
    });

    it(`${file}: does not define its own resolveWorldFromGeometry (the fork this review round closed)`, () => {
      expect(src).not.toMatch(/function resolveWorldFromGeometry/);
    });
  }
});

// -----------------------------------------------------------------------------------------
// (B) BEHAVIOUR — route's own geometry-consuming pure functions, fed by the shared decode.
// -----------------------------------------------------------------------------------------

describe("computeRouteReveal / computeRoute resolve territories from an injected NON-WORLD geometry (decoded via the SHARED resolveVideoGeometry)", () => {
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
  // Decoded through the shared resolveVideoGeometry, exactly as RouteReveal.tsx's own useMemo
  // now does — route only reads `.world` off the result; `.joinKey` is unused (see the "one
  // shared implementation, route reads only `world`" note in RouteReveal.tsx/RouteScrolly.tsx).
  const { world: injectedWorld } = resolveVideoGeometry(
    { geometry: injectedTopology },
    "route-reveal",
  );

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

describe("decoding the injected world Topology (via the SHARED resolveVideoGeometry) reproduces the same territories as the old static-import world.geojson path (world-path parity)", () => {
  const world = JSON.parse(readFileSync(WORLD_GEOJSON_PATH, "utf8")) as PolyFC;

  // The real route this skill already ships (assets/sample-data/route.json, the Yarlung
  // Tsangpo) crosses a small, known handful of South Asian countries. Narrowed to that
  // allow-list so building a Topology from real Natural Earth geometry stays fast in a unit
  // test — the two paths below still decode the SAME real ring coordinates for every territory
  // the route actually crosses, so the parity this proves is real, not narrowed away.
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

  it("old path (raw world.geojson feature array) and new path (topojson-decoded injected geometry, via the SHARED resolveVideoGeometry) resolve identical territories", () => {
    const oldPath = computeRouteReveal(routeConfig, nearby);
    const topology = topologize(nearby, "world");
    const { world: viaInjectedGeometry } = resolveVideoGeometry(
      { geometry: topology },
      "route-scrolly",
    );
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
