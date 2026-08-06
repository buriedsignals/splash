// sweep-marks.ts — a map config's OWN data, read as the marks a sweep would light.
//
// `carriersFor` (sweep-carrier.ts) decides which carriers a set of marks can drive. It is pure,
// and it knows nothing about configs: each component adapts its own rows/points to `SweepMark` at
// render time. This is that adaptation done off a config ON DISK, so the question "what can THIS
// map's data drive?" is answerable one turn before a journalist is asked to choose a carrier —
// the same posture as `can-carry-walk` and `narrative-kinds`, which exist because a capability
// asserted from memory is wrong eventually.
//
// A region table is NOT re-read here: `choropleth-sweep.ts` already adapts one, and it is what
// `validateChoroplethConfig` refuses on. A second reading of the same rows could offer a carrier
// the config would then be rejected for — two truths about one product, which is the failure this
// whole line of work exists to close.
//
// ★ IT READS, IT NEVER GUESSES. Two map types keep their marks OUT of the config — a route's are
// the territories the line crosses (computed at produce time against the injected geometry, see
// route-geo.ts's computeRoute) and a hex grid's are the cells (binned at produce time, see
// HexGridStory). For those the honest answer is "not readable here, and this is why", never a
// list assembled from whatever else the file happens to carry.

import {
  EVERY_REGION_HAS_A_PLACE,
  choroplethSweepMarks,
  parseSweepTimes,
} from "./choropleth-sweep";
import { MAP_TYPES, type MapType } from "./map-types";
import type { SweepMark } from "./sweep-carrier";

export type SweepMarksRead =
  /** The marks this config carries, and where in it they were read from. */
  | { ok: true; type: MapType; readFrom: string; marks: SweepMark[] }
  /**
   * No marks can be read. `type` names the map when the file IS one whose marks only exist
   * after produce; it is `null` when the file is not a map-native config at all, which is an
   * input problem rather than an answer about a map.
   */
  | { ok: false; type: MapType | null; why: string };

type Row = Record<string, unknown>;

/** A number the data really carries. `Number("n/a")` is NaN and `typeof NaN === "number"`, so an
 *  unguarded cell would offer a carrier that has nothing to advance on. Mirrors the guard
 *  `choroplethSweepMarks` applies to a region table. */
function finiteOf(raw: unknown): number | undefined {
  const n = Number(raw);
  return Number.isFinite(n) && !(typeof raw === "string" && !raw.trim())
    ? n
    : undefined;
}

/**
 * A POINT SET, as the carriers need to see it — the one adaptation a region table's own adapter
 * cannot do, because a point carries its position in the file rather than in the geometry.
 *
 * The temporal column goes through `parseSweepTimes`, the same reader the choropleth uses: one
 * notion of "a declared date column", so a year and an ISO date are not read two ways depending
 * on which map type asked.
 */
function pointMarks(
  rows: readonly Row[],
  opts: { valueField?: string; timeField?: string },
): SweepMark[] {
  const times = opts.timeField
    ? parseSweepTimes(rows.map((r) => r[opts.timeField!]))
    : rows.map(() => undefined);
  return rows.map((r, i) => {
    const mark: SweepMark = { name: String(r.label ?? `#${i + 1}`) };
    const value = opts.valueField ? finiteOf(r[opts.valueField]) : undefined;
    if (value !== undefined) mark.value = value;
    if (times[i] !== undefined) mark.time = times[i];
    const lon = finiteOf(r.lon);
    const lat = finiteOf(r.lat);
    if (lon !== undefined && lat !== undefined) {
      mark.lon = lon;
      mark.lat = lat;
    }
    return mark;
  });
}

function rowsOf(config: Row, key: string): Row[] | undefined {
  const raw = config[key];
  if (!Array.isArray(raw)) return undefined;
  return raw.filter((r): r is Row => !!r && typeof r === "object");
}

/**
 * WHAT THIS CONFIG'S DATA CAN BE READ AS, for the sweep.
 *
 * The type comes from the config's own discriminator, with choropleth as the default because
 * that is what `mount.tsx` does — a choropleth config carries no `type` at all.
 *
 * ★ The temporal column is the one the config DECLARES (`timeField`). Nothing here sniffs a
 * column for date-shaped strings: a carrier offered off a guess is a carrier the render may not
 * be able to drive, and the journalist would have no way to know which column it meant.
 */
