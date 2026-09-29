// twin/skills/map-web/scripts/compare-png.mjs
//
// A tolerant PNG comparison, by DECODED PIXELS rather than a byte-equality check. Discovered
// necessary while wiring `map-web`'s `render-preview.mjs` `--check`: two headless-Chrome
// screenshots of the IDENTICAL self-contained HTML, launched back-to-back on the same machine, were
// NOT always byte-identical — a handful of anti-aliased text-edge pixels differ between launches
// even with `--font-render-hinting=none`/`--disable-lcd-text` set. The rendered PICTURE is what a
// preview check cares about — a handful of sub-perceptible pixels differing between two runs of the
// SAME input is not "the seed changed and the preview did not"; `committed.equals(png)` was
// answering a stricter, wrong question (and a PNG ENCODER that changes its byte stream without
// changing a pixel fails it too). This compares by decoded pixels with a small per-channel tolerance
// and a tiny allowed fraction of differing pixels.
//
// CARRIED byte for byte into every skill whose `render-preview.mjs --check` compares a committed
// preview (line 1 names this canonical; `splash/test/carried-copies.test.ts` holds the copies).
//
// No dependency and no browser: the PNGs are decoded here with `node:zlib`, so a skill that
// rasterises with resvg checks its preview without launching Chrome. It decodes what the preview
// renderers write — 8- or 16-bit greyscale, RGB, palette, with or without alpha, non-interlaced —
// and REFUSES anything else rather than guessing. Only R, G and B are compared (a fully transparent
// pixel counts as black), which is what the earlier `<canvas>` decode compared.

import { inflateSync } from "node:zlib";

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

/** A PNG's pixels as 8-bit RGBA, `{ width, height, rgba }`. Throws on a shape it does not decode. */
function decodePng(input) {
  const buf = Buffer.from(input);
  if (buf.length < 8 || SIGNATURE.some((byte, i) => buf[i] !== byte))
    throw new Error("not a PNG: the 8-byte signature is missing");
  let header = null;
  let palette = null;
  let paletteAlpha = null;
  const idat = [];
  for (let at = 8; at + 8 <= buf.length; ) {
    const length = buf.readUInt32BE(at);
    const type = buf.toString("latin1", at + 4, at + 8);
    const data = buf.subarray(at + 8, at + 8 + length);
    if (type === "IHDR")
      header = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        depth: data[8],
        colour: data[9],
        interlace: data[12],
      };
    else if (type === "PLTE") palette = data;
    else if (type === "tRNS") paletteAlpha = data;
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    at += 12 + length;
  }
  if (!header) throw new Error("not a PNG: no IHDR chunk");
  const { width, height, depth, colour, interlace } = header;
  const channels = CHANNELS[colour];
  if (!channels) throw new Error(`PNG colour type ${colour} is not one this comparison decodes`);
  if (interlace !== 0) throw new Error("interlaced PNG: not one this comparison decodes");
  if (!(depth === 8 || (depth === 16 && colour !== 3)))
    throw new Error(`PNG bit depth ${depth} (colour type ${colour}) is not one this comparison decodes`);
  if (colour === 3 && !palette) throw new Error("palette PNG with no PLTE chunk");

  const bytesPerPixel = channels * (depth / 8);
  const stride = width * bytesPerPixel;
  const raw = inflateSync(Buffer.concat(idat));
  if (raw.length < height * (stride + 1)) throw new Error("PNG image data is shorter than its header says");
  const pixels = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = y * stride;
    const up = out - stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bytesPerPixel ? pixels[out + x - bytesPerPixel] : 0;
      const b = y > 0 ? pixels[up + x] : 0;
      const c = y > 0 && x >= bytesPerPixel ? pixels[up + x - bytesPerPixel] : 0;
      let predictor;
      if (filter === 0) predictor = 0;
      else if (filter === 1) predictor = a;
      else if (filter === 2) predictor = b;
      else if (filter === 3) predictor = (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        predictor = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      } else throw new Error(`PNG row ${y} carries unknown filter type ${filter}`);
      pixels[out + x] = (row[x] + predictor) & 0xff;
    }
  }

  const rgba = new Uint8Array(width * height * 4);
  const step = depth / 8; // 16-bit samples: keep the high byte
  for (let i = 0; i < width * height; i++) {
    const at = i * bytesPerPixel;
    const sample = (k) => pixels[at + k * step];
    let r, g, b, alpha;
    if (colour === 0) [r, g, b, alpha] = [sample(0), sample(0), sample(0), 255];
    else if (colour === 2) [r, g, b, alpha] = [sample(0), sample(1), sample(2), 255];
    else if (colour === 3) {
      const index = pixels[at];
      [r, g, b] = [palette[index * 3], palette[index * 3 + 1], palette[index * 3 + 2]];
      alpha = paletteAlpha && index < paletteAlpha.length ? paletteAlpha[index] : 255;
    } else if (colour === 4) [r, g, b, alpha] = [sample(0), sample(0), sample(0), sample(1)];
    else [r, g, b, alpha] = [sample(0), sample(1), sample(2), sample(3)];
    rgba.set([r, g, b, alpha], i * 4);
  }
  return { width, height, rgba };
}

/**
 * @param {Uint8Array} a
 * @param {Uint8Array} b
 * @param {{ tolerance?: number, maxDiffFraction?: number }} [options]
 *   `tolerance`: the largest per-channel (R/G/B) difference still considered "the same pixel".
 *   `maxDiffFraction`: the largest share of pixels allowed to exceed that tolerance before the two
 *   images are considered genuinely different, not launch-to-launch anti-aliasing jitter.
 *   The defaults (6, 0.002) are map-web's own, set for a text-heavy full-page Chrome screenshot.
 *   Every other preview check passes `maxDiffFraction: 0` — per-channel jitter within the tolerance
 *   is forgiven, but no pixel may exceed it — because at 0.002 a small changed region passes.
 */
export function comparePngBuffers(a, b, options = {}) {
  const { tolerance = 6, maxDiffFraction = 0.002 } = options;
  const imgA = decodePng(a);
  const imgB = decodePng(b);
  if (imgA.width !== imgB.width || imgA.height !== imgB.height) {
    return {
      same: false,
      reason: `size mismatch: ${imgA.width}x${imgA.height} vs ${imgB.width}x${imgB.height}`,
    };
  }
  const channel = (data, i, k) => (data[i + 3] === 0 ? 0 : data[i + k]);
  let diffPixels = 0;
  for (let i = 0; i < imgA.rgba.length; i += 4) {
    for (let k = 0; k < 3; k++) {
      if (Math.abs(channel(imgA.rgba, i, k) - channel(imgB.rgba, i, k)) > tolerance) {
        diffPixels++;
        break;
      }
    }
  }
  const totalPixels = imgA.width * imgA.height;
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
