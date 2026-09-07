// twin/scripts/design-base/pixel-palette.mjs
//
// THE PIXEL ROUTE: an artifact's colour signature read off its own pixels.
//
// The computed-style route (`harvest-styles.mjs`) reaches type everywhere and marks wherever they
// are SVG. It reaches NOTHING on a poster, a canvas chart or a video frame — measured on
// informationisbeautiful.net on 2026-09-07, where four pieces returned 17-23 type tuples and ZERO
// mark colours. Those artifacts carry a full art direction, frequently a stronger one than a
// newsroom page's, and this is how it is taken. The two routes are not alternatives: a reference
// measured by one only is under-measured (`docs/splash/2026-09-07-design-base-…-spec.md`, §6).
//
// What it reports:
//   ground      the modal colour — what most of the artifact is painted on
//   chromatic   the genuinely coloured, by coverage: the direction's own palette
//   neutral     the desaturated colours, by coverage: ink and furniture
//   clusters    the hue poles, which is what the shape below is decided from
//   shape       diverging | sequential | categorical | monochrome
//
// The name is `readPixelPalette`, not `readPalette`, because `shared/chart-beat/colour.mjs`
// already exports `readPalette` for reading a newsroom's `PALETTE.md`. Two different questions
// must not share a name.
//
// Usage:  bun scripts/design-base/pixel-palette.mjs <png> [--top 10] [--crop x,y,w,h]

import { readFileSync } from "node:fs";
import { PNG } from "pngjs";

/** Bits per channel when bucketing. Fine enough to keep two near tints apart, coarse enough that
 *  anti-aliasing noise collapses into its parent instead of inventing hundreds of one-pixel
 *  colours. */
const BITS = 5;
const SHIFT = 8 - BITS;

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
const CHROMATIC_MIN_CHROMA = 0.18;

/** A hue cluster carrying less than this share of the COLOURED ink is noise, not a pole.
 *
 *  RELATIVE TO THE INK, NEVER TO THE IMAGE. An absolute floor of 0.4% of all pixels called the IIB
 *  "Who's Suing Whom in AI" network MONOCHROME — six hues from 5 to 331 degrees, each covering
 *  ~0.3% of a page that is 90.9% white. On a sparse graphic every real pole sits under any
 *  absolute floor; measured against the ink they are all substantial. */
const CLUSTER_MIN_INK_SHARE = 0.06;

/** Two colours within this many degrees of hue are the same pole. */
const SAME_POLE_DEGREES = 40;

/** A cluster whose members span at least this much lightness is a ramp — a pole with tints — and
 *  not a flat category colour. */
const RAMP_MIN_LIGHTNESS_SPAN = 0.12;

/** How many colours are clustered over, independent of how many are reported: a pole and its tints
 *  must both be in the set for the ramp test to see them, and `top` is a reporting choice. */
const CLUSTER_OVER = 24;

/** Colours this dark or this light are the ground or the ink, whatever their nominal saturation. */
const LIGHTNESS_FLOOR = 0.06;
const LIGHTNESS_CEILING = 0.97;

/** sRGB to HSL. Saturation is what separates a direction's palette from its furniture; hue is what
 *  the poles are counted on. */
