// Are these two PNGs the same PICTURE? — decoded, not compared byte for byte.
//
// WHY THIS EXISTS. Every canon guard in this tree used to ask whether two PNGs were the same BYTES.
// Three measurements on 2026-08-19 say that is the wrong question and that it was already costing:
// `chart-video`'s preview flipped 78611 -> 78605 bytes between two machines and back again, with 20
// of 1 166 400 pixels differing and none further apart than 8/255; `scrolly`'s own `--check` went
// red rendering 6543 bytes where 6609 was committed, a fresh render sitting 375/576000 pixels
// (0,065 %) from it. Both rasterise text through the SYSTEM fonts, so byte equality was asserting
// "this PNG is reproducible on any machine", which neither resvg nor Chrome promises. The picture is
// what the guard cares about.
//
// WHY IT DECODES PNG ITSELF. `map-web` met this first and answered it by decoding both images on a
// real Chrome `<canvas>`. That works where a browser is already open, and five of the seven canon
// skills rasterise through resvg and have no other reason to launch one — a comparison must not cost
// more than the render it checks. `node:zlib` and ninety lines do the same job synchronously, with
// no dependency, which is also what lets every skill carry the SAME copy and be held to it.
//
// WHAT THIS CANNOT DO, MEASURED — read this before trusting `--check` as a change detector.
// The difference between two machines is not always low-amplitude anti-aliasing. On `scrolly`'s
// 640x900 preview the two rasterisations differ by 382 pixels, and the amplitudes are
// 5-8:13 · 9-16:42 · 17-32:77 · 33-64:137 · 65-128:111 · 129-255:2 — whole strokes landing in
// different pixels, because resvg resolves the face INSTALLED on the machine
// (`render-still.mjs`'s own header: handing resvg a font FILE "is the next step rather than this
// one"). A real seed edit on the same preview — one label from 18px to 30px — moves 345 pixels with
// 156 of them at 129-255. FEWER pixels than the machine difference. No threshold on count or on
// amplitude separates those two, so on a small, text-dominated preview `--check` cannot be relied
// on to notice a seed change; it can only refuse a picture that changed a LOT. Where the render is
// reproducible it is exact — `chart-video`, `chart-web`, `chart-beat`, `image-beat`, `map-beat` and
// `map-web` all come back 0/N here — so this limit is `scrolly`'s today, and it ends for everyone
// the day the rasteriser is handed font files instead of a family name.
//
// SCOPE: every PNG a browser reads. Bit depths 1, 2, 4, 8 and 16; colour types greyscale (0), RGB
// (2), palette (3), greyscale+alpha (4) and RGBA (6); `tRNS` on all three types that can carry it;
// and Adam7 interlacing. It began at "8-bit, non-interlaced, RGB or RGBA" — enough for all fourteen
// `preview.png` here — and was widened on the owner's ruling that sharing a mechanism between skills
// is for carrying capability ACROSS, never for trimming to what the weakest path can afford: the
// browser comparator this replaced could read all of the above, so this one has to. Anything outside
// still throws by name rather than decoding wrong.
//
// SIXTEEN-BIT SAMPLES ARE REDUCED TO EIGHT by taking the high byte, which is what Chrome does —
// measured on `test/fixtures/png/grey-16bit.png`, where sample 63757 comes back 249 (`>> 8`) and not
// 248 (`* 255 / 65535`). Sub-byte depths scale by `value * 255 / (2^depth - 1)`, so 4-bit sample 3
// is 51, also measured against Chrome.
//
// ALPHA IS STRAIGHT HERE, AND IT IS NOT IN A CANVAS. `<canvas>` premultiplies on `drawImage` and
// un-premultiplies on `getImageData`, so a browser-decoded translucent pixel comes back CHANGED —
// grey 248 at alpha 20 reads as 242, and any colour at alpha 0 reads as black. This decoder returns
// what the file says. The cross-check in `test/compare-png.test.ts` puts these values through the
// same premultiply round-trip before comparing, rather than pretending the two agree.

import { inflateSync } from "node:zlib";

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
/** The seven Adam7 passes as [xStart, yStart, xStep, yStep]. */
const ADAM7 = [
  [0, 0, 8, 8],
  [4, 0, 8, 8],
  [0, 4, 4, 8],
  [2, 0, 4, 4],
  [0, 2, 2, 4],
  [1, 0, 2, 2],
  [0, 1, 1, 2],
];

