// twin/proof/video-choropleth-europe-lowcarbon/layout.mjs
//
// THE VIDEO FRAME, LAID OUT IN BUN — every word the six events show, placed once, measured on the
// same font files the still measures with, and the map given the rectangle the text leaves.
//
// Runs in Bun only: `measureText` / `measureTextBand` rasterise through resvg. The composition in
// Chrome receives the result as props and draws at these coordinates; the only thing it measures is
// the width agreement (spec §4.1), against the `width` every line carries.
//
// EVERY BLOCK IS RESERVED FROM FRAME 0. The reference mark lands at `reference` and the conclusion at
// `conclusion`, but their space is in the layout from the start, so nothing shifts when they arrive
// (motion grammar). A block that appears later is laid out exactly like one that is always there.
//
// THE COMPOSITION: a text panel on the LEFT — eyebrow, title, key label, key with its reference mark,
// the conclusion slot — the map to its right, and the source as one footer line under both. The
// panel is read before the map, in reading order, as in the still. The source spans the frame
// because the map is bound by its WIDTH, not its height: a footer under it costs the map almost
// nothing, where the same line in the panel wraps to two or three and pushes the panel wider.
//
// THE MAP BOX IS THE VIDEO'S OWN. The still's camera is `CAMERA_ASPECT` (1000/760), but the video
// zooms, so the map takes the largest rectangle the panel leaves, its aspect clamped to 0.8–1.6 of
// the still's, and the aspect it chose travels out as `mapAspect`. Nothing here reads the still's
// unit-box positions (`shapes[].rings`, `anchor`, `seatOf`, `waters[].x/y`): the map places its own
// words, as MapLibre symbol layers.

import { measureText, measureTextBand } from "#shared/chart-beat/render-still.mjs";
import { applyCase, DERIVED_SIZE_RATIO } from "#shared/chart-beat/registers.mjs";
import { frameInsetFor, sizeFor } from "#shared/chart-video/sizes.mjs";
import { YEAR, copyOf } from "../static-choropleth-europe-lowcarbon/beat.mjs";

/** The register each block is set in. The key's break labels and its « non rapportée » label are
 *  one block; the reference mark is an annotation set under the top class. */
export const BLOCK_REGISTERS = Object.freeze({
  eyebrow: "eyebrow",
  title: "display",
  keyLabel: "axis",
  key: "axis",
  reference: "annot",
  conclusion: "body",
  source: "axis",
});

const FRENCH_COUNT = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix"];
const capitalise = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * The still's copy, rewritten for the video (BRIEF.md, « The copy »): two title forms, the key label
 * with its year, the key's printed breaks, the reference mark, the conclusion sentence and a short
 * source. Not cased — `caseCopy` applies each block's register.
 */
export function videoCopyOf(subject) {
  const { BREAKS, FLOOR, ODD_ONE, NEIGHBOUR_CEILING, above, neighbours, format, french } = subject;
  const still = copyOf(subject);
  const count = FRENCH_COUNT[above.length];
  if (!count) throw new Error(`no French word for a count of ${above.length} countries above the floor`);
  const odd = french(ODD_ONE);
  if (!/^[AEIOUYÉÈÊH]/i.test(odd))
    throw new Error(`the conclusion elides « de l’ » before ${odd}, which does not open on a vowel`);
  return {
    eyebrow: still.eyebrow,
    title: [still.title[1], still.title[2]],
    keyLabel: `part bas-carbone de la production, ${YEAR}`,
    breaks: BREAKS.map(format),
    missingLabel: "donnée non rapportée",
    reference: `plus de ${FLOOR} %`,
    conclusion:
      `${capitalise(count)} pays dépassent ${FLOOR} %. ` +
      `Les ${neighbours.length} voisins mesurés de l’${odd} sont tous sous ${NEIGHBOUR_CEILING} %.`,
    source: "Source : Ember, Energy Institute (2025), via Our World in Data · fond MapTiler",
  };
}

/** Every string of `copy`, cased by the register its block is drawn in. */
export function caseCopy(copy, registers) {
  const as = (slot, text) => applyCase(text, registers[BLOCK_REGISTERS[slot]].transform);
  return {
    eyebrow: as("eyebrow", copy.eyebrow),
    title: copy.title.map((t) => as("title", t)),
    keyLabel: as("keyLabel", copy.keyLabel),
    breaks: copy.breaks.map((b) => as("key", b)),
    missingLabel: as("key", copy.missingLabel),
    reference: as("reference", copy.reference),
    conclusion: as("conclusion", copy.conclusion),
    source: as("source", copy.source),
  };
}

// ── measurement: the still's own, on the video's drawn registers ────────────────────────────────

