// map-native's seven types split into two families. map-native validates a CONFIG and has no
// spec layer of its own, so this assembler composes the whole config for both:
//   - THE REGION FAMILY (choropleth, cartogram, dot-density) reads the geography already
//     measured in orient (brief.geo) rather than re-measuring it.
//   - THE POINT FAMILY (symbol, hex-grid, locator, route) has no basemap-join half-match to
//     measure — a lat/lon pair anchors every mark directly — so it finds and bound-checks
//     coordinate columns instead.
// Both make the judgment calls the design spec (§4.2) requires to be visible in code, not
// buried in a mapper.
import { fail, ok, type VerbResult } from "../../core/verbs";
import type { ProductionBrief, GeoMatch } from "../../core/production-brief";
import { parseCsvRows } from "../profile";
import { BASEMAP_NAMES } from "../../../skills/map-native/src/basemaps";
// The renderer's own basemap-registry key, recovered from GeoMatch's GeographyRef (Task 9 —
// GeoMatch stopped carrying that raw key when it widened from `basemap: string`). See
// lib/geo/ref.ts's own doc comment for why `geography.set` is not usable directly here.
import { basemapKeyFor, resolveGeographyRef } from "../../geo/ref";
// One wording for one fact, shared with the prose chain's own gate — see the dot-density
// branch below for why only the sentence is shared and not the condition.
import {
  ISO_A3_BASEMAP,
  isoA3PinnedInFormat,
  isoA3PinnedJoinRefusal,
} from "../../../skills/map-native/src/region-join-support";

const REGION_TYPES = new Set(["choropleth", "cartogram", "dot-density"]);
const POINT_TYPES = new Set(["symbol", "hex-grid", "locator", "route"]);
const MAP_NATIVE_TYPES = new Set<string>([...REGION_TYPES, ...POINT_TYPES]);

// No bare `x`/`y`: they were the one pair in these lists the rule below argues AGAINST — an
// ordinary chart CSV's x and y columns are not coordinates, and a map that plots the wrong column
// looks exactly like a map that plots the right one. No fixture ever used them.
const LAT_NAMES = ["lat", "latitude", "lat_dd"];
const LON_NAMES = ["lon", "lng", "long", "longitude", "lon_dd"];

/** The coordinate columns, by name. Deliberately a CLOSED list rather than a heuristic on the
 *  values: a column of small numbers is not a latitude just because it could be one, and a map
 *  that plots the wrong column looks exactly like a map that plots the right one. */
function coordColumns(
  columns: string[],
): { lat: string; lon: string } | undefined {
  const find = (names: string[]): string | undefined =>
    columns.find((c) => names.includes(c.trim().toLowerCase()));
  const lat = find(LAT_NAMES);
  const lon = find(LON_NAMES);
  return lat && lon ? { lat, lon } : undefined;
}

/** The label column: the first column that is neither a coordinate nor numeric — the
 *  journalist's own name for the row (a place, an event), carried through so a point on the
 *  map can be named without inventing one. */
function labelColumnFor(
  columns: string[],
  numericColumns: string[],
  coords: { lat: string; lon: string },
): string | undefined {
  return columns.find(
    (c) => c !== coords.lat && c !== coords.lon && !numericColumns.includes(c),
  );
}

/** Coordinates are refused when they don't parse as numbers, or when they parse outside a
 *  physical globe (|lat| > 90, |lon| > 180) — named by the row's own label (or, absent one,
 *  by the raw pair), never silently plotted in the sea. */
