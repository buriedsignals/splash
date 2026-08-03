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
import { ADM1_FEATURE_ID_PROPERTY } from "./index-build";
import {
  basemapKeyFor,
  fileExtensionFor,
  resolveGeographyRef,
  type GeographyRef,
} from "./ref";

export type ResolveForProduceInput = {
  config: Record<string, unknown>; // parsed config, MUTATED in place
  assetsGeoDir: string; // absolute path to the skill's assets/geo
  renderWidthPx: number;
  // The single VisualFormat this call is producing (map-native's and scrolly's own CLI
  // argument, threaded through — never a second source of truth). Optional: every caller
  // written before Task 7 has no reason to know about the video refusal below, and absent
  // means "not a video", the behaviour every existing caller already had.
  format?: string;
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
  // The RESOLVED ids an ADM1 join (matchAdm1Index) bound each raw column value to — threaded
  // straight through from GeoMatch.featureIdsByValue (lib/loop/assemble/map-native.ts),
  // never recomputed here. See production-brief.ts's doc comment on that field and this
  // file's own use of it below. Absent for a shipped world/us-states join (nothing to
  // disagree with there) and for every config assembled before this field existed.
  featureIdsByValue?: Record<string, { featureId: string; country: string }[]>;
};

// An admin-1 join's RESOLVED id for one raw column value — never the raw value itself. See
// production-brief.ts's GeoMatch.featureIdsByValue doc comment for why this exists: matching
// tolerates spelling variants via a NORMALIZED index ("Geneve" files under the same key as
// "Genève"), but the shipped geometry file's own properties are not normalized, so comparing
// a raw CSV value against them directly (the bug this closes) finds nothing for "Geneve" even
// though matching already resolved it.
//
// Filters the resolved hits to `geography.scope` exactly as `subsetGeometry`'s own scope
// check would (lib/geo/subset.ts's ADM1_COUNTRY_PROPERTY filter): a name shared across a
// border (the "Jura" CH/FR collision) must resolve to the ONE country this join is scoped to,
// never to both — passing both through would make the sibling country's id look "requested
// but absent" once subsetGeometry's own scope filter drops it, a false refusal for a region
// nobody asked for.
function resolveAdm1FeatureIds(
  rawValue: string,
  regionKeyLabel: string,
  featureIdsByValue: Record<string, { featureId: string; country: string }[]>,
  geography: ResolvedGeography,
): string[] {
  const value = rawValue.trim();
  const hits = featureIdsByValue[value];
  if (!hits || hits.length === 0) {
    // WHAT THE FILE OFFERS, bounded: not the full 4596-feature ADM1 index (this function
    // never loads it — only the earlier match step did, and did not persist it), but the
    // OTHER values THIS SAME COLUMN already resolved (`featureIdsByValue`'s own keys) — a
    // journalist comparing spellings needs exactly this list, not the whole gazetteer, and it
    // is naturally bounded by how many distinct values the column actually had (a CSV column
    // realistically has tens of regions, never thousands). Capped at 5 anyway, mirroring
    // subsetGeometry's own `missing.slice(0, 5)` convention, for a column that somehow did.
    const resolvedValues = Object.keys(featureIdsByValue);
    const sample = resolvedValues.slice(0, 5);
    const offer = resolvedValues.length
      ? ` — this file recognised ${resolvedValues.length} other value(s) in "${regionKeyLabel}": ${sample.join(", ")}${resolvedValues.length > sample.length ? `, +${resolvedValues.length - sample.length} more` : ""}`
      : " — no other value in this column resolved either";
    throw new Error(
      `produce: "${value}" (column "${regionKeyLabel}") was never resolved against ` +
        `${geography.set}${geography.scope ? ` scoped to "${geography.scope}"` : ""} — the ` +
        `earlier geography match never bound this value to a region in the file, so produce ` +
        `cannot either; check its spelling against the source data${offer}`,
    );
  }
  const scoped = geography.scope
    ? hits.filter((h) => h.country === geography.scope)
    : hits;
  if (scoped.length === 0) {
    // WHAT THE FILE OFFERS, for this refusal: the value's OWN resolved featureId(s) — it is a
    // real region in the file, just not in the scoped country — plus the same bounded sample
    // of this column's other in-scope values as refusal 1 above, so a journalist can compare
    // "what I typed" against "what this join actually draws".
    const ownFeatureIds = hits.map((h) => `${h.featureId} (${h.country})`);
    const resolvedValues = Object.keys(featureIdsByValue).filter(
      (v) => v !== value,
    );
    const sample = resolvedValues.slice(0, 5);
    const offer = sample.length
      ? ` — other values already resolved to "${geography.scope}" in this column: ${sample.join(", ")}${resolvedValues.length > sample.length ? `, +${resolvedValues.length - sample.length} more` : ""}`
      : "";
    throw new Error(
      `produce: "${value}" (column "${regionKeyLabel}") matched ${ownFeatureIds.join(", ")} ` +
        `in the offline index, but this join is scoped to "${geography.scope}" — none of its ` +
        `matches belong to that country, so drawing any of them would colour the wrong ` +
        `region${offer}`,
    );
  }
  return scoped.map((h) => h.featureId);
}