const faceOf = (r) => ({
  fontSize: r.fontSize,
  fontWeight: r.fontWeight,
  fontFamily: r.fontFamily,
  fontStyle: r.fontStyle === "italic" ? "italic" : "normal",
});

/** A line's width as the composition's width-agreement check reads it (spec §4.1). */
export function widthOf(text, r) {
  return measureText(text, faceOf(r)) + Number(r.letterSpacing ?? 0) * Math.max(0, [...text].length - 1);
}

/** The ink band a register can reach: accented capitals above, cedilla and descenders below. A
 *  block's first baseline sits at its top plus this ascent, never at a half-leading guess. */
const BAND_PROBE = "ÉÀÇHxpgjq1,’";
export const bandOf = (r) => measureTextBand(BAND_PROBE, faceOf(r));

const wrapped = new Map();
function wrap(text, maxWidth, r) {
  const key = `${r.fontFamily}|${r.fontSize}|${r.fontWeight}|${r.fontStyle}|${r.letterSpacing}|${maxWidth}|${text}`;
  const held = wrapped.get(key);
  if (held) return held;
  const lines = [];
  let current = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const trial = current ? `${current} ${word}` : word;
    if (current && widthOf(trial, r) > maxWidth) {
      lines.push(current);
      current = word;
    } else current = trial;
  }
  if (current) lines.push(current);
  wrapped.set(key, lines);
  return lines;
}

// ── the rhythm: every gap a multiple of the lead of the register named beside it ─────────────────

const EYEBROW_GAP = 0.5; // × eyebrow lead: eyebrow → title
const TITLE_GAP = 0.5; // × display lead: title → key label
const KEY_LABEL_GAP = 0.3; // × axis lead: key label → swatches
const STRIP_GAP = 0.15; // × axis lead: swatches → break labels
const ROW_GAP = 0.35; // × axis lead: break labels → « non rapportée » row, and on to a reference row
const KEY_GAP = 0.75; // × body lead: key → conclusion
const SOURCE_GAP = 0.75; // × axis lead: conclusion and map → source
const GUTTER = 1; // × body lead: panel → map
/** Chrome sets a first baseline 0.5–1 px off the naive formula (adaptive-leading spec §5.4), so the
 *  text never touches the inset's top or foot. */
const EDGE_SAFETY = 2;
/** Panel widths as shares of the frame inside its insets, the narrowest first: the biggest map is
 *  what the beat wants, and a wider panel is spent only when the copy will not fit. */
const SHARES = [0.3, 0.32, 0.34, 0.36, 0.38, 0.4, 0.42, 0.44, 0.46, 0.48, 0.5, 0.52, 0.54, 0.56];
/** The map box's aspect stays within this band of the still's camera. */
export const MAP_ASPECT_BAND = Object.freeze([0.8, 1.6]);

/** A stack of lines from `top`: first baseline at `top + ascent`, each next one `lead` below. */
function stack(id, r, texts, x, width, top, align = "start") {
  const band = bandOf(r);
  const lines = texts.map((text, i) => {
    const w = widthOf(text, r);
    return { text, x: align === "end" ? x + width - w : x, y: top + band.ascent + i * r.lead, width: w };
  });
  const height = band.ascent + (texts.length - 1) * r.lead + band.descent;
  return { id, register: BLOCK_REGISTERS[id], lines, box: { x, y: top, width, height } };
}

const bottomOf = (block) => block.box.y + block.box.height;

/**
 * The key and the reference mark. Six swatches across the panel, the five breaks printed centred on
 * the edges they open, the « non rapportée » swatch and label on a row beneath. « plus de 94 % » is
 * set under the top class, right-aligned to the key's end: on the « non rapportée » row when a full
 * axis lead of air separates the two, on a row of its own when it does not.
 */
