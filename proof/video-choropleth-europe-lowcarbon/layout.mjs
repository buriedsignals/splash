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

/** The air a block in the ground band keeps from the band's edges and from the block above it, × the axis lead —
 *  the same `PILL_GAP` every other pair of blocks in this beat is held apart by. */
const BAND_AIR = 0.25;
/** The least share of the frame the live map may be left with once the band has taken its room — the static twin's
 *  `MIN_MAP_SHARE`, and its reasoning: below a third the map stops being the largest single thing in the frame. */
const MIN_MAP_SHARE = 1 / 3;

/** THE CREDIT THE BAND SETS: the longest form that holds ONE line at this frame's measure, which is what the band is
 *  for — a credit given two lines takes its second line out of the map's own height. `CREDIT_ONE_LINE` already asks
 *  every form for one line; a narrow frame buys some of them a second, and those are the ones this passes over. */
const creditInBand = (sources) => sources.find((s) => s.lines.length === 1) ?? sources[0];

/**
 * THE BAND'S GEOMETRY: the credit at its foot on the frame's own margin, the whole width of the frame behind it, so
 * the band reads as ground the composition is built on rather than as a card laid over the map. It stands on the
 * left margin, where every other block of this beat stands.
 *
 * THE BAND CARRIES BOTH THE KEY AND THE CREDIT, and it was MEASURED down to one of them first. The credit has to
 * stand on cells that are ALL sea — it crosses no coast, no country and no word of the map's — and the square map
 * leaves no such row anywhere; the key is allowed 3 % of land under its halo (`PANEL_LAND`, the owner's rule), which
 * is a far weaker ask. So the first band drawn here carried the credit alone, leaving the map 948 px of the 1080 and
 * the key its own search. Measured 2026-09-24, all three directions: the key found no place on that map either — a
 * 719 × 200 block over 3 % land does not exist on a square map of Europe. The band carries what the map has NO room
 * for, and here that is both.
 */
function bandFor({ frame, inset, vInset, air, panel, credit }) {
  const height = air + panel.height + air + credit.height + vInset;
  const y = frame.height - height;
  const mapBand = { x: 0, y: 0, width: frame.width, height: y };
  if (mapBand.height < frame.height * MIN_MAP_SHARE)
    throw new Error(
      `the ground band is ${height.toFixed(0)}px tall and leaves the map ${mapBand.height.toFixed(0)}px of a ` +
        `${frame.height}px frame, under the ${(frame.height * MIN_MAP_SHARE).toFixed(0)}px a map beat keeps for its map. ` +
        `Give the beat a shorter credit, or fewer classes in the key.`,
    );
  return { x: 0, y, width: frame.width, height, mapBand, panelAt: { x: inset, y: y + air }, sourceAt: { x: inset, y: frame.height - vInset - credit.height } };
}

/**
 * THE FRAME IS THE WHOLE DESIGN, AND THE SHOTS ARE ALREADY DRAWN FROM IT.
 *
 * Until 2026-09-23 this function threw `the choropleth video lays out at landscape only` on anything but
 * landscape. That refusal protected no drawing: it was a record that the shots had only ever been MEASURED on a
 * 1920 × 1080 frame. Every one of them reads the frame it is given — `titleCardFor` wraps to the frame's own
 * reading measure and buys the lines a narrower one costs, `sourceCreditFor` does the same for the credit's line
 * budget, `keyFor` is laid out at its own origin from the registers alone, and the story's stage IS the frame.
 * Nothing here read 1920 or 1080.
 *
 * What a narrower frame can genuinely break is the one thing the refusal never checked: a block laid out at its
 * own origin can come out WIDER than the frame has content to hold it, and it would then be seated by `build.mjs`
 * with a margin missing or not seated at all, with the arithmetic nowhere in the message. So that is the
 * assertion now, and it holds at all three frames (measured 2026-09-23, the three filed directions):
 *
 *   landscape 1750 px of content — panel 599-654, narrowest credit form 598-707
 *   square    936  px of content — panel 719-784, narrowest credit form 717-849
 *   portrait  936  px of content — panel 719-784, narrowest credit form 717-849
 *
 * @param {{ registers: Record<string, any>, copy: {
 *   eyebrow: string, title: string[], counterSteps: string[], breaks: string[], missingLabel: string,
 *   source: string[] }, size: "landscape" | "square" | "portrait", k: number }} input
 *   `registers` from `videoRegistersOf`; `copy` NOT cased — each slot is cased by its own register.
 */