// A shipped world/us-states join has its OWN normalization gap, found by review after this
// file's admin-1 fix shipped: `matchShippedBasemaps` (skills/map-native/src/geo-match.ts)
// matches CASE-INSENSITIVELY (`v.toUpperCase()` against the file's own keys, pre-uppercased by
// `keysOf`) and reports "matched" — but this file used to pass the RAW, un-uppercased value
// straight to `subsetGeometry`'s byte-for-byte compare, which found nothing for a lowercase
// CSV ("ny" against the real file's "NY") and threw the identical "regions absent from the
// file" contradiction the admin-1 fix closes, on a completely different path. Verified live: 0
// of world.geojson's `iso_a3` and us-states.geojson's `postal` values contain a lowercase
// character (checked directly against both shipped assets) — the file's own convention is
// ALWAYS uppercase, so uppercasing the query (mirroring matchShippedBasemaps's own rule,
// applied to the FILE side already) closes this without touching subsetGeometry's generic,
// byte-for-byte contract at all. Trimmed too, for the same reason matchShippedBasemaps trims
// before comparing.
//
// ONLY for a SHIPPED join — review round 2's second finding: this used to apply to ANY
// non-admin-1 geography, including a DECLARED one (a journalist's own uploaded file). A
// declared file's casing/spelling is the journalist's, never ours to assume or rewrite — the
// caller below only invokes this when `geography.origin === "shipped"`.
function normalizeShippedJoinValue(raw: string): string {
  return raw.trim().toUpperCase();
}

// The property-bag shape this file reads back OFF the geometry it just produced — TopoJSON's
// per-geometry `properties` survive arc-encoding untouched, so no topojson-client decode is
// needed to read them (only the coordinate arcs are compressed).
type TopoJsonLike = {
  objects: Record<
    string,
    { geometries: { properties?: Record<string, unknown> }[] }
  >;
};

