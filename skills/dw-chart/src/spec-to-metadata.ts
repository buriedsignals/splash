import type { ChartSpec } from "./chart-spec";
import {
  ANNOTATION_UNSUPPORTED_TYPES,
  ANNOTATION_UNMAPPED_BAR_TYPES,
  DEFAULT_BASE_COLOR,
  MULTI_SERIES_TYPES,
  SCATTER_ANNOTATION_TYPES,
  normalizeNumberFormat,
  type ChartType,
} from "./chart-spec";
import {
  dataShape,
  parseCsvRecords,
  renameColumns,
  scatterColumns,
  scatterPointAt,
  sortCsv,
  valueAt,
} from "./csv";
import { applyValueLabels, hasValueLabelControl } from "./value-label-safety";

// Line/area chart types whose default "direct labelling" puts the series name at
// the line end — the clip/overlap source on a single series (the title + subtitle
// already name it, and DW reserves no right gutter for the wrapped label).
const LINE_LIKE_TYPES = new Set<ChartType>([
  "d3-lines",
  "multiple-lines",
  "d3-area",
]);

// A single value column means a single series: the title/subtitle already name
// it, so the line-end direct label adds nothing and is the clip source.
function isSingleSeries(spec: ChartSpec): boolean {
  if (MULTI_SERIES_TYPES.has(spec.type)) return false;
  const csv = spec.seriesLabels
    ? renameColumns(spec.data, spec.seriesLabels)
    : spec.data;
  return dataShape(csv).columns.length <= 2; // 1 label + 1 value
}

// The plot's x/y domain, read from the resolved CSV, so an annotation's point can
// be placed as a fraction (0..1) of the plot. x is categorical on a line chart:
// its fraction is the row index over (rows - 1). y is the numeric value domain.
interface PlotDomain {
  labels: string[];
  yMin: number;
  yMax: number;
}
function plotDomain(csv: string, yColumn?: string): PlotDomain {
  const records = parseCsvRecords(csv.trim());
  const header = (records[0] ?? []).map((c) => c.trim());
  const rows = records.slice(1);
  const labels = rows.map((r) => r[0]?.trim() ?? "");
  // Scatter passes its Y column so the domain is the y-axis ALONE — its x and y are
  // DIFFERENT numeric columns, so slurping every column (below) would fold the x range
  // (e.g. GDP) into the y domain (life-expectancy) and push every annotation off-canvas.
  // For the category-x / value-y types (no yColumn) the domain is every value column.
  const yIdx = yColumn ? header.indexOf(yColumn) : -1;
  const values: number[] = [];
  for (const r of rows) {
    if (yIdx >= 1) {
      const n = Number(r[yIdx]);
      if (Number.isFinite(n)) values.push(n);
    } else {
      for (const cell of r.slice(1)) {
        const n = Number(cell);
        if (Number.isFinite(n)) values.push(n);
      }
    }
  }
  const yMin = values.length ? Math.min(...values) : 0;
  const yMax = values.length ? Math.max(...values) : 1;
  return { labels, yMin, yMax };
}

function pointFraction(
  dom: PlotDomain,
  x: string | number | undefined,
  y: number | undefined,
): { xFrac: number; yFrac: number } {
  const idx = x !== undefined ? dom.labels.indexOf(String(x).trim()) : -1;
  const xFrac =
    idx >= 0 && dom.labels.length > 1 ? idx / (dom.labels.length - 1) : 0.5;
  // yFrac is 0 at the TOP of the plot (high value) → 1 at the bottom, matching the
  // quadrant model in placeAnnotation.
  const span = dom.yMax - dom.yMin;
  const yFrac = y !== undefined && span > 0 ? (dom.yMax - y) / span : 0.5;
  return { xFrac, yFrac };
}

// The series as a polyline in fractional plot coords: x = row index / (n-1) left
// → right; y = 0 at the top (max value) → 1 at the bottom (min value). Only the
// column pinned by the annotation is walked (or the first value column).
export function seriesPolyline(
  csv: string,
  dom: PlotDomain,
  column?: string,
): { xFrac: number; yFrac: number }[] {
  const records = parseCsvRecords(csv.trim());
  const header = (records[0] ?? []).map((c) => c.trim());
  const colIdx = column ? Math.max(1, header.indexOf(column)) : 1;
  const span = dom.yMax - dom.yMin;
  const pts: { xFrac: number; yFrac: number }[] = [];
  const rows = records.slice(1);
  rows.forEach((cells, i) => {
    const v = Number(cells[colIdx]);
    if (!Number.isFinite(v)) return;
    const xFrac = rows.length > 1 ? i / (rows.length - 1) : 0.5;
    const yFrac = span > 0 ? (dom.yMax - v) / span : 0.5;
    pts.push({ xFrac, yFrac });
  });
  return pts;
}

