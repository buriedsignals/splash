import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { GeoMatch } from "../../../lib/core/production-brief";
import { BASEMAPS, type BasemapMeta } from "./basemaps";

const assetsDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../assets/geo",
);

// The join-key values a basemap actually contains, read once per (dir, basemap) pair.
// world.geojson is 4 MB and orient runs once per run, so the read is amortised — but a second
// call must not pay it. A missing or corrupt asset caches as `undefined` too: matchGeography
// never throws (I1), so a basemap this process cannot read is one this data cannot be matched
// against — not a reason to retry the same failing read on every call in the same process.
const keyCache = new Map<string, Map<string, Set<string> | undefined>>();

function keysOf(
  dir: string,
  basemap: string,
  joinKey: string,
): Set<string> | undefined {
  let perDir = keyCache.get(dir);
  if (!perDir) {
    perDir = new Map();
    keyCache.set(dir, perDir);
  }
  if (perDir.has(basemap)) return perDir.get(basemap);
  let keys: Set<string> | undefined;
  try {
    const fc = JSON.parse(
      readFileSync(join(dir, `${basemap}.geojson`), "utf8"),
    ) as GeoJSON.FeatureCollection;
    keys = new Set(
      fc.features
        .map((f) => f.properties?.[joinKey])
        .filter((v): v is string => typeof v === "string")
        .map((v) => v.trim().toUpperCase()),
    );
  } catch {
    // Absent file (ENOENT) or unparseable JSON — both measured the same way: this basemap
    // cannot be matched against, not a reason to take the whole measurement down. A broken
    // us-states.geojson must still let a world match succeed.
    keys = undefined;
  }
  perDir.set(basemap, keys);
  return keys;
}

/**
 * WHICH COLUMN IS THE GEOGRAPHY, AND AGAINST WHICH SHIPPED BASEMAP.
 *
 * Tries every column against every shipped basemap's join key and keeps the best join. Returns
 * undefined when nothing joins at all — data with no geography is not a failed map, it is a
 * chart, and saying so is orient's job.
 *
 * The caller decides what to DO with a partial join (lib/loop/assemble/map-native.ts refuses
 * below half). This function only measures, and it always names the orphans: a count alone
 * would let a journalist ship a map with two holes in it and never know which two.
 *
 * Never throws (invariant I1): a basemap whose asset cannot be read or parsed is skipped, never
 * fatal — `lib/loop/orient.ts` calls this directly on the driver's `orient` case, which has no
 * try/catch of its own around it. `dir`/`basemaps` default to the real shipped assets and
 * registry; the two trailing parameters exist so a test can point this exact function at a
 * fixture without touching the shipped basemap files.
 */
export function matchGeography(
  columns: string[],
  rows: Record<string, string | number>[],
  dir: string = assetsDir,
  basemaps: Record<string, BasemapMeta> = BASEMAPS,
): GeoMatch | undefined {
  let best: GeoMatch | undefined;
  for (const basemap of Object.keys(basemaps)) {
    const keys = keysOf(dir, basemap, basemaps[basemap]!.joinKey);
    if (!keys) continue;
    for (const column of columns) {
      const values = rows.map((r) => String(r[column] ?? "").trim());
      const unmatched = values.filter(
        (v) => v !== "" && !keys.has(v.toUpperCase()),
      );
      const matched = values.filter(
        (v) => v !== "" && keys.has(v.toUpperCase()),
      ).length;
      if (matched === 0) continue;
      if (!best || matched > best.matched)
        best = { column, basemap, matched, total: values.length, unmatched };
    }
  }
  return best;
}