export function layoutFor({ registers, copy, size, k }) {
  const row = sizeFor(size);
  const frame = { width: row.width, height: row.height };
  const inset = frameInsetFor(size);
  const vInset = verticalInsetFor(size);
  for (const [name, r] of Object.entries(registers))
    if (!(r.fontSize >= row.minTypePx)) throw new Error(`register ${name} is ${r.fontSize}px, under the ${row.minTypePx}px floor`);

  // 1. THE TITLE CARD, 3. THE CREDIT — the owner (2026-09-14): « la vue finale doit être la map et pas le titre à
  // nouveau »; `build.mjs` seats the credit on the measured sea.
  const { form, register, eyebrow, title } = titleCardFor({ registers, eyebrow: copy.eyebrow, title: copy.title, size, eyebrowToDisplay: EYEBROW_TO_DISPLAY });
  // The credit at its shortest, in every form that holds the frame's own line budget: `build.mjs` seats the
  // longest that finds open sea. `CREDIT_ONE_LINE` asks for one line, and `sourceCreditFor` carries that budget
  // across in reading terms — a credit that holds one line across 1750 px of landscape content is given two on
  // the 936 px a square or a portrait frame offers, rather than being refused for a headline it does not have.
  const sources = copy.source.flatMap((form) => {
    try {
      return [sourceCreditFor({ registers, forms: [form], size, k, ...CREDIT_ONE_LINE })];
    } catch {
      return [];
    }
  });
  if (!sources.length) throw new Error(`no form of the source holds the credit's line budget at ${size}`);
  const { register: sourceR, ...source } = sources[0];
  // 2. THE KEY: the count over the key — the floor's cursor on the bornes says which share the count is above.
  const { counters, ...key } = keyFor({ registers, k, counters: [copy.counterSteps], breaks: copy.breaks, missingLabel: copy.missingLabel });
  // EVERY BLOCK FITS THE FRAME'S CONTENT, or the frame is named with the arithmetic. The narrowest credit form is
  // the one `build.mjs` falls back on when nothing longer finds open sea, so it is the form this measures: a
  // panel or a last-resort credit wider than the content has nowhere inside the margins to stand.
  const content = frame.width - 2 * inset;
  const overrun = [
    ["the key panel", key.width],
    ["the narrowest form of the credit", Math.min(...sources.map((s) => s.width))],
  ].filter(([, width]) => width > content);
  if (overrun.length)
    throw new Error(
      `at ${size} the frame holds ${content}px of content between its margins, and ` +
        `${overrun.map(([what, width]) => `${what} is ${width.toFixed(0)}px`).join(", ")}. ` +
        `Give the beat a shorter form, or fewer classes in the key — the frame's margin is not the thing to spend.`,
    );

  /**
   * THE GROUND BAND — WHAT THE SQUARE FRAME MAKES POSSIBLE, AND WHAT THE STATIC TWIN ALREADY DRAWS.
   *
   * The story's rule above — « the live map on the whole frame, edge to edge » — was written for a 16:9 frame, and
   * at 16:9 it costs nothing: Europe is fitted there by its HEIGHT, and the width left over is the open Atlantic
   * the count, the key and the credit stand on. A SQUARE frame fits the same ground by its WIDTH, so the map is
   * Europe and nothing else. Measured on the square whole-map picture, 2026-09-24: the bottom 100 px of the frame
   * are 72 % land and the top 100 px are 27 % land — there is no sky and no sea to stand anything in, which is
   * exactly what the three directions refused with (« no one-line form of the source finds the open sea »).
   *
   * So at square the frame overrides the story's rule, and it does it the way the static twin does
   * (`proof/static-choropleth-europe-lowcarbon/DirectedChoroplethMap.tsx`, `STACKED`): a band of the direction's own
   * ground across the foot, the key over the credit inside it, and the live map fitted into the band that is left —
   * still full width, edge to edge across it. This is a DIFFERENT DRAWING of the same argument, not a degraded one:
   * the credit crosses no coast because it crosses no map at all, and the key is read off ground, not off water.
   *
   * THE MAP STAYS THE SUBJECT, the twin's `MIN_MAP_SHARE` (« a third is a statement about what a map beat IS »):
   * a band that leaves the map less than a third of the frame is refused with the number it fell short by.
   */
  const band = size === "square" ? bandFor({ frame, inset, vInset, air: BAND_AIR * registers.axis.lead, panel: key, credit: creditInBand(sources) }) : null;

  return {
    frame,
    inset,
    vInset,
    content,
    registers: { ...registers, source: sourceR },
    /** The story's map: the whole frame, or the band above the ground band at square. */
    stage: { x: 0, y: 0, width: frame.width, height: frame.height },
    band,
    titleCard: { form, register, eyebrow, title },
    source,
    /** Every one-line form of the credit, longest first, each laid out at its own origin. */
    sources: sources.map(({ register, ...s }) => s),
    panel: { width: key.width, height: key.height, halo: key.halo, valueHalo: key.valueHalo, counter: counters[0], swatches: key.swatches, bornes: key.bornes, missingSwatch: key.missingSwatch, missingLabel: key.missingLabel },
  };
}