// A label box in fractional plot coords (x,y each 0..1; y=0 is the plot TOP).
interface FracBox {
  xL: number;
  xR: number;
  top: number; // smaller yFrac (higher on screen)
  bottom: number; // larger yFrac (lower on screen)
}

// Does the plotted series pass through the INTERIOR of a fractional box? The anchor
// data point sits on the line at a CORNER of every candidate box, so corner/edge
// contact is expected and must NOT count — only a sample strictly inside (by `tol`)
// means the label body would overlap the curve. Sampled densely along each segment.
function lineCrossesBox(
  poly: { xFrac: number; yFrac: number }[],
  box: FracBox,
  tol = 0.01,
): boolean {
  const xL = box.xL + tol;
  const xR = box.xR - tol;
  const top = box.top + tol;
  const bot = box.bottom - tol;
  if (xR <= xL || bot <= top) return false;
  for (let i = 0; i + 1 < poly.length; i++) {
    const a = poly[i];
    const b = poly[i + 1];
    const steps = 24;
    for (let s = 0; s <= steps; s++) {
      const x = a.xFrac + ((b.xFrac - a.xFrac) * s) / steps;
      const y = a.yFrac + ((b.yFrac - a.yFrac) * s) / steps;
      if (x > xL && x < xR && y > top && y < bot) return true;
    }
  }
  return false;
}

// DECIDE where an annotation label sits, in a WIDTH-INVARIANT way. With dx=dy=0 the
// label box is anchored AT the data point and extends into one quadrant (up/down ×
// left/right/centre). We pick the quadrant whose box is clear of the plotted series
// (so the label never sits ON the curve) and needs the least axis headroom, then
// return the DW `align` plus how far the chosen box spills past the top/bottom of the
// data range (as a fraction of the y-span) — the caller extends the axis by that much
// so the label has real whitespace to occupy at EVERY render width. Horizontal spill
// is left to Datawrapper's own annotation clamp (it keeps text on-canvas), so only the
// vertical axis needs extending. Deterministic: same geometry → same placement.
export interface Placement {
  align: string; // DW anchor, e.g. "br"
  headroomTopFrac: number; // extend y-axis ABOVE data max by this × span (>=0)
  headroomBottomFrac: number; // extend BELOW data min by this × span (>=0)
}
export function placeAnnotation(
  polys:
    { xFrac: number; yFrac: number }[] | { xFrac: number; yFrac: number }[][],
  anchorX: number,
  anchorY: number,
  labelSpanFrac = 0.42,
): Placement {
  // Accept a single polyline (single-series) OR an array of polylines (multi-series).
  // On a multi-series chart a label must clear EVERY plotted line, not just its own —
  // otherwise it sits on a sibling series. Normalise to an array of polylines.
  const lines: { xFrac: number; yFrac: number }[][] =
    polys.length > 0 && Array.isArray((polys as unknown[])[0])
      ? (polys as { xFrac: number; yFrac: number }[][])
      : [polys as { xFrac: number; yFrac: number }[]];
  const hFrac = 0.09; // label height as a fraction of plot height (bold, + gap)
  // Candidate quadrants. vUp = box sits ABOVE the point (DW anchor bottom → "b");
  // vDown = below (anchor top → "t"). h="r": box extends LEFT (anchor right); h="l":
  // extends RIGHT; h="c": centred.
  const verticals = [
    { up: true, v: "b" },
    { up: false, v: "t" },
  ];
  const horizontals = [
    { key: "r", from: -labelSpanFrac, to: 0 },
    { key: "l", from: 0, to: labelSpanFrac },
    { key: "c", from: -labelSpanFrac / 2, to: labelSpanFrac / 2 },
  ];
  let best: {
    align: string;
    top: number;
    bottom: number;
    cost: number;
  } | null = null;
  for (const vert of verticals) {
    const top = vert.up ? anchorY - hFrac : anchorY;
    const bottom = vert.up ? anchorY : anchorY + hFrac;
    for (const hz of horizontals) {
      const box: FracBox = {
        xL: anchorX + hz.from,
        xR: anchorX + hz.to,
        top,
        bottom,
      };
      if (lines.some((line) => lineCrossesBox(line, box))) continue; // clear EVERY series
      const headTop = Math.max(0, -box.top); // spills above the plot top
      const headBot = Math.max(0, box.bottom - 1); // spills below the plot bottom
      // Horizontal spill is ASYMMETRIC in Datawrapper (measured): it CLAMPS a label
      // that would run off the LEFT back on-canvas, but lets a label overflow off the
      // RIGHT (it renders past the frame → a real clip). So a right overflow must
      // DOMINATE the cost (any on-canvas placement beats it), while a left overflow is
      // cheap (DW absorbs it; only mildly penalised so we don't bury the label under
      // the y-axis). Vertical spill (headroom) is NOT a clip — the axis is extended to
      // absorb it — so it is cheap too. All else equal, prefer the label ABOVE the
      // curve (reads better) via a small down-bias.
      const rightOverflow = Math.max(0, box.xR - 1);
      const leftOverflow = Math.max(0, -box.xL);
      const cost =
        rightOverflow * 20 +
        leftOverflow * 1 +
        (headTop + headBot) * 3 +
        (vert.up ? 0 : 0.3);
      if (!best || cost < best.cost)
        best = {
          align: `${vert.v}${hz.key}`,
          top: box.top,
          bottom: box.bottom,
          cost,
        };
    }
  }
  // Degenerate fallback (every quadrant crosses the line — a label wider than the
  // local relief): place above, centred, and let the measured remediation + headroom
  // in produce() resolve it. Never returns a placement that we know sits on the line
  // when a clear one exists.
  if (!best) {
    const top = anchorY - hFrac;
    return {
      align: "bc",
      headroomTopFrac: Math.max(0, -top),
      headroomBottomFrac: 0,
    };
  }
  return {
    align: best.align,
    headroomTopFrac: Math.max(0, -best.top),
    headroomBottomFrac: Math.max(0, best.bottom - 1),
  };
}

