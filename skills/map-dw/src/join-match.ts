// The produce-time dataless-join guard — the general safety net behind the validation-level
// key check (basemap-keys.ts). A choropleth whose data-row region codes match NO region on
// the basemap ships a fully grey, DATALESS map, yet Datawrapper still publishes it and the
// orchestrator marked it `status:"produced"`. This recomputes the REAL join-match rate from
// the live basemap geometry and fails hard when the join essentially failed, so a dataless
// render never ships as produced. It covers ANY basemap (in the static key registry or not)
// and ANY cause (wrong `mapKeyAttr` OR data codes in the wrong code space).

const API = "https://api.datawrapper.de/v3";

// Fraction of data rows that must match a region for the choropleth to be considered to
// carry data. A healthy choropleth matches ~all of its own curated rows (≈1.0); the bug
// matched exactly 0.0. Half cleanly separates the two and also catches near-total join
// failures (a wrong key that accidentally matches a stray row or two) — while never
// tripping a correct map, whose data is curated FOR its basemap.
export const MIN_JOIN_MATCH_RATE = 0.5;

interface BasemapGeometry {
  content?: {
    objects?: Record<
      string,
      { geometries?: Array<{ properties?: Record<string, unknown> }> }
    >;
  };
}

// Pure: the fraction of `dataCodes` present in `regionValues` (the basemap's values for the
// chosen key). Empty data → 0 (nothing to encode). Exact, trimmed string match, mirroring
// Datawrapper's own region join.
export function joinMatchRate(
  regionValues: Set<string>,
  dataCodes: string[],
): number {
  if (dataCodes.length === 0) return 0;
  let matched = 0;
  for (const c of dataCodes) if (regionValues.has(c)) matched++;
  return matched / dataCodes.length;
}

// Pure: the non-empty, trimmed values of one CSV column (the choropleth's regionKey). Naive
// split mirrors the rest of dw-chart's csv.ts — region codes (ISO / postal / GEOID) never
// carry embedded commas.
export function columnValues(csv: string, column: string): string[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((c) => c.trim());
  const idx = header.indexOf(column);
  if (idx < 0) return [];
  return lines
    .slice(1)
    .map((l) => l.split(",")[idx]?.trim())
    .filter((v): v is string => !!v);
}

// The set of a basemap's region values for a given key, pulled from the LIVE Datawrapper
// basemap API. Every geometry object is scanned so the extraction is independent of the
// topology's object naming.
export async function fetchBasemapRegionValues(
  basemap: string,
  keyAttr: string,
): Promise<Set<string>> {
  const t = process.env.DATAWRAPPER_API_TOKEN;
  if (!t)
    throw new Error("DATAWRAPPER_API_TOKEN is not set (see /atelier/.env)");
  const r = await fetch(`${API}/basemaps/${basemap}`, {
    headers: { Authorization: `Bearer ${t}` },
  });
  if (!r.ok)
    throw new Error(`fetchBasemap ${basemap} ${r.status}: ${await r.text()}`);
  const j = (await r.json()) as BasemapGeometry;
  const out = new Set<string>();
  const objects = j.content?.objects ?? {};
  for (const k of Object.keys(objects))
    for (const g of objects[k]?.geometries ?? []) {
      const v = g?.properties?.[keyAttr];
      if (v !== undefined && v !== null) out.add(String(v).trim());
    }
  return out;
}

export interface JoinMatchReport {
  rate: number;
  matched: number;
  total: number;
  basemap: string;
  mapKeyAttr: string;
}

// Fetch the basemap geometry and compute how many of the choropleth's data rows actually
// join to a region. The caller fails hard when `rate < MIN_JOIN_MATCH_RATE`.
export async function assessJoinMatch(
  basemap: string,
  mapKeyAttr: string,
  data: string,
  regionKey: string,
): Promise<JoinMatchReport> {
  const regionValues = await fetchBasemapRegionValues(basemap, mapKeyAttr);
  const codes = columnValues(data, regionKey);
  const rate = joinMatchRate(regionValues, codes);
  const matched = Math.round(rate * codes.length);
  return { rate, matched, total: codes.length, basemap, mapKeyAttr };
}

// The clear, fail-hard message for a dataless join — names the mismatch and (when the key is
// simply absent from the basemap) leaves the caller's key check to have already suggested the
// valid keys. Shared so produce and its tests assert the same wording.
export function datalessJoinError(r: JoinMatchReport): string {
  return (
    `dataless choropleth: mapKeyAttr "${r.mapKeyAttr}" joined ${r.matched} of ${r.total} ` +
    `data rows to basemap "${r.basemap}" (match rate ${(r.rate * 100).toFixed(0)}% < ` +
    `${(MIN_JOIN_MATCH_RATE * 100).toFixed(0)}%) — the map would render fully grey with no ` +
    `data encoded. Check that regionKey values match the basemap's map-key-attr code space.`
  );
}