export function sweepMarksFrom(config: unknown): SweepMarksRead {
  if (!config || typeof config !== "object" || Array.isArray(config))
    return {
      ok: false,
      type: null,
      why: "this file does not hold a map config — expected a JSON object",
    };
  const c = config as Row;
  const declared = c.type;
  if (declared !== undefined && typeof declared !== "string")
    return {
      ok: false,
      type: null,
      why: "the config's `type` is not a string",
    };
  // No `type` at all is the choropleth's own shape (mount.tsx's default) — but only when the
  // file actually looks like one. Without this, a chart config would be read as a choropleth
  // with no rows and answered as if it were a map with no data.
  const type = (declared ?? "choropleth") as string;
  if (!(MAP_TYPES as readonly string[]).includes(type))
    return {
      ok: false,
      type: null,
      why: `this is not a map-native config: "${type}" is not one of ${MAP_TYPES.join(", ")}`,
    };
  if (declared === undefined && !Array.isArray(c.rows))
    return {
      ok: false,
      type: null,
      why: "this file declares no `type` and carries no `rows` — it is not a map-native config",
    };

  const timeField = typeof c.timeField === "string" ? c.timeField : undefined;

  switch (type as MapType) {
    // Region tables — read by the choropleth's OWN adapter (choropleth-sweep.ts), never by a
    // second reading of the same rows. That adapter is what the validator refuses on, so a
    // proposal composed from anything else could offer a carrier the config would then be
    // rejected for. `EVERY_REGION_HAS_A_PLACE` is its pre-render stand-in for a position: a
    // region is a shape ON the basemap, so it has a centre as surely as the map has the region —
    // true of a dot-density's regions exactly as of a choropleth's.
    case "choropleth":
    case "dot-density": {
      const rows = rowsOf(c, "rows");
      const regionKey =
        typeof c.regionKey === "string" ? c.regionKey : undefined;
      if (!rows || !regionKey)
        return {
          ok: false,
          type: type as MapType,
          why: "this config carries no `rows` joined by a `regionKey`, so it has no marks to read",
        };
      return {
        ok: true,
        type: type as MapType,
        readFrom: "rows",
        marks: choroplethSweepMarks(
          rows,
          {
            regionKey,
            // A dot-density can be uni-variate (dots per region, no column): no value field
            // means no value, which is the honest input to `carriersFor`.
            valueField: typeof c.valueField === "string" ? c.valueField : "",
            ...(timeField ? { timeField } : {}),
          },
          EVERY_REGION_HAS_A_PLACE,
        ),
      };
    }

    // A cartogram's rows are regions too — the same adapter, pointed at the column names this
    // type uses (`values`, keyed by `id`, valued by `value`).
    case "cartogram": {
      const rows = rowsOf(c, "values");
      if (!rows)
        return {
          ok: false,
          type: "cartogram",
          why: "this config carries no `values`, so it has no marks to read",
        };
      const labelField =
        typeof c.labelField === "string" ? c.labelField : undefined;
      return {
        ok: true,
        type: "cartogram",
        readFrom: "values",
        marks: choroplethSweepMarks(
          rows,
          {
            regionKey: labelField ?? "id",
            valueField: "value",
            ...(timeField ? { timeField } : {}),
          },
          EVERY_REGION_HAS_A_PLACE,
        ),
      };
    }

    // Point sets: the position is IN the file, one per mark, rather than in the geometry.
    case "symbol": {
      const points = rowsOf(c, "points");
      if (!points)
        return {
          ok: false,
          type: "symbol",
          why: "this config carries no `points`, so it has no marks to read",
        };
      return {
        ok: true,
        type: "symbol",
        readFrom: "points",
        marks: pointMarks(points, {
          valueField: "value",
          ...(timeField ? { timeField } : {}),
        }),
      };
    }

    case "locator": {
      const markers = rowsOf(c, "markers");
      if (!markers)
        return {
          ok: false,
          type: "locator",
          why: "this config carries no `markers`, so it has no marks to read",
        };
      return {
        ok: true,
        type: "locator",
        readFrom: "markers",
        // A locator marker has no value by design (locator-geo.ts: markers are UNIFORM size,
        // category is the only per-marker variable), so no value column is read for one.
        marks: pointMarks(markers, timeField ? { timeField } : {}),
      };
    }

    // The two types whose marks are NOT in the file. Answered, not guessed.
    case "route":
      return {
        ok: false,
        type: "route",
        why:
          "a route map's marks are the territories the line crosses, and they exist only once " +
          "the route is run against the map's geometry at produce time (route-geo.ts) — so what " +
          "they can drive cannot be read from this config",
      };
    case "hex-grid":
      return {
        ok: false,
        type: "hex-grid",
        why:
          "a hex grid's marks are its cells, and they exist only once the points are binned at " +
          "produce time — the file carries the points that feed them, not the marks themselves",
      };
  }
}