// Interpolate the series' yFrac at an arbitrary xFrac (linear between vertices).
function lineYAt(
  poly: { xFrac: number; yFrac: number }[],
  xFrac: number,
): number | undefined {
  if (!poly.length) return undefined;
  if (xFrac <= poly[0].xFrac) return poly[0].yFrac;
  if (xFrac >= poly[poly.length - 1].xFrac) return poly[poly.length - 1].yFrac;
  for (let i = 0; i + 1 < poly.length; i++) {
    const a = poly[i];
    const b = poly[i + 1];
    if (xFrac >= a.xFrac && xFrac <= b.xFrac) {
      const t =
        b.xFrac === a.xFrac ? 0 : (xFrac - a.xFrac) / (b.xFrac - a.xFrac);
      return a.yFrac + t * (b.yFrac - a.yFrac);
    }
  }
  return poly[poly.length - 1].yFrac;
}

// The series' yFrac extent over the horizontal band the label body occupies.
// A right-anchored label extends LEFT of the anchor, a left-anchored one RIGHT.
// Returns the min (highest) and max (lowest) line yFrac across that band — the
// vertical slab the label must clear to sit in whitespace.
function lineExtentOverLabel(
  poly: { xFrac: number; yFrac: number }[],
  anchorX: number,
  horiz: "l" | "c" | "r",
  wFrac: number,
): { yMin: number; yMax: number } {
  const from = horiz === "r" ? -wFrac : horiz === "l" ? 0 : -wFrac / 2;
  const to = from + wFrac;
  let yMin = Infinity;
  let yMax = -Infinity;
  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    const xf = anchorX + from + ((to - from) * i) / steps;
    const y = lineYAt(poly, Math.min(1, Math.max(0, xf)));
    if (y === undefined) continue;
    yMin = Math.min(yMin, y);
    yMax = Math.max(yMax, y);
  }
  return { yMin, yMax };
}

