// choropleth-sweep.ts — HOW A CHOROPLETH'S REGIONS BECOME SWEEP MARKS.
//
// sweep-carrier.ts is pure and knows nothing about map types: it asks each mark for a value, a
// date, a position. This is the choropleth's own adapter — the one place that says which column
// holds the date and where a region "is".
//
// It exists because `time` and `space` were written in the core and unreachable from a
// choropleth: the component built its marks from `{name, value}` alone, so `carriersFor` could
// never offer them and every mark landed at 1. Two carriers written, tested, and impossible to
// choose.

import {
  carriersFor,
  type CarrierOffer,
  type SweepMark,
} from "./sweep-carrier";

const BARE_YEAR = /^\d{4}$/;

/**
 * A TEMPORAL COLUMN, READ AS SORTABLE NUMBERS — one scale for the whole column, never per cell.
 *
 * A bare year stays a year (2019 → 2019); anything else goes through Date.parse (ms since epoch).
 * The choice is made ACROSS the column, not cell by cell: mixing 2019 with 1_546_300_800_000 in
 * one set would put every year at the very start of the sweep and every date at the very end,
 * which is not an ordering — it is an artefact of two units. So the moment one cell is not a bare
 * year, every cell goes through Date.parse (which reads "2019" as 1 January 2019 anyway).
 *
 * A cell the parser cannot read returns undefined, and sweepStops lands that mark at the END —
 * placing it first would assert a rank the data never gave.
 */
export function parseSweepTimes(
  raw: readonly unknown[],
): (number | undefined)[] {
  const cells = raw.map((v) =>
    v === undefined || v === null ? "" : String(v).trim(),
  );
  const allBareYears = cells.every((c) => c === "" || BARE_YEAR.test(c));
  return cells.map((c) => {
    if (!c) return undefined;
    if (allBareYears) return Number(c);
    const ms = Date.parse(c);
    return Number.isNaN(ms) ? undefined : ms;
  });
}

export type ChoroplethMarkFields = {
  regionKey: string;
  valueField: string;
  /** The column holding each region's date — a year, or an ISO date. Optional: without it the
   *  `time` carrier is not offered, and the absence is explained rather than silently missing. */
  timeField?: string;
};

/**
 * The choropleth's rows, as the carriers need to see them.
 *
 * `centroidOf` is injected rather than derived here because the geometry only exists at render
 * time — the pre-render validator has rows and nothing else (see `choroplethCarriers`).
 */
export function choroplethSweepMarks(
  rows: readonly Record<string, unknown>[],
  fields: ChoroplethMarkFields,
  centroidOf: (key: string) => [number, number] | undefined,
): SweepMark[] {
  const times = fields.timeField
    ? parseSweepTimes(rows.map((r) => r[fields.timeField!]))
    : rows.map(() => undefined);
  return rows.map((r, i) => {
    const name = String(r[fields.regionKey] ?? "");
    const raw = Number(r[fields.valueField]);
    // NaN is a `number` to typeof, so an unparseable cell left unguarded would make
    // `carriersFor` offer `threshold` on a column that cannot drive it.
    const value = Number.isFinite(raw) ? raw : undefined;
    const at = centroidOf(name);
    const mark: SweepMark = { name };
    if (value !== undefined) mark.value = value;
    if (times[i] !== undefined) mark.time = times[i];
    if (at) {
      mark.lon = at[0];
      mark.lat = at[1];
    }
    return mark;
  });
}

/**
 * A stand-in position resolver for the PRE-RENDER check.
 *
 * `carriersFor` asks only whether a mark has a position, never where it is — and for a choropleth
 * the answer is structural: a region is a shape ON the basemap, so it has a centre as surely as
 * the map has the region. This answers that question and nothing else; the real centres are read
 * off the geometry at render time by `regionCentroids`. It is never used to compute a stop.
 */
export const EVERY_REGION_HAS_A_PLACE = (): [number, number] => [0, 0];

/**
 * WHICH CARRIERS THIS CONFIG CAN DRIVE, judged before any geometry is loaded — what the validator
 * refuses on, and what a proposal reads its options from.
 */
export function choroplethCarriers(
  rows: readonly Record<string, unknown>[],
  fields: ChoroplethMarkFields,
): CarrierOffer[] {
  return carriersFor(
    choroplethSweepMarks(rows, fields, EVERY_REGION_HAS_A_PLACE),
  );
}
