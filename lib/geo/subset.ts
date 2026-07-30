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
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
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

export type SubsetInput = {
  sourcePath: string;
  outPath: string;
  featureIds: string[];
  idProperty: string;
  keepProperties: string[];
  renderWidthPx: number;
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
  // a SyntaxError inside mapshaper's expression evaluator.
  const filterExpr = `${idList}.includes(String(this.properties[${JSON.stringify(
    input.idProperty,
  )}]))`;
  const tmp = mkdtempSync(join(tmpdir(), "geo-subset-"));
  try {
    // Pass 1 — filter and prune, no simplification, to GeoJSON we can measure.
    const filtered = join(tmp, "filtered.geojson");
    mapshaper([
      input.sourcePath,
      "-filter",
      filterExpr,
      "-filter-fields",
      `fields=${input.keepProperties.join(",")}`,
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
          `are absent from ${input.sourcePath} on join key "${input.idProperty}" — ` +
          `first missing: ${missing.slice(0, 5).join(", ")}`,
      );
    const toleranceMeters = toleranceMetersFor(
      extentMetersFor(bboxOf(features.map((f) => f.geometry))),
      input.renderWidthPx,
    );
    // Pass 2 — simplify and encode. `keep-shapes` is what stops a small polygon (Luxembourg,
    // Malta, Singapore, every island state) from being annihilated into `geometry: null`.
    mapshaper([
      filtered,
      "-simplify",
      "visvalingam",
      `interval=${toleranceMeters}m`,
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
          `of existence at ${Math.round(toleranceMeters)} m/px — every consumer reads .type ` +
          `on these and will throw`,
      );
    return {
      bytes: statSync(input.outPath).size,
      featureCount: geometries.length,
    };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
