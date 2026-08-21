/** The capability this script carries, read by `scripts/guards.mjs` and checked against
 *  `doctrine/references/guard-catalogue.json` by `doctrine/test/guard-parity.test.ts`. */
export const GUARDS = ["graphicFillsItsFrame"];

import { decodePng } from "./compare-png.mjs";

/** THE FRACTION OF THE READER'S OWN WINDOW the graphic's own box actually covers, against a floor
 *  measured for this format, never invented. `stress-f-housing-pressure`'s choropleth drew in the
 *  left half of a 1440x900 window with the right half empty ground — not a broken box (a plate never
 *  stretches to a shape it was not baked for, geo-discipline.md), but nothing had ever MEASURED how
 *  small "small" already was, at any width, for any format that ships a page.
 *
 *  `ceiling` in `weightAgainstCeiling`'s own words is a per-format PARAMETER here too, never a module
 *  constant this function reads by name: the achievable floor differs by format for a structural
 *  reason — chart-web's own frame IS its viewBox, fluid by construction, and clears 60%+ at every
 *  measured width; a map-web beat is bound by its baked plate's own true aspect against the window's,
 *  and the measured population's worst case is 22.9% (that skill's own seed, 1280x800) — each
 *  copy's own caller supplies the floor its OWN measured population earned. `under` is strictly `<`,
 *  not `<=`, the same reasoning `weightAgainstCeiling` states for `over`: a page sitting exactly on
 *  the floor is the measurement the floor was taken FROM, not yet a violation of it. */
export function graphicFillsItsFrame(fraction, floor) {
  return { fraction, floor, under: fraction < floor };
}

/** THE SAME QUESTION OF A FIXED FRAME, which until round five nothing ever asked.
 *
 *  `fills-its-frame` used to require `ships-standalone-html`, so it reached the four formats whose
 *  container VARIES and none of the four whose frame is fixed and known at render time — the
 *  capability was declared against the trait describing its first instance (a standalone page)
 *  rather than the trait describing the property (a beat with a delivered frame). A static PNG or a
 *  video's last frame has the same defect available to it and no browser to measure it in, so the
 *  fraction is read out of the delivered file's own pixels instead.
 *
 *  WHAT IT MEASURES: the box the drawing actually occupies, over the frame's own area. Ground is
 *  the frame's most common colour, read off the image rather than passed in — a beat's ground comes
 *  from PALETTE.md and a caller that had to name it could name the wrong one. A pixel is INK when
 *  it is opaque enough to see and its channels are further from that ground than `INK_DISTANCE`
 *  summed across R, G and B; the box is the bounding box of every ink pixel. A BOX, not a coverage
 *  count, because that is what the browser-driven copies of this capability measure (`.chart-figure`'s
 *  own `getBoundingClientRect`) and one capability may not mean two things depending which format a
 *  reader is looking at. Ink coverage is a different question, and `reveal-fills-the-frame` is
 *  already the guard that asks it.
 *
 *  A frame with no ink at all returns 0, which is under every floor any format can measure. */
export function frameFillFraction(png) {
  const INK_DISTANCE = 24;
  const ALPHA_FLOOR = 8;
  const { width, height, data } = decodePng(png);
  const counts = new Map();
  for (let i = 0; i < width * height; i++) {
    const key = (data[i * 4] << 16) | (data[i * 4 + 1] << 8) | data[i * 4 + 2];
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let ground = 0;
  let most = -1;
  for (const [key, seen] of counts)
    if (seen > most) {
      most = seen;
      ground = key;
    }
  const channels = [(ground >> 16) & 255, (ground >> 8) & 255, ground & 255];
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] < ALPHA_FLOOR) continue;
      const distance =
        Math.abs(data[i] - channels[0]) +
        Math.abs(data[i + 1] - channels[1]) +
        Math.abs(data[i + 2] - channels[2]);
      if (distance <= INK_DISTANCE) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  if (right < 0) return { fraction: 0, width, height, box: null };
  const box = { left, top, right, bottom };
  const fraction = ((right - left + 1) * (bottom - top + 1)) / (width * height);
  return { fraction, width, height, box };
}

/** THIS FORMAT'S OWN FLOOR, measured 2026-08-21, and the population is ONE reading — said out loud
 *  rather than padded, because a floor that pretends to a population it does not have is worse than
 *  a narrow one that admits it:
 *    this skill's own preview, 900x1633:  86.40%
 *  `exampleRunnersFor` derives the wider population from a committed runner naming
 *  `skills/image-beat/scripts/` or `#shared/image-beat/`, and no beat in this tree names either:
 *  an image beat's own runner reaches the SHARED chart-beat renderer, so its delivered frames are
 *  measured in chart-beat's population instead of here. That is a real gap in attribution, not an
 *  absence of beats, and it is what a wider floor here would need fixed first.
 *  `MARGIN_FRACTION` is the widest of the four fixed-frame copies for exactly that reason: a floor
 *  taken from one reading has no spread behind it, and this format's own letterboxed photo box can
 *  legitimately sit lower in a frame whose photos are a different aspect. */
export const MEASURED_MIN_FRACTION = 0.864;
export const MARGIN_FRACTION = 0.2;
export const FLOOR_FRACTION = MEASURED_MIN_FRACTION - MARGIN_FRACTION;
