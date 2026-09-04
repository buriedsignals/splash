// twin/skills/image-beat/scripts/image-raster.mjs
//
// THE PHOTOGRAPH SIDE OF A PHOTO ESSAY: reading a PNG or JPEG's dimensions and EXIF orientation off
// its own bytes, fitting it into a box without cropping, embedding it as a data URI, and refusing a
// beat that would weigh more than the ceiling. These used to live inside this skill's copy of
// `render-still.mjs`, which made that copy the one variant of a file every other skill carries
// verbatim; they are this skill's own, so they live in this skill's own file, and `render-still.mjs`
// is a plain carried copy again.

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
