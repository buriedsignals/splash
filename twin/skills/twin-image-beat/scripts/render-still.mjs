// twin/skills/twin-image-beat/scripts/render-still.mjs
//
// This skill's OWN copy of the rasteriser — `deriveFurniture`/`contrast`/`measureText`/
// `renderStill` are byte-for-byte the same rule `twin-chart-beat/scripts/render-still.mjs` and
// `twin-scrolly/scripts/render-still.mjs` already carry. A skill never imports another skill's
// copy of its own machinery — see `twin-chart-beat/SKILL.md`, Architecture, "A beat does not
// import this file from here" — so this file exists a third time rather than once, shared.
//
// The genre-specific addition below `renderStill` is what a photograph needs that a drawn chart
// never does: reading a raster file's own intrinsic size and (for a JPEG) its EXIF orientation,
// fitting it into a fixed box without cropping or stretching, encoding it as a `data:` URI so the
// SVG this skill emits never references an external file, and refusing to render — loudly — past
// a total-weight ceiling. See `references/image-discipline.md` for the doctrine each function
// below is written under.
//
// Runs inside a Splash root: uses `react-dom/server` and `@resvg/resvg-js` from the root's
// dependencies, the same as its sibling copies.

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { Resvg } from "@resvg/resvg-js";

const HEX = /^#[0-9a-fA-F]{6}$/;

/** The one font stack. Matches the seed's own draw font — see `twin-chart-beat/render-still.mjs`
 *  for why a mismatch here would make every measured gutter a lie. */
export const FONT_FAMILY = "Helvetica, Arial, sans-serif";

