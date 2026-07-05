// core/format — make a chart adapt to its CANVAS aspect ratio. The fixed layout
// is tuned for landscape (~840×480); on a square (1:1) or portrait (4:5, 9:16)
// social video the text would be tiny and the plot stretched. resolveFrame
// scales the typography/margins by `scale` and, on a tall canvas, keeps the plot
// at a sane aspect by padding it into a centred band (so the data is never
// vertically stretched). Shared by line / bar / scatter.
import { TYPE } from "./tokens";

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
export function resolveFrame(
  width: number,
  height: number,
  basePad: Pad,
  scale = 1,
  plotAspect = 0.8,
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
): ResolvedFrame {
  const frame = responsive
    ? { scale: 1, pad: { ...basePad }, type: TYPE as ResolvedFrame["type"] }
    : resolveFrame(width, height, basePad, scale, plotAspect);

  if (!responsive) {
    const minTop = estimateHeaderPx(title, subtitle, width, scale);
    if (frame.pad.top < minTop) {
      frame.pad = { ...frame.pad, top: minTop };
    }
  }

  return frame as ResolvedFrame;
}
