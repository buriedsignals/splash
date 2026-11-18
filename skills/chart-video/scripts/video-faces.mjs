// twin/skills/chart-video/scripts/video-faces.mjs
//
// THE TYPEFACE A VIDEO FRAME IS SET IN, CARRIED INTO THE COMPOSITION AS BYTES.
//
// A Remotion composition is drawn by headless Chrome, not by resvg, so `useTypeface` putting a
// recorded family in force in THIS process changed nothing about the mp4: the composition carried
// its own literal stack, nothing loaded a face, and Chrome set every frame in whatever the machine
// had under the first name it could not find — Helvetica here, for a seed that names Open Sans.
// Measured on the seed's last frame, 2026-09-13.
//
// So the render resolves the faces here, in node, and hands them over as input props: the stack
// the composition must draw in, and the woff2 bytes for it. The bytes are the very TrueType file
// Bun measured every line with (`typefaceFile`, carried beside this file as `./typefaces.mjs`),
// embedded whole — see `measuredFileFaces` for why neither Google's web woff2 nor a cut subset
// draws a line at its measured width. Bytes rather than a stylesheet link for the reason
// `film/scripts/fetch-typefaces.mjs` gives: a frame painted before a network face arrives is a
// frame in the wrong face.
//
// A character the file has no glyph for is refused here, before any frame is drawn. Text a
// composition composes that the props cannot foresee is caught on the other side, by
// `assets/face-coverage.ts`, against what the frame actually drew.

import { existsSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import fontverter from "fontverter";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  codePointsOf,
  fontCodePoints,
  rangeSpec,
  requestedFamily,
  servedFace,
  isWoff2,
  typefaceFile,
} from "./typefaces.mjs";

/**
 * THE LATIN-1 BLOCK, CARRIED WHOLE. A composition types words of its own — a unit, an axis title,
 * "years" — that no scan of the props can see, and the first beat migrated after the seed drew a
 * "g" no face carried. A web page cuts its faces to the letter because a reader downloads them; a
 * video frame is rasterised here and its faces never leave this machine, so the conservative
 * direction costs nothing a reader pays. Printable U+0021–U+007E and U+00A1–U+00FF: every house
 * family on the ladders carries all of them. Anything beyond is still asked for by the props, and
 * still caught in the browser by `face-coverage.ts` when a composition types it.
 */
const LATIN_1 = String.fromCodePoint(
  ...Array.from({ length: 0x7e - 0x21 + 1 }, (_, i) => 0x21 + i),
  ...Array.from({ length: 0xff - 0xa1 + 1 }, (_, i) => 0xa1 + i),
);

/** Every string anywhere in the props — the words a composition can be handed to draw. */
function stringsOf(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (value && typeof value === "object") for (const item of Object.values(value)) stringsOf(item, out);
  return out;
}

/**
 * THE FACES CUT FROM THE FILE BUN MEASURED WITH — never from Google's web woff2.
 *
 * Every width a directed video lays out is resvg's reading of the TrueType file `typefaceFile`
 * fetches, and `embedded-faces.ts` refuses a frame whose line Chrome draws more than max(1px, 2%)
 * off that width. Google serves the web woff2 from a different build: in Merriweather Italic its
 * space is ~1.2px wider at 39px, so a short line with spaces ("20 t : 6 pays", 206.29px in Bun,
 * 210.98px in Chrome) failed the agreement on spaces alone (gx-beeswarm video, 2026-11-18). Chrome
 * handed Bun's own file drew it at 206.29px. The file is also the whole family, so a character no
 * web subset reaches (U+2082) needs no second request.
 *
 * AND IT IS EMBEDDED WHOLE, NOT CUT. hb-subset drops the legacy `kern` table that resvg and Chrome
 * both apply to this file: the same line cut to its own characters drew at 212.17px against the
 * whole file's 207.48px. A video's faces never leave this machine, so the whole file costs no reader
 * anything; its woff2 is converted once and cached beside the TrueType.
 */
const wholeInMemory = new Map();

/** The TrueType file as a woff2, unchanged in its tables — converted once, cached beside it. */
async function wholeWoff2(file, bytes) {
  const held = wholeInMemory.get(file);
  if (held) return held;
  const path = `${file}.whole.woff2`;
  let woff2 = existsSync(path) && statSync(path).size > 0 ? readFileSync(path) : null;
  if (woff2 && !isWoff2(woff2)) woff2 = null;
  if (!woff2) {
    woff2 = Buffer.from(await fontverter.convert(bytes, "woff2"));
    if (!isWoff2(woff2)) throw new Error(`converting ${file} produced no woff2. Nothing was cached.`);
    const staging = `${path}.${process.pid}.part`;
    writeFileSync(staging, woff2);
    renameSync(staging, path);
  }
  wholeInMemory.set(file, woff2);
  return woff2;
}

