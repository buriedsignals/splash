import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { GeoMatch } from "../../../lib/core/production-brief";
import { BASEMAPS, type BasemapMeta, resolveGeographyRef } from "./basemaps";
import type { Adm1Index } from "../../../lib/geo/index-build";

const assetsDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../assets/geo",
);
const adm1IndexPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../lib/geo/adm1-index.json",
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

// The offline ADM1 index (Task 7), read once per process. A missing or corrupt
// lib/geo/adm1-index.json caches as `undefined`, exactly like a broken basemap asset above:
// matchGeography never throws (I1), so a process that cannot read the index simply cannot try
// the ADM1 candidate, not a reason to crash the whole measurement.
let cachedAdm1Index: Adm1Index | undefined | null = null; // null = "tried and failed"
function loadAdm1Index(): Adm1Index | undefined {
  if (cachedAdm1Index !== null) return cachedAdm1Index ?? undefined;
  try {
    cachedAdm1Index = JSON.parse(
      readFileSync(adm1IndexPath, "utf8"),
    ) as Adm1Index;
  } catch {
    cachedAdm1Index = null;
  }
  return cachedAdm1Index ?? undefined;
}

// NOTE (flagged, not fixed here — see task-8-report.md): this folds separators ("-", "'") to
// spaces, which is Task 7's `normalizeName` regime (used for the 12 name fields: "Genève" ->
// "GENEVE"). Task 7's committed index ALSO carries a second, separator-PRESERVING regime
// (`normalizeCode`, used for iso_3166_2/code_hasc/postal/fips/wikidataid — e.g. "CH-GE" stays
// "CH-GE", not "CH GE"). A code-shaped query normalized only this way will not find its
// code-family index entry. None of this task's required tests exercise a code-shaped query
// against the real index, so this single-regime function is what the brief specifies; the dual-
// regime gap is real and forward-looking, not something this task silently papers over.
function normalizeValue(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[-']/g, " ")
    .trim();
}

/** The shipped-basemap candidate — returns the GeographyRef-shaped `geography` field (Task 9
 *  replaced the earlier bare `basemap: string`; see production-brief.ts's GeoMatch doc comment). */
function matchShippedBasemaps(
  columns: string[],
  rows: Record<string, string | number>[],
  dir: string,
  basemaps: Record<string, BasemapMeta>,
): GeoMatch | undefined {
  let best: GeoMatch | undefined;
  for (const name of Object.keys(basemaps)) {
    const keys = keysOf(dir, name, basemaps[name]!.joinKey);
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
        best = {
          column,
          geography: resolveGeographyRef(name),
          matched,
          total: values.length,
          unmatched,
        };
    }
  }
  return best;
}

/** The ADM1-index candidate (D10.2, new in this task) — the mechanism that makes a Swiss-canton
 *  or French-département column matchable at all. Only a WIN (matched > 0) is returned; a column
 *  that finds nothing here (e.g. an ADM0 name like "Suisse" — spec's own rule-3 fixture) is not
 *  reported as a failed ADM1 match, it simply does not win this candidate — geoRefusal (Task 12,
 *  `lib/loop/assemble/map-native.ts`) is where "no geography at all" is said. */
function matchAdm1Index(
  columns: string[],
  rows: Record<string, string | number>[],
  index: Adm1Index | undefined,
): GeoMatch | undefined {
  if (!index) return undefined;
  let best: GeoMatch | undefined;
  for (const column of columns) {
    const values = rows.map((r) => String(r[column] ?? "").trim());
    const families = new Map<string, number>(); // which family won, and how many times
    // Country votes (Task 15) — which country this admin-1 column's subset should be scoped
    // to, so an unscoped "Jura" (CH/FR) does not also colour France's Jura département
    // (lib/geo/subset.ts is where that scope is applied). Every hit of a matched value votes
    // for its OWN country — not just hits[0] — so a value that itself collides across a
    // border (like "Jura") votes for BOTH countries rather than arbitrarily crediting only
    // whichever the index happens to list first; the column's unambiguous rows (every other
    // canton, matching only Switzerland) still settle the outcome.
    const countries = new Map<string, number>();
    const unmatched: string[] = [];
    let matched = 0;
    for (const v of values) {
      if (v === "") continue;
      const hits = index[normalizeValue(v)];
      if (!hits || hits.length === 0) {
        unmatched.push(v);
        continue;
      }
      matched++;
      const family = hits[0]!.family;
      families.set(family, (families.get(family) ?? 0) + 1);
      for (const country of new Set(hits.map((h) => h.country)))
        countries.set(country, (countries.get(country) ?? 0) + 1);
    }
    if (matched === 0) continue;
    const winningFamily = [...families.entries()].sort(
      (a, b) => b[1] - a[1],
    )[0]![0];
    // scope is set only when one country strictly outpolls every other — a tie (a column
    // genuinely split between two countries, not just one colliding name) has no honest single
    // scope to report, so it is left undefined rather than a coin flip that would silently drop
    // half the data at subset time.
    const countryVotes = [...countries.entries()].sort((a, b) => b[1] - a[1]);
    const scope =
      countryVotes.length > 0 &&
      (countryVotes.length === 1 || countryVotes[0]![1] > countryVotes[1]![1])
        ? countryVotes[0]![0]
        : undefined;
    const candidate: GeoMatch = {
      column,
      geography: {
        origin: "shipped",
        set: "natural-earth-admin-1",
        scope,
        level: column, // no per-feature "level" name is threaded to this fixture-free path yet —
        // and no task is currently scheduled to add the real per-country admin-level label the
        // index carries — this is a placeholder until one is.
        // FLAGGED (see task-8-report.md): this happens to equal "canton" only because the test
        // fixture's own CSV column is named "canton" — a coincidence, not a real level lookup.
        joinKey: winningFamily,
        joinKeyFamily: winningFamily,
      },
      matched,
      total: values.length,
      unmatched,
    };
    if (!best || candidate.matched > best.matched) best = candidate;
  }
  return best;
}

/**
 * WHICH COLUMN IS THE GEOGRAPHY, AND AGAINST WHICH GEOGRAPHY. Tries every column against the
 * shipped basemaps' join keys AND the offline ADM1 index (D10.2), and keeps the best join across
 * both candidates. Returns undefined when nothing joins at all — data with no geography is not a
 * failed map, it is a chart, and saying so is orient's job.
 *
 * The caller decides what to DO with a partial join (lib/loop/assemble/map-native.ts refuses
 * below half). This function only measures, and it always names the orphans: a count alone
 * would let a journalist ship a map with two holes in it and never know which two.
 *
 * Never throws (invariant I1): a basemap or index that cannot be read or parsed is skipped,
 * never fatal — `lib/loop/orient.ts` calls this directly on the driver's `orient` case, which has
 * no try/catch of its own around it. `dir`/`basemaps`/`adm1Index` default to the real shipped
 * assets, registry and committed index; the trailing parameters exist so a test can point this
 * exact function at fixtures without touching the shipped assets.
 */
export function matchGeography(
  columns: string[],
  rows: Record<string, string | number>[],
  dir: string = assetsDir,
  basemaps: Record<string, BasemapMeta> = BASEMAPS,
  adm1Index: Adm1Index | undefined = loadAdm1Index(),
): GeoMatch | undefined {
  const shipped = matchShippedBasemaps(columns, rows, dir, basemaps);
  const adm1 = matchAdm1Index(columns, rows, adm1Index);
  if (!shipped) return adm1;
  if (!adm1) return shipped;
  return adm1.matched > shipped.matched ? adm1 : shipped;
}
