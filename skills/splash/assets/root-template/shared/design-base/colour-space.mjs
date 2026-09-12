// twin/shared/design-base/colour-space.mjs
//
// THE COLOUR FACTS THE COMPOSER NEEDS, WITHOUT THE RASTERISER IT DOES NOT.
//
// `pixel-palette.mjs` reads PNGs and therefore imports `pngjs`, which an installed Splash root does
// not carry. `compose.mjs` needs six pure values out of it — the chroma floor, the pole width, the
// ramp span, and the two functions that put a colour in hue space — and nothing else. Split here so
// the composer ships and the harvester keeps its reader: `pixel-palette.mjs` imports these back and
// re-exports them, so nothing that used it has to change.

/**
 * Below this CHROMA a colour is furniture, not palette — chroma being `(max - min) / 255` on the
 * raw channels, which is colourfulness as the eye meets it.
 *
 * NOT HSL SATURATION, and this is measured rather than preferred. ABC's cream ground `#FFFCEE`
 * has an HSL saturation of **1.0**: saturation is `d / (2 - max - min)`, so it runs away toward
 * both poles, and a two-percent warmth on near-white reads as fully saturated. Counted as palette,
 * that ground outweighed the piece's real blue accent by coverage and the harvester reported a
 * blue-accented chart as *monochrome at 49 degrees* — its own paper's hue. The same failure waits
 * at the other pole for a warm near-black ink. Chroma puts cream at 0.067 and the accent at 0.62,
 * which is the separation the reader actually sees.
 *
 * 0.18 sits above every paper and ink tint met so far and below every mark.
 */
export const CHROMATIC_MIN_CHROMA = 0.18;

/** Two colours within this many degrees of hue are the same pole. */
export const SAME_POLE_DEGREES = 40;

/** A cluster whose members span at least this much lightness is a ramp — a pole with tints — and
 *  not a flat category colour. */
export const RAMP_MIN_LIGHTNESS_SPAN = 0.12;

/** sRGB to HSL. Saturation is what separates a direction's palette from its furniture; hue is what
 *  the poles are counted on. */
export function hsl(r, g, b) {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  const chroma = max - min;
  if (max === min) return { h: 0, s: 0, l, chroma: 0 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === R
      ? ((G - B) / d + (G < B ? 6 : 0)) / 6
      : max === G
        ? ((B - R) / d + 2) / 6
        : ((R - G) / d + 4) / 6;
  return { h: h * 360, s, l, chroma };
}

/** Hue is circular: 358 and 2 are four degrees apart, not 356. Without this a single red pole
 *  splits in two and a monochrome artifact reports as diverging. */
export function hueGap(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}
