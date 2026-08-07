// READING WHAT THE RENDER ACTUALLY PAINTED — test support for the loop's e2e proofs, and the
// reason they can assert a COLOUR at all.
//
// It lives here, beside the other fixtures, and not in lib/verify: nothing in production reads a
// delivered image's pixels. The verify layer reads an image's IHDR (lib/verify/png.ts) because a
// SIZE is a fact the loop acts on; a colour is only ever a fact a proof checks.
//
// WHY IT EXISTS AT ALL — the rule it makes it possible to keep (CLAUDE.md, 2026-07-14): a hex
// colour must NEVER be grepped out of a produced HTML bundle. Those bundles inline the whole
// palette registry, so a grep "finds" every colour whether or not it was painted; a run once
// cost an investigation over a false "still purple". The only honest question is what came out
// of the compositor, and this is how the proofs ask it.
import { inflateSync } from "node:zlib";

export type Pixels = {
  width: number;
  height: number;
  /** The RGB triple at a pixel. Alpha is dropped: a delivered PNG is already composited. */
  at: (x: number, y: number) => [number, number, number];
};

/** Decode an 8-bit RGB/RGBA PNG — the two forms every producer in this repo emits (a headless
 *  Chromium screenshot and a Datawrapper export). Anything else throws by name rather than
 *  returning plausible garbage from a wrong stride. */
export function decodePng(buf: Buffer): Pixels {
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const bitDepth = buf[24];
  const colorType = buf[25];
  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6))
    throw new Error(
      `unsupported png: bitDepth=${bitDepth} colorType=${colorType} — this decoder reads 8-bit RGB/RGBA only`,
    );
  const channels = colorType === 6 ? 4 : 3;

  const idat: Buffer[] = [];
  let off = 8;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    if (type === "IDAT") idat.push(buf.subarray(off + 8, off + 8 + len));
    off += 12 + len;
    if (type === "IEND") break;
  }
  const raw = inflateSync(Buffer.concat(idat));

  // PNG scanline filters (RFC 2083 §6) — each row is reconstructed from the row above and the
  // pixel to the left, so the whole image has to be walked in order; there is no random access
  // into the compressed stream.
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);
  let p = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[p++];
    const line = raw.subarray(p, p + stride);
    p += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prior = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? cur[i - channels] : 0;
      const b = prior ? prior[i] : 0;
      const c = prior && i >= channels ? prior[i - channels] : 0;
      const x = line[i];
      let v: number;
      switch (filter) {
        case 0:
          v = x;
          break;
        case 1:
          v = x + a;
          break;
        case 2:
          v = x + b;
          break;
        case 3:
          v = x + ((a + b) >> 1);
          break;
        case 4: {
          const pa = Math.abs(b - c);
          const pb = Math.abs(a - c);
          const pc = Math.abs(a + b - 2 * c);
          v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
          break;
        }
        default:
          throw new Error(`bad png filter ${filter} on row ${y}`);
      }
      cur[i] = v & 255;
    }
  }
  return {
    width,
    height,
    at: (x, y) => {
      const i = y * stride + x * channels;
      return [out[i], out[i + 1], out[i + 2]];
    },
  };
}

/** The most common colour in a rectangle.
 *
 *  The MODE, never the mean: a furniture band, a bar or a legend swatch is mostly its own flat
 *  fill, and glyphs, hairlines and edge antialiasing are always the minority — so the mode reads
 *  the fill EXACTLY, while an average of the same box returns a colour that appears nowhere in
 *  the image and cannot be compared to anything the code computed. It also spares every proof a
 *  glyph-free coordinate that nobody can keep true as a layout moves. */
export function modalColor(
  px: Pixels,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): [number, number, number] {
  const counts = new Map<number, number>();
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const [r, g, b] = px.at(x, y);
      const k = (r << 16) | (g << 8) | b;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  let best = 0;
  let bestN = -1;
  for (const [k, n] of counts)
    if (n > bestN) {
      best = k;
      bestN = n;
    }
  return [(best >> 16) & 255, (best >> 8) & 255, best & 255];
}

export const toHex = (c: readonly number[]): string =>
  "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");

/** `rgba(r,g,b,a)` → its four numbers. Proofs read the alpha OUT of the colour the engine
 *  computed rather than restating it, so a change to a pill's translucency changes what they
 *  expect instead of quietly falsifying them. */
export function parseRgba(s: string): [number, number, number, number] {
  const m = s.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/,
  );
  if (!m) throw new Error(`not an rgb(a) string: ${s}`);
  return [
    Number(m[1]),
    Number(m[2]),
    Number(m[3]),
    m[4] === undefined ? 1 : Number(m[4]),
  ];
}

/** What a translucent colour looks like once the compositor has put it over a backdrop. */
export function over(
  fg: readonly [number, number, number, number],
  bg: readonly [number, number, number],
): [number, number, number] {
  const [r, g, b, a] = fg;
  return [
    Math.round(r * a + bg[0] * (1 - a)),
    Math.round(g * a + bg[1] * (1 - a)),
    Math.round(b * a + bg[2] * (1 - a)),
  ];
}
