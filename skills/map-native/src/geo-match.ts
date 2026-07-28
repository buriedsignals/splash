import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { GeoMatch } from "../../../lib/core/production-brief";
import { BASEMAPS } from "./basemaps";

const assetsDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../assets/geo",
);

// The join-key values a basemap actually contains, read once per process. world.geojson is 4 MB
// and orient runs once per run, so the read is amortised — but a second call must not pay it.
const keyCache = new Map<string, Set<string>>();

function keysOf(basemap: string): Set<string> {
  const hit = keyCache.get(basemap);
  if (hit) return hit;
  const joinKey = BASEMAPS[basemap]!.joinKey;
  const fc = JSON.parse(
    readFileSync(join(assetsDir, `${basemap}.geojson`), "utf8"),
  ) as GeoJSON.FeatureCollection;
  const keys = new Set(
    fc.features
      .map((f) => f.properties?.[joinKey])
      .filter((v): v is string => typeof v === "string")
      .map((v) => v.trim().toUpperCase()),
  );
  keyCache.set(basemap, keys);
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
 */
export function matchGeography(
  columns: string[],
  rows: Record<string, string | number>[],
): GeoMatch | undefined {
  let best: GeoMatch | undefined;
  for (const basemap of Object.keys(BASEMAPS)) {
    const keys = keysOf(basemap);
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
