// THE REGION FAMILY — choropleth, cartogram, dot-density. map-native validates a CONFIG and has
// no spec layer of its own, so this assembler composes the whole config: it reads the geography
// already measured in orient (brief.geo) rather than re-measuring it, and it makes the two
// judgment calls the design spec (§4.2) requires to be visible in code, not buried in a mapper.
import { fail, ok, type VerbResult } from "../../core/verbs";
import type { ProductionBrief, GeoMatch } from "../../core/production-brief";
import { parseCsvRows } from "../profile";
import { BASEMAP_NAMES } from "../../../skills/map-native/src/basemaps";

const REGION_TYPES = new Set(["choropleth", "cartogram", "dot-density"]);

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
 *  phrase, not word-by-word, so the boundary sits at the START and END of the full phrase. */
function valueFieldFor(
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
      `this data carries no geography Splash can place — the shipped basemaps are ` +
      `${BASEMAP_NAMES.join(" and ")}, and no column matched either of them`
    );
  if (geo.matched * 2 < geo.total)
    return (
      `only ${geo.matched} of ${geo.total} rows match the ${geo.basemap} basemap — ` +
      `unmatched: ${geo.unmatched.join(", ")}`
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

export function assembleMapNative(brief: ProductionBrief): VerbResult<unknown> {
  if (!REGION_TYPES.has(brief.nativeType))
    return fail(
      "invalid-request",
      `this assembler builds the region family (choropleth, cartogram, dot-density) — ` +
        `"${brief.nativeType}" is not one of them`,
    );

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
    const values = rows.map((row) => ({
      id: row[geo.column]!,
      value: Number(row[valueField]),
    }));
    return ok({
      type: "cartogram",
      values,
      title,
      description,
      source,
      ...(unit ? { valueUnit: unit } : {}),
    });
  }

  if (brief.nativeType === "dot-density") {
    return ok({
      type: "dot-density",
      regionKey: geo.column,
      // No validator branch checks this field (DotDensityConfigShape types it `string` with
      // no format constraint) — the matched basemap name is the only value on hand that names
      // the geography this join happened against. See task-5-report.md for the open question.
      boundaries: geo.basemap,
      rows: typedRows(rows, numeric),
      valueField,
      basemap: geo.basemap,
      title,
      description,
      source,
    });
  }

  return ok({
    type: "choropleth",
    regionKey: geo.column,
    valueField,
    rows: typedRows(rows, numeric),
    basemap: geo.basemap,
    title,
    description,
    source,
    ...(unit ? { unit } : {}),
  });
}
