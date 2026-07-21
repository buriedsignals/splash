// core/format — make a chart adapt to its CANVAS aspect ratio. The fixed layout
// is tuned for landscape (~840×480); on a square (1:1) or portrait (4:5, 9:16)
// social video the text would be tiny and the plot stretched. resolveFrame
// scales the typography/margins by `scale` and, on a tall canvas, keeps the plot
// at a sane aspect by padding it into a centred band (so the data is never
// vertically stretched). Shared by line / bar / scatter.
import { TYPE } from "./tokens";
import { sourceFooterReserve } from "../../../../lib/core/text-fit";

export interface Pad {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ResolvedFrame {
  scale: number;
  pad: Pad; // scaled, and vertically centred on tall canvases
  type: { title: number; axis: number; label: number; source: number };
}

/**
 * @param plotAspect  target plot height / width (≈0.6 = the landscape default).
 *                    The plot never gets taller than innerWidth * plotAspect;
 *                    extra height becomes top/bottom margin (centres the band).
 */
// resolveFrame's own landscape-tuned default (~840×480). Shared with the tall-canvas
// boost below so the two never drift apart.
export const DEFAULT_PLOT_ASPECT = 0.8;

export function resolveFrame(
  width: number,
  height: number,
  basePad: Pad,
  scale = 1,
  plotAspect = DEFAULT_PLOT_ASPECT,
): ResolvedFrame {
  const s = scale;
  const pad: Pad = {
    top: basePad.top * s,
    right: basePad.right * s,
    bottom: basePad.bottom * s,
    left: basePad.left * s,
  };
  const innerW = width - pad.left - pad.right;
  const availH = height - pad.top - pad.bottom;
  const idealH = innerW * plotAspect;
  if (availH > idealH) {
    const extra = (availH - idealH) / 2;
    pad.top += extra;
    pad.bottom += extra;
  }
  return {
    scale: s,
    pad,
    type: {
      title: TYPE.title * s,
      axis: TYPE.axis * s,
      label: TYPE.label * s,
      source: TYPE.source * s,
    },
  };
}

// ChartFrame layout constants — kept in sync with ChartFrame.tsx:
//   topPad    = 18 * scale  (space above the title text block)
//   lineHeight = 1.2        (CSS line-height on the title)
//   subMargin  = 4 * scale  (gap between title bottom and subtitle)
const TITLE_LINE_HEIGHT = 1.2;
// Approximate character width as a fraction of font-size (sans-serif, mixed case).
// Calibrated so that an 840px canvas with 24px left/right inset and 22px title
// font gives ~33 chars per line — consistent with what browsers render.
const CHAR_WIDTH_RATIO = 0.52;

/**
 * Estimate the pixel height of the ChartFrame header block (title + optional
 * subtitle) in static/video mode (responsive=false), using font metrics.
 *
 * This is a pure synchronous computation — no DOM, no ResizeObserver. It is
 * intentionally conservative (rounds up line count) so the SVG plot area is
 * always pushed far enough down on the first render.
 *
 * @param title     The insight title string.
 * @param subtitle  The unit string, or empty/undefined when there is none.
 * @param width     Canvas width in pixels.
 * @param scale     The typography scale factor (same as passed to resolveFrame).
 */
export function estimateHeaderPx(
  title: string,
  subtitle: string | undefined,
  width: number,
  scale = 1,
): number {
  const titleFontPx = TYPE.title * scale;
  const axisFontPx = TYPE.axis * scale;
  const topPad = 18 * scale;
  const hInset = 24 * scale; // left + right inset (each side)
  const availableWidth = width - 2 * hInset;

  // Estimate chars per line from available width and font size.
  const charsPerLine = Math.max(
    1,
    Math.floor(availableWidth / (titleFontPx * CHAR_WIDTH_RATIO)),
  );
  const titleLines = Math.max(1, Math.ceil(title.length / charsPerLine));
  const titlePx = titleLines * titleFontPx * TITLE_LINE_HEIGHT;

  const subtitlePx =
    subtitle && subtitle.length > 0 ? 4 * scale + axisFontPx : 0;

  // Add a small safety buffer (half a line) to account for character-width
  // variation between real browsers and this approximation.
  const buffer = titleFontPx * TITLE_LINE_HEIGHT * 0.5;

  return Math.ceil(topPad + titlePx + subtitlePx + buffer);
}

// Channel-driven format (Slice 2): a portrait/story canvas (social-vertical,
// 9:16) needs the plot to fill most of the available height — the
// landscape-tuned plotAspect (~0.8, i.e. plot height ≈ 0.8x its width) would
// otherwise centre a small, landscape-shaped chart in a sea of empty top/bottom
// margin on a canvas that is nearly twice as tall as it is wide. Boost
// plotAspect proportionally to how much taller-than-wide the canvas is; square
// (ratio 1) and landscape (ratio ~0.56-0.57) canvases fall under the threshold
// and are untouched — only a genuinely tall/portrait canvas triggers it.
// Capped so an extreme ratio never stretches the plot absurdly.
//
// Scoped to resolveFrameWithHeader (below), NOT the base resolveFrame — so
// RadarChart's direct resolveFrame(..., 1) call ("keep it circular") is never
// touched by this boost.
const TALL_CANVAS_RATIO = 1.2; // height/width above this = "tall" (only 9:16 today)
// A straight canvasAspect multiplier (1.78x at true 9:16) only fills ~47% of the
// available height once top/bottom header/footer margins are subtracted — the
// chart reads as a small island. A 1.3x headroom factor closes that gap (~63%
// fill at 9:16) without crowding the title/source bands; capped so an extreme
// ratio never stretches the plot absurdly.
const TALL_CANVAS_HEADROOM = 1.3;
const TALL_CANVAS_BOOST_CAP = 2.5; // never more than a 2.5x plotAspect multiplier

// Source-footer band reserve (static / video only).
//
// In the fixed (non-responsive) frame ChartFrame overlays the cited source as an
// absolute band pinned to the BOTTOM of the canvas (ChartFrame.tsx: bottom:12*scale,
// one line of TYPE.source text). A chart's basePad.bottom holds only its OWN x-axis
// furniture (ticks + axis title / legend) — it has no knowledge of that footer — so
// the x-axis TITLE, placed at `innerHeight + ~44`, i.e. absolute baseline
// `H - pad.bottom + DY`, lands in the very same band as the source and OVERPRINTS it
// (Bug M: "...articl" + "Taille des classes"). Reserve the footer band here, in the
// one shared static resolver, so EVERY chart's bottom furniture floats above it —
// the symmetric twin of the header reserve on pad.top below. Responsive/interactive
// lays the source out in normal flow BELOW the plot, so it needs no reserve.
//
// The value is UNSCALED px; resolveFrame multiplies the whole basePad by `scale`, so
// the reserve tracks the canvas (a portrait video's larger source font/inset get a
// proportionally taller band). Composition: because everything a chart draws at the
// bottom is measured from innerHeight, growing pad.bottom by this reserve lifts the
// axis furniture by exactly the reserve, opening a clear band underneath for the
// source — no per-type magic-number tuning, and it can never CREATE a bottom overlap.
//
// The reserve formula itself (bottom-inset + one source-caption line + clearance) is
// engine-agnostic geometry — moved to the shared core (lib/core/text-fit.ts) as
// `sourceFooterReserve(sourceFontPx)`, parametrized on the UNSCALED source-caption
// font size instead of closing over chart-native's local `TYPE.source` token, so core
// stays free of engine-local design tokens. Exported (via the call below) so the
// invariant is discoverable and testable (tests/footer-fit.test.ts).

function boostPlotAspectForTallCanvas(
  width: number,
  height: number,
  plotAspect: number,
): number {
  const canvasAspect = height / width;
  return canvasAspect > TALL_CANVAS_RATIO
    ? plotAspect *
        Math.min(canvasAspect * TALL_CANVAS_HEADROOM, TALL_CANVAS_BOOST_CAP)
    : plotAspect;
}

/**
 * Like resolveFrame but enforces padding.top ≥ the estimated header height so
 * that a 2-line (or longer) title never overlaps the first data row on the
 * FIRST render — no ResizeObserver, no second paint needed.
 *
 * Drop-in replacement for the resolveFrame call in static/video mode:
 *   const frame = resolveFrameWithHeader(title, subtitle, width, height, basePad, scale);
 *
 * In responsive mode the title lives in normal flow above the SVG, so no
 * enforcement is needed — pass responsive=true and this function is equivalent
 * to resolveFrame with scale=1.
 *
 * @param reserveSourceFooter  static/video only: grow basePad.bottom by
 *   sourceFooterReserve(TYPE.source) so the x-axis title clears the bottom source line
 *   (default true). Pass false for a chart that ALREADY reserves the source band
 *   inside its own basePad.bottom (e.g. WaterfallChart, whose rotated-label
 *   descent budget is derived from that same reservation) — reserving twice would
 *   double-count and collapse the plot.
 */
export function resolveFrameWithHeader(
  title: string,
  subtitle: string | undefined,
  width: number,
  height: number,
  basePad: Pad,
  scale = 1,
  plotAspect?: number,
  responsive = false,
  reserveSourceFooter = true,
): ResolvedFrame {
  // Reserve the source-footer band at the bottom (static/video only) by growing the
  // chart's declared bottom padding before the plot is laid out — so centring and
  // innerHeight both account for it, and the x-axis title clears the source line.
  const staticBasePad: Pad = {
    ...basePad,
    bottom:
      basePad.bottom +
      (reserveSourceFooter ? sourceFooterReserve(TYPE.source) : 0),
  };

  const frame = responsive
    ? { scale: 1, pad: { ...basePad }, type: TYPE as ResolvedFrame["type"] }
    : resolveFrame(
        width,
        height,
        staticBasePad,
        scale,
        boostPlotAspectForTallCanvas(
          width,
          height,
          plotAspect ?? DEFAULT_PLOT_ASPECT,
        ),
      );

  if (!responsive) {
    const minTop = estimateHeaderPx(title, subtitle, width, scale);
    if (frame.pad.top < minTop) {
      frame.pad = { ...frame.pad, top: minTop };
    }
  }

  return frame as ResolvedFrame;
}