function channels(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

function luminance(hex) {
  const [r, g, b] = channels(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two #rrggbb colours, 1..21. */
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function mix(ground, toward, ratio) {
  const target = channels(toward);
  return (
    "#" +
    channels(ground)
      .map((v, i) => Math.round(v + (target[i] - v) * ratio).toString(16).padStart(2, "0"))
      .join("")
  );
}

/** See `twin-chart-beat/scripts/render-still.mjs` for the full derivation and the mid-grey
 *  counter-example a luminance threshold gets wrong. Identical rule, own copy. */
export function deriveFurniture(ground) {
  if (!HEX.test(ground)) throw new Error(`ground must be #rrggbb, got ${JSON.stringify(ground)}`);
  const ink = contrast("#000000", ground) >= contrast("#FFFFFF", ground) ? "#000000" : "#FFFFFF";
  let muted = ink;
  for (let step = 31; step <= 50; step++) {
    const candidate = mix(ground, ink, step / 50);
    if (contrast(candidate, ground) >= 4.5) {
      muted = candidate;
      break;
    }
  }
  return { ink, muted, grid: mix(ground, ink, 0.18) };
}

const measured = new Map();

/** Identical contract to `twin-chart-beat`'s own `measureText` — see that file for why the second
 *  argument must be an options object and why a missing `fontSize` throws instead of guessing. */
export function measureText(text, options) {
  if (!text) return 0;
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new Error(
      `measureText's second argument must be an options object shaped { fontSize, fontWeight?, fontFamily? }, got ${JSON.stringify(options)} (${typeof options})`,
    );
  }
  const { fontSize, fontWeight = 400, fontFamily = FONT_FAMILY } = options;
  if (typeof fontSize !== "number" || !Number.isFinite(fontSize)) {
    throw new Error(
      `measureText's options.fontSize must be a finite number, got ${JSON.stringify(fontSize)} — a missing fontSize silently defaults to resvg's own size and under-measures`,
    );
  }
  const key = `${fontFamily}|${fontWeight}|${fontSize}|${text}`;
  if (measured.has(key)) return measured.get(key);
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const probe =
    `<svg xmlns="http://www.w3.org/2000/svg" width="8000" height="400">` +
    `<text x="0" y="300" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${fontWeight}">${escaped}</text>` +
    `</svg>`;
  const box = new Resvg(probe, { font: { loadSystemFonts: true } }).getBBox();
  const width = box ? box.x + box.width : 0;
  measured.set(key, width);
  return width;
}

/** Render one React element to an SVG on disk and a PNG beside it. Identical contract to the
 *  chart genre's own `renderStill` — see that file for why rasterising at a size the element was
 *  not drawn at is refused rather than silently scaled. */
export async function renderStill({ element, width, height, outDir, name }) {
  const svg = renderToStaticMarkup(element);
  if (!svg.startsWith("<svg")) throw new Error(`renderStill expects an element whose root is <svg>, got ${svg.slice(0, 40)}`);

  const drawn = { width: Number(svg.match(/\bwidth="(\d+(?:\.\d+)?)"/)?.[1]), height: Number(svg.match(/\bheight="(\d+(?:\.\d+)?)"/)?.[1]) };
  if (drawn.width !== width || drawn.height !== height) {
    throw new Error(`asked to render at ${width}x${height}, but the element is drawn at ${drawn.width}x${drawn.height}`);
  }

  await mkdir(outDir, { recursive: true });
  const svgPath = join(outDir, `${name}.svg`);
  const pngPath = join(outDir, `${name}.png`);
  await writeFile(svgPath, svg);
  await writeFile(pngPath, rasterise(svg, width));
  return { svgPath, pngPath };
}

function rasterise(svg, width) {
  const image = new Resvg(svg, {
    font: { loadSystemFonts: true },
    fitTo: { mode: "width", value: width * 2 },
  }).render();
  return image.asPng();
}

// ===================== image-genre additions =====================
// Nothing below this line has a sibling in `twin-chart-beat`. A photograph is a raster file this
// skill did not draw, which is what all four of these exist to handle: reading its real size,
// refusing one an image viewer would silently rotate, fitting it into a shared box without lying
// about its shape, and keeping the embedded total honest.

/**
 * The MIME type + intrinsic pixel size of a PNG or JPEG, read from the file's own bytes — never
 * assumed from the extension, and never decoded through a library that would also try to correct
 * anything (see `checkOrientation` below for why correction is refused rather than attempted).
 *
 * PNG: the IHDR chunk is fixed at bytes 16..24 (8-byte signature, 4-byte length, 4-byte "IHDR",
 * then 4-byte width, 4-byte height, both big-endian) in every conformant PNG — there is nothing to
 * search for.
 *
 * JPEG: dimensions live in the first Start-Of-Frame marker (0xC0-0xCF, excluding the DHT/JPG/DAC
 * markers 0xC4/0xC8/0xCC, none of which carry a frame header), found by walking the marker chain
 * from byte 2 — a JPEG has no fixed offset for it the way PNG does, because arbitrary metadata
 * segments (EXIF, ICC, comments) can precede it.
 */
export function readImageMeta(bytes) {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    if (bytes.length < 24) throw new Error("PNG bytes truncated before the IHDR chunk");
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { format: "png", mime: "image/png", width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let pos = 2;
    while (pos + 4 <= bytes.length) {
      if (bytes[pos] !== 0xff) throw new Error(`malformed JPEG: expected a marker at byte ${pos}, got 0x${bytes[pos].toString(16)}`);
      const marker = bytes[pos + 1];
      if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
        pos += 2;
        continue;
      }
      if (marker === 0xda) break; // Start Of Scan: no more headers follow
      const length = view.getUint16(pos + 2);
      const isSOF = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSOF) {
        return { format: "jpeg", mime: "image/jpeg", height: view.getUint16(pos + 5), width: view.getUint16(pos + 7) };
      }
      pos += 2 + length;
    }
    throw new Error("JPEG has no Start-Of-Frame marker — cannot read its dimensions");
  }
  throw new Error("not a PNG or a JPEG (checked the magic bytes) — this skill embeds only those two formats");
}

/**
 * The EXIF orientation tag (1..8) of a JPEG, or `null` if the file carries no EXIF APP1 segment
 * at all (a photo exported by most editors, or any PNG, has none — treated as already normal).
 * A PNG never carries this tag: `readOrientation` returns `null` for one without inspecting it.
 *
 * This function only ever READS the tag — see `checkOrientation` below for why nothing in this
 * skill rotates pixels to correct for it.
 */
export function readOrientation(bytes) {
  if (!(bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8)) return null; // not a JPEG
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let pos = 2;
  while (pos + 4 <= bytes.length) {
    if (bytes[pos] !== 0xff) return null;
    const marker = bytes[pos + 1];
    if (marker === 0xda) return null; // Start Of Scan: EXIF always precedes it
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      pos += 2;
      continue;
    }
    const length = view.getUint16(pos + 2);
    if (marker === 0xe1) {
      const segmentStart = pos + 4;
      const isExif =
        bytes[segmentStart] === 0x45 && bytes[segmentStart + 1] === 0x78 && bytes[segmentStart + 2] === 0x69 &&
        bytes[segmentStart + 3] === 0x66 && bytes[segmentStart + 4] === 0x00 && bytes[segmentStart + 5] === 0x00;
      if (isExif) {
        const tiffStart = segmentStart + 6;
        const little = bytes[tiffStart] === 0x49 && bytes[tiffStart + 1] === 0x49; // "II" vs "MM"
        const ifdOffset = little
          ? view.getUint32(tiffStart + 4, true)
          : view.getUint32(tiffStart + 4, false);
        const ifd0 = tiffStart + ifdOffset;
        const entryCount = little ? view.getUint16(ifd0, true) : view.getUint16(ifd0, false);
        for (let i = 0; i < entryCount; i++) {
          const entry = ifd0 + 2 + i * 12;
          const tag = little ? view.getUint16(entry, true) : view.getUint16(entry, false);
          if (tag === 0x0112) {
            return little ? view.getUint16(entry + 8, true) : view.getUint16(entry + 8, false);
          }
        }
        return null; // EXIF present, no orientation tag in it — treated as normal
      }
    }
    pos += 2 + length;
  }
  return null;
}