// Choose the vertical side (above vs below the anchor) AND the displacement (in
// plot-height fractions) that puts the WHOLE label in whitespace, off the curve.
// Deterministic and consistent with the render guardrail: the displacement clears
// the line's full vertical excursion over the label's horizontal band (so a wide
// label over a steep line is pushed far enough), and the side is chosen so the
// label does not run off the padded plot. `dyFrac` is signed (negative = up); the
// caller scales it to pixels by the estimated plot height.
export function clearVerticalSide(
  poly: { xFrac: number; yFrac: number }[],
  anchorX: number,
  anchorY: number,
  labelSpanFrac = 0.48,
  horiz: "l" | "c" | "r" = "c",
): { v: "t" | "b"; dySign: number; dyFrac: number; horiz: "l" | "c" | "r" } {
  const hFrac = 0.06; // ~one bold line-height as a fraction of plot height
  const gap = 0.09; // clear gap between the line and the nearest label edge
  const AXIS_PAD = 0.08; // DW pads the numeric axis beyond the data extent
  if (poly.length < 2)
    return { v: "t", dySign: -1, dyFrac: -(hFrac + gap), horiz };

  // Evaluate one horizontal extension direction: the vertical push each side needs
  // to clear the line under the label, whether that side fits the padded plot, and
  // a penalty (clip = huge, else the displacement magnitude). Extending the label
  // toward the GENTLER slope needs a smaller push — so we also try the opposite
  // horizontal anchor and keep whichever placement is cheapest.
  const evalHoriz = (hz: "l" | "c" | "r") => {
    const { yMin, yMax } = lineExtentOverLabel(
      poly,
      anchorX,
      hz,
      labelSpanFrac,
    );
    // Horizontal box extent, to penalise a label running off the left/right edge
    // (r → extends left, l → right, c → half each way).
    const x0 =
      hz === "r"
        ? anchorX - labelSpanFrac
        : hz === "l"
          ? anchorX
          : anchorX - labelSpanFrac / 2;
    const hClip = x0 < 0 || x0 + labelSpanFrac > 1;
    if (!Number.isFinite(yMin) || !Number.isFinite(yMax))
      return {
        hz,
        below: false,
        dyFrac: -(hFrac + gap),
        cost: (hClip ? 10 : 0) + hFrac + gap,
      };
    const upFrac = anchorY - yMin + gap; // upward near-edge travel
    const downFrac = yMax - anchorY + gap; // downward near-edge travel
    const fitsAbove = anchorY - upFrac - hFrac >= -AXIS_PAD;
    const fitsBelow = anchorY + downFrac + hFrac <= 1 + AXIS_PAD;
    let below: boolean;
    if (fitsAbove && !fitsBelow) below = false;
    else if (fitsBelow && !fitsAbove) below = true;
    else below = downFrac < upFrac;
    const dyFrac = below ? downFrac + hFrac / 2 : -(upFrac + hFrac / 2);
    const travel = below ? downFrac : upFrac;
    const vClip = below ? !fitsBelow : !fitsAbove;
    // Vertical or horizontal clipping is a hard penalty; else prefer the smaller
    // vertical push (keeps the label tighter to its data point).
    return {
      hz,
      below,
      dyFrac,
      cost: (vClip ? 10 : 0) + (hClip ? 10 : 0) + travel,
    };
  };

  // Candidate horizontal anchors: the requested one, plus — for an INTERIOR anchor
  // — its mirror (l↔r) and CENTER, so a near-apex label can extend toward the
  // calmer side of the curve or straddle the apex (half the width each way, so it
  // clears the descending arms with a small push and stays on-canvas). Near a plot
  // edge the horizontal anchor is fixed by edge-clamping (flipping it would push
  // the label off-canvas), so only widen the choice when the anchor is interior.
  const NEAR_EDGE = 0.15;
  const interior = anchorX > NEAR_EDGE && anchorX < 1 - NEAR_EDGE;
  const mirror: Record<string, "l" | "c" | "r"> = { l: "r", r: "l", c: "c" };
  const candidates = [evalHoriz(horiz)];
  if (interior) {
    if (mirror[horiz] !== horiz) candidates.push(evalHoriz(mirror[horiz]));
    if (horiz !== "c") candidates.push(evalHoriz("c"));
  }
  candidates.sort((a, b) => a.cost - b.cost);
  const best = candidates[0];
  return best.below
    ? { v: "b", dySign: 1, dyFrac: best.dyFrac, horiz: best.hz }
    : { v: "t", dySign: -1, dyFrac: best.dyFrac, horiz: best.hz };
}

// The horizontal position (0..1, left→right) of an annotation's data-x within the
// plotted row range — the same mapping DW uses to place the connector origin.
// Exposed so produce() can recover the on-curve ANCHOR x-pixel at the measured
// export width (map this fraction onto the measured series x-extent), independent
// of any dx the label carries. Width-independent by construction.
export function annotationXFrac(
  csv: string,
  x: string | number | undefined,
): number {
  const dom = plotDomain(csv);
  return pointFraction(dom, x, undefined).xFrac;
}

export interface DwPatch {
  title: string;
  type: string;
  /** DW chart language (BCP-47 regional, e.g. "fr-FR"). Datawrapper localizes number
   *  + date formatting from this field. Absent → DW default (en-US). */
  language?: string;
  metadata: {
    describe: Record<string, unknown>;
    visualize: Record<string, unknown>;
    data?: Record<string, unknown>;
    // The self-built, localized "Source : X" line for non-English deliverables (see
    // sourceNotes below) — DW's own "Source:" caption cannot be relocalized.
    annotate: { notes: string };
  };
}

// SOURCE-LABEL i18n (verified-bug fix), MIRRORED from map-dw — the canonical
// implementation + live-API verification live in skills/map-dw/src/spec-to-map-metadata.ts
// (kept duplicated per-skill on purpose; see that file before changing either copy).
// Datawrapper's own auto-rendered "Source:" caption prefix does NOT localize via the
// chart `language` field — verified LIVE against the real API (3 independently created
// charts, 2 chart types, both created-with and patched-after language:"fr-FR"/"fr"):
// the SAME chart correctly localized its OTHER auto-captions ("Created with Datawrapper"
// → "Créé avec Datawrapper"; the byline caption "Chart:" → "Graphique:") but kept
// rendering the literal English word "Source:" every time. This is a narrow,
// Datawrapper-side translation-key gap with no documented metadata override (confirmed
// against the full v3 OpenAPI chart schema: `language` — "Visualization language
// (output locale)" — is the ONLY locale field on a chart or its metadata; no export-time
// query param or nested field exists either). So for any language whose localized prefix
// differs from DW's own English default, we build the WHOLE "Source : X" line ourselves —
// the same fr/de/it table chart-native and map-native already use (their own
// src/core/locale.ts) — and ship it via `annotate.notes`, the one DW field that renders
// text verbatim with no auto-caption, instead of `describe.source-name` (whose
// un-relocalizable "Source:" prefix would otherwise still show in English ahead of it,
// duplicating the caption). English (DW's own default, where the native caption already
// reads correctly) keeps the native source-name/source-url path, so its clickable
// hyperlink in the interactive embed survives — only the genuinely-broken non-English
// case pays the "notes, no hyperlink" trade-off notes can't render.
// Exported: src/furniture-i18n.ts (the produce-time i18n gate) asserts the outgoing
// metadata against THESE exact label bytes — one table, never a re-typed literal.
export const SOURCE_LABELS: Record<string, string> = {
  fr: "Source :", // spaced colon (French typography)
  de: "Quelle:",
  it: "Fonte:",
  en: "Source:",
};

