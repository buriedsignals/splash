// The join-key registry: for each Datawrapper basemap map-dw vets, the set of valid
// `map-key-attr` values a choropleth data column may join against. Sourced from the LIVE
// Datawrapper basemap API (`GET /v3/basemaps/{id}` → `meta.keys[].value`) and pinned here so
// `validateMapSpec` can reject a wrong join key WITHOUT a network call.
//
// Why this exists: a wrong `mapKeyAttr` silently fails the region join and ships a fully
// grey, DATALESS choropleth — Datawrapper still publishes it, so the failure is invisible
// until someone reads the PNG. Verified: `mapKeyAttr:"ISO_A3"` on `world-2019` (whose real
// alpha-3 key is `DW_STATE_CODE`) matched 0 of 10 data rows and rendered every region grey.
//
// Only basemaps listed here are checked at validation time. An unknown basemap is skipped by
// the validator and covered instead by the produce-time dataless-join guard (`join-match.ts`),
// which recomputes the real match rate from the live geometry — the general net for any basemap.
//
// To add a basemap: `GET /v3/basemaps/{id}` and copy `meta.keys[].value` verbatim (keys are
// case-sensitive). Keep in sync with `eval/basemaps.ts` KNOWN_BASEMAPS.
export const BASEMAP_JOIN_KEYS: Record<string, readonly string[]> = {
  "world-2019": [
    "DW_NAME",
    "NAME_SHORT",
    "DW_STATE_CODE",
    "ISO_2",
    "GERMAN_NAME_NEW_2",
    "GERMAN_NAME_NEW",
    "GERMAN_NAME",
  ],
  europe: [
    "ISO_A3",
    "ISO_A2",
    "NAME_NEW",
    "GERMAN_NAME_NEW",
    "FIPS_10_",
    "GERMAN_NAME",
    "ADMIN",
  ],
  "europe-sovereign-states": [
    "ISO_3_SOV",
    "ISO_2_SOV",
    "NAME_SOV",
    "GERMAN_NAME_SOV_NEW",
    "GERMAN_NAME_SOV",
  ],
  "us-states": ["NAME", "id", "NAME_ABBR"],
  "us-states-continental": ["NAME", "id", "NAME_ABBR"],
  "us-counties-2023": ["GEOID", "NAME_ABR"],
  "france-metropolitan-departments": ["name", "fips", "postal", "code_hasc"],
};

// The valid join keys for a basemap, or undefined when the basemap is not in the registry
// (the validator then skips the key check and defers to the produce-time dataless guard).
export function validJoinKeysFor(
  basemap: string,
): readonly string[] | undefined {
  return BASEMAP_JOIN_KEYS[basemap];
}