/**
 * Throws unless a JPEG's EXIF orientation is normal (`1`) or absent (`null`). See
 * `references/image-discipline.md`, "Colour and orientation" — reading the tag is simple and
 * reliable; correctly ROTATING pixels for all eight EXIF orientation values, including the four
 * mirrored ones, needs an image-transform library this skill does not carry, and a wrong rotation
 * would ship a photograph flipped with more confidence than doing nothing at all. Detecting and
 * refusing is the honest half of the problem to solve tonight; rotating is the other half, left
 * open and named, not attempted half-built.
 */
export function checkOrientation(bytes, label) {
  const orientation = readOrientation(bytes);
  if (orientation !== null && orientation !== 1) {
    throw new Error(
      `${label}: EXIF orientation is ${orientation}, not 1 (normal) — this skill does not rotate pixels to correct for it (see references/image-discipline.md, "Colour and orientation"). Re-export the photo already upright, then supply it again.`,
    );
  }
}

/**
 * Where an intrinsic-sized image lands inside a fixed box, preserving its own aspect ratio —
 * never cropped, never stretched. Pure: no colour, no file I/O, just the arithmetic. See
 * `references/image-discipline.md`, "Aspect ratio", for why this skill letterboxes instead of
 * cropping or stretching.
 */
export function fitBox(intrinsic, box) {
  if (intrinsic.width <= 0 || intrinsic.height <= 0) {
    throw new Error(`fitBox needs a positive intrinsic size, got ${intrinsic.width}x${intrinsic.height}`);
  }
  const scale = Math.min(box.width / intrinsic.width, box.height / intrinsic.height);
  const drawWidth = intrinsic.width * scale;
  const drawHeight = intrinsic.height * scale;
  return {
    drawWidth,
    drawHeight,
    offsetX: (box.width - drawWidth) / 2,
    offsetY: (box.height - drawHeight) / 2,
  };
}

/** A `data:` URI for an image already identified by `readImageMeta` — the one form an embedded
 *  photograph takes in this skill's SVG, so the artifact never references an external file. */
export function toDataUri(bytes, mime) {
  return `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
}

/** The most this skill will embed across every photograph in one beat, in raw (pre-base64) bytes.
 *  See `references/image-discipline.md`, "Weight", for where this number comes from and what a
 *  journalist is told to do when they hit it. */
export const WEIGHT_LIMIT_BYTES = 20 * 1024 * 1024;

/**
 * Throws, loudly and by name, if the images this beat is about to embed would exceed
 * `WEIGHT_LIMIT_BYTES` combined. Takes `{ label, bytes }` pairs rather than raw byte arrays so the
 * error can name which photograph to shrink, worst offender first — a total with no names attached
 * tells a journalist there is a problem but not which file to go re-export.
 */
export function checkWeight(images) {
  const total = images.reduce((sum, img) => sum + img.bytes.length, 0);
  if (total <= WEIGHT_LIMIT_BYTES) return;
  const worst = [...images].sort((a, b) => b.bytes.length - a.bytes.length);
  const mb = (n) => (n / (1024 * 1024)).toFixed(1);
  const named = worst.map((img) => `${img.label} (${mb(img.bytes.length)} MB)`).join(", ");
  throw new Error(
    `this beat would embed ${mb(total)} MB of photographs, over the ${mb(WEIGHT_LIMIT_BYTES)} MB limit ` +
      `(references/image-discipline.md, "Weight"). Largest first: ${named}. Re-export the largest ` +
      `one at a smaller size and supply it again — this skill does not recompress a photograph on ` +
      `its own, the same reason it does not crop one (see "Aspect ratio"): how much quality to give ` +
      `up is an editorial call, not one this skill makes silently.`,
  );
}
