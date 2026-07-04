// core/map-format — adapt a map's FURNITURE to its canvas. Mirrors chart-native's
// core/format.ts (resolveFrame). Unlike a chart there is no plot to centre (the map
// fills the viewport); instead `pad` is the fitBounds SAFE-AREA that reserves the title
// band (top), the source + legend band (bottom), and the label overhang (sides) so the
// DATA extent is framed inside the furniture — title-not-on-data + nothing-off-frame by
// construction. `scale` enlarges text on narrow/portrait canvases.
import { FRAME_TYPE } from "../theme/map-tokens";

export interface MapPad {
  top: number;
  right: number;
  bottom: number;
  left: number;
}
export interface ResolvedMapFrame {
  scale: number;
  pad: MapPad;
  type: { title: number; description: number; source: number };
}

const LINE_HEIGHT = 1.3;
const MARGIN = 12;
const BASE_INSET = 24;
const LEGEND_ROOM = 28;
const REF = 720; // the canvas min-side at which scale === 1
// A point marker's pin + label extends BEYOND its anchor (the pin rises ~24px above the
// anchor, the label sits ~16px below). fitBounds frames the anchor POINT, so without extra
// clearance a marker whose anchor is reserved-clear still has its pin/label overlapping the
// title band (top) or the legend/source band (bottom). Reserve the overhang on both.
const MARKER_CLEARANCE = 30;
// The on-map description is clamped to 2 lines (MapFrame) — reserve exactly that.
const DESC_LINES = 2;

const clamp = (x: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, x));

// The widest span of LONGITUDE (degrees) a viewport can ever display in Web Mercator.
// The map cannot zoom out past the point where the full world HEIGHT fills the
// viewport (below that MapTiler clamps to avoid vertical gaps), so at that floor a
// viewport of aspect w/h shows ~360·(w/h)° of longitude. A data extent wider than this
// is PHYSICALLY impossible to frame fully at that aspect (a globe-spanning point set on
// a narrow portrait phone) — the responsive data-extent guard must tolerate that
// instead of failing an unfixable render, while still catching a fittable extent that
// was wrongly cropped. Pure + unit-tested so the threshold can't silently drift.
export function maxFittableLngSpan(width: number, height: number): number {
  return 360 * (width / height);
}

export function resolveMapFrame(
  width: number,
  height: number,
  opts: {
    titleLines?: number;
    hasDescription?: boolean;
    labelOverhang?: number;
    legendHeight?: number;
    titleHeightPx?: number;
  } = {},
): ResolvedMapFrame {
  const titleLines = opts.titleLines ?? 2;
  const hasDescription = opts.hasDescription ?? false;
  const labelOverhang = opts.labelOverhang ?? 64;
  const legendHeight = opts.legendHeight ?? 0;
  const titleHeightPx = opts.titleHeightPx ?? 0;

  const scale = clamp(Math.min(width, height) / REF, 0.85, 1.6);
  const type = {
    title: Math.round(FRAME_TYPE.title * scale),
    description: Math.round(FRAME_TYPE.description * scale),
    source: Math.round(FRAME_TYPE.source * scale),
  };

  // MapFrame insets the title pill (top) and the source/legend (bottom) by this gutter.
  const gutter = 16 * scale;
  // MARKER_CLEARANCE is a FIXED pixel value (a pin glyph is a fixed size — it must NOT
  // scale down on a small canvas, or the pin clips into the furniture at mobile widths).
  const titleEstimate =
    titleLines * type.title * LINE_HEIGHT +
    (hasDescription ? DESC_LINES * type.description * LINE_HEIGHT : 0) +
    2 * MARGIN * scale; // pill vertical padding
  // Prefer the MEASURED banner height (real wrapping), else the estimate. The band spans
  // gutter + banner + a fixed marker clearance so a marker's PIN/LABEL — not just its
  // anchor — clears the furniture.
  const topBand =
    gutter + Math.max(titleEstimate, titleHeightPx) + MARKER_CLEARANCE;
  const sourceBand = type.source * LINE_HEIGHT + 2 * MARGIN * scale;
  const bottomBand =
    gutter +
    Math.max(sourceBand, legendHeight + LEGEND_ROOM * scale) +
    MARKER_CLEARANCE;
  const side = Math.max(BASE_INSET, labelOverhang) * scale;

  return {
    scale,
    pad: {
      top: Math.round(topBand),
      bottom: Math.round(bottomBand),
      left: Math.round(side),
      right: Math.round(side),
    },
    type,
  };
}
