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

const clamp = (x: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, x));

export function resolveMapFrame(
  width: number,
  height: number,
  opts: {
    titleLines?: number;
    hasDescription?: boolean;
    labelOverhang?: number;
    legendHeight?: number;
  } = {},
): ResolvedMapFrame {
  const titleLines = opts.titleLines ?? 2;
  const hasDescription = opts.hasDescription ?? false;
  const labelOverhang = opts.labelOverhang ?? 64;
  const legendHeight = opts.legendHeight ?? 0;

  const scale = clamp(Math.min(width, height) / REF, 0.85, 1.6);
  const type = {
    title: Math.round(FRAME_TYPE.title * scale),
    description: Math.round(FRAME_TYPE.description * scale),
    source: Math.round(FRAME_TYPE.source * scale),
  };

  const titleBand =
    titleLines * type.title * LINE_HEIGHT +
    (hasDescription ? type.description * LINE_HEIGHT : 0) +
    2 * MARGIN * scale;
  const sourceBand =
    type.source * LINE_HEIGHT + LEGEND_ROOM * scale + MARGIN * scale;
  const bottomBand = Math.max(
    sourceBand,
    legendHeight + MARGIN * scale + type.source * LINE_HEIGHT,
  );
  const side = Math.max(BASE_INSET, labelOverhang) * scale;

  return {
    scale,
    pad: {
      top: Math.round(titleBand),
      bottom: Math.round(bottomBand),
      left: Math.round(side),
      right: Math.round(side),
    },
    type,
  };
}