async function measuredFileFaces(requests, text) {
  const required = codePointsOf(text);
  const groups = new Map();
  for (const request of requests) {
    const weight = request.weight ?? 400;
    const style = request.style ?? "normal";
    const italic = style === "italic";
    const served = servedFace(request.family, weight, { italic });
    if (!served || served.style !== style)
      throw new Error(
        `"${request.family}" has no ${style} face${served ? ` — Google serves ${served.style} for it` : ""}. ` +
          `Declaring other bytes as ${style} would set the frame in the wrong face with nothing to say so.`,
      );
    const file = typefaceFile(request.family, weight, { italic });
    const group = groups.get(file) ?? { family: served.family, style, file, weights: [] };
    group.weights.push(weight);
    groups.set(file, group);
  }
  const out = [];
  for (const { family, style, file, weights } of groups.values()) {
    const bytes = readFileSync(file);
    const cmap = new Set(fontCodePoints(bytes));
    const missing = required.filter((cp) => !cmap.has(cp));
    if (missing.length > 0)
      throw new Error(
        `"${family}" ${style} cannot set ` +
          `${missing.map((cp) => `U+${cp.toString(16).toUpperCase().padStart(4, "0")} (${JSON.stringify(String.fromCodePoint(cp))})`).join(", ")} — ` +
          `the face has no glyph for them. Change the character or change the family.`,
      );
    out.push({
      family,
      style,
      weight: Math.min(...weights),
      weightTo: Math.max(...weights),
      unicodeRange: rangeSpec([...cmap]),
      base64: (await wholeWoff2(file, bytes)).toString("base64"),
    });
  }
  return out;
}

/** One request per distinct family × weight × style — `wanted` and a direction's own registers can
 *  both repeat a combination (two core voices sharing a face at the same weight), and each is asked
 *  for once. */
function dedupeWanted(list) {
  const seen = new Map();
  for (const request of list) {
    const key = `${request.family}|${request.weight}|${request.style ?? "normal"}`;
    if (!seen.has(key)) seen.set(key, request);
  }
  return [...seen.values()];
}

/**
 * The deduplicated `[{ family, weight, style }]` a directed video's registers ask for — one entry
 * per distinct family × weight × style among its six resolved registers (`display`, `eyebrow`,
 * `body`, `annot`, `value`, `axis`), the `wanted` form `videoFaces` takes.
 *
 * @param {Record<string, {fontFamily: string, fontWeight: number, fontStyle?: "normal"|"italic"}>} registers
 * @returns {Array<{family: string, weight: number, style: "normal"|"italic"}>}
 */
export function wantedOf(registers) {
  return dedupeWanted(
    Object.values(registers).map((r) => ({
      family: r.fontFamily,
      weight: r.fontWeight,
      style: r.fontStyle === "italic" ? "italic" : "normal",
    })),
  );
}

/**
 * @param {{wanted?: Array<{family: string, weight?: number, style?: "normal"|"italic"}>,
 *          stack?: string, weights?: number[], props: object}} beat
 *        `wanted` is what a directed video passes — one entry per family × weight × style its
 *        registers resolve to. `stack` + `weights` is the single-family form the seed uses.
 *        `wanted` and `stack`/`weights` are the same choice made two ways: exactly one form may be
 *        given, never neither and never both — a caller confused about which one it is driving is
 *        exactly the caller this refuses.
 *
 *        THE TEXT ITSELF IS ALREADY CASED. A directed beat runs its treatment's words through
 *        `applyCase(text, register.transform)` in Bun before they ever reach `props`, so the subset
 *        cut here — and the face `stringsOf` scans — is cut from the CASED strings, not the
 *        treatment's own casing.
 */
export async function videoFaces({ wanted, stack, weights, props }) {
  const hasWanted = Array.isArray(wanted) && wanted.length > 0;
  const hasStackForm = stack !== undefined && weights !== undefined;
  if (hasWanted && hasStackForm)
    throw new Error(
      "videoFaces: pass either `wanted` or `stack` + `weights`, not both — a caller driving both " +
        "forms at once does not know which one it means.",
    );
  if (!hasWanted && !hasStackForm)
    throw new Error(
      "videoFaces: pass `wanted` (a non-empty array) or `stack` + `weights` — neither form was given.",
    );
  if (props && (Object.hasOwn(props, "fontFamily") || Object.hasOwn(props, "faces")))
    throw new Error(
      "videoFaces: props already carries a `fontFamily` or `faces` key — the spread in " +
        "writeRenderProps would silently overwrite it with the ones this call resolves.",
    );

  const requests = hasWanted
    ? dedupeWanted(wanted)
    : [...new Set(weights)].map((weight) => ({ family: requestedFamily(stack), weight }));
  const faces = await measuredFileFaces(requests, [LATIN_1, ...stringsOf(props)].join("\n"));
  return {
    fontFamily: stack ?? null,
    faces: faces.map(({ family, style, weight, weightTo, unicodeRange, base64 }) => ({
      family,
      style,
      weight,
      weightTo,
      unicodeRange,
      base64,
    })),
  };
}

/**
 * The props a render is driven by, written TWICE: with the bytes into a temporary file the
 * renderer reads, and without them into `auditPath`, the props file a beat commits beside its mp4.
 * A committed audit file carrying ~100 KB of base64 per render is a diff nobody reads; what it
 * keeps — the stack, and each face's family, weight and measured range — is what an audit asks.
 *
 * @returns {Promise<string>} the path to hand `remotion --props=`
 */
export async function writeRenderProps({ props, wanted, stack, weights, auditPath }) {
  const typeface = await videoFaces({ wanted, stack, weights, props });
  const rendered = { ...props, ...typeface };
  const audit = { ...props, ...typeface, faces: typeface.faces.map(({ base64, ...face }) => face) };
  await writeFile(auditPath, JSON.stringify(audit, null, 2));
  const renderPath = join(await mkdtemp(join(tmpdir(), "video-props-")), "props.json");
  await writeFile(renderPath, JSON.stringify(rendered));
  return renderPath;
}
