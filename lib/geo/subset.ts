// filter → measure → simplify → encode (D5). Every cut is a real bunx mapshaper invocation —
// no mock, per repo convention (real APIs, real failures). Tolerance is ALWAYS an absolute
// metre value derived from render width, never a percentage: -simplify 5% (a number that
// "sounds prudent") moves the Swiss border by 64px at 1200px width (spec D5, measured).
//
// The extent is MEASURED, not guessed. A placeholder constant shipped once and cost 62 of the
// world basemap's 241 features: tolerance is metres per pixel, so a placeholder LARGER than
// the real extent simplifies HARDER, which is the unsafe direction — the opposite of what the
// placeholder's own comment claimed.
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export function toleranceMetersFor(
  mapExtentMeters: number,
  renderWidthPx: number,
): number {
  return mapExtentMeters / renderWidthPx;
}

/** The larger of a lon/lat bbox's two sides, in metres. Equirectangular, which is ample for
 *  choosing a simplification threshold — this number picks a tolerance, it does not project a
 *  map. Longitude degrees are scaled by the cosine of the mid-latitude, which is what makes a
 *  Swiss extent read as ~350 km rather than ~500 km. */
export function extentMetersFor(bbox: {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}): number {
  const M_PER_DEG_LAT = 111_320;
  const midLat = ((bbox.minLat + bbox.maxLat) / 2) * (Math.PI / 180);
  const height = (bbox.maxLat - bbox.minLat) * M_PER_DEG_LAT;
  const width =
    (bbox.maxLon - bbox.minLon) *
    M_PER_DEG_LAT *
    Math.max(Math.cos(midLat), 0.01);
  return Math.max(width, height);
}

/** Walks GEOMETRY ONLY and returns the bbox of every coordinate in it. Geometry only, never
 *  the whole feature: a properties table can legitimately hold an array of two numbers, and a
 *  naive whole-object walk would read it as a coordinate and blow the extent out. Throws when
 *  the input holds no coordinate at all — an empty bbox would silently produce a nonsense
 *  tolerance, and "the filter matched nothing" is the far more useful thing to say. */
export function bboxOf(geometries: unknown[]): {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
} {
  let minLon = Infinity,
    minLat = Infinity,
    maxLon = -Infinity,
    maxLat = -Infinity;
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      if (typeof node[0] === "number" && typeof node[1] === "number") {
        minLon = Math.min(minLon, node[0]);
        maxLon = Math.max(maxLon, node[0]);
        minLat = Math.min(minLat, node[1]);
        maxLat = Math.max(maxLat, node[1]);
        return;
      }
      for (const child of node) walk(child);
      return;
    }
    if (node && typeof node === "object") {
      for (const v of Object.values(node as Record<string, unknown>)) walk(v);
    }
  };
  for (const g of geometries) walk(g);
  if (!Number.isFinite(minLon))
    throw new Error(
      "bboxOf: the input holds no coordinate — nothing was retained",
    );
  return { minLon, minLat, maxLon, maxLat };
}

// The property natural-earth-admin-1's own asset carries the feature's country code under
// (verified by direct inspection of skills/map-native/assets/geo/natural-earth-admin-1.topojson
// — Natural Earth's admin-1 layer names it "adm0_a3", not "iso_a2" or the world basemap's own
// "iso_a3"). This is a property of the SET, not of any one join — fixed regardless of which
// name family (name, name_fr, iso_3166_2...) actually won the join key.
const ADM1_COUNTRY_PROPERTY = "adm0_a3";

export type SubsetInput = {
  sourcePath: string;
  outPath: string;
  featureIds: string[];
  idProperty: string;
  keepProperties: string[];
  renderWidthPx: number;
  // The ISO-A3 country to additionally restrict the join to (Task 15) — set only for an
  // admin-1 join (GeographyRef.scope), absent for a global set (world, us-states). Without it,
  // a name shared across a border (e.g. "Jura", CH/FR) joins to every country's feature of that
  // name, not just the one the data actually meant.
  scope?: string;
};

function mapshaper(args: string[]): void {
  const r = spawnSync("bunx", ["mapshaper", ...args], { encoding: "utf8" });
  if (r.status !== 0)
    throw new Error(
      `subsetGeometry: bunx mapshaper failed (exit ${r.status}): ${r.stderr}`,
    );
}