function coordinateRefusal(
  rows: Record<string, string>[],
  coords: { lat: string; lon: string },
  labelColumn: string | undefined,
): string | undefined {
  for (const row of rows) {
    const lat = Number(row[coords.lat]);
    const lon = Number(row[coords.lon]);
    const label = labelColumn
      ? row[labelColumn]
      : `${row[coords.lat]}, ${row[coords.lon]}`;
    if (!Number.isFinite(lat) || !Number.isFinite(lon))
      return (
        `${label} has a coordinate that is not a number ` +
        `(lat "${row[coords.lat]}", lon "${row[coords.lon]}")`
      );
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180)
      return (
        `${label} has an out-of-range coordinate (lat ${lat}, lon ${lon}) — ` +
        `never plotted in the sea`
      );
  }
  return undefined;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** WHICH COLUMN HOLDS THE VALUE. One numeric column is unambiguous. Several is a real
 *  question, and the takeaway is where the journalist already answered it: the column whose
 *  name appears in the confirmed takeaway wins. Neither ⇒ refuse and LIST them — guessing
 *  here paints the wrong quantity on a map and nothing downstream can tell.
 *
 *  The match is on WORD BOUNDARIES, on both sides of the normalisation: a plain `includes`
 *  lets a short or generic column name (`n`, `id`, `x`) match as an incidental substring of
 *  unrelated prose ("outcome" contains "n") and either falsely collides with the real answer
 *  or — worse — gets silently picked on its own when the real column is never named at all.
 *  A multi-word column (`gdp_per_capita` → "gdp per capita") still has to match as a whole
 *  phrase, not word-by-word, so the boundary sits at the START and END of the full phrase.
 *
 *  EXPORTED because map-dw asks the same question of the same brief (a hosted choropleth has
 *  one `valueColumn` exactly as a native one has one `valueField`), and two copies of this
 *  rule would be two answers to "which quantity is on the map" — the one question whose wrong
 *  answer nothing downstream can see. */
export function valueFieldFor(
  numeric: string[],
  takeaway: string,
): { field: string } | { candidates: string[] } {
  if (numeric.length === 1) return { field: numeric[0]! };
  const lower = takeaway.toLowerCase();
  const said = numeric.filter((c) => {
    const phrase = escapeRegExp(c.toLowerCase().replace(/[_-]+/g, " "));
    return new RegExp(`\\b${phrase}\\b`).test(lower);
  });
  if (said.length === 1) return { field: said[0]! };
  return { candidates: numeric };
}

/** HALF THE ROWS. Below it, this basemap does not know this geography and a map would be
 *  mostly holes; above it, the orphans travel as a warning the caller shows. The threshold is
 *  a decision, not a measurement — it is written here once so it is arguable in one place. */
function geoRefusal(geo: GeoMatch | undefined): string | undefined {
  if (!geo)
    return (
      `this data carries no geography Splash can place — tried the shipped basemaps ` +
      `(${BASEMAP_NAMES.join(", ")}) and the built-in admin-1 index, and no column matched any of them`
    );
  if (geo.matched * 2 < geo.total)
    return (
      `only ${geo.matched} of ${geo.total} rows match ${geo.geography.set}` +
      `${geo.geography.scope ? ` (${geo.geography.scope})` : ""} — unmatched: ${geo.unmatched.join(", ")}`
    );
  return undefined;
}

/** rows straight off parseCsvRows are all strings (CSV has no types) — every numeric column
 *  has to be coerced back before it can satisfy a validator that requires typeof "number"
 *  (validateChoroplethConfig's per-row numeric check). Non-numeric columns pass through. */
function typedRows(
  rows: Record<string, string>[],
  numericColumns: string[],
): Record<string, string | number>[] {
  return rows.map((row) => {
    const typed: Record<string, string | number> = { ...row };
    for (const c of numericColumns) typed[c] = Number(row[c]);
    return typed;
  });
}

/**
 * THE CONFIRMED WALK, ready to spread onto a config — sub-project ③.
 *
 * `arcBeats` is what every map-native renderer already reads (skills/map-native/src/map-arc.ts);
 * what was missing was a writer. The brief's beats arrive already projected to `{region, role,
 * text}` (lib/loop/assemble/brief.ts), so this THREADS them and derives nothing — the journalist's
 * confirmed wording is pinned verbatim, which is the rule map-arc.ts states for this field.
 *
 * Spread rather than assigned, so a run with no walk produces a config BYTE-IDENTICAL to the one
 * it produced before this existed: an absent field, not an empty array. `route` and `hex-grid`
 * reach this too and are honoured the same way — they are outside the PROPOSAL step
 * (PROPOSABLE_MAP_TYPES) because nothing can draft their anchor, which says nothing about
 * carrying one a journalist wrote themselves.
 */
