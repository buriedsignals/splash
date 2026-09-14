// twin/skills/chart-video/scripts/shots.mjs
//
// THE SHOTS A DIRECTED VIDEO BEAT IS CUT INTO, MEASURED IN BUN.
//
// A video is not a page (`references/directed-type-choreography.md`, « The shots, and how little to write »):
// a title card at frame 0, then the story on the whole frame with one key standing on it, and no end card —
// the video ends on the picture with the source as a credit. This module lays out the parts every type shares;
// a beat lays out its own picture and seats these parts on it.
//
// Every width is `measureText` on the face the composition embeds, plus the register's tracking; every baseline
// sits at its block's edge plus the ink ascent resvg measures; every gap is a multiple of the lead of the
// register named beside it. The composition draws at these coordinates and checks the widths back.
//
// NO `#shared/*` IMPORT HERE: this module lives inside the skill and is carried into `map-beat` by a plain
// `// twin/` copy. A value the design base owns (the eyebrow's gap to the display) is passed in by the beat.
//
// Runs in Bun only (resvg).

import { applyCase } from "./registers.mjs";
import { measureText, measureTextBand } from "./render-still.mjs";
import { frameInsetFor, MARGIN_RATIO, sizeFor } from "./sizes.mjs";

/** Bun measures the static TrueType face, Chrome draws the web woff2, and the render accepts Chrome up to 2 %
 *  wider. A measure fitted to the last Bun pixel is drawn past it by that much. */
export const DRAWN_WIDER = 0.02;
/** The band every word of one register shares, so the words of one role are one height. */
export const BAND_PROBE = "ÉÀÇHxpgjq1,’";
/** The title card sets its words to a reading measure, not across the whole frame. */
export const CARD_MEASURE = 0.72; // × content width
export const CARD_MAX_LINES = 3;
/** The credit's measure: narrow enough to sit in a corner of the picture. */
export const CREDIT_MEASURE = 0.28; // × content width
export const CREDIT_MAX_LINES = 3;
// The key's rhythm, × the axis lead.
const COUNTER_TO_COUNTER = 0.15;
const COUNTER_TO_KEY = 0.45;
const SWATCH_HEIGHT = 0.4;
const SWATCH_AIR = 0.5; // a swatch is its widest borne plus this
const SWATCH_JOIN = 0.05;
const MISSING_GAP = 0.25;
/** A pill's padding around its word, as shares of the register's size. */
const PILL_PAD_X = 0.3;
const PILL_PAD_Y = 0.12;

export const faceOf = (r) => ({
  fontSize: r.fontSize,
  fontWeight: r.fontWeight,
  fontFamily: r.fontFamily,
  fontStyle: r.fontStyle === "italic" ? "italic" : "normal",
});

/** A line's width as the composition's width agreement reads it. */
export function widthOf(text, r) {
  return measureText(text, faceOf(r)) + Number(r.letterSpacing ?? 0) * Math.max(0, [...text].length - 1);
}
export const bandOf = (text, r) => measureTextBand(text, faceOf(r));
const lineOf = (text, r, x, y, width = widthOf(text, r)) => ({ text, x, y, width });

/** THE FRAME'S TOP AND BOTTOM MARGIN — `frameInsetFor`'s own rule, read on the frame's HEIGHT. */
export function verticalInsetFor(size) {
  const row = sizeFor(size);
  return Math.max(Math.round(MARGIN_RATIO * row.height), row.minTypePx * 2);
}

/** A register at another size, its tracking and lead scaled with it. */
export const registerAt = (r, fontSize) => ({
  ...r,
  fontSize,
  letterSpacing: (Number(r.letterSpacing ?? 0) * fontSize) / r.fontSize,
  lead: (r.lead * fontSize) / r.fontSize,
});

/** THE HALO A WORD ON A PICTURE IS STRUCK IN — the map plate's stroke, `max(2.5, ascent × 0.34)` behind a name,
 *  `max(2, ascent × 0.3)` behind a sea's, the floors carried by the ladder's factor `k`. */
export function haloOf(r, k, kind = "area") {
  const { ascent } = bandOf(BAND_PROBE, r);
  return kind === "water" ? Math.max(2 * k, 0.3 * ascent) : Math.max(2.5 * k, 0.34 * ascent);
}

/** Words wrapped greedily to `measure`, each line's width measured. Breaks at ordinary spaces only: a
 *  no-break space (« 94 % », « Data · ») holds its words together. */