function hsl(r, g, b) {
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

function hex(r, g, b) {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.round(v).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

/** Hue is circular: 358 and 2 are four degrees apart, not 356. Without this a single red pole
 *  splits in two and a monochrome artifact reports as diverging. */
function hueGap(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * The hue poles, largest first.
 *
 * CLUSTER COUNT DECIDES THE SHAPE, NOT HUE SPREAD. A first version used `max(hue) - min(hue)` and
 * called the IIB "Left vs. Right" poster CATEGORICAL at 207 degrees — a poster whose entire
 * mechanism is two opposed poles, each with its own tint ramp. Spread reports the same number for
 * two clusters and for six.
 */
function hueClusters(colours) {
  const clusters = [];
  for (const c of [...colours].sort((a, b) => b.share - a.share)) {
    const home = clusters.find((cl) => hueGap(cl.h, c.h) <= SAME_POLE_DEGREES);
    if (home) {
      home.members.push(c);
      home.share += c.share;
    } else clusters.push({ h: c.h, members: [c], share: c.share });
  }
  const ink = colours.reduce((sum, c) => sum + c.share, 0) || 1;
  return clusters.filter((cl) => cl.share / ink >= CLUSTER_MIN_INK_SHARE);
}

/**
 * @param {string} file            a PNG on disk
 * @param {{crop?: [number,number,number,number], top?: number}} options
 * @returns {{ground, chromatic, neutral, clusters, ramped, shape, pixels}}
 */
export function readPixelPalette(file, { crop = null, top = 10 } = {}) {
  const png = PNG.sync.read(readFileSync(file));
  const [cx, cy, cw, ch] = crop ?? [0, 0, png.width, png.height];

  const buckets = new Map();
  let counted = 0;
  for (let y = Math.max(0, cy); y < Math.min(png.height, cy + ch); y += 1)
    for (let x = Math.max(0, cx); x < Math.min(png.width, cx + cw); x += 1) {
      const i = (png.width * y + x) << 2;
      // A pixel that is not fully opaque is a composite of things this image does not state.
      if (png.data[i + 3] < 250) continue;
      const r = png.data[i];
      const g = png.data[i + 1];
      const b = png.data[i + 2];
      const key = ((r >> SHIFT) << (BITS * 2)) | ((g >> SHIFT) << BITS) | (b >> SHIFT);
      const seen = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
      seen.n += 1;
      seen.r += r;
      seen.g += g;
      seen.b += b;
      buckets.set(key, seen);
      counted += 1;
    }

  if (counted === 0)
    throw new Error(`no opaque pixels to read in ${file}${crop ? ` at crop ${crop.join(",")}` : ""}`);

  const entries = [...buckets.values()]
    .map((v) => {
      const r = v.r / v.n;
      const g = v.g / v.n;
      const b = v.b / v.n;
      return { hex: hex(r, g, b), share: v.n / counted, ...hsl(r, g, b) };
    })
    .sort((a, b) => b.share - a.share);

  const coloured = entries.filter(
    (e) => e.chroma >= CHROMATIC_MIN_CHROMA && e.l > LIGHTNESS_FLOOR && e.l < LIGHTNESS_CEILING,
  );
  const clusters = hueClusters(coloured.slice(0, CLUSTER_OVER));
  const ramped = clusters.filter((cl) => {
    const ls = cl.members.map((m) => m.l);
    return cl.members.length >= 2 && Math.max(...ls) - Math.min(...ls) >= RAMP_MIN_LIGHTNESS_SPAN;
  }).length;

  const shape =
    coloured.length === 0
      ? "monochrome"
      : clusters.length <= 1
        ? ramped
          ? "sequential"
          : "monochrome"
        : clusters.length === 2
          ? "diverging"
          : "categorical";

  return {
    ground: entries[0],
    chromatic: coloured.slice(0, top),
    neutral: entries.filter((e) => e.chroma < CHROMATIC_MIN_CHROMA).slice(0, top),
    clusters: clusters.map((c) => ({
      hue: Math.round(c.h),
      share: c.share,
      size: c.members.length,
    })),
    ramped,
    shape,
    pixels: counted,
  };
}

if (import.meta.main) {
  const [file, ...rest] = process.argv.slice(2);
  if (!file) throw new Error("usage: bun scripts/design-base/pixel-palette.mjs <png> [--top n] [--crop x,y,w,h]");
  const flag = (name, fallback) => {
    const at = rest.indexOf(name);
    return at >= 0 ? rest[at + 1] : fallback;
  };
  const out = readPixelPalette(file, {
    top: Number(flag("--top", "10")),
    crop: flag("--crop", null)?.split(",").map(Number) ?? null,
  });
  const pct = (v) => (v * 100).toFixed(1).padStart(5) + " %";
  console.log(`\n${file}`);
  console.log(`  ${out.pixels.toLocaleString("en-GB")} pixels read`);
  console.log(`  ground    ${out.ground.hex}  ${pct(out.ground.share)}`);
  console.log(
    `  shape     ${out.shape}  (${out.clusters.length} hue cluster${out.clusters.length === 1 ? "" : "s"} at ` +
      out.clusters.map((c) => `${c.hue}deg`).join(", ") +
      `; ${out.ramped} ramped)`,
  );
  console.log("  chromatic");
  for (const c of out.chromatic)
    console.log(`    ${c.hex}  ${pct(c.share)}  hue ${c.h.toFixed(0).padStart(3)}  sat ${(c.s * 100).toFixed(0).padStart(3)}%`);
  console.log("  neutral");
  for (const c of out.neutral.slice(0, 5)) console.log(`    ${c.hex}  ${pct(c.share)}`);
}