/** Undo the five PNG scanline filters over one pass's rows, in place, and return the raw bytes. */
function unfilter(raw, from, rows, stride, bpp) {
  const out = new Uint8Array(rows * stride);
  for (let y = 0; y < rows; y++) {
    const filter = raw[from + y * (1 + stride)];
    const line = from + y * (1 + stride) + 1;
    for (let i = 0; i < stride; i++) {
      const value = raw[line + i];
      const left = i >= bpp ? out[y * stride + i - bpp] : 0;
      const above = y > 0 ? out[(y - 1) * stride + i] : 0;
      const upLeft = y > 0 && i >= bpp ? out[(y - 1) * stride + i - bpp] : 0;
      let byte = value;
      if (filter === 1) byte = value + left;
      else if (filter === 2) byte = value + above;
      else if (filter === 3) byte = value + ((left + above) >> 1);
      else if (filter === 4) {
        const p = left + above - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - above);
        const pc = Math.abs(p - upLeft);
        byte = value + (pa <= pb && pa <= pc ? left : pb <= pc ? above : upLeft);
      } else if (filter !== 0) throw new Error(`unknown PNG scanline filter ${filter}`);
      out[y * stride + i] = byte & 0xff;
    }
  }
  return out;
}

/** Read sample number `index` out of a packed scanline at `depth` bits per sample. */
function sampleAt(row, index, depth) {
  if (depth === 16) return (row[index * 2] << 8) | row[index * 2 + 1];
  if (depth === 8) return row[index];
  const perByte = 8 / depth;
  const shift = 8 - depth * ((index % perByte) + 1);
  return (row[Math.floor(index / perByte)] >> shift) & ((1 << depth) - 1);
}

/** @returns {{ width: number, height: number, data: Uint8Array }} STRAIGHT RGBA, 4 bytes per pixel */
export function decodePng(buffer) {
  const bytes = Uint8Array.from(buffer);
  for (let i = 0; i < SIGNATURE.length; i++)
    if (bytes[i] !== SIGNATURE[i])
      throw new Error("not a PNG: the 8-byte signature is missing");

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let at = 8;
  let header = null;
  let palette = null;
  let trns = null;
  const idat = [];
  while (at + 8 <= bytes.length) {
    const length = view.getUint32(at);
    const type = String.fromCharCode(...bytes.subarray(at + 4, at + 8));
    const body = bytes.subarray(at + 8, at + 8 + length);
    if (type === "IHDR")
      header = {
        width: view.getUint32(at + 8),
        height: view.getUint32(at + 12),
        depth: body[8],
        colorType: body[9],
        interlace: body[12],
      };
    else if (type === "PLTE") palette = body.slice();
    else if (type === "tRNS") trns = body.slice();
    else if (type === "IDAT") idat.push(body);
    else if (type === "IEND") break;
    at += 12 + length;
  }
  if (!header) throw new Error("not a PNG: no IHDR chunk");

  const { width, height, depth, colorType, interlace } = header;
  const channels = CHANNELS[colorType];
  if (!channels)
    throw new Error(`unknown PNG colour type ${colorType}`);
  if (![1, 2, 4, 8, 16].includes(depth))
    throw new Error(`unknown PNG bit depth ${depth}`);
  if ((colorType === 2 || colorType === 4 || colorType === 6) && depth < 8)
    throw new Error(`bit depth ${depth} is not legal for colour type ${colorType}`);
  if (colorType === 3 && depth === 16)
    throw new Error("a palette PNG cannot be 16-bit");
  if (colorType === 3 && !palette)
    throw new Error("palette PNG with no PLTE chunk");
  if (interlace !== 0 && interlace !== 1)
    throw new Error(`unknown PNG interlace method ${interlace}`);

  const raw = inflateSync(Buffer.concat(idat.map((c) => Buffer.from(c))));
  const bpp = Math.ceil((channels * depth) / 8);
  const rgba = new Uint8Array(width * height * 4);
  const full = (1 << depth) - 1;
  // The 16-bit sample a `tRNS` names, compared against the sample as stored — so a 4-bit greyscale
  // `tRNS` of 0x000A means the raw sample 10, not the 8-bit value it scales to.
  const trnsGrey = colorType === 0 && trns ? (trns[0] << 8) | trns[1] : null;
  const trnsRgb =
    colorType === 2 && trns
      ? [(trns[0] << 8) | trns[1], (trns[2] << 8) | trns[3], (trns[4] << 8) | trns[5]]
      : null;

  const place = (x, y, samples) => {
    const out = (y * width + x) * 4;
    let r;
    let g;
    let b;
    let a = 255;
    if (colorType === 3) {
      const index = samples[0];
      r = palette[index * 3];
      g = palette[index * 3 + 1];
      b = palette[index * 3 + 2];
      // A `tRNS` on a palette may be SHORTER than the palette; entries it does not reach are opaque.
      a = trns && index < trns.length ? trns[index] : 255;
    } else if (colorType === 0 || colorType === 4) {
      const grey = samples[0];
      const eight = depth === 16 ? grey >> 8 : Math.round((grey * 255) / full);
      r = eight;
      g = eight;
      b = eight;
      if (colorType === 4) a = depth === 16 ? samples[1] >> 8 : samples[1];
      else if (trnsGrey !== null && grey === trnsGrey) a = 0;
    } else {
      const eight = (v) => (depth === 16 ? v >> 8 : v);
      r = eight(samples[0]);
      g = eight(samples[1]);
      b = eight(samples[2]);
      if (colorType === 6) a = eight(samples[3]);
      else if (
        trnsRgb &&
        samples[0] === trnsRgb[0] &&
        samples[1] === trnsRgb[1] &&
        samples[2] === trnsRgb[2]
      )
        a = 0;
    }
    rgba[out] = r;
    rgba[out + 1] = g;
    rgba[out + 2] = b;
    rgba[out + 3] = a;
  };

  const readPass = (from, xs, ys) => {
    const stride = Math.ceil((xs.length * channels * depth) / 8);
    const lines = unfilter(raw, from, ys.length, stride, bpp);
    for (let row = 0; row < ys.length; row++) {
      const line = lines.subarray(row * stride, (row + 1) * stride);
      for (let col = 0; col < xs.length; col++) {
        const samples = [];
        for (let c = 0; c < channels; c++)
          samples.push(sampleAt(line, col * channels + c, depth));
        place(xs[col], ys[row], samples);
      }
    }
    return ys.length * (1 + stride);
  };

  if (!interlace) {
    readPass(
      0,
      Array.from({ length: width }, (_, x) => x),
      Array.from({ length: height }, (_, y) => y),
    );
  } else {
    let from = 0;
    for (const [x0, y0, dx, dy] of ADAM7) {
      const xs = [];
      for (let x = x0; x < width; x += dx) xs.push(x);
      const ys = [];
      for (let y = y0; y < height; y += dy) ys.push(y);
      if (!xs.length || !ys.length) continue;
      from += readPass(from, xs, ys);
    }
  }

  return { width, height, data: rgba };
}