function arcBeatsFrom(brief: ProductionBrief): { arcBeats?: unknown[] } {
  const beats = (brief.beats ?? []).filter((b) => b.region !== undefined);
  if (!beats.length) return {};
  return {
    arcBeats: beats.map((b) => ({
      region: b.region!,
      role: b.role,
      text: b.text,
      // Threaded, never defaulted: an absent movement means "the global cameraMode decides",
      // and writing a value here would silently promote a default into a decision.
      ...(b.movement ? { movement: b.movement } : {}),
    })),
  };
}

export function assembleMapNative(brief: ProductionBrief): VerbResult<unknown> {
  if (!MAP_NATIVE_TYPES.has(brief.nativeType))
    return fail(
      "invalid-request",
      `this assembler builds map-native's seven types (choropleth, cartogram, dot-density, ` +
        `symbol, hex-grid, locator, route) — "${brief.nativeType}" is not one of them`,
    );

  if (POINT_TYPES.has(brief.nativeType)) return assemblePointFamily(brief);

  const refusal = geoRefusal(brief.geo);
  if (refusal) return fail("invalid-request", refusal);
  const geo = brief.geo!;

  const { rows, numericColumns } = parseCsvRows(brief.dataCsv);
  const numeric = numericColumns.filter((c) => c !== geo.column);
  const resolved = valueFieldFor(numeric, brief.angle.confirmedTakeaway);
  if ("candidates" in resolved)
    return fail(
      "invalid-request",
      `several numeric columns could be the mapped value and the takeaway names none of ` +
        `them — candidates: ${resolved.candidates.join(", ")}`,
    );
  const valueField = resolved.field;

  const title = brief.angle.confirmedTakeaway;
  const description = brief.angle.altInsight;
  const source = {
    name: brief.attribution,
    ...(brief.sourceUrl ? { url: brief.sourceUrl } : {}),
  };
  const unit = brief.angle.unit;

  if (brief.nativeType === "cartogram") {
    // THE SAME FACT AS THE dot-density BRANCH BELOW, on the type that branch forgot.
    // CartogramMap.tsx — the component behind BOTH the static and the interactive format —
    // calls `computeCartogram(config, world)` at :194 without threading a key, and
    // cartogram-geo.ts:62 resolves it as `data.joinKey ?? "iso_a3"`. Nothing here ever set
    // `config.joinKey`, so a us-states cartogram assembled, cleared validate-config, built,
    // and produced an artifact: a bare basemap of EUROPE carrying the journalist's title,
    // alt-insight and source credit over Poland and Turkey, with no data layer at all
    // (measured end-to-end through lib/host/cli.ts, 2026-08-07 — see this branch's test).
    //
    // SCOPED BY FORMAT, unlike the dot-density branch below and deliberately so. Only
    // CartogramMap.tsx pins the key; CartogramStory, CartogramReveal and CartogramScrolly all
    // resolve it through resolveVideoGeometry (core/video-geometry.ts), which prefers
    // `config.geography.joinKey`. A blanket refusal here would delete a working capability, so
    // this asks the shared module WHICH formats the pinning actually reaches — the same
    // question, through the same function, that the prose chain's regionJoinError asks
    // (skills/splash/src/validate-gate.ts). The dot-density branch's own broader condition is
    // left as it stands: narrowing it would ADMIT a pairing that is refused today, which is a
    // capability decision owed its own rendered proof, not a side effect of fixing this one.
    //
    // Judged on the RENDERER'S basemap key (basemapKeyFor), not `geo.geography.set` — "world"'s
    // own set is "natural-earth-admin-0" (lib/geo/ref.ts), so this reads the same identifier the
    // config below writes.
    const basemapKey = basemapKeyFor(geo.geography);
    if (basemapKey !== ISO_A3_BASEMAP && isoA3PinnedInFormat(brief.format))
      return fail(
        "invalid-request",
        isoA3PinnedJoinRefusal("cartogram", basemapKey),
      );
    const values = rows.map((row) => ({
      id: row[geo.column]!,
      value: Number(row[valueField]),
    }));
    return ok({
      type: "cartogram",
      ...arcBeatsFrom(brief),
      values,
      geography: geo.geography,
      title,
      description,
      source,
      ...(brief.lang ? { lang: brief.lang } : {}),
      ...(unit ? { valueUnit: unit } : {}),
      // Threaded straight through, never recomputed — see resolve-for-produce.ts's own use
      // of this field and production-brief.ts's GeoMatch.featureIdsByValue doc comment.
      ...(geo.featureIdsByValue
        ? { featureIdsByValue: geo.featureIdsByValue }
        : {}),
    });
  }

  if (brief.nativeType === "dot-density") {
    // DotDensityMap.tsx hard-codes the join key "iso_a3" — it never reads config.basemap or
    // config.boundaries at all (verified 2026-07-28, task-7). UPDATE (2026-07-30, Task 17,
    // commit 5e4e9f71): the component no longer hard-imports world.geojson (it now decodes an
    // injected config.geometry) — only the "iso_a3" join-key literal survives as this refusal's
    // justification. The engine's own validator only checks that `basemap` NAMES a registered
    // basemap, so a "us-states" dot-density would clear validate-config and then render against
    // WORLD geometry, joining state postal codes against country ISO codes — wrong silently,
    // not missing. Refused here, at the one place that knows which basemap this geography
    // actually matched, rather than shipping a config that looks truthful and renders false.
    // See task-7-report.md for the fix-the-component alternative this defers, and Task 13
    // (task-13-brief.md Steps 3-6) for re-deriving the join key so this refusal can be lifted.
    //
    // Judged on the RENDERER'S basemap key (basemapKeyFor), not `geo.geography.set` directly —
    // "world"'s own set is "natural-earth-admin-0", not "world" (see lib/geo/ref.ts's doc
    // comment), so this guard reads the same identifier the config below writes.
    //
    // The SENTENCE now comes from skills/map-native/src/region-join-support.ts, so the prose
    // chain — which refuses the same pairing at its own gate (skills/splash/src/validate-gate.ts)
    // — says one thing about one fact rather than a second wording of its own. The CONDITION
    // stays here: this branch refuses every non-world basemap in every format, which is broader
    // than the mechanism strictly requires (a video resolves the key correctly), and narrowing
    // it is a capability decision for this chain, not a side effect of sharing a string.
    const basemapKey = basemapKeyFor(geo.geography);
    if (basemapKey !== "world")
      return fail(
        "invalid-request",
        isoA3PinnedJoinRefusal("dot-density", basemapKey),
      );
    return ok({
      type: "dot-density",
      ...arcBeatsFrom(brief),
      regionKey: geo.column,
      // No validator branch checks this field (DotDensityConfigShape types it `string` with
      // no format constraint) — the matched basemap name is the only value on hand that names
      // the geography this join happened against. See task-5-report.md for the open question.
      boundaries: basemapKey,
      rows: typedRows(rows, numeric),
      valueField,
      basemap: basemapKey,
      geography: geo.geography,
      title,
      description,
      source,
      ...(brief.lang ? { lang: brief.lang } : {}),
      ...(unit ? { valueUnit: unit } : {}),
    });
  }

  return ok({
    type: "choropleth",
    ...arcBeatsFrom(brief),
    regionKey: geo.column,
    valueField,
    rows: typedRows(rows, numeric),
    basemap: basemapKeyFor(geo.geography),
    geography: geo.geography,
    title,
    description,
    source,
    ...(brief.lang ? { lang: brief.lang } : {}),
    // TWO fields, TWO readers, and they are not interchangeable: ChoroplethMap.tsx:53-54
    // documents `unit` as the long legend HEADER and `valueUnit` as the SHORT suffix its
    // tooltip (:393) and bin ranges (:355) print. Emitting only `unit` showed the unit in a
    // heading and on no value — the sibling branches (:189, :333, :368) already emit
    // `valueUnit`; this one was the odd one out.
    ...(unit ? { unit, valueUnit: unit } : {}),
    // Threaded straight through, never recomputed — see resolve-for-produce.ts's own use of
    // this field and production-brief.ts's GeoMatch.featureIdsByValue doc comment.
    ...(geo.featureIdsByValue
      ? { featureIdsByValue: geo.featureIdsByValue }
      : {}),
  });
}

