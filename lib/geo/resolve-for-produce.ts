// The geometry-resolution step (D5, D7), extracted from skills/map-native/scripts/produce.mjs
// so it is callable both from a produce.mjs (map-native and, later, scrolly — Task 4) and from a
// keyless unit test (Task 2) with no render and no filesystem writes. This is a behaviour-preserving
// move: the logic below is unchanged from produce.mjs apart from three bindings that had to follow
// the new call boundary — parsedConfig → input.config, mediaSize.width → input.renderWidthPx, and
// the assets/geo path → input.assetsGeoDir. Persisting the resolved config to disk stays the
// producer's job (produce.mjs writes outDir/config.json itself) — this module never touches the
// filesystem for output, only for reading the geometry source it resolves.
import { readFileSync, rmSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { subsetGeometry } from "./subset";
import { assertGeoCreditPresent, type GeographyLicenceInfo } from "./policy";
import { basemapKeyFor, resolveGeographyRef, type GeographyRef } from "./ref";

export type ResolveForProduceInput = {
  config: Record<string, unknown>; // parsed config, MUTATED in place
  assetsGeoDir: string; // absolute path to the skill's assets/geo
  renderWidthPx: number;
};

// The GeographyRef this block actually handles at runtime, widened with the two fields the
// moved logic reads off it that GeographyRef itself does not declare — `sourcePath` (see the
// comment on `sourcePath` below: "this task's own addition to the config shape ... a genuine,
// documented pipeline gap") and `licence` (read only by assertGeoCreditPresent's own error
// message). Both stay optional/undefined exactly as they always were at runtime — this is a
// type declaration for the existing gap, not a fix for it.
type ResolvedGeography = GeographyRef & {
  sourcePath?: string;
  licence?: string;
};

// The moved block's real config shape varies per map type (choropleth/cartogram/dot-density/
// route) and was always untyped JS before this move (produce.mjs). A local narrowing type —
// the same idiom already used elsewhere in this codebase for bridging an untyped-at-the-boundary
// object into typed code (e.g. lib/core/verbs/publish.ts, lib/host/drive.ts's `as Record<string,
// unknown>` casts) — declares only the fields this function actually reads or writes.
type LooseMapConfig = Record<string, unknown> & {
  geography?: ResolvedGeography;
  basemap?: string;
  geoCredit?: { name: string; url?: string };
  type?: string;
  values?: { id: unknown }[];
  rows?: Record<string, unknown>[];
  regionKey?: string;
  geometry?: unknown;
};

// The minimal shape the route branch reads off a parsed GeoJSON source file — just enough to
// scan every feature's join-key property (see the "route" branch below).
type RouteGeoJSONSource = {
  type: string;
  features: { properties?: Record<string, unknown> }[];
};

/** Resolves config.geography into config.geometry. Returns true when it wrote geometry,
 *  false when the config carries no geography to resolve. Never writes to disk. */
export async function resolveGeometryForProduce(
  input: ResolveForProduceInput,
): Promise<boolean> {
  // input.config's real shape varies per map type (choropleth/cartogram/dot-density/route) and
  // was always untyped JS before this move (produce.mjs) — one alias, narrowed to the fields
  // this block reads/writes (LooseMapConfig above), rather than scattering casts through logic
  // this task must not alter. `config` IS `input.config` (same object reference), so mutations
  // below still land on the caller's object.
  const config = input.config as LooseMapConfig;

  // Geometry resolution (D5, D7) — resolve the geometry DESCRIPTOR (which source, which
  // features are actually drawn) into actual bytes, and refuse a missing OSM credit. Runs
  // BEFORE the conformance gate and BEFORE any build step: nothing is built without a
  // resolved geometry, and (for a declared file) without its credit. ChoroplethMap.tsx /
  // CartogramMap.tsx / DotDensityMap.tsx / RouteMap.tsx all throw a loud, named
  // "config.geometry is required" today (Tasks 16/17 already removed their bundled `?raw`
  // GEOJSON_BY_BASEMAP fallback — see e.g. ChoroplethMap.tsx's own comment: "Real today for
  // every caller until Task 20 lands config.geometry injection") — this step is what makes
  // them resolvable again.
  //
  // DEVIATION from this task's own brief, found while implementing (documented in
  // task-20-report.md): the brief's D5 code sample gates this whole step on
  // `if (config.geography)` alone. In the REAL tree, `config.geography` is a GeographyRef
  // that is ALWAYS present for choropleth/cartogram/dot-density once assembled by
  // lib/loop/assemble/map-native.ts — for a SHIPPED basemap too (`origin: "shipped"`), not
  // only a declared one. Every one of this skill's own sample-data fixtures
  // (assets/sample-data/*.json, exercised by the live produce-single-format e2e suite) still
  // predates that and carries only the legacy `basemap: "world"` field, no `geography` at
  // all — so gating strictly on `config.geography` would leave every real fixture (and the
  // live e2e suite) throwing "config.geometry is required" both before AND after this
  // change. Resolved by falling back to `resolveGeographyRef(config.basemap)` — the EXACT
  // fallback ChoroplethMap.tsx's own render code already applies — whenever `config.geography`
  // is absent but `config.basemap` names a shipped registry entry.
  const geography: ResolvedGeography | undefined =
    config.geography ??
    (config.basemap ? resolveGeographyRef(config.basemap) : undefined);

  // WHICH TYPES JOIN GEOMETRY. The point family (symbol, locator, hex-grid) draws markers at
  // coordinates and reads no geometry at all, but it still carries `basemap: "world"` — so a
  // gate on the presence of `geography` alone entered this block for it and then assumed
  // `config.rows`, which the point family does not have. Listed as an allow-list of the types
  // that DO join, never as a deny-list of the ones that do not: a new point-family type must
  // be opted IN to resolution deliberately, not discovered by a crash.
  const JOINING_TYPES = new Set([
    "choropleth",
    "cartogram",
    "dot-density",
    "route",
  ]);
  const joins = JOINING_TYPES.has(String(config.type));
  if (!joins) return false;

  if (geography) {
    // D7's credit obligation applies ONLY to a DECLARED geometry (a shipped basemap —
    // Natural Earth `world.geojson`, US Census `us-states.geojson` — is public domain, no
    // credit owed). assertGeoCreditPresent's own contract treats a present first argument as
    // "this geometry needs a credit" (see its own comment: "no declared geometry (a shipped
    // basemap) — nothing to credit here"); passing `geography` through UNCONDITIONALLY
    // whenever it is present — as this task's own brief's D5 code sample literally does —
    // would fail-hard on every existing shipped-basemap map, none of which the assembler (or
    // any sample fixture) populates a `geoCredit` for today. Gated on `origin` instead.
    assertGeoCreditPresent(
      geography.origin === "declared"
        ? (geography as unknown as GeographyLicenceInfo)
        : undefined,
      config.geoCredit,
    );

    // The feature ids actually drawn (D5's own design call): recomputed here from the
    // config's own data (the assembler does not thread a dedicated featureIds field back
    // through ProductionBrief/GeoMatch — a deliberate smaller-change call this task's brief
    // documents) rather than a NEW field on the manifest schema.
    //
    // "route" is NOT one of the brief's two named shapes (choropleth/dot-density vs.
    // cartogram) — a genuine gap in the brief's own Design call, found while implementing:
    // RouteMap.tsx does not know in advance which territories the route crosses
    // (`computeRoute` works that out FROM the geometry, at render time), so there is no
    // pre-known per-row id list to filter down to. Route needs every feature the source
    // names — its "id list" is every id present in the source file (a query, not a filter);
    // the prune/simplify/encode wins of D5 still apply in full to the result, only the
    // per-feature filtering step is a no-op for this one type.
    let featureIds =
      config.type === "cartogram"
        ? config.values!.map((v) => String(v.id))
        : config.type === "route"
          ? null // resolved below, once sourcePath is known
          : config.rows!.map((r) => String(r[config.regionKey as string]));

    // WHERE to read the frozen source from: a declared file names its own frozen path
    // (`geography.sourcePath` — this task's own addition to the config shape, threaded by a
    // future assembler task per Task 10's freeze; confirmed by grep while implementing that
    // no code in this tree sets it yet, on any config, for any origin — a genuine, documented
    // pipeline gap this task does not close). A shipped basemap has no such field (the
    // assembler never sets it, and never will — it's not a per-run fact); its file is the
    // registry asset this skill already ships under assets/geo/<basemapKey>.geojson, the
    // exact asset geo-match.ts itself reads to measure join candidates
    // (skills/map-native/src/geo-match.ts:8-10).
    const sourcePath =
      geography.sourcePath ??
      (geography.origin === "shipped"
        ? join(input.assetsGeoDir, `${basemapKeyFor(geography)}.geojson`)
        : undefined);
    if (!sourcePath)
      throw new Error(
        `produce: config.geography names a declared geometry (level "${geography.level}") but ` +
          `carries no sourcePath — the assembler must thread the frozen input file's path onto ` +
          `config.geography before produce can resolve it`,
      );

    if (featureIds === null) {
      const sourceRaw = JSON.parse(
        readFileSync(sourcePath, "utf8"),
      ) as RouteGeoJSONSource;
      if (sourceRaw.type !== "FeatureCollection")
        throw new Error(
          `produce: route geometry source "${sourcePath}" is not a GeoJSON FeatureCollection ` +
            `(got type "${sourceRaw.type}") — the whole-source id scan a route needs only ` +
            `understands GeoJSON today`,
        );
      featureIds = sourceRaw.features.map((f) =>
        String(f.properties?.[geography.joinKey]),
      );
    }

    const geomTmpDir = mkdtempSync(join(tmpdir(), "map-native-geometry-"));
    try {
      const geomOutPath = join(geomTmpDir, "geometry.topojson");
      await subsetGeometry({
        sourcePath,
        outPath: geomOutPath,
        featureIds,
        idProperty: geography.joinKey,
        keepProperties: [geography.joinKey],
        renderWidthPx: input.renderWidthPx,
      });
      config.geometry = JSON.parse(readFileSync(geomOutPath, "utf8"));
    } finally {
      rmSync(geomTmpDir, { recursive: true, force: true });
    }

    delete geography.sourcePath; // produce-time-only — never reaches the browser
    config.geography = geography; // observable even when synthesized from `basemap`

    return true;
  }

  return false;
}