export function wrap(text, r, measure) {
  const lines = [];
  let current = "";
  for (const word of text.split(/ +/)) {
    const trial = current ? `${current} ${word}` : word;
    if (current && widthOf(trial, r) > measure) {
      lines.push(current);
      current = word;
    } else current = trial;
  }
  if (current) lines.push(current);
  return lines.map((t) => ({ text: t, width: widthOf(t, r) }));
}

/** The first form that wraps into at most `maxLines` lines of the measure, at the register's own size. */
export function blockFor(forms, r, measure, maxLines) {
  for (let form = 0; form < forms.length; form++) {
    const lines = wrap(applyCase(forms[form], r.transform), r, measure);
    if (lines.length <= maxLines && lines.every((l) => l.width <= measure)) return { form, lines };
  }
  throw new Error(`no form wraps into ${maxLines} lines of ${measure}px in ${r.fontFamily} ${r.fontSize}px`);
}

/**
 * A CARD'S WORDS: the first form, in the display register, that wraps into at most `maxLines` lines of the
 * measure; a form may step its size down by half pixels, never to or under the largest other register — a
 * headline smaller than the voice under it has stopped being the headline.
 */
export function cardTextFor(forms, registers, { measure, maxLines = CARD_MAX_LINES }) {
  const drawn = registers.display;
  const largest = Math.max(...Object.entries(registers).filter(([n]) => n !== "display").map(([, r]) => r.fontSize));
  if (!(drawn.fontSize > largest))
    throw new Error(`the display register is ${drawn.fontSize}px, not larger than every other register (${largest}px)`);
  const lowestQuarter = Math.floor(largest * 4) + 1;
  for (let form = 0; form < forms.length; form++) {
    const text = applyCase(forms[form], drawn.transform);
    for (let quarter = Math.floor(drawn.fontSize * 4); quarter >= lowestQuarter; quarter -= 2) {
      const r = quarter / 4 === drawn.fontSize ? drawn : registerAt(drawn, quarter / 4);
      const lines = wrap(text, r, measure);
      if (lines.length <= maxLines && lines.every((l) => l.width <= measure)) return { form, register: r, lines };
    }
  }
  throw new Error(`no card form wraps into ${maxLines} lines of ${measure}px above ${lowestQuarter / 4}px in ${drawn.fontFamily}`);
}

/** A word's box: the word and its padding (a pill's, or the halo's own reach), one height per register. */
export function pillOf(text, r, pad) {
  const cased = applyCase(text, r.transform);
  const textWidth = widthOf(cased, r);
  const band = bandOf(BAND_PROBE, r);
  const padX = pad ?? PILL_PAD_X * r.fontSize;
  const padY = pad ?? PILL_PAD_Y * r.fontSize;
  return { text: cased, textWidth, width: textWidth + 2 * padX, height: band.ascent + band.descent + 2 * padY, textX: padX, baseline: padY + band.ascent };
}

/**
 * 1. THE TITLE CARD — the eyebrow and a short title, alone on the direction's ground from frame 0, the title as
 * large as the display register draws, wrapped to the reading measure, the block centred on the frame's height,
 * set from the frame's inset. No standfirst.
 *
 * @param {{ registers: Record<string, any>, eyebrow: string, title: string[], size: string, eyebrowToDisplay: number }} input
 *   `eyebrowToDisplay`: the design base's `EYEBROW_TO_DISPLAY`, passed by the beat.
 */
export function titleCardFor({ registers, eyebrow, title: forms, size, eyebrowToDisplay }) {
  const row = sizeFor(size);
  const inset = frameInsetFor(size);
  const measure = (CARD_MEASURE * (row.width - 2 * inset)) / (1 + DRAWN_WIDER);
  const eyebrowR = registers.eyebrow;
  const title = cardTextFor(forms, registers, { measure });
  const eyebrowText = applyCase(eyebrow, eyebrowR.transform);
  const eyebrowBand = bandOf(eyebrowText, eyebrowR);
  const titleBand = bandOf(title.lines.map((l) => l.text).join(" "), title.register);
  const gap = eyebrowToDisplay * eyebrowR.lead;
  const block = eyebrowBand.ascent + eyebrowBand.descent + gap + titleBand.ascent + (title.lines.length - 1) * title.register.lead + titleBand.descent;
  const top = Math.round((row.height - block) / 2);
  const eyebrowLine = lineOf(eyebrowText, eyebrowR, inset, top + eyebrowBand.ascent);
  const firstBaseline = eyebrowLine.y + eyebrowBand.descent + gap + titleBand.ascent;
  return {
    form: title.form,
    register: title.register,
    eyebrow: eyebrowLine,
    title: title.lines.map((l, i) => lineOf(l.text, title.register, inset, firstBaseline + i * title.register.lead, l.width)),
  };
}

