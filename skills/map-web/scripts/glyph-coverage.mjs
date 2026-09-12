// twin/shared/chart-beat/glyph-coverage.mjs
//
// A FAMILY THAT CANNOT SET THE TEXT IS REFUSED BEFORE THE RENDER, NOT AFTER.
//
// THE DEFECT, MEASURED 2026-09-07. `CO2` sets in the requested family at the requested weight.
// `CO₂` — one subscript, U+2082 — drops the ENTIRE text run to a fallback face and loses the
// requested weight with it. Superclarendon, Iowan Old Style and Futura, three for three, and the
// render exits zero. Nothing anywhere goes red, and a delivered title silently arrives in a font
// nobody chose. A map label fails the same way and worse: a range MapTiler does not serve makes the
// character vanish from the word outright — "Mer d'Azov" printed as "Mer dAzov".
//
// THE ANSWER IS NOW THE FONT'S OWN cmap, WHICH IS GROUND TRUTH. This file used to infer coverage
// from METRICS: lay one character out in the family and in five probe families, and call it missing
// when two differently-metricked faces produced an identical width, because two faces that differ on
// a control string cannot agree to a hundredth of a pixel unless both fell back to the same face.
// That worked — a sweep of 264 family-character pairs found no false positive — but its own header
// said what it really wanted: *"WHY NOT READ THE FONT'S cmap, which would be ground truth: it needs
// the font FILE, and resvg resolves families through `loadSystemFonts` without exposing a path… If
// a path-resolving route ever lands, this file is where it goes."*
//
// The route landed. `typefaces.mjs` beside this file turns a family name into a `.ttf` on disk, so
// the question "does this family have U+2082" is answered by the table the rasteriser itself will
// consult, rather than by an inference from two rendered widths. The heuristic is GONE rather than
// kept alongside: two answers to one question is how they drift.
//
// WHAT IT READS. The character-to-glyph map of the family's UPRIGHT 400 — a family's coverage is a
// property of its design, and Google serves the same character set across a family's weights. It
// prefers the format 12 subtable (full Unicode) and falls back to format 4 (the Basic Multilingual
// Plane), which is what every browser does.
//
// WHAT IT COSTS, STATED. The first question about a family fetches that family's file; every later
// one is answered from a cached parse. A family the cache does not hold and the network cannot
// reach REFUSES, naming the family — it does not quietly report full coverage.

import { readFileSync } from "node:fs";
import { typefaceFile } from "./typefaces.mjs";

/** `U+2082`, the way a code point is written where a person has to read it. */
export function codePointOf(character) {
  return "U+" + character.codePointAt(0).toString(16).toUpperCase().padStart(4, "0");
}

/** An sfnt table directory: `{ tag → { offset, length } }`. Handles a TrueType collection by
 *  reading its first font, which is the one a rasteriser takes by default. */
function tableDirectory(view) {
  let base = 0;
  if (view.getUint32(0) === 0x74746366) base = view.getUint32(12); // 'ttcf'
  const count = view.getUint16(base + 4);
  const tables = new Map();
  for (let i = 0; i < count; i++) {
    const record = base + 12 + i * 16;
    const tag = String.fromCharCode(
      view.getUint8(record), view.getUint8(record + 1),
      view.getUint8(record + 2), view.getUint8(record + 3),
    );
    tables.set(tag, { offset: view.getUint32(record + 8), length: view.getUint32(record + 12) });
  }
  return tables;
}

/** The code points a format 4 subtable maps — the Basic Multilingual Plane. */
function readFormat4(view, at, into) {
  const segCount = view.getUint16(at + 6) / 2;
  const endAt = at + 14;
  const startAt = endAt + segCount * 2 + 2;
  const deltaAt = startAt + segCount * 2;
  const rangeAt = deltaAt + segCount * 2;
  for (let s = 0; s < segCount; s++) {
    const end = view.getUint16(endAt + s * 2);
    const start = view.getUint16(startAt + s * 2);
    if (start > end) continue;
    const delta = view.getInt16(deltaAt + s * 2);
    const rangeOffset = view.getUint16(rangeAt + s * 2);
    for (let c = start; c <= end && c !== 0xffff; c++) {
      let glyph;
      if (rangeOffset === 0) glyph = (c + delta) & 0xffff;
      else {
        const index = rangeAt + s * 2 + rangeOffset + (c - start) * 2;
        if (index + 1 >= view.byteLength) continue;
        glyph = view.getUint16(index);
        if (glyph !== 0) glyph = (glyph + delta) & 0xffff;
      }
      if (glyph !== 0) into.add(c);
    }
  }
}

