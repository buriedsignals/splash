// Beat derivation for hex-grid videos — the sibling of deriveDotDensityStory. title → establish
// (all cells) → reveal the HIGHEST cells (by aggregate, descending, capped) → takeaway. Cells are
// anonymous grid cells, so a reveal caption is value + rank ("18 points — the densest hexagon"). The
// camera STAYS framed on the data zone: a reveal expands the cell bbox to >= 50% of the full extent so
// it never over-zooms to a single cell (the locator camera lesson).
//
// Claim-arc (S2, map-storyboard-and-video-geography Task 5): hex-grid is the one arc-capable
// type whose anchors are COMPUTED, not declared — see map-arc.ts's ARC_CAPABLE_MAP_TYPES
// comment and MapArcBeat's lon/lat doc. A journalist names a PLACE (a free-text label plus its
// coordinates); the resolution below finds the cell that CONTAINS that coordinate by
// point-in-polygon, entirely against `layout.cells` — the POPULATED cells computeHexGrid
// already dropped every empty one from. So "the place falls in an empty cell" and "the place
// falls outside the grid's bbox entirely" are the SAME case here (neither has a populated cell
// containing it) and get the SAME refusal: option (a) of the task's Step 1 — refuse by name,
// never silently snap to the nearest populated cell (that would move the journalist's camera
// somewhere they did not point it) and never silently frame an empty area (that would assert a
// story beat with no data behind it — this deriver's whole contract, established/ranked/arc
// alike, is "every beat is backed by real bins"). Mirrors every other anchor in this plan: a
// beat names something the data has, or it is refused, by name, with the real way out.
import type { Beat, MapArcBeat } from "./map-story";
import { closingCaption, deriveBinTakeawayCopy } from "./map-story";
import type { HexGridLayout } from "./hex-grid-geo";
import { bbox, booleanPointInPolygon, point as turfPoint } from "@turf/turf";
import { labelWithUnit, localizeValueLabel } from "./core/locale";
import { storyCopy } from "../../../lib/core/story-copy";

export interface HexGridStoryMeta {
  title: string;
  description?: string;
  insight?: string;
  lang?: string;
  // Journalist-confirmed claim-arc override (S2) — see map-arc.ts's MapArcBeat.lon/lat doc
  // and this file's own header comment. When present + non-empty, the reveal beats follow the
  // arc (in the ARC's order) instead of the value-ranked selection below; absent/empty leaves
  // today's ranked walk byte-identical.
  arcBeats?: MapArcBeat[];
}

const DEFAULT_MAX_REVEALS = 5;

// Expand a cell bbox so its span is at least `minFrac` of the full extent (centred on the cell).
// Exported so a caller resolving an arc's own camera outside this file (and this file's own
// tests) can reproduce the SAME framing rather than a re-derived copy — mirrors route-story.ts's
// exported routeArcCamera.
export function frameCell(
  cell: [number, number, number, number],
  full: [number, number, number, number],
  minFrac = 0.5,
): [number, number, number, number] {
  const [cw, cs, ce, cn] = cell;
  const [fw, fs, fe, fn] = full;
  const cx = (cw + ce) / 2,
    cy = (cs + cn) / 2;
  const halfW = Math.max((ce - cw) / 2, ((fe - fw) * minFrac) / 2);
  const halfH = Math.max((cn - cs) / 2, ((fn - fs) * minFrac) / 2);
  return [cx - halfW, cy - halfH, cx + halfW, cy + halfH];
}

// The index of the (populated) cell containing (lon, lat), or null when no cell does —
// either because the point falls in a bin computeHexGrid dropped for having no points, or
// because it falls outside the grid's bbox entirely (see this file's header comment: the
// two cases are indistinguishable from `layout.cells` alone, and are refused identically).
function findContainingCellIndex(
  layout: HexGridLayout,
  lon: number,
  lat: number,
): number | null {
  const pt = turfPoint([lon, lat]);
  for (let i = 0; i < layout.cells.length; i++) {
    if (
      booleanPointInPolygon(
        pt,
        layout.cells[i].feature as GeoJSON.Feature<GeoJSON.Polygon>,
      )
    )
      return i;
  }
  return null;
}

