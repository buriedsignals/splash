// map-dw is the HOSTED map: Datawrapper renders it, so what this composes is a MapSpec
// (skills/map-dw/src/map-spec.ts) and not a component config. Two things make it different
// from its native sibling, and both are the whole job:
//
//   1. THE BASEMAP IS A TRANSLATION, not a pass-through. `brief.geo.basemap` is map-native's
//      vocabulary ("world", "us-states") because orient measured the join against map-native's
//      shipped basemaps. Datawrapper has its own basemap ids and its own join-key names, and a
//      wrong key does not fail — it ships a fully grey, DATALESS map that Datawrapper happily
//      publishes (skills/map-dw/src/basemap-keys.ts's header records the ISO_A3-on-world-2019
//      case). So the translation is an explicit table below, one entry per geography whose CODE
//      SPACE was verified to be the same on both sides, and a geography absent from it is
//      REFUSED rather than mapped onto the nearest-looking id.
//   2. THE UNIT IS APPENDED, NEVER MULTIPLIED. See `unit` below.
//
// Scope: CHOROPLETH only, of map-dw's three declared types. `symbol` can never be produced at
// all (validateMapSpec's symbol branch pushes an unconditional error — the registry declares
// the type `deferred` for exactly that reason), and `locator` is producible by the engine but
// is not composed here: its markers need the coordinate/label rules map-native's point family
// already owns, and map-native builds locator maps today. Both refusals name where to go.
import { fail, ok, type VerbResult } from "../../core/verbs";
import type { ProductionBrief, GeoMatch } from "../../core/production-brief";
import { parseCsvRows } from "../profile";
// ONE rule for "which column holds the mapped value", shared with map-native — see its doc
// comment. A second copy would be a second answer to the same question.
import { valueFieldFor } from "./map-native";
// The engine's OWN join floor, reused rather than restated: below it produceMap refuses after
// having fetched the live basemap geometry, so refusing here is the same decision taken
// earlier and offline.
import { MIN_JOIN_MATCH_RATE } from "../../../skills/map-dw/src/join-match";

/** map-native's basemap name → the Datawrapper basemap that carries the SAME geography in the
 *  SAME code space. Both entries were probed live (2026-07-28, `GET /v3/basemaps/{id}`, the
 *  values behind the key):
 *    - world      → world-2019 / DW_STATE_CODE — 200 regions, ISO alpha-3 ("ESH", "MAR"),
 *                   which is exactly map-native's world join key (`iso_a3`). NOT `ISO_A3`,
 *                   which world-2019 does not declare — the recorded grey-map bug.
 *    - us-states  → us-states / id — 51 regions, 2-letter UPPERCASE postal codes ("AL", "GA"),
 *                   exactly map-native's us-states join key (`postal`). NOT `NAME_ABBR`, whose
 *                   values are the dotted "Ala." form, and not `us-states-continental`, which
 *                   drops Alaska and Hawaii — two rows that would vanish silently rather than
 *                   fail. (SKILL.md records `us-states` 500ing on publish; re-probed live on
 *                   2026-07-28, it published fine. `us-states-continental` is the documented
 *                   fallback id if that ever comes back.)
 *  A geography not in this table has no verified code space on the Datawrapper side, and a
 *  guessed id is the one failure mode that renders as a plausible, empty map. */
const DW_BASEMAPS: Record<
  string,
  { basemap: string; mapKeyAttr: string; codes: string }
> = {
  world: {
    basemap: "world-2019",
    mapKeyAttr: "DW_STATE_CODE",
    codes: "ISO alpha-3 country codes",
  },
  "us-states": {
    basemap: "us-states",
    mapKeyAttr: "id",
    codes: "2-letter US postal codes",
  },
};

/** The geographies map-dw can place, spelled out for a refusal: a journalist reading it has to
 *  be able to tell what would have worked. */
function placeableGeographies(): string {
  return Object.entries(DW_BASEMAPS)
    .map(([name, m]) => `${name} (${m.codes} → ${m.basemap})`)
    .join(", ");
}

/** The types the LOOP composes for map-dw. Narrower than the engine's own catalogue on
 *  purpose (see the header) — index.ts hands this to `supports`, so a locator or symbol form
 *  is MARKED in the offer instead of being chosen and then dead-ending at produce. */
export function supportsMapDwType(nativeType: string): boolean {
  return nativeType === "choropleth";
}

/** WHY a type this engine declines is declined, in the journalist's words. EXPORTED so the
 *  assembler table hands it to the offer as map-dw's `declines` sentence: until it did, this
 *  function was reached only from assembleMapDw — which `assemblerFor` never calls for a
 *  declined type — so a journalist read the generic "nothing can build a map-dw form yet —
 *  production is wired for …, map-dw" (a sentence contradicting itself in its own second half)
 *  while the real reason sat here, written and unreachable. */