/** THE POINT FAMILY — symbol, hex-grid, locator, route. The four types diverge only in what
 *  they carry alongside the coordinates: symbol wants a value, hex-grid an optional one,
 *  locator a name, route just the ordered pairs — so this finds the shared columns once and
 *  lets each branch pick what it needs. */
function assemblePointFamily(brief: ProductionBrief): VerbResult<unknown> {
  const { rows, columns, numericColumns } = parseCsvRows(brief.dataCsv);
  const coords = coordColumns(columns);
  if (!coords)
    return fail(
      "invalid-request",
      `this data carries no coordinates Splash can plot on a map — looked for a lat/lon ` +
        `column pair (also accepts latitude/longitude, lat/lng, lat_dd/lon_dd, x/y) among: ` +
        `${columns.join(", ")}`,
    );

  const labelColumn = labelColumnFor(columns, numericColumns, coords);
  const coordRefusal = coordinateRefusal(rows, coords, labelColumn);
  if (coordRefusal) return fail("invalid-request", coordRefusal);

  const title = brief.angle.confirmedTakeaway;
  const description = brief.angle.altInsight;
  const source = {
    name: brief.attribution,
    ...(brief.sourceUrl ? { url: brief.sourceUrl } : {}),
  };
  const unit = brief.angle.unit;
  // Point families plot raw coordinates, not a region join — "world" is the only shipped
  // basemap that never clips a mark, whatever hemisphere it lands in.
  const basemap = "world";

  if (brief.nativeType === "route") {
    const route = rows.map(
      (row) =>
        [Number(row[coords.lon]), Number(row[coords.lat])] as [number, number],
    );
    return ok({
      type: "route",
      route,
      basemap,
      geography: resolveGeographyRef(basemap), // basemap is the literal "world" set above
      title,
      description,
      source,
      ...(brief.lang ? { lang: brief.lang } : {}),
      ...(unit ? { valueUnit: unit } : {}),
    });
  }

  if (brief.nativeType === "locator") {
    if (!labelColumn)
      return fail(
        "invalid-request",
        `a locator needs a name for each marker, and no column besides the coordinates ` +
          `holds one — columns: ${columns.join(", ")}`,
      );
    const markers = rows.map((row) => ({
      lon: Number(row[coords.lon]),
      lat: Number(row[coords.lat]),
      label: row[labelColumn]!,
    }));
    return ok({
      type: "locator",
      ...arcBeatsFrom(brief),
      markers,
      basemap,
      title,
      description,
      source,
      ...(brief.lang ? { lang: brief.lang } : {}),
      ...(unit ? { valueUnit: unit } : {}),
    });
  }

  const nonCoordNumeric = numericColumns.filter(
    (c) => c !== coords.lat && c !== coords.lon,
  );

  if (brief.nativeType === "hex-grid") {
    // Unlike symbol, a value is OPTIONAL here (aggregate defaults to "count", which needs
    // none) — so an ambiguous or absent value column is an omission, not a refusal.
    const resolved = valueFieldFor(
      nonCoordNumeric,
      brief.angle.confirmedTakeaway,
    );
    const points = rows.map((row) => ({
      lon: Number(row[coords.lon]),
      lat: Number(row[coords.lat]),
      ...("field" in resolved ? { value: Number(row[resolved.field]) } : {}),
    }));
    return ok({
      type: "hex-grid",
      points,
      basemap,
      title,
      description,
      source,
      ...(brief.lang ? { lang: brief.lang } : {}),
      ...(unit ? { valueUnit: unit } : {}),
    });
  }

  // symbol — the only point type whose value is required by its own validator.
  if (nonCoordNumeric.length === 0)
    return fail(
      "invalid-request",
      `a symbol map needs a numeric value column besides the coordinates, and none was ` +
        `found — columns: ${columns.join(", ")}`,
    );
  const resolved = valueFieldFor(
    nonCoordNumeric,
    brief.angle.confirmedTakeaway,
  );
  if ("candidates" in resolved)
    return fail(
      "invalid-request",
      `several numeric columns could be the plotted value and the takeaway names none of ` +
        `them — candidates: ${resolved.candidates.join(", ")}`,
    );
  const points = rows.map((row) => ({
    lon: Number(row[coords.lon]),
    lat: Number(row[coords.lat]),
    value: Number(row[resolved.field]),
    ...(labelColumn ? { label: row[labelColumn] } : {}),
  }));
  return ok({
    type: "symbol",
    ...arcBeatsFrom(brief),
    points,
    basemap,
    title,
    description,
    source,
    ...(brief.lang ? { lang: brief.lang } : {}),
    ...(unit ? { valueUnit: unit } : {}),
  });
}