// Turn a journalist-confirmed claim-arc into ORDERED reveal Beats — the hex-grid analogue of
// applyMapArc (map-story.ts), reimplemented locally rather than reusing it because applyMapArc's
// `resolve(region: string)` has no seam for the coordinate pair a hex-grid anchor needs (see
// this file's header comment and MapArcBeat's lon/lat doc in map-arc.ts). `region` is the
// journalist's own place NAME, carried straight into the callout — never a lookup key, since no
// name-to-cell registry exists to look one up in. Every anchor is required to carry lon/lat and
// resolve to a POPULATED cell (findContainingCellIndex above) — an anchor that doesn't is
// refused BY NAME (Step 1, option (a): never silently snap to the nearest cell, never silently
// frame the empty area). The camera reuses frameCell — the SAME >= 50%-of-extent framing the
// ranked walk below uses, so an arc-confirmed reveal never over-zooms either.
function resolveHexGridArc(
  layout: HexGridLayout,
  arcBeats: MapArcBeat[],
  fmt: (v: number) => string,
): Beat[] {
  const full = layout.bounds;
  return arcBeats.map((b) => {
    if (typeof b.lon !== "number" || typeof b.lat !== "number")
      throw new Error(
        `hex-grid arcBeats: "${b.region}" has no (lon, lat) — a hex-grid anchor is a place, ` +
          "and a place needs coordinates to resolve against the binned grid.",
      );
    const idx = findContainingCellIndex(layout, b.lon, b.lat);
    if (idx === null)
      throw new Error(
        `hex-grid arcBeats: "${b.region}" (${b.lon}, ${b.lat}) — no data at that place; the ` +
          `grid is empty there. The ${layout.cells.length} populated cells span roughly ` +
          `[${full[0].toFixed(2)}, ${full[1].toFixed(2)}] to [${full[2].toFixed(2)}, ${full[3].toFixed(2)}] — ` +
          "point the beat at a place inside that data.",
      );
    const cell = layout.cells[idx];
    const cellBbox = bbox(cell.feature) as [number, number, number, number];
    const text = b.text ?? "";
    return {
      kind: "reveal",
      camera: frameCell(cellBbox, full),
      highlight: [String(idx)],
      dim: true,
      callout: {
        region: String(idx),
        name: b.region,
        value: fmt(cell.value),
        text,
      },
      copy: text,
      role: b.role,
      authored: true,
    };
  });
}

export function deriveHexGridStory(
  layout: HexGridLayout,
  meta: HexGridStoryMeta,
  opts: { maxReveals?: number } = {},
): Beat[] {
  const cap = Math.max(1, opts.maxReveals ?? DEFAULT_MAX_REVEALS);
  const full = layout.bounds;
  // The unit only applies to sum/mean — those aggregate the points' VALUE column, which the
  // unit describes (e.g. "kWh"). "count" aggregates the points THEMSELVES, already named by
  // the "points" word below; appending a value unit there would misdescribe the number.
  const unit = layout.valueUnit ?? "";
  const copy = storyCopy(meta.lang);
  const fmt = (v: number) =>
    layout.aggregate === "mean"
      ? copy.meanOf(
          labelWithUnit(localizeValueLabel(v, meta.lang), unit, meta.lang),
        )
      : layout.aggregate === "sum"
        ? labelWithUnit(
            localizeValueLabel(Math.round(v), meta.lang),
            unit,
            meta.lang,
          )
        : copy.pointCount(localizeValueLabel(Math.round(v), meta.lang));

  // Value-descending, ONE sort, two readers: the ranked walk below slices its reveals off the
  // front, and the closer reads the peak. Same comparator (and same index tie-break) the walk
  // always used, so the reveal order is byte-identical.
  const ranked = layout.cells
    .map((c, i) => ({ c, i }))
    .sort((a, b) => b.c.value - a.c.value || a.i - b.i);

  const beats: Beat[] = [];
  beats.push({
    kind: "title",
    camera: full,
    highlight: [],
    dim: false,
    callout: null,
    copy: meta.title,
  });
  beats.push({
    kind: "establish",
    camera: full,
    highlight: [],
    dim: false,
    callout: null,
    copy: "",
  });

  if (meta.arcBeats?.length) {
    // Journalist-confirmed claim-arc override — the reveals follow the ARC order, resolved
    // by place (lon/lat → containing cell), not the value-ranked selection below. See this
    // file's header comment and resolveHexGridArc's own doc.
    beats.push(...resolveHexGridArc(layout, meta.arcBeats, fmt));
  } else {
    ranked.slice(0, cap).forEach(({ c, i }, rank) => {
      const cellBbox = bbox(c.feature) as [number, number, number, number];
      // Furniture — the rank AND its bin noun come out of the locale table together, because
      // the two cannot be concatenated across languages ("the densest hexagon", but
      // "l'hexagone le plus dense"). Inline, this was English in every deliverable.
      const desc = copy.densestBin(rank + 1, layout.binShape);
      const value = fmt(c.value);
      const text = `${value} — ${desc}`;
      beats.push({
        kind: "reveal",
        camera: frameCell(cellBbox, full),
        highlight: [String(i)],
        dim: true,
        callout: { region: String(i), name: desc, value, text },
        copy: text,
      });
    });
  }

  // A grid's bins have no names and — across `count`/`sum`/`mean` — no total that is true for
  // all three, so the honest close is the PEAK against the population it leads
  // (`deriveBinTakeawayCopy`). The peak's value goes through this deriver's own `fmt`, so the
  // close speaks the aggregate's own words ("18 points", "12 kWh avg") rather than a second
  // formatting of the same number.
  //
  // Measured before this: with no `insight` the copy was "", and the page closed on the figure's
  // DESCRIPTION — its own opening card, verbatim.
  const peak = ranked[0]?.c;
  beats.push({
    kind: "takeaway",
    camera: full,
    highlight: [],
    dim: false,
    callout: null,
    copy: closingCaption(
      meta.insight,
      meta.title,
      peak
        ? deriveBinTakeawayCopy({
            peakLabel: fmt(peak.value),
            binCount: layout.cells.length,
            binShape: layout.binShape,
            lang: meta.lang,
          })
        : "",
    ),
  });

  return beats;
}
