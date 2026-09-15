// THE VIDEO IN SEQUENCES, MEASURED IN BUN — not the page layout of the other formats.
//
// The owner (2026-09-14): « Le layout vidéo ne doit pas être comme les autres, genre premier plan le titre en
// premier puis ensuite tout un storytelling ». So the frame is not a header over a map over a key: it is a
// sequence of shots.
//
//   1. THE TITLE CARD — the eyebrow and the title, alone on the direction's ground, as large as the display
//      register draws, wrapped to a reading measure. No standfirst: a video says what it can show rather than
//      writing it (the owner, 2026-09-14: « faire comprendre en écrivant le moins possible de texte explicatif »).
//   2. THE STORY — the live map on the whole frame, edge to edge. What the story needs to be read — the count and
//      the key — sits in one PANEL that comes and goes with its gestures; `build.mjs` seats it on the sea the map
//      was measured to paint. The panel is laid out here at its own origin: the count and the key, no sentence;
//      the six and the seas are the map's own words, the close-up's labels the overlay's (`build.mjs`).
//   3. NO END CARD — the video ends on the map, with the source set small on its sea.
//
// Every width is `measureText` on the face the composition embeds, plus the register's tracking; every
// baseline sits at its block's edge plus the ink ascent resvg measures; every gap is a multiple of the lead
// of the register named beside it. The composition draws at these coordinates and only checks the widths back
// (spec §4.1).
//
// Runs in Bun only (resvg).

import { frameInsetFor, sizeFor } from "#shared/chart-video/sizes.mjs";
import { EYEBROW_TO_DISPLAY } from "#shared/design-base/register.mjs";
import { CREDIT_ONE_LINE, keyFor, sourceCreditFor, titleCardFor, verticalInsetFor } from "../../skills/map-beat/scripts/shots.mjs";

// The shots every type shares — the title card, the key, the credit — are the skill's (`shots.mjs`).
export { DRAWN_WIDER, haloOf, pillOf, widthOf } from "../../skills/map-beat/scripts/shots.mjs";

/** The register each slot is set in. */
export const SLOT_REGISTERS = Object.freeze({
  eyebrow: "eyebrow",
  title: "display",
  counter: "value",
  key: "axis",
  source: "axis",
  name: "area",
  featureName: "feature",
  oddName: "closeFeature",
  water: "water",
});

/**
 * THE STILL'S MAP TREATMENTS AT THE VIDEO'S SIZE — `mapRegistersFor` (the still's component) applied to the
 * video's own registers: `area` is the axis register tracked to at least 0.8 px of the still, carried by the
 * ladder's factor `k`; `feature` is that at 700 (the six the map names, and Albania's name); `water` the axis in
 * italic, untracked (the seas the map names). `closeFeature` is the close-up's own name, the value register set as a
 * feature — the one word the shot is about.
 */
export function mapRegistersOf(registers, k) {
  const { axis, value } = registers;
  const area = { ...axis, letterSpacing: Math.max(Number(axis.letterSpacing ?? 0), 0.8 * k) };
  return {
    area,
    feature: { ...area, fontWeight: 700 },
    closeFeature: { ...value, fontWeight: 700, letterSpacing: (area.letterSpacing * value.fontSize) / axis.fontSize },
    water: { ...axis, fontStyle: "italic", letterSpacing: 0, transform: "none" },
  };
}

/**
 * @param {{ registers: Record<string, any>, copy: {
 *   eyebrow: string, title: string[], counterSteps: string[], breaks: string[], missingLabel: string,
 *   source: string[] }, size: "landscape", k: number }} input
 *   `registers` from `videoRegistersOf`; `copy` NOT cased — each slot is cased by its own register.
 */
export function layoutFor({ registers, copy, size, k }) {
  if (size !== "landscape") throw new Error(`the choropleth video lays out at landscape only, not ${JSON.stringify(size)}`);
  const row = sizeFor(size);
  const frame = { width: row.width, height: row.height };
  const inset = frameInsetFor(size);
  const vInset = verticalInsetFor(size);
  for (const [name, r] of Object.entries(registers))
    if (!(r.fontSize >= row.minTypePx)) throw new Error(`register ${name} is ${r.fontSize}px, under the ${row.minTypePx}px floor`);

  // 1. THE TITLE CARD, 3. THE CREDIT — the owner (2026-09-14): « la vue finale doit être la map et pas le titre à
  // nouveau »; `build.mjs` seats the credit on the measured sea.
  const { form, register, eyebrow, title } = titleCardFor({ registers, eyebrow: copy.eyebrow, title: copy.title, size, eyebrowToDisplay: EYEBROW_TO_DISPLAY });
  // The credit on one line, in every form that holds one: `build.mjs` seats the longest that finds open sea.
  const sources = copy.source.flatMap((form) => {
    try {
      return [sourceCreditFor({ registers, forms: [form], size, k, ...CREDIT_ONE_LINE })];
    } catch {
      return [];
    }
  });
  if (!sources.length) throw new Error("no form of the source holds one line");
  const { register: sourceR, ...source } = sources[0];
  // 2. THE KEY: the count over the key — the floor's cursor on the bornes says which share the count is above.
  const { counters, ...key } = keyFor({ registers, k, counters: [copy.counterSteps], breaks: copy.breaks, missingLabel: copy.missingLabel });

  return {
    frame,
    inset,
    vInset,
    content: frame.width - 2 * inset,
    registers: { ...registers, source: sourceR },
    /** The story's map: the whole frame. */
    stage: { x: 0, y: 0, width: frame.width, height: frame.height },
    titleCard: { form, register, eyebrow, title },
    source,
    /** Every one-line form of the credit, longest first, each laid out at its own origin. */
    sources: sources.map(({ register, ...s }) => s),
    panel: { width: key.width, height: key.height, halo: key.halo, valueHalo: key.valueHalo, counter: counters[0], swatches: key.swatches, bornes: key.bornes, missingSwatch: key.missingSwatch, missingLabel: key.missingLabel },
  };
}
