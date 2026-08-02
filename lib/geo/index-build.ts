// The offline ADM1 index — built ONCE (Step 6's fetch script), committed, never inlined (spec
// D6/R6: the source is frozen since 2022, so a refresh cadence would be theatre). This file is
// the PURE indexing logic only; the download/convert/write is a separate script.
//
// `country` (Task 15) is the feature's own ISO-A3 (Natural Earth's `adm0_a3`) — carried on
// every entry, not just the featureId, because a colliding name (e.g. "Jura", CH/FR) needs its
// country resolvable per HIT, not parsed back out of featureId's own "ADM0-number" convention:
// that convention is not reliable enough to parse (measured: 40 of 4596 real features have an
// adm1_code prefix that does not match their own adm0_a3, e.g. disputed/dependent territories).
export type Adm1IndexEntry = {
  featureId: string;
  family: string;
  country: string;
};
export type Adm1Index = Record<string, Adm1IndexEntry[]>;

// The identifier families the spec measured (D6): 5 codes + 12 name fields + every name_alt
// alias. Field names as Natural Earth's admin_1 shapefile ships them.
const CODE_FAMILIES = [
  "iso_3166_2",
  "code_hasc",
  "postal",
  "fips",
  "wikidataid",
] as const;
const NAME_FIELDS = [
  "name",
  "name_alt",
  "name_local",
  "name_en",
  "name_fr",
  "name_de",
  "name_es",
  "name_it",
  "name_pt",
  "name_ru",
  "name_zh",
  "name_ar",
] as const;

// Diacritic-strip + uppercase, shared by both key flavors below.
function normalizeCore(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics after NFD decomposition
    .toUpperCase()
    .trim();
}

// Names fold dash/apostrophe to space so compound names match their plain-space spelling
// ("Saint-Etienne" ~ "Saint Etienne").
function normalizeName(raw: string): string {
  return normalizeCore(raw).replace(/[-']/g, " ").trim();
}

// Codes (iso_3166_2, code_hasc, postal, fips, wikidataid) keep their canonical separator —
// "CH-GE" is the ISO 3166-2 code's own format, not a compound name to fold. Stripping the dash
// would silently corrupt the identifier instead of just widening a name match.
function normalizeCode(raw: string): string {
  return normalizeCore(raw);
}

function add(
  index: Adm1Index,
  rawKey: string | undefined,
  entry: Adm1IndexEntry,
  kind: "name" | "code" = "name",
): void {
  if (!rawKey) return;
  const key = kind === "code" ? normalizeCode(rawKey) : normalizeName(rawKey);
  if (!key) return;
  const existing = index[key] ?? (index[key] = []);
  if (!existing.some((e) => e.featureId === entry.featureId))
    existing.push(entry);
}

// The property Natural Earth's admin-1 layer carries a feature's own canonical id under —
// `featureId` below equals this property's value for every entry the source actually
// populates it for (verified: 0 of 4596 real features in the committed asset are missing it;
// the synthetic "<adm0_a3>-<i>" fallback below is defensive only and has never fired against
// what is actually shipped). `lib/geo/resolve-for-produce.ts` relies on this: it filters the
// shipped ADM1 asset on THIS property using the RESOLVED featureId, which is exact — unlike
// filtering on a name family ("name", "name_fr"...), which needs the query normalized the
// same way this index was built (NFD-strip + uppercase) and a real shapefile property never
// is.
export const ADM1_FEATURE_ID_PROPERTY = "adm1_code";

export function buildAdm1Index(features: GeoJSON.Feature[]): Adm1Index {
  const index: Adm1Index = {};
  features.forEach((f, i) => {
    const p = (f.properties ?? {}) as Record<string, string | undefined>;
    const featureId =
      p[ADM1_FEATURE_ID_PROPERTY] && p[ADM1_FEATURE_ID_PROPERTY]!.trim() !== ""
        ? p[ADM1_FEATURE_ID_PROPERTY]!
        : `${p.adm0_a3 ?? "UNK"}-${i}`;
    // country is read straight off adm0_a3, independently of featureId — see the top-of-file
    // comment on why featureId's own prefix cannot be parsed back into a country instead.
    const country = p.adm0_a3 && p.adm0_a3.trim() !== "" ? p.adm0_a3 : "UNK";

    for (const family of CODE_FAMILIES)
      add(index, p[family], { featureId, family, country }, "code");
    for (const field of NAME_FIELDS)
      add(index, p[field], { featureId, family: field, country }, "name");
    // name_alt is a pipe-delimited alias list on Natural Earth's real files — split it, but the
    // family stays "name_alt" for every alias (the spec reports it as one family).
    if (p.name_alt)
      for (const alias of p.name_alt.split("|"))
        add(index, alias, { featureId, family: "name_alt", country }, "name");
  });
  return index;
}