/**
 * 3. THE CREDIT — no end card: the video ends on its picture, the source set on it as a credit, the axis voice at
 * the type floor, the first form that holds `CREDIT_MAX_LINES` lines of a narrow measure, laid out at its own
 * origin with the halo's reach around it. The beat seats the box on its picture.
 */
export function sourceCreditFor({ registers, forms, size, k }) {
  const row = sizeFor(size);
  const content = row.width - 2 * frameInsetFor(size);
  const r = registerAt(registers.axis, row.minTypePx);
  const halo = haloOf(r, k);
  const block = blockFor(forms, r, (CREDIT_MEASURE * content) / (1 + DRAWN_WIDER), CREDIT_MAX_LINES);
  const band = bandOf(block.lines.map((l) => l.text).join(" "), r);
  const lines = block.lines.map((l, i) => lineOf(l.text, r, halo / 2, halo / 2 + band.ascent + i * r.lead, l.width));
  return {
    form: block.form,
    register: r,
    lines,
    halo,
    width: Math.ceil(halo + Math.max(...lines.map((l) => l.width)) * (1 + DRAWN_WIDER)),
    height: Math.ceil(halo + band.ascent + (lines.length - 1) * r.lead + band.descent),
  };
}

/**
 * 2. THE KEY — the counts over a stepped key, no plate and no unit line, laid out at its own origin: one row per
 * counter (each row's steps drawn at one place, one at a time), the class swatches, their bornes, and the
 * absence's swatch with its label. The words stand in their halo on whatever the beat seats the key over.
 *
 * @param {{ registers: { value: any, axis: any }, k: number, counters: string[][], breaks: string[], missingLabel?: string }} input
 *   texts NOT cased — each is cased by its own register here.
 */
export function keyFor({ registers, k, counters: rows, breaks: breakTexts, missingLabel: missing }) {
  const { value, axis } = registers;
  const pad = haloOf(axis, k) / 2;
  const counters = [];
  let baseline = pad;
  let counterWidth = 0;
  rows.forEach((steps, i) => {
    const texts = steps.map((t) => applyCase(t, value.transform));
    const widths = texts.map((t) => widthOf(t, value));
    const band = texts.map((t) => bandOf(t, value)).reduce((a, b) => ({ ascent: Math.max(a.ascent, b.ascent), descent: Math.max(a.descent, b.descent) }));
    baseline += (i === 0 ? 0 : COUNTER_TO_COUNTER * axis.lead) + band.ascent;
    counters.push(texts.map((t, j) => lineOf(t, value, pad, baseline, widths[j])));
    counterWidth = Math.max(counterWidth, ...widths);
    baseline += band.descent;
  });
  const breaks = breakTexts.map((b) => applyCase(b, axis.transform));
  const breakWidths = breaks.map((b) => widthOf(b, axis));
  const swatchW = Math.max(...breakWidths) + SWATCH_AIR * axis.lead;
  const swatchH = SWATCH_HEIGHT * axis.lead;
  const join = SWATCH_JOIN * axis.lead;
  const classCount = breaks.length + 1;
  const keyBand = bandOf(BAND_PROBE, axis);
  const swatchTop = (rows.length ? baseline + COUNTER_TO_KEY * axis.lead : pad);
  const swatches = Array.from({ length: classCount }, (_, i) => ({ x: pad + i * swatchW, y: swatchTop, width: swatchW - join, height: swatchH }));
  const borneBaseline = swatchTop + swatchH + keyBand.ascent;
  const bornes = breaks.map((text, i) => lineOf(text, axis, pad + (i + 1) * swatchW - breakWidths[i] / 2, borneBaseline, breakWidths[i]));
  let bottom = borneBaseline;
  let missingSwatch = null;
  let missingLabel = null;
  let right = classCount * swatchW;
  if (missing !== undefined) {
    const missingBaseline = borneBaseline + axis.lead;
    missingSwatch = { x: pad, y: missingBaseline - swatchH, width: swatchW - join, height: swatchH };
    missingLabel = lineOf(applyCase(missing, axis.transform), axis, pad + swatchW + MISSING_GAP * axis.lead, missingBaseline);
    right = Math.max(right, missingLabel.x - pad + missingLabel.width);
    bottom = missingBaseline;
  }
  return {
    width: Math.ceil(pad + Math.max(counterWidth, right) * (1 + DRAWN_WIDER) + pad),
    height: Math.ceil(bottom + keyBand.descent + pad),
    halo: haloOf(axis, k),
    valueHalo: haloOf(value, k),
    counters,
    swatches,
    bornes,
    missingSwatch,
    missingLabel,
  };
}