// REVIEW ROUND 2's real finding: normalizing the SUBSET QUERY closed the produce-time crash,
// but every RENDER-TIME join was still comparing the UNTOUCHED raw value against the file's
// real properties — `ChoroplethMap.tsx` → `computeChoropleth` (`choropleth-geo.ts`),
// `computeCartogram`'s own `valueByKey`/`matched` join (`cartogram-geo.ts`, on TOP of its
// internal `computeChoropleth` reuse — two joins, not one), and `computeDotDensity`
// (`dot-density-geo.ts`) all key `String(row[regionKey])` / `String(v.id)` against
// `String(f.properties[joinKey])` directly, with no normalization of their own. Patching each
// of those (three files, four join sites) would be "a normalization applied at N of N+1
// sites" — the review's own words for why that is the same bug again, not a fix. Consumer list
// verified exhaustive by grepping every read of `regionKey`/`config.rows`/`config.values`/`.id`
// across skills/map-native/src (see this task's report for the full list and how each was
// ruled in or out) — `cartogram-story.ts`/`dot-density-story.ts`/every `*Story.tsx` consume
// the ALREADY-JOINED `layout` these compute functions return, never a second raw join; the
// hover tooltip (`ChoroplethMap.tsx`) reads `f.state?.label ?? f.properties?.name`, never the
// raw regionKey value, so rewriting it changes no reader-visible text.
//
// The fix that covers every one of those consumers AT ONCE, present and future: REWRITE
// config.rows/config.values THEMSELVES, once, here, to the canonical joinKey literal read
// straight off the geometry this function just produced. There is no second copy of this data
// anywhere downstream — every consumer reads config.rows/config.values from the SAME config
// object (or its serialized config.json), so a single rewrite point is structurally complete,
// not another per-call-site patch.
//
// Builds `requestedId → canonical joinKey literal` from the DELIVERED geometry (never
// re-derived): `idProperty` is what `subsetGeometry` just filtered on (so every requested id
// among these IS present, by that function's own post-condition), `joinKey` is what a render
// join actually compares against.
function canonicalJoinValuesFrom(
  geometry: TopoJsonLike,
  idProperty: string,
  joinKey: string,
): Map<string, string> {
  const layerKey = Object.keys(geometry.objects)[0];
  const out = new Map<string, string>();
  if (!layerKey) return out;
  for (const g of geometry.objects[layerKey]!.geometries) {
    const id = g.properties?.[idProperty];
    const joinVal = g.properties?.[joinKey];
    if (
      id !== undefined &&
      id !== null &&
      joinVal !== undefined &&
      joinVal !== null
    )
      out.set(String(id), String(joinVal));
  }
  return out;
}

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
  // `config.type` defaults to "choropleth" when absent — the same convention produce.mjs's
  // own conformance logging and source-manifest.ts's `type()` already apply (every shipped
  // sample fixture, e.g. assets/sample-data/choropleth.json, carries no `type` field at all
  // and relies on this default). `String(config.type)` alone turned an absent type into the
  // literal string "undefined", which is never in JOINING_TYPES — silently skipping geometry
  // resolution for the default-typed choropleth case and leaving the renderer to throw
  // "config.geometry is required" at runtime.
  const joins = JOINING_TYPES.has(String(config.type ?? "choropleth"));
  if (!joins) return false;

  if (geography) {
    // Tasks 7-9/13 moved every video composition (ChoroplethStory/Reveal,
    // CartogramStory/Reveal, DotDensityStory/Reveal, RouteReveal/Scrolly, and the scrolly
    // siblings) off the bundled world.geojson/hardcoded "iso_a3" and onto the shared
    // resolveVideoGeometry (skills/map-native/src/core/video-geometry.ts), which reads
    // config.geometry (injected below) and its own config.geography.joinKey — so a SHIPPED
    // non-world geography (us-states, natural-earth-admin-1 — a Swiss-canton choropleth, e.g.)
    // now renders the SAME real subset as static/interactive/scrolly, not an empty world map.
    // The refusal that used to stand in for this (a "shipped basemap that is not world" branch)
    // is gone — render-verified (Task 10, task-10-report.md): a Swiss-canton choropleth video
    // renders the real cantons, coloured against the legend, camera-toured beat by beat.
    //
    // A DECLARED geometry stays refused for video. Unlike the shipped case above, no production
    // code threads `geography.sourcePath` for a declared geography (confirmed by grep while
    // implementing this task — unchanged since Task 9's own finding at commit fba11075): no
    // assembler task wires a journalist-uploaded file through to this point yet, so a declared
    // geometry always fails on "carries no sourcePath" below regardless of format — but naming
    // it here, for video specifically, says the honest thing ("not built or verified yet") to a
    // future caller that DOES start setting it, rather than the generic sourcePath error, which
    // would read as a config bug instead of an unbuilt path.
    if (input.format === "video" && geography.origin === "declared")
      throw new Error(
        `produce: a declared geography ("${geography.set}") cannot be rendered as video yet — ` +
          `no assembler threads its frozen source file through to produce (config.geography.sourcePath ` +
          `is unset for every declared geography in this tree), so this path has never been built or ` +
          `verified. Choose static, interactive or scrolly for this geography`,
      );

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

    // WHICH PROPERTY the geometry filter matches on. An admin-1 join (matchAdm1Index, D10.2)
    // resolves to a canonical featureId (`config.featureIdsByValue`, threaded from GeoMatch —
    // see production-brief.ts's doc comment) rather than a value in the joinKey NAME family,
    // so it filters on ADM1_FEATURE_ID_PROPERTY ("adm1_code") instead of `geography.joinKey`.
    // A shipped world/us-states join keeps `geography.joinKey` as its idProperty — that part
    // is genuinely unchanged, the file's own iso_a3/postal property names — but it is NOT
    // otherwise untouched: see `normalizeShippedJoinValue` below for the case/whitespace gap
    // this same review round found and closed on that path too.
    const isAdm1Join = basemapKeyFor(geography) === "natural-earth-admin-1";
    // FAIL LOUD, never fall back to the raw-value path silently: re-deriving raw ids here
    // instead of refusing would silently reproduce the exact mismatch this whole mechanism
    // exists to prevent. This is an UNCAUGHT throw (neither map-native's nor scrolly's
    // producer wraps this call — see skills/map-native/scripts/produce.mjs's own top-level
    // `await resolveGeometryForProduce(...)`), which is only an acceptable answer for a
    // genuine PROGRAMMER error: a config assembled by code that forgot to thread
    // `geo.featureIdsByValue` onto an admin-1 config it built fresh, today. It is NOT an
    // acceptable answer for a JOURNALIST-facing stale manifest — a v5-vintage run whose
    // admin-1 match predates this field entirely — and that case never reaches this line: the
    // schema version bump (v5→v6, lib/loop/manifest.ts) plus lib/loop/migrate.ts's
    // migrateV5toV6 drop that stale match on the way in (before produce ever sees the config),
    // so it surfaces as the ordinary, catchable "needs orient again" next-action instead of a
    // crash. (Route can never be admin-1 — assemblePointFamily always resolves it against
    // "world" — so this can never fire for it; excluded from the condition anyway,
    // belt-and-braces, since route's own id list is resolved from the source file below, not
    // from `config.rows`/`config.values` at all.)
    if (isAdm1Join && config.type !== "route" && !config.featureIdsByValue)
      throw new Error(
        `produce: an admin-1 geography ("${geography.set}"` +
          `${geography.scope ? ` ${geography.scope}` : ""}) was matched before this run ` +
          `started threading resolved region ids through to produce ` +
          `(config.featureIdsByValue is unset) — re-run the geography match (orient) for ` +
          `this element rather than subsetting on raw column spelling, which is exactly the ` +
          `mismatch this field exists to prevent`,
      );
    const idProperty = isAdm1Join
      ? ADM1_FEATURE_ID_PROPERTY
      : geography.joinKey;

    // A non-admin-1 value's own id, for BOTH the subset query below and the row/value
    // canonicalization after the geometry is produced (see canonicalJoinValuesFrom's own
    // comment). Normalizes ONLY for a SHIPPED join — review round 2's second finding: this
    // used to apply unconditionally to every non-admin-1 geography, which silently included a
    // DECLARED one (a journalist's own uploaded file, whose casing/spelling is theirs, never
    // ours to assume). A declared join's value passes through completely unchanged, exactly as
    // it did before either fix in this file existed.
    const shippedJoinId = (raw: string): string =>
      geography.origin === "shipped" ? normalizeShippedJoinValue(raw) : raw;

    // The feature ids actually drawn (D5's own design call), captured ALONGSIDE the per-row/
    // per-value REQUESTED id (rowRequestedIds/valueRequestedIds below — the single id, first of
    // any ambiguous set, this row/value asked for) so the canonicalization pass after the
    // geometry is produced can look each one up without re-deriving it. An admin-1 join
    // resolves each raw value through `resolveAdm1FeatureIds` instead of using it directly (see
    // that function's own doc comment). A non-admin-1 join normalizes each raw value via
    // `shippedJoinId` above — this is NOT byte-for-byte the pre-fix behaviour for a SHIPPED
    // join: a lowercase/whitespace-padded CSV value used to be passed straight through and
    // silently disagree with `subsetGeometry`'s byte-for-byte compare, the same "recognised,
    // then absent" contradiction the admin-1 fix closes, just on this path instead. A DECLARED
    // join is untouched, byte-for-byte, on purpose.
    //
    // "route" is NOT one of the brief's two named shapes (choropleth/dot-density vs.
    // cartogram) — a genuine gap in the brief's own Design call, found while implementing:
    // RouteMap.tsx does not know in advance which territories the route crosses
    // (`computeRoute` works that out FROM the geometry, at render time), so there is no
    // pre-known per-row id list to filter down to. Route needs every feature the source
    // names — its "id list" is every id present in the source file (a query, not a filter);
    // the prune/simplify/encode wins of D5 still apply in full to the result, only the
    // per-feature filtering step is a no-op for this one type. Route's own id list (below,
    // once sourcePath is known) is scanned straight off the SOURCE FILE, never off a
    // journalist-supplied value, so it was never exposed to this case/whitespace gap either.
    const rowRequestedIds: (string | undefined)[] = [];
    const valueRequestedIds: (string | undefined)[] = [];
    let featureIds =
      config.type === "cartogram"
        ? config.values!.flatMap((v) => {
            const raw = String(v.id);
            const ids = isAdm1Join
              ? resolveAdm1FeatureIds(
                  raw,
                  "values[].id",
                  config.featureIdsByValue!,
                  geography,
                )
              : [shippedJoinId(raw)];
            valueRequestedIds.push(ids[0]);
            return ids;
          })
        : config.type === "route"
          ? null // resolved below, once sourcePath is known
          : config.rows!.flatMap((r) => {
              const raw = String(r[config.regionKey as string]);
              const ids = isAdm1Join
                ? resolveAdm1FeatureIds(
                    raw,
                    config.regionKey as string,
                    config.featureIdsByValue!,
                    geography,
                  )
                : [shippedJoinId(raw)];
              rowRequestedIds.push(ids[0]);
              return ids;
            });

    // WHERE to read the frozen source from: a declared file names its own frozen path
    // (`geography.sourcePath` — this task's own addition to the config shape, threaded by a
    // future assembler task per Task 10's freeze; confirmed by grep while implementing that
    // no code in this tree sets it yet, on any config, for any origin — a genuine, documented
    // pipeline gap this task does not close). A shipped basemap has no such field (the
    // assembler never sets it, and never will — it's not a per-run fact); its file is the
    // registry asset this skill already ships under assets/geo/<basemapKey>.<fileExtension> —
    // the extension comes from the registry (fileExtensionFor), never guessed: a hardcoded
    // ".geojson" here is exactly what produced a raw mapshaper ENOENT against the real ADM1
    // asset, which ships as topojson (Task 8, C6).
    const sourcePath =
      geography.sourcePath ??
      (geography.origin === "shipped"
        ? join(
            input.assetsGeoDir,
            `${basemapKeyFor(geography)}.${fileExtensionFor(geography)}`,
          )
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
        idProperty,
        // The join key alone is not enough: seven consumers read `properties.name` for the
        // label a reader actually sees (hover popup, video callout, cartogram cell, route
        // territory). Both of this suite's fixtures happened to join ON `name`, which is why
        // pruning to the join key alone looked harmless. `labelField` joins the list when the
        // config names one. `idProperty` joins it too when it differs from `joinKey` (the
        // admin-1 case: idProperty is "adm1_code", joinKey is "name"/"name_fr"/...) — the
        // canonicalization pass below reads it back off the delivered geometry to rewrite
        // config.rows/config.values to the file's own joinKey literal, and strips it again
        // right after, so the SHIPPED property surface (what a bundle actually receives) ends
        // up unchanged from before either fix in this file existed.
        keepProperties: [
          ...new Set(
            [
              geography.joinKey,
              "name",
              typeof input.config.labelField === "string"
                ? input.config.labelField
                : undefined,
              idProperty !== geography.joinKey ? idProperty : undefined,
            ].filter((k): k is string => Boolean(k)),
          ),
        ],
        renderWidthPx: input.renderWidthPx,
        // Task 15: an admin-1 join (matchAdm1Index) carries the country it resolved to on
        // `geography.scope` — threaded straight through so subsetGeometry restricts the join to
        // that one country and a name shared across a border (e.g. "Jura", CH/FR) does not also
        // colour the neighbour. Absent for every non-admin-1 geography (world, us-states,
        // declared), exactly as `scope` itself is.
        scope: geography.scope,
      });
      config.geometry = JSON.parse(readFileSync(geomOutPath, "utf8"));
    } finally {
      rmSync(geomTmpDir, { recursive: true, force: true });
    }

    // REWRITE config.rows/config.values to the geometry's own canonical joinKey literal — see
    // canonicalJoinValuesFrom's own comment for why this is the single fix point for every
    // render-time join (ChoroplethMap.tsx/computeChoropleth, computeCartogram's two joins,
    // computeDotDensity), not a per-consumer patch. ONLY for a SHIPPED join (admin-1 or
    // world/us-states) — a DECLARED geometry is the journalist's own file, and review round
    // 2's second finding is exactly this: its casing/spelling is theirs, never ours to
    // normalize or rewrite. Route is excluded structurally (no config.rows/config.values to
    // rewrite — it has config.route, raw coordinates, untouched).
    if (geography.origin === "shipped" && config.type !== "route") {
      const canonical = canonicalJoinValuesFrom(
        config.geometry as TopoJsonLike,
        idProperty,
        geography.joinKey,
      );
      if (config.type === "cartogram") {
        config.values!.forEach((v, i) => {
          const canon = valueRequestedIds[i]
            ? canonical.get(valueRequestedIds[i]!)
            : undefined;
          if (canon !== undefined) v.id = canon;
        });
      } else {
        config.rows!.forEach((r, i) => {
          const canon = rowRequestedIds[i]
            ? canonical.get(rowRequestedIds[i]!)
            : undefined;
          if (canon !== undefined) r[config.regionKey as string] = canon;
        });
      }
      // idProperty was added to keepProperties above ONLY so canonicalJoinValuesFrom could
      // read it back — strip it again so the shipped property surface is exactly what it was
      // before either fix in this file existed (joinKey/name/labelField only).
      if (idProperty !== geography.joinKey) {
        for (const layer of Object.values(
          (config.geometry as TopoJsonLike).objects,
        ))
          for (const g of layer.geometries)
            if (g.properties) delete g.properties[idProperty];
      }
    }

    delete geography.sourcePath; // produce-time-only — never reaches the browser
    config.geography = geography; // observable even when synthesized from `basemap`
    delete config.featureIdsByValue; // produce-time-only — same discipline as sourcePath above

    return true;
  }

  return false;
}
