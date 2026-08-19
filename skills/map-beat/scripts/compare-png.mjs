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
// SCOPE, stated rather than assumed: 8-bit, non-interlaced, RGB or RGBA — measured true of all
// fourteen `preview.png` in this tree. Anything else throws by name rather than decoding wrong.

import { inflateSync } from "node:zlib";

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** @returns {{ width: number, height: number, data: Uint8Array }} straight RGBA, 4 bytes per pixel */
export function decodePng(buffer) {
  const bytes = Uint8Array.from(buffer);
  for (let i = 0; i < SIGNATURE.length; i++)
    if (bytes[i] !== SIGNATURE[i])
      throw new Error("not a PNG: the 8-byte signature is missing");

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let at = 8;
  let header = null;
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
    else if (type === "IDAT") idat.push(body);
    else if (type === "IEND") break;
    at += 12 + length;
  }
  if (!header) throw new Error("not a PNG: no IHDR chunk");
  if (header.depth !== 8)
    throw new Error(`only 8-bit PNGs are read here; this one is ${header.depth}-bit`);
  if (header.interlace !== 0)
    throw new Error("interlaced PNGs are not read here");
  const channels = header.colorType === 6 ? 4 : header.colorType === 2 ? 3 : 0;
  if (!channels)
    throw new Error(
      `only RGB and RGBA PNGs are read here; this one is colour type ${header.colorType}`,
    );

  const { width, height } = header;
  const stride = width * channels;
  const raw = inflateSync(Buffer.concat(idat.map((c) => Buffer.from(c))));
  const lines = new Uint8Array(height * stride);

  for (let y = 0; y < height; y++) {
    const filter = raw[y * (1 + stride)];
    const from = y * (1 + stride) + 1;
    for (let i = 0; i < stride; i++) {
      const value = raw[from + i];
      const left = i >= channels ? lines[y * stride + i - channels] : 0;
      const above = y > 0 ? lines[(y - 1) * stride + i] : 0;
      const upLeft = y > 0 && i >= channels ? lines[(y - 1) * stride + i - channels] : 0;
      let out = value;
      if (filter === 1) out = value + left;
      else if (filter === 2) out = value + above;
      else if (filter === 3) out = value + ((left + above) >> 1);
      else if (filter === 4) {
        const p = left + above - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - above);
        const pc = Math.abs(p - upLeft);
        out = value + (pa <= pb && pa <= pc ? left : pb <= pc ? above : upLeft);
      } else if (filter !== 0) throw new Error(`unknown PNG scanline filter ${filter}`);
      lines[y * stride + i] = out & 0xff;
    }
  }

  if (channels === 4) return { width, height, data: lines };
  const rgba = new Uint8Array(width * height * 4);
  for (let p = 0; p < width * height; p++) {
    rgba[p * 4] = lines[p * 3];
    rgba[p * 4 + 1] = lines[p * 3 + 1];
    rgba[p * 4 + 2] = lines[p * 3 + 2];
    rgba[p * 4 + 3] = 255;
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