function sourceLabel(lang?: string): string {
  if (!lang) return SOURCE_LABELS.en;
  const base = lang.toLowerCase().split(/[-_]/)[0];
  return SOURCE_LABELS[base] ?? SOURCE_LABELS.en;
}

// True when DW's own native "Source:" caption already reads correctly for `lang` (i.e.
// there is nothing to relocalize) — English or an unrecognised tag, which falls back to
// English furniture anyway.
function usesNativeSourceCaption(lang?: string): boolean {
  return sourceLabel(lang) === SOURCE_LABELS.en;
}

// The self-built localized source line for `annotate.notes` — used ONLY when the DW
// native caption is unlocalizable (see the note above). Empty when there is no source, or
// when the native caption already covers it (English/absent lang). dw-chart writes
// nothing else to `annotate.notes` today; if that ever changes, COMPOSE with this line
// instead of overwriting it.
function sourceNotes(spec: {
  source?: { name: string; url?: string };
  lang?: string;
}): string {
  if (usesNativeSourceCaption(spec.lang)) return "";
  if (!spec.source?.name) return "";
  return `${sourceLabel(spec.lang)} ${spec.source.name}`;
}

// Map a deliverable language to the regional locale tag Datawrapper reads (verified
// live: PATCH /v3/charts/{id} with language:"fr-FR" renders "1 900,5"). A short tag
// gets a sensible region; a tag that is already regional ("fr-CH") passes through.
export function dwLocale(lang: string): string {
  if (lang.includes("-")) return lang;
  const map: Record<string, string> = {
    fr: "fr-FR",
    en: "en-US",
    de: "de-DE",
    es: "es-ES",
    it: "it-IT",
    nl: "nl-NL",
    pt: "pt-PT",
  };
  return map[lang.toLowerCase()] ?? lang;
}

// The de-emphasis grey for `spec.highlight`: every non-highlighted bar drops to the
// muted grey Datawrapper's OWN default-theme palette carries — read live from
// GET /v3/themes/datawrapper (colors.palette[6] = "#c4c4c4"), so a highlighted chart
// reads exactly like a native Datawrapper "grey context + one accent" chart. A single
// named constant (one value): change it here and every highlighted bar family follows.
export const HIGHLIGHT_MUTED_GREY = "#c4c4c4";

// SCATTER AXIS-TITLE CLEARANCE (QA Wave 11 — the Copenhagen occlusion, render-confirmed on a
// live published chart). Datawrapper's d3-scatter-plot draws the x- AND y-axis titles INLINE
// at the plot CORNERS — x-title bottom-right, y-title top-left — derived from the column
// headers and anchored INSIDE the plot area with a fixed 115px width (all verified live
// against the real API). With corner-clustered data a mark in that corner is HIDDEN behind
// the title (the rightmost point, Copenhagen, vanished under the x-axis title). DW exposes
// NO lever to move a scatter axis title outside the plot, and none to hide the title while
// keeping the tick scale — `x-pos`/`y-pos:"off"` drops the tick LABELS too, and the title
// text is bound to the column header with no metadata override (every one of these verified
// live: extreme metadata patches left the render unchanged). The ONE lever the scatter
// renderer honours is the axis DOMAIN: `visualize.y-axis.range`, which MUST be NUMERIC —
// the renderer's calculateDomain() reads each bound through Number.isFinite, so STRING
// bounds (what the line/column `custom-range-y` path emits) are silently ignored on a
// scatter. Extending the Y domain past the data on BOTH ends pushes every mark out of the
// top/bottom corner title bands. Because each title is a horizontal strip at a corner,
// clearing the vertical band clears it for ANY horizontal data distribution — deterministic,
// not per-case. 0.3 of the y-span each side clears a 1–2 line title down to ~360px wide
// (live-measured: title↔mark overlap = 0 at 900px AND 360px, vs 1–2 before), and a scatter
// axis padded ~30% reads naturally — DW's own auto-domain already pads 10%.
export const SCATTER_AXIS_TITLE_CLEARANCE_FRAC = 0.3;