function keyBlocks({ registers, copy, x, width, top }) {
  const { axis, annot } = registers;
  const axisBand = bandOf(axis);
  const annotBand = bandOf(annot);
  const classCount = copy.breaks.length + 1;
  const swatchW = width / (classCount + 0.2);
  const swatchH = axisBand.ascent;
  const swatches = Array.from({ length: classCount }, (_, i) => ({
    x: x + i * swatchW,
    y: top,
    width: swatchW - 1,
    height: swatchH,
    class: i,
  }));
  const labelsBaseline = top + swatchH + STRIP_GAP * axis.lead + axisBand.ascent;
  const labels = copy.breaks.map((text, i) => {
    const w = widthOf(text, axis);
    return { text, x: x + (i + 1) * swatchW - w / 2, y: labelsBaseline, width: w };
  });

  const rowTop = labelsBaseline + axisBand.descent + ROW_GAP * axis.lead;
  const missingX = x + swatchW + 0.25 * axis.lead;
  const missingW = widthOf(copy.missingLabel, axis);
  const referenceW = widthOf(copy.reference, annot);
  const sharesRow = x + width - referenceW - (missingX + missingW) >= axis.lead;
  const rowBaseline = rowTop + (sharesRow ? Math.max(axisBand.ascent, annotBand.ascent) : axisBand.ascent);
  const missing = { text: copy.missingLabel, x: missingX, y: rowBaseline, width: missingW };
  const missingSwatch = { x, y: rowBaseline - swatchH, width: swatchW - 1, height: swatchH };
  const keyBottom = rowBaseline + axisBand.descent;
  const key = {
    id: "key",
    register: BLOCK_REGISTERS.key,
    lines: [...labels, missing],
    swatches,
    missingSwatch,
    box: { x, y: top, width, height: keyBottom - top },
  };

  const reference = sharesRow
    ? {
        id: "reference",
        register: BLOCK_REGISTERS.reference,
        lines: [{ text: copy.reference, x: x + width - referenceW, y: rowBaseline, width: referenceW }],
        box: {
          x: x + width - referenceW,
          y: rowBaseline - annotBand.ascent,
          width: referenceW,
          height: annotBand.ascent + annotBand.descent,
        },
      }
    : stack("reference", annot, [copy.reference], x, width, keyBottom + ROW_GAP * axis.lead, "end");
  return { key, reference, bottom: Math.max(keyBottom, bottomOf(reference)) };
}

/** The whole frame's text at one panel width, one title form and one display size. */
function textAt({ registers, copy, frame, inset, panel, form }) {
  const x = inset;
  const { eyebrow: eyebrowR, display, axis, body } = registers;
  const eyebrow = stack("eyebrow", eyebrowR, wrap(copy.eyebrow, panel, eyebrowR), x, panel, inset + EDGE_SAFETY);
  const title = stack(
    "title",
    display,
    wrap(copy.title[form], panel, display),
    x,
    panel,
    bottomOf(eyebrow) + EYEBROW_GAP * eyebrowR.lead,
  );
  const keyLabel = stack(
    "keyLabel",
    axis,
    wrap(copy.keyLabel, panel, axis),
    x,
    panel,
    bottomOf(title) + TITLE_GAP * display.lead,
  );
  const { key, reference, bottom: keyBottom } = keyBlocks({
    registers,
    copy,
    x,
    width: panel,
    top: bottomOf(keyLabel) + KEY_LABEL_GAP * axis.lead,
  });
  const conclusion = stack(
    "conclusion",
    body,
    wrap(copy.conclusion, panel, body),
    x,
    panel,
    keyBottom + KEY_GAP * body.lead,
  );

  const sourceWidth = frame.width - inset * 2;
  const sourceLines = wrap(copy.source, sourceWidth, axis);
  const sourceBand = bandOf(axis);
  const sourceTop =
    frame.height -
    inset -
    EDGE_SAFETY -
    (sourceBand.ascent + (sourceLines.length - 1) * axis.lead + sourceBand.descent);
  const source = stack("source", axis, sourceLines, x, sourceWidth, sourceTop);

  const blocks = [eyebrow, title, keyLabel, key, reference, conclusion, source];
  // A break label wider than its swatch runs into the next one: that panel is too narrow as well.
  const labels = key.lines.slice(0, copy.breaks.length);
  const crowded = labels.some((l, i) => i > 0 && labels[i - 1].x + labels[i - 1].width + 0.25 * axis.lead > l.x);
  const tooWide =
    crowded || blocks.some((b) => b.lines.some((l) => l.x < b.box.x || l.x + l.width > b.box.x + b.box.width));
  const footTop = sourceTop - SOURCE_GAP * axis.lead;
  return { blocks, spare: footTop - bottomOf(conclusion), tooWide, footTop };
}

/** The largest map box right of the panel and above the source, its aspect clamped to the band. */
function mapBoxFor({ frame, inset, panel, gutter, footTop, aspect }) {
  const left = inset + panel + gutter;
  const availW = frame.width - inset - left;
  const availH = footTop - inset;
  const [lo, hi] = MAP_ASPECT_BAND.map((k) => k * aspect);
  let width = availW;
  let height = availH;
  if (width / height < lo) height = width / lo;
  if (width / height > hi) width = height * hi;
  const drawn = { width: Math.floor(width), height: Math.floor(height) };
  const mapBox = {
    x: Math.ceil(left + (availW - drawn.width) / 2),
    y: Math.ceil(inset + (availH - drawn.height) / 2),
    ...drawn,
  };
  if (mapBox.x + mapBox.width > frame.width - inset) mapBox.x = frame.width - inset - mapBox.width;
  if (mapBox.y + mapBox.height > footTop) mapBox.y = Math.floor(footTop - mapBox.height);
  return { mapBox, drawn, mapAspect: width / height };
}

