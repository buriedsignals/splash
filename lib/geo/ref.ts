// The basemap registry — moved here from skills/map-native/src/basemaps.ts (D10), which is now
// a thin re-export of this file, the same move house-ramp.ts already made for lib/core/
// house-ramp.ts. GeographyRef is a PLAIN type (never z.infer) — see this plan's Global
// Constraints on why lib/geo/*'s runtime-reachable exports must stay zod-free.
export interface BasemapMeta {
  joinKey: string; // the geojson feature property region values match against
  label: string;
}

export const BASEMAPS: Record<string, BasemapMeta> = {
  world: { joinKey: "iso_a3", label: "World countries (ISO-A3 codes)" },
  "us-states": {
    joinKey: "postal",
    label: "US states (2-letter postal codes)",
  },
  "natural-earth-admin-1": {
    joinKey: "name",
    label: "Sub-national admin-1 (cantons, départements, states, provinces)",
  },
};

export const BASEMAP_NAMES = Object.keys(BASEMAPS);

// Resolve a basemap's metadata, failing LOUDLY (with the valid list) on an unknown
// name — never a silent fallback to world or a mystery render.
export function resolveBasemapMeta(name: string): BasemapMeta {
  const meta = BASEMAPS[name];
  if (!meta)
    throw new Error(
      `unknown basemap "${name}" — valid basemaps: ${BASEMAP_NAMES.join(", ")}`,
    );
  return meta;
}

/** What a resolved geography IS — the descriptor produce needs to subset (Task 6) and the
 *  journalist needs to read ("joint sur ISO 3166-2" vs "joint sur le nom français" — spec D10).
 *  `origin` distinguishes a shipped default from a journalist-declared file (Task 9's
 *  input.geography); `scope` is the ISO-A3 country scope of an admin-1 subset, absent for a
 *  global set. */
export type GeographyRef = {
  origin: "shipped" | "declared";
  set: string;
  scope?: string;
  level: string;
  joinKey: string;
  joinKeyFamily: string;
  /** The shipped asset's actual file format on disk — "geojson" (world, us-states) or
   *  "topojson" (the much larger ADM1 index, arc-shared to stay well under a GeoJSON encoding
   *  of the same geometry). Optional: a ref built outside this registry (matchAdm1Index's own
   *  literal in skills/map-native/src/geo-match.ts, or any DECLARED geometry, whose file lives
   *  wherever its own sourcePath says) carries no opinion here — fileExtensionFor's own registry
   *  lookup is what resolves those. Never guessed at produce time: that guess (always ".geojson")
   *  is exactly what produced an ENOENT against the real ADM1 asset (Task 8). */
  fileExtension?: "geojson" | "topojson";
};

const SHIPPED_REFS: Record<string, GeographyRef> = {
  world: {
    origin: "shipped",
    set: "natural-earth-admin-0",
    level: "country",
    joinKey: "iso_a3",
    joinKeyFamily: "iso_a3",
    fileExtension: "geojson",
  },
  "us-states": {
    origin: "shipped",
    set: "us-states",
    level: "state",
    joinKey: "postal",
    joinKeyFamily: "postal",
    fileExtension: "geojson",
  },
  "natural-earth-admin-1": {
    origin: "shipped",
    set: "natural-earth-admin-1",
    level: "admin-1",
    joinKey: "name",
    joinKeyFamily: "name",
    fileExtension: "topojson",
  },
};

export function resolveGeographyRef(name: string): GeographyRef {
  const ref = SHIPPED_REFS[name];
  if (!ref)
    throw new Error(
      `unknown basemap "${name}" — valid basemaps: ${BASEMAP_NAMES.join(", ")}`,
    );
  return ref;
}

// The inverse of resolveGeographyRef — the BASEMAPS registry KEY a renderer's `config.basemap`
// (or `config.boundaries`) field needs to load the right geojson asset (validateBasemap,
// ChoroplethMap.tsx's resolveBasemapMeta). Needed because GeoMatch stopped carrying that raw key
// once GeoMatch.basemap widened to GeoMatch.geography (Task 9) — a GeographyRef's own `set` is
// NOT that key for every shipped geography ("world"'s set is "natural-earth-admin-0", not
// "world"). Falls back to `ref.set` unchanged when it names no shipped basemap (an ADM1 match,
// e.g.) — the renderer's own validateBasemap is what refuses that name; this function never
// throws (matchGeography's own I1 discipline), so a config-writer downstream can still compose
// a (refusable) config rather than crash while assembling one.
export function basemapKeyFor(ref: GeographyRef): string {
  for (const [key, shipped] of Object.entries(SHIPPED_REFS))
    if (shipped.set === ref.set) return key;
  return ref.set;
}

// basemapKeyFor's sibling — which file EXTENSION the shipped asset behind a GeographyRef
// actually has on disk (Task 8, C6). A `ref` built via resolveGeographyRef already carries its
// own `fileExtension` and is returned unchanged; a `ref` built elsewhere (matchAdm1Index's own
// literal — it has no reason to know this registry's file layout) is looked up here by `set`,
// the same bridge basemapKeyFor already makes for the registry KEY. Falls back to "geojson" —
// the previous universal assumption — for a set this registry does not recognise at all, never
// throwing (mirrors basemapKeyFor's own never-throws discipline, matchGeography's I1).
export function fileExtensionFor(ref: GeographyRef): "geojson" | "topojson" {
  if (ref.fileExtension) return ref.fileExtension;
  for (const shipped of Object.values(SHIPPED_REFS))
    if (shipped.set === ref.set) return shipped.fileExtension ?? "geojson";
  return "geojson";
}