export async function subsetGeometry(
  input: SubsetInput,
): Promise<{ bytes: number; featureCount: number }> {
  const idList = JSON.stringify(input.featureIds);
  // The property is addressed, never interpolated as a bare identifier: a join key is
  // ordinary shapefile prose ("code insee", "NUTS-2 code") and a bare identifier makes those
  // a SyntaxError inside mapshaper's expression evaluator. The country column (when `scope` is
  // set) is addressed the exact same bracketed way, for the exact same reason — a country
  // column with a space in its name would be no safer than a join key with one.
  const idFilterExpr = `${idList}.includes(String(this.properties[${JSON.stringify(
    input.idProperty,
  )}]))`;
  const filterExpr = input.scope
    ? `${idFilterExpr} && String(this.properties[${JSON.stringify(
        ADM1_COUNTRY_PROPERTY,
      )}]) === ${JSON.stringify(input.scope)}`
    : idFilterExpr;
  const tmp = mkdtempSync(join(tmpdir(), "geo-subset-"));
  try {
    // Pass 1 — filter, no simplification, to GeoJSON we can measure. Field pruning happens in
    // JS below, NOT via `-filter-fields` here: mapshaper's `-filter-fields` throws when a named
    // field is absent from the source table, and `keepProperties` may now name `name` (or a
    // config's `labelField`) that a given source lacks — this repo ships two geometry assets,
    // and only one guarantee holds across both: the join key itself is always present.
    const filtered = join(tmp, "filtered.geojson");
    mapshaper([
      input.sourcePath,
      "-filter",
      filterExpr,
      "-o",
      filtered,
      "format=geojson",
      "force",
    ]);
    const parsed = JSON.parse(readFileSync(filtered, "utf8")) as {
      features?: { properties?: Record<string, unknown>; geometry?: unknown }[];
    };
    const features = parsed.features ?? [];
    // POST-CONDITION 1 — every id the data asked for came back. A silently-dropped region the
    // data has a value for is a hole in the map; it must be a named refusal here, not a blank
    // area the journalist has to notice.
    const got = new Set(
      features.map((f) => String(f.properties?.[input.idProperty])),
    );
    const missing = input.featureIds.filter((id) => !got.has(id));
    if (missing.length)
      throw new Error(
        `subsetGeometry: ${missing.length} of ${input.featureIds.length} requested regions ` +
          `are absent from ${input.sourcePath} on join key "${input.idProperty}"` +
          (input.scope
            ? ` after scoping to "${input.scope}" — a "missing" region here may be a real ` +
              `feature that belongs to a DIFFERENT country and was filtered out BY that scope ` +
              `(not a join-key mismatch); check whether it crosses the border before assuming ` +
              `the join key is wrong`
            : "") +
          ` — first missing: ${missing.slice(0, 5).join(", ")}`,
      );
    // POST-CONDITION 3 (Task 15) — no single requested id may come back with MORE features
    // than it was asked for. A silently-EXTRA region is the mirror image of POST-CONDITION 1's
    // silently-missing one, and until this task nothing checked for it: a join key value shared
    // across a border (any world-wide admin-1 name — "Jura" CH/FR is the one that surfaced, it
    // will not be the only one) returns every feature with that value, not just the one the
    // data meant, and a count alone (POST-CONDITION 1 above) still passes on a superset. This is
    // the GENERAL guard — it is not specific to admin-1 or to `scope` below, which only fixes
    // the one collision this task found; this is what catches the next one.
    //
    // Counted PER ID (a multiset), not as a blunt total-vs-distinct comparison: the "route" type
    // (resolve-for-produce.ts) asks for EVERY id in the source file, duplicates and all — a
    // country legitimately split across several disjoint Features that all share one iso_a3
    // code requests that same id more than once and is meant to retain every one of them
    // (confirmed live: world.geojson resolves 241 features off 236 distinct iso_a3 values, a
    // real repeated-id source, not a collision). What must never happen is a single id — even
    // one requested only once, like `featureIds: ["Jura"]` — coming back with more matches than
    // it was asked for; that per-id shape is exactly the Jura (CH/FR) collision this task found.
    const requestedCounts = new Map<string, number>();
    for (const id of input.featureIds)
      requestedCounts.set(id, (requestedCounts.get(id) ?? 0) + 1);
    const gotCounts = new Map<string, number>();
    for (const f of features) {
      const id = String(f.properties?.[input.idProperty]);
      gotCounts.set(id, (gotCounts.get(id) ?? 0) + 1);
    }
    const oversupplied = [...gotCounts.entries()].filter(
      ([id, count]) => count > (requestedCounts.get(id) ?? 0),
    );
    if (oversupplied.length)
      throw new Error(
        `subsetGeometry: on join key "${input.idProperty}" in ${input.sourcePath}, ` +
          `${oversupplied.length} id(s) matched more features than requested — a join-key ` +
          `value is colliding with another region's (e.g. an admin-1 name shared across a ` +
          `border); scope the request to a single country or use a less ambiguous join key. ` +
          `First: "${oversupplied[0]![0]}" wanted ${requestedCounts.get(oversupplied[0]![0]) ?? 0}, got ${oversupplied[0]![1]}`,
      );
    // Prune properties to the intersection of `keepProperties` and the fields actually present
    // on the filtered features — never pass a field mapshaper doesn't have, and never assume a
    // requested field (e.g. a declared file lacking `name`) exists just because it was asked
    // for. Union across all features, not just the first: a source's schema is not guaranteed
    // uniform per-feature.
    const presentFields = new Set(
      features.flatMap((f) => Object.keys(f.properties ?? {})),
    );
    const fieldsToKeep = new Set(
      input.keepProperties.filter((f) => presentFields.has(f)),
    );
    for (const f of features) {
      if (!f.properties) continue;
      for (const key of Object.keys(f.properties))
        if (!fieldsToKeep.has(key)) delete f.properties[key];
    }
    writeFileSync(filtered, JSON.stringify(parsed));
    const bbox = bboxOf(features.map((f) => f.geometry));
    // mapshaper only accepts a metre-denominated `-simplify interval=<N>m` for a dataset it can
    // read as lat-long, and it refuses ANY file whose coordinates fall outside +/-180 — which
    // the shipped us-states asset does, deliberately: Alaska's Aleutians are encoded past the
    // antimeridian (-188.9) so the state stays contiguous instead of being split across the map
    // ("[simplify] Unable to convert meters to unknown coordinates" on the metre path
    // otherwise). For that source, express the tolerance in the source's own units (degrees)
    // instead, derived straight from the bbox already measured above — no unit conversion.
    //
    // DECISION (task-14-brief.md's own ask): NOT applied to every source, only to one whose
    // bbox mapshaper would reject — narrower than the brief's stated preference ("prefer
    // replacing it everywhere ... because one code path cannot drift against another"), and
    // that preference was explicitly conditional on the rendered results matching. They did
    // not: re-running the world basemap's own tests under the degrees formula moved real
    // numbers, not just held a floor. `subset.test.ts`'s Norway vertex-count floor (800) still
    // PASSED under the degrees path (1985 vertices), but the actual count moved from the
    // metre-path's 1238 to 1985 — a +60% change from a formula that omits
    // extentMetersFor's cos(mid-latitude) longitude scaling (see task-14-report.md, Step 5, for
    // the measured before/after). A floor holding is not "matched"; the two formulas are not
    // equivalent for a normal in-range source, only usable as a substitute for one mapshaper
    // will not accept at all. So: metres stays the path for every source mapshaper CAN read as
    // lat-long (zero drift, unchanged since before this task); degrees is used only when the
    // bbox itself is already outside the range mapshaper accepts.
    //
    // bboxOf's own "outside +/-180" check here is a plain range comparison, not a call into
    // lib/geo/crs.ts's coordinateRangeVerdict: that guard is scoped to a journalist's DECLARED
    // geography input (lib/loop/init.ts, slot "geography"), not to the shipped basemap assets
    // this module reads — wrapping us-states' Aleutians to satisfy it would split Alaska across
    // the map, exactly what the -188.9 encoding exists to prevent.
    const outOfRange =
      bbox.minLon < -180 ||
      bbox.maxLon > 180 ||
      bbox.minLat < -90 ||
      bbox.maxLat > 90;
    const intervalArg = outOfRange
      ? `interval=${Math.max(bbox.maxLon - bbox.minLon, bbox.maxLat - bbox.minLat) / input.renderWidthPx}`
      : `interval=${toleranceMetersFor(extentMetersFor(bbox), input.renderWidthPx)}m`;
    // Pass 2 — simplify and encode. `keep-shapes` is what stops a small polygon (Luxembourg,
    // Malta, Singapore, every island state) from being annihilated into `geometry: null`.
    mapshaper([
      filtered,
      "-simplify",
      "visvalingam",
      intervalArg,
      "keep-shapes",
      "-o",
      input.outPath,
      "format=topojson",
      "quantization=1e5",
      "force",
    ]);
    // POST-CONDITION 2 — nothing was annihilated. Belt as well as braces: keep-shapes is the
    // fix, this is the guard that tells us when it stops being enough.
    const topo = JSON.parse(readFileSync(input.outPath, "utf8")) as {
      objects: Record<string, { geometries: { type?: string | null }[] }>;
    };
    const geometries = Object.values(topo.objects).flatMap((o) => o.geometries);
    // mapshaper writes an annihilated shape as an explicit `"type":null`, not an omitted key —
    // JSON.parse yields `null`, never `undefined` — so both are checked for.
    const nulls = geometries.filter((g) => g.type == null);
    if (nulls.length)
      throw new Error(
        `subsetGeometry: ${nulls.length} of ${geometries.length} shapes were simplified out ` +
          `of existence at ${intervalArg} — every consumer reads .type on these and will throw`,
      );
    return {
      bytes: statSync(input.outPath).size,
      featureCount: geometries.length,
    };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