/** The display register at another size — its tracking and its lead scaled with it. */
const displayAt = (display, fontSize) => ({
  ...display,
  fontSize,
  letterSpacing: (display.letterSpacing * fontSize) / display.fontSize,
  lead: (display.lead * fontSize) / display.fontSize,
});

/**
 * THE LADDER, the still's own idea measured at the video's drawn size. For each panel width, the
 * narrowest first: the first title form at its drawn size; the same form at the largest size down to
 * one voice step (`DERIVED_SIZE_RATIO`) and never under the floor; then the next form, the same way.
 * Only when no form fits does the panel take width from the map. *Prefer the fuller headline at a
 * slightly smaller size over the stub headline at full size*, as in `mapGeometryFor`.
 *
 * @param {{ registers: Record<string, any>, copy: ReturnType<typeof caseCopy>, aspect: number,
 *           size: "landscape" }} input  `registers` from `videoRegistersOf`, `copy` from `caseCopy`
 */
export function videoLayoutFor({ registers, copy, aspect, size }) {
  if (size !== "landscape")
    throw new Error(`the choropleth video lays out at landscape only, not ${JSON.stringify(size)}`);
  const row = sizeFor(size);
  const frame = { width: row.width, height: row.height };
  const inset = frameInsetFor(size);
  for (const [name, r] of Object.entries(registers))
    if (!(r.fontSize >= row.minTypePx))
      throw new Error(`register ${name} is ${r.fontSize}px, under the ${row.minTypePx}px floor at ${size}`);

  const drawnDisplay = registers.display;
  const floor = Math.max(row.minTypePx, drawnDisplay.fontSize * DERIVED_SIZE_RATIO);
  const gutter = GUTTER * registers.body.lead;
  const content = frame.width - inset * 2;
  let closest = null;

  const attempt = (panel, form, fontSize) => {
    const at = { ...registers, display: fontSize === drawnDisplay.fontSize ? drawnDisplay : displayAt(drawnDisplay, fontSize) };
    const text = textAt({ registers: at, copy, frame, inset, panel, form });
    const fits = !text.tooWide && text.spare >= 0;
    if (!text.tooWide && (!closest || text.spare > closest.spare))
      closest = { spare: text.spare, panel, form, fontSize };
    return fits ? { ...text, registers: at, fontSize } : null;
  };

  for (const share of SHARES) {
    const panel = Math.round(content * share);
    for (let form = 0; form < copy.title.length; form++) {
      let chosen = attempt(panel, form, drawnDisplay.fontSize);
      if (!chosen) {
        // Whether a form fits is monotone in size (a smaller headline never takes more lines or more
        // height), so the largest fitting quarter-pixel is found by bisection.
        let lo = Math.ceil(floor * 4);
        let hi = Math.floor(drawnDisplay.fontSize * 4) - 1;
        if (lo <= hi && attempt(panel, form, lo / 4)) {
          while (lo < hi) {
            const mid = Math.ceil((lo + hi + 1) / 2);
            if (attempt(panel, form, mid / 4)) lo = mid;
            else hi = mid - 1;
          }
          chosen = attempt(panel, form, lo / 4);
        }
      }
      if (!chosen) continue;
      const { mapBox, drawn, mapAspect } = mapBoxFor({ frame, inset, panel, gutter, footTop: chosen.footTop, aspect });
      const title = chosen.blocks.find((b) => b.id === "title");
      return {
        frame,
        inset,
        panel: { x: inset, width: panel, share },
        title: {
          form,
          lines: title.lines.length,
          fontSize: chosen.fontSize,
          drawnFontSize: drawnDisplay.fontSize,
        },
        registers: chosen.registers,
        blocks: chosen.blocks,
        mapBox,
        drawn,
        mapAspect,
        spare: chosen.spare,
      };
    }
  }
  throw new Error(
    `the video panel's copy does not fit ${frame.width}x${frame.height} in ` +
      `${drawnDisplay.fontFamily} ${drawnDisplay.fontSize}px: ` +
      (closest
        ? `the closest rung (panel ${closest.panel}px, title form ${closest.form + 1} at ` +
          `${closest.fontSize}px) overruns the source by ${(-closest.spare).toFixed(0)}px`
        : `no rung sets every word inside the panel`) +
      `. Give the beat a shorter title form — do not shrink the map, which is the subject.`,
  );
}