export function mapDwTypeRefusal(nativeType: string): string {
  if (nativeType === "symbol")
    // The registry's own reason, in the journalist's words: DW's proportional circles carry
    // their value on HOVER only, so the owned static PNG is mute, unlabeled circles.
    return (
      `map-dw can never draw a symbol map: Datawrapper shows a circle's value on hover only, ` +
      `so the owned static image would ship unlabeled circles that carry no claim — build it ` +
      `with map-native, which labels the largest circles by name and value`
    );
  if (nativeType === "locator")
    return (
      `map-dw can host a locator map, but the loop composes only its choropleth today — ` +
      `build the locator with map-native, which places markers straight from the lat/lon ` +
      `columns`
    );
  return (
    `this assembler builds map-dw's choropleth — the Datawrapper map that shades regions by ` +
    `value. "${nativeType}" is not it`
  );
}

/** The join, decided BEFORE any API call. Absent geography, an untranslatable one, and a join
 *  that would be mostly holes are three different refusals because they have three different
 *  fixes. The threshold is the engine's own MIN_JOIN_MATCH_RATE — one floor, read twice. */
function geoRefusal(geo: GeoMatch | undefined): string | undefined {
  if (!geo)
    return (
      `this data carries no geography Splash can place — a Datawrapper choropleth joins a ` +
      `region column against a basemap, and the geographies map-dw can place are ` +
      `${placeableGeographies()}; no column matched either`
    );
  if (!DW_BASEMAPS[geo.basemap])
    return (
      `no Datawrapper basemap carries the "${geo.basemap}" geography in a code space Splash ` +
      `has verified — map-dw can place ${placeableGeographies()}. map-native ships the ` +
      `"${geo.basemap}" basemap itself`
    );
  if (geo.matched < geo.total * MIN_JOIN_MATCH_RATE)
    return (
      `only ${geo.matched} of ${geo.total} rows match the ${geo.basemap} basemap — ` +
      `unmatched: ${geo.unmatched.join(", ")}`
    );
  return undefined;
}

export function assembleMapDw(brief: ProductionBrief): VerbResult<unknown> {
  if (!supportsMapDwType(brief.nativeType))
    return fail("invalid-request", mapDwTypeRefusal(brief.nativeType));

  const refusal = geoRefusal(brief.geo);
  if (refusal) return fail("invalid-request", refusal);
  const geo = brief.geo!;
  const dw = DW_BASEMAPS[geo.basemap]!;

  const { columns, numericColumns } = parseCsvRows(brief.dataCsv);
  const numeric = numericColumns.filter((c) => c !== geo.column);
  if (numeric.length === 0)
    return fail(
      "invalid-request",
      `a choropleth shades regions by a NUMBER, and no column besides "${geo.column}" holds ` +
        `one — columns: ${columns.join(", ")}`,
    );
  const resolved = valueFieldFor(numeric, brief.angle.confirmedTakeaway);
  if ("candidates" in resolved)
    return fail(
      "invalid-request",
      `several numeric columns could be the mapped value and the takeaway names none of ` +
        `them — candidates: ${resolved.candidates.join(", ")}`,
    );

  return ok({
    mapType: "choropleth",
    basemap: dw.basemap,
    mapKeyAttr: dw.mapKeyAttr,
    regionKey: geo.column,
    valueColumn: resolved.field,
    // The CSV verbatim: Datawrapper is handed the journalist's own table, not a re-serialized
    // one (setData posts this string).
    data: brief.dataCsv,
    title: brief.angle.confirmedTakeaway,
    altInsight: brief.angle.altInsight,
    source: {
      name: brief.attribution,
      ...(brief.sourceUrl ? { url: brief.sourceUrl } : {}),
    },
    ...(brief.lang ? { lang: brief.lang } : {}),
    // THE UNIT IS APPENDED, NEVER MULTIPLIED (map-spec.ts's own `unit` doc, probed live
    // 2026-07-12). Datawrapper suffixes this string to the legend value as-is, so a "%" unit
    // AND a "%" numberFormat token both render a percent sign and the legend reads "10% %".
    // This assembler therefore declares the percent EXACTLY ONCE — through `unit`, the field
    // the journalist's own angle carries — and emits NO numberFormat at all: it has no
    // editorial reason to override Datawrapper's own number formatting, and the only place
    // the two fields interact is the doubling this comment exists to prevent.
    ...(brief.angle.unit ? { unit: brief.angle.unit } : {}),
  });
}