// The single source of truth for the CSV that reaches Datawrapper: apply the
// human column labels first, then the ranking sort. Both the data upload and
// the metadata mapping (annotation y-derivation) must see the SAME CSV, so
// resolve it once here.
export function resolveData(spec: ChartSpec): string {
  let csv = spec.data;
  if (spec.seriesLabels) csv = renameColumns(csv, spec.seriesLabels);
  if (spec.sort) csv = sortCsv(csv, spec.sort);
  return csv;
}

export function specToMetadata(spec: ChartSpec): DwPatch {
  const csv = resolveData(spec);

  // Native source caption only when DW's own English "Source:" prefix reads correctly
  // for the deliverable language; a non-English chart ships the localized line via
  // annotate.notes instead and blanks these (else the footer shows BOTH captions) —
  // same decision as map-dw (see the SOURCE-LABEL i18n note above).
  const nativeSource = usesNativeSourceCaption(spec.lang);
  const describe: Record<string, unknown> = {
    intro: spec.intro ?? "",
    "source-name": nativeSource ? (spec.source?.name ?? "") : "",
    "source-url": nativeSource ? (spec.source?.url ?? "") : "",
    "aria-description": spec.altInsight,
  };
  // Normalise the number token so a printf/Python mistake (".1f") becomes a valid
  // Datawrapper token ("0.0") instead of shipping garbage value labels.
  const numberFormat = spec.numberFormat
    ? normalizeNumberFormat(spec.numberFormat)
    : undefined;
  const valueFormat = spec.valueFormat
    ? normalizeNumberFormat(spec.valueFormat)
    : undefined;
  describe["number-format"] = numberFormat ?? "0,0.[00]";

  const visualize: Record<string, unknown> = {};
  // bar/column value labels honour `value-label-format`, NOT describe.number-format
  if (numberFormat) visualize["value-label-format"] = numberFormat;
  // The numeric axis honours `y-grid-format` (numeral.js token). Prefer an
  // explicit valueFormat (e.g. '$0,0a' currency, or '00:00:00' → h:mm:ss for a
  // seconds axis), else fall back to the number format so the axis and the
  // value labels stay in sync.
  const axisFormat = valueFormat ?? numberFormat;
  if (axisFormat) visualize["y-grid-format"] = axisFormat;
  if (spec.baseColor) visualize["base-color"] = spec.baseColor;
  // Datawrapper keys `custom-colors` by the SERIES NAME as it appears in the
  // uploaded data — and `resolveData` renames the headers via `seriesLabels`
  // BEFORE upload. So a seriesColors map keyed to the ORIGINAL machine column
  // names (e.g. `cpi_energy`) no longer matches the renamed series (`Energy`),
  // Datawrapper silently drops the whole map, and the chart ships on DW's default
  // all-blue ramp (the recurring referendum/recyclage/inflation defect). Re-key the
  // colours through the SAME rename the data went through, so a renamed N-series
  // chart keeps its intended distinct Okabe-Ito hues. Keys not renamed (already the
  // display name) pass through unchanged — matching how annotation columns are
  // remapped above.
  if (spec.seriesColors) {
    const labels = spec.seriesLabels;
    visualize["custom-colors"] = labels
      ? Object.fromEntries(
          Object.entries(spec.seriesColors).map(([key, hex]) => [
            labels[key] ?? key,
            hex,
          ]),
        )
      : spec.seriesColors;
  }
  // HIGHLIGHT (single-series bar family — HIGHLIGHT_TYPES, validated upstream): the
  // highlighted CATEGORY takes the accent (spec.baseColor when chosen, else the
  // library default) and every OTHER bar drops to the muted DW palette grey, painted
  // via base-color. custom-colors is keyed by the CATEGORY VALUE, never a row index:
  // resolveData may re-sort the rows (spec.sort), so an index would silently accent a
  // different bar after the re-sort — the value survives any ordering (verified live:
  // d3-bars + column-chart both honour the category key at render). This deliberately
  // overrides the base-color set from spec.baseColor above — with a highlight, the
  // baseColor IS the accent of the one highlighted bar, not the colour of them all.
  // seriesColors can't collide here (validateChartSpec rejects the combination).
  if (spec.highlight) {
    visualize["base-color"] = HIGHLIGHT_MUTED_GREY;
    visualize["custom-colors"] = {
      [spec.highlight.trim()]: spec.baseColor ?? DEFAULT_BASE_COLOR,
    };
  }
  // VALUE LABELS (contrast-safe). Datawrapper's bar/column value labels have two
  // traps: vertical columns default to hover-only (invisible on the static PNG),
  // and horizontal bars draw a white inside label that fails WCAG on darker subject
  // hues (no colour/placement override exists — DW owns the label colour). Route both
  // through the safe mapper: columns → outside dark ink + always-on; horizontal bars →
  // the value axis stays on (force-grid) as a redundant reading path. Since dw-chart
  // cannot recolour a DW label, a sub-AA white inside label is caught at produce as a
  // HARD failure (checkValueLabelContrast) unless the colour is brand-explicit — never
  // shipped silently. Other chart types (line/scatter/pie) keep Datawrapper's own
  // labelling — see value-label-safety.ts.
  if (hasValueLabelControl(spec.type))
    applyValueLabels(spec.type, visualize, spec.valueLabels, numberFormat);

  // LABEL SAFETY (publishable-blocker guard): the line-end direct label on a
  // SINGLE-series line/area chart wraps and clips the right edge / collides with
  // the last x-tick (the title + subtitle already name the series). Turn direct
  // labelling OFF for that case — DW then reclaims the right gutter, so nothing
  // can clip. Multi-series keeps `labeling:"right"` (the labels ARE the legend)
  // and DW reserves margin for them.
  if (LINE_LIKE_TYPES.has(spec.type))
    visualize["labeling"] = isSingleSeries(spec) ? "off" : "right";

  // Axis headroom (fraction of the y-span) the annotations need above/below the data —
  // hoisted to function scope so the SCATTER axis-title clearance below can fold it into the
  // one range key the scatter renderer honours (a near-extreme annotation label needs at
  // least as much headroom as the title clearance).
  let headTopFrac = 0;
  let headBotFrac = 0;

  // Skip the annotation mapping for types this pipeline can't annotate (validateChartSpec
  // warns about both), rather than build metadata Datawrapper ignores at render:
  //  • pie/donut/table — no text-annotation layer in Datawrapper at all;
  //  • horizontal bars (d3-bars family) — the layer exists, but this mapper's column/line
  //    coordinate model (category-x, value-y) is dropped by the bar layer (value-x,
  //    category-y). Verified via a rendered export.
  if (
    spec.annotations &&
    spec.annotations.length &&
    !ANNOTATION_UNSUPPORTED_TYPES.has(spec.type) &&
    !ANNOTATION_UNMAPPED_BAR_TYPES.has(spec.type)
  ) {
    // SCATTER is the one annotatable type whose x and y are DIFFERENT numeric columns
    // (x = first value column, y = second; a leading text column is the point label).
    // Reading its y from "the first value column" — or the y-domain from ALL columns —
    // lands the annotation in the X (e.g. GDP) range instead of the Y (life-expectancy)
    // range, and Datawrapper drops it off-canvas. Resolve the y-column so both the axis
    // domain and each annotation's y come from the Y axis alone.
    const scatterCols = SCATTER_ANNOTATION_TYPES.has(spec.type)
      ? scatterColumns(csv)
      : undefined;
    const dom = plotDomain(csv, scatterCols?.yCol);
    const span = dom.yMax - dom.yMin || 1;
    // Every VALUE column's polyline (all columns after the label column). A label must
    // clear EVERY plotted series, not only the one it annotates — on a multi-series
    // chart the label would otherwise sit on a sibling line (F6). Built once. A scatter
    // has no connecting line to clear (points are discrete; DW draws the connector), so
    // it passes NO series to the placement.
    const header = (parseCsvRecords(csv.trim())[0] ?? []).map((c) => c.trim());
    const allPolys = scatterCols
      ? []
      : header
          .slice(1)
          .map((col) => seriesPolyline(csv, dom, col))
          .filter((p) => p.length >= 2);
    // Accumulate the axis headroom every annotation needs, as a fraction of the
    // y-span, so a near-extreme label (a peak at the max) has real whitespace to sit
    // in — the extension is in DATA space, therefore identical at every render width.
    // (headTopFrac/headBotFrac are hoisted to function scope above so the SCATTER
    // axis-title clearance below folds in this same annotation headroom.)
    visualize["text-annotations"] = spec.annotations.map((a) => {
      // Resolve the series column name AFTER renaming, so an annotation pinned
      // to a machine-named column still finds its (renamed) series.
      const column =
        a.column && spec.seriesLabels?.[a.column]
          ? spec.seriesLabels[a.column]
          : a.column;
      // Resolve the annotation's data point (numeric x + y).
      //  • SCATTER: find the row the annotation names (by label OR x-value) and read its
      //    numeric x-column value and Y-column value, so a point pinned by NAME still
      //    gets a positionable numeric x AND a y taken from the Y axis (not the x column).
      //  • Other types (category-x model): keep the x as given and derive a missing y
      //    from the data at x — Datawrapper DROPS an annotation with no numeric y.
      let annX: string | number | undefined = a.x;
      let y: number | undefined;
      let derived = false;
      if (scatterCols) {
        const pt = scatterPointAt(csv, a.x, scatterCols, column);
        if (pt) annX = pt.x;
        if (a.y !== undefined) y = a.y;
        else {
          y = pt?.y;
          derived = true;
        }
      } else if (a.y !== undefined) {
        y = a.y;
      } else if (a.x !== undefined) {
        y = valueAt(csv, a.x, column);
        derived = true;
      }
      // MECHANICAL GUARD (wrong-column tripwire). A DERIVED y is read from a data cell, so
      // it MUST fall inside the y-axis domain. If it lands outside, it was read from the
      // WRONG column (the scatter x/GDP bug: y=40000 against a 55–85 axis) — fail hard
      // rather than ship an annotation Datawrapper silently drops off-canvas. An explicit
      // spec.y is left alone (a deliberate threshold label may sit off the data extent).
      if (
        derived &&
        y !== undefined &&
        Number.isFinite(y) &&
        (y < dom.yMin - 1e-9 || y > dom.yMax + 1e-9)
      )
        throw new Error(
          `annotation "${a.text}" derived y=${y} is outside the y-axis domain ` +
            `[${dom.yMin}, ${dom.yMax}] — it was read from the wrong column (on a scatter ` +
            `the y comes from the Y column, not the x/first value column). Pin the annotation ` +
            `to the correct column, or give it an explicit y.`,
        );

      // WIDTH-INVARIANT PLACEMENT. The label is anchored at the DATA point (x,y) with
      // NO pixel dx/dy — absolute offsets are exactly what broke at responsive widths,
      // because they clear the curve at one export width but push the label off-canvas
      // / onto the ticks at every other width. Instead `placeAnnotation` picks the
      // quadrant (align) whose box clears the plotted series, and reports how much
      // axis headroom that box needs; both are data-space, so the label stays off the
      // curve and on-canvas at ALL widths. Datawrapper clamps any horizontal overflow.
      // On a scatter the horizontal frac is not a categorical row index, so leave x
      // undefined (xFrac → 0.5) — placement is cosmetic there (no line to clear).
      const { xFrac, yFrac } = pointFraction(
        dom,
        scatterCols ? undefined : a.x,
        y,
      );
      // Clear ALL series (multi-series safe), falling back to the annotated column's
      // own polyline if the header scan found nothing. Scatter passes no series.
      const polys = scatterCols
        ? []
        : allPolys.length > 0
          ? allPolys
          : [seriesPolyline(csv, dom, column)];
      const place = placeAnnotation(polys, xFrac, yFrac);
      headTopFrac = Math.max(headTopFrac, place.headroomTopFrac);
      headBotFrac = Math.max(headBotFrac, place.headroomBottomFrac);

      return {
        text: a.text,
        x: annX !== undefined ? String(annX) : "",
        y: y !== undefined ? String(y) : "",
        bold: true,
        color: "#333333",
        align: place.align,
        dx: 0,
        dy: 0,
        // The text lives off its data point by design → always draw the connector.
        connectorLine: { enabled: true, type: "straight", arrowHead: "none" },
        showMobile: true,
        showDesktop: true,
      };
    });

    // Extend the numeric axis so the chosen label boxes have whitespace to occupy.
    // A small base pad (0.06) is always added so a label anchored exactly at the data
    // extent is never flush against the frame; the per-annotation headroom is added on
    // top. Both bounds are pinned (deterministic) — DW then renders identical geometry
    // at every width, which is what makes the guardrail's "validated == delivered"
    // hold across the whole responsive envelope, not just the export width.
    const BASE = 0.06;
    const rangeMax = dom.yMax + (headTopFrac + BASE) * span;
    const rangeMin = dom.yMin - (headBotFrac + BASE) * span;
    visualize["custom-range-y"] = [
      String(Math.round(rangeMin)),
      String(Math.round(rangeMax)),
    ];
  }

  // SCATTER axis-title clearance — pin a NUMERIC y-axis.range (the ONE lever the scatter
  // renderer honours; the string custom-range-y above is silently ignored on a scatter) that
  // extends the Y-COLUMN domain past the data on both ends, pushing every mark clear of the
  // inline corner titles (see SCATTER_AXIS_TITLE_CLEARANCE_FRAC). Folds in any annotation
  // headroom already accumulated so a near-extreme label keeps its whitespace too. Runs for
  // EVERY scatter (annotations optional) — the occlusion is a title-vs-mark collision, not an
  // annotation concern.
  if (SCATTER_ANNOTATION_TYPES.has(spec.type)) {
    const sCols = scatterColumns(csv);
    const sDom = plotDomain(csv, sCols?.yCol);
    const sSpan = sDom.yMax - sDom.yMin || 1;
    const k = SCATTER_AXIS_TITLE_CLEARANCE_FRAC;
    visualize["y-axis"] = {
      range: [
        sDom.yMin - Math.max(k, headBotFrac) * sSpan,
        sDom.yMax + Math.max(k, headTopFrac) * sSpan,
      ],
    };
  }

  const patch: DwPatch = {
    title: spec.title,
    type: spec.type,
    metadata: { describe, visualize, annotate: { notes: sourceNotes(spec) } },
  };
  if (spec.lang) patch.language = dwLocale(spec.lang);
  if (spec.transpose !== undefined)
    patch.metadata.data = { transpose: spec.transpose };
  return patch;
}
