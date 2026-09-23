// twin/skills/chart-video/assets/face-coverage.ts
//
// WHAT A FRAME DREW, HELD AGAINST WHAT THE RENDER EMBEDDED.
//
// A Remotion frame is painted by Chrome, and Chrome sets a glyph its named face cannot supply in
// whatever face comes next in the stack — Helvetica on this machine, something else on a Linux
// host — and reports nothing. `scripts/video-faces.mjs` embeds the faces from the props' own words,
// but a composition also composes text at render time (a formatted value, a tick label), and a
// build-time scan cannot see that. So the composition reads back every run it actually drew, with
// the family and weight Chrome resolved for it, and this module says which characters no embedded
// face could have set.
//
// WHY A SECOND RANGE PARSER. `parseUnicodeRange` lives in `scripts/typefaces.mjs`, which imports
// `node:fs` at module scope and cannot be bundled for a browser — the same wall `FONT_FAMILY` and
// `deriveFurniture` stand behind. The ranges it reads are the ones `embeddedWebFaces` measured off
// each cut file's own cmap, so they are exact; this reads them, it does not re-derive them.

export type EmbeddedFace = {
  family: string;
  style: "normal" | "italic";
  weight: number;
  weightTo: number;
  unicodeRange: string;
  base64: string;
};

export type DrawnRun = {
  text: string;
  family: string;
  weight: number;
  style?: "normal" | "italic";
};
export type Uncovered = { codePoint: number; family: string; weight: number };

/** `U+20-7E, U+2082, U+04??` as `[lo, hi]` pairs. A token this cannot read is refused: a range
 *  silently dropped would report a covered character as missing, or worse, the reverse. */
export function parseRanges(spec: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  for (const part of spec.split(",")) {
    const token = part.trim().replace(/^[uU]\+/, "");
    if (!token) continue;
    const [lo, hi] = token.includes("-")
      ? token.split("-").map((h) => Number.parseInt(h, 16))
      : [
          Number.parseInt(token.replace(/\?/g, "0"), 16),
          Number.parseInt(token.replace(/\?/g, "F"), 16),
        ];
    if (!Number.isFinite(lo) || !Number.isFinite(hi))
      throw new Error(
        `unreadable unicode-range token ${JSON.stringify(part)} in ${JSON.stringify(spec)}`,
      );
    ranges.push([lo, hi]);
  }
  return ranges;
}

/** Spaces and format characters carry no ink, and `codePointsOf` in `typefaces.mjs` never asks a
 *  face for them — Open Sans has no U+202F, which `Intl.NumberFormat("fr-FR")` puts in every
 *  thousand. The two sides must skip the same set, or a French figure fails a frame no face fixes. */
const INKLESS = /[\s\u00AD\u200B-\u200F\u2028-\u202F\u205F-\u2064\uFEFF]/;

export function uncoveredText(
  runs: DrawnRun[],
  faces: EmbeddedFace[],
): Uncovered[] {
  const parsed = faces.map((face) => ({
    face,
    ranges: parseRanges(face.unicodeRange),
  }));
  const seen = new Set<string>();
  const out: Uncovered[] = [];
  for (const { text, family, weight, style = "normal" } of runs) {
    for (const ch of text) {
      if (INKLESS.test(ch)) continue;
      const codePoint = ch.codePointAt(0)!;
      const key = `${family}|${weight}|${style}|${codePoint}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const covered = parsed.some(
        ({ face, ranges }) =>
          face.family === family &&
          face.style === style &&
          weight >= face.weight &&
          weight <= face.weightTo &&
          ranges.some(([lo, hi]) => codePoint >= lo && codePoint <= hi),
      );
      if (!covered) out.push({ codePoint, family, weight });
    }
  }
  return out;
}