/**
 * @param {Buffer|Uint8Array} a
 * @param {Buffer|Uint8Array} b
 * @param {{ tolerance?: number, maxDiffFraction?: number }} [options]
 *   `tolerance`: the largest per-channel (R/G/B/A) difference still counted as "the same pixel".
 *   `maxDiffFraction`: the largest share of pixels allowed past that tolerance before the two are
 *   a different picture rather than the same one rasterised twice.
 */
export function comparePngBuffers(a, b, options = {}) {
  const { tolerance = 6, maxDiffFraction = 0.002 } = options;
  const left = decodePng(a);
  const right = decodePng(b);
  if (left.width !== right.width || left.height !== right.height)
    return {
      same: false,
      reason: `size mismatch: ${left.width}x${left.height} vs ${right.width}x${right.height}`,
    };

  let diffPixels = 0;
  // ALPHA IS COMPARED TOO, unlike the browser copy this replaces: a still whose ground went
  // transparent is a different picture with every RGB channel unchanged.
  for (let i = 0; i < left.data.length; i += 4)
    if (
      Math.abs(left.data[i] - right.data[i]) > tolerance ||
      Math.abs(left.data[i + 1] - right.data[i + 1]) > tolerance ||
      Math.abs(left.data[i + 2] - right.data[i + 2]) > tolerance ||
      Math.abs(left.data[i + 3] - right.data[i + 3]) > tolerance
    )
      diffPixels++;

  const totalPixels = left.width * left.height;
  const fraction = diffPixels / totalPixels;
  return {
    same: fraction <= maxDiffFraction,
    diffPixels,
    totalPixels,
    fraction,
    reason:
      fraction > maxDiffFraction
        ? `${diffPixels}/${totalPixels} pixels (${(fraction * 100).toFixed(3)}%) exceed tolerance ${tolerance}, over the allowed ${(maxDiffFraction * 100).toFixed(3)}%`
        : undefined,
  };
}