/** The code points a format 12 subtable maps — all of Unicode, in groups. */
function readFormat12(view, at, into) {
  const groups = view.getUint32(at + 12);
  for (let g = 0; g < groups; g++) {
    const record = at + 16 + g * 12;
    const start = view.getUint32(record);
    const end = view.getUint32(record + 4);
    const startGlyph = view.getUint32(record + 8);
    if (startGlyph === 0 && start === 0) continue;
    for (let c = start; c <= end; c++) into.add(c);
  }
}

/** Every code point the font at `path` can set. */
export function coveredCodePoints(path) {
  const bytes = readFileSync(path);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const cmap = tableDirectory(view).get("cmap");
  if (!cmap) throw new Error(`${path} carries no cmap table — it cannot be asked what it can set`);

  const subtables = [];
  const count = view.getUint16(cmap.offset + 2);
  for (let i = 0; i < count; i++) {
    const record = cmap.offset + 4 + i * 8;
    const platform = view.getUint16(record);
    const encoding = view.getUint16(record + 2);
    const at = cmap.offset + view.getUint32(record + 4);
    subtables.push({ platform, encoding, at, format: view.getUint16(at) });
  }
  // Format 12 covers everything format 4 does and the planes above it, so it is preferred when the
  // font carries both — the order a browser resolves in.
  const chosen =
    subtables.filter((s) => s.format === 12).sort((a, b) => (a.platform === 3 ? -1 : 1))[0] ??
    subtables.filter((s) => s.format === 4).sort((a, b) => (a.platform === 3 ? -1 : 1))[0];
  if (!chosen)
    throw new Error(
      `${path} has a cmap with no format 4 or format 12 subtable (found ` +
        `${subtables.map((s) => s.format).join(", ") || "none"}) — this reader cannot answer for it`,
    );

  const covered = new Set();
  if (chosen.format === 12) readFormat12(view, chosen.at, covered);
  else readFormat4(view, chosen.at, covered);
  return covered;
}

const parsed = new Map();

/** The character set of a family's upright 400, parsed once per process. */
function coverageOf(family) {
  const held = parsed.get(family);
  if (held) return held;
  const covered = coveredCodePoints(typefaceFile(family, 400));
  parsed.set(family, covered);
  return covered;
}

/**
 * The code points in `text` that `family` cannot set, in the order they first appear.
 *
 * @param {string} family
 * @param {string} text
 * @returns {string[]} e.g. `["U+2082"]`
 */
export function missingGlyphs(family, text) {
  if (!family || !text) return [];
  const covered = coverageOf(family);
  const missing = [];
  const seen = new Set();
  for (const character of text) {
    const code = character.codePointAt(0);
    if (seen.has(code)) continue;
    seen.add(code);
    if (!covered.has(code)) missing.push(codePointOf(character));
  }
  return missing;
}

/** Whether `family` can set every character of `text`. */
export function familyCovers(family, text) {
  return missingGlyphs(family, text).length === 0;
}

/**
 * Refuse a family that cannot set the text it is being handed.
 *
 * @param {string} family
 * @param {string} text
 * @param {{where?: string}} options  where the text is being set, so the message names the caller
 */
export function assertCoversText(family, text, { where = "this text" } = {}) {
  const missing = missingGlyphs(family, text);
  if (missing.length === 0) return;
  throw new Error(
    `the family "${family}" cannot set ${where}: it has no glyph for ${missing.join(", ")}. ` +
      `One missing code point drops the WHOLE text run to a fallback face and loses the requested ` +
      `weight with it, silently — so the family is refused here rather than in the delivered file.`,
  );
}
