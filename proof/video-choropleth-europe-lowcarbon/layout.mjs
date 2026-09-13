// THE VIDEO IN SEQUENCES, MEASURED IN BUN — not the page layout of the other formats.
//
// The owner (2026-09-14): « Le layout vidéo ne doit pas être comme les autres, genre premier plan le titre en
// premier puis ensuite tout un storytelling ». So the frame is not a header over a map over a key: it is a
// sequence of shots.
//
//   1. THE TITLE CARD — the eyebrow and the title, alone on the direction's ground, as large as the display
//      register draws, wrapped to a reading measure. The longest title form that names the subject.
//   2. THE STORY — the map on the whole frame, edge to edge. What the story needs to be read — the count and
//      the key — sits in one PANEL that comes and goes with its gestures; `build.mjs` seats it where it covers
//      the least land at the overview camera. The panel is laid out here at its own origin.
//   3. THE END CARD — the claim, stated once its evidence has been shown, and the source.
//
// Every width is `measureText` on the face the composition embeds, plus the register's tracking; every
// baseline sits at its block's edge plus the ink ascent resvg measures; every gap is a multiple of the lead
// of the register named beside it. The composition draws at these coordinates and only checks the widths back
// (spec §4.1).
//
// Runs in Bun only (resvg).

import { measureText, measureTextBand } from "#shared/chart-beat/render-still.mjs";
import { applyCase } from "#shared/chart-beat/registers.mjs";
import { frameInsetFor, MARGIN_RATIO, sizeFor } from "#shared/chart-video/sizes.mjs";
import { EYEBROW_TO_DISPLAY } from "#shared/design-base/register.mjs";

/** The register each slot is set in. */
export const SLOT_REGISTERS = Object.freeze({
  eyebrow: "eyebrow",
  title: "display",
  claim: "display",
  counter: "value",
  key: "axis",
  source: "axis",
  name: "axis",
  oddName: "value",
  water: "annot",
});

// ── the rhythm: every gap a multiple of the lead of the register named beside it ───────────────────────
/** The title card and the end card set their words to a reading measure, not across the whole frame. */
const CARD_MEASURE = 0.72; // × content width
const CARD_MAX_LINES = 4;
const PANEL_PAD = 0.55; // × axis lead
const COUNTER_TO_KEY = 0.45; // × axis lead
const CLAIM_TO_SOURCE = 1.2; // × axis lead
const GUTTER = 1; // × axis lead
const SWATCH_HEIGHT = 0.4; // × axis lead
const SWATCH_AIR = 0.5; // × axis lead: a swatch is its widest borne plus this
const SWATCH_JOIN = 0.05; // × axis lead
const MISSING_GAP = 0.25; // × axis lead
/** A pill's padding around its word, as shares of the register's size (the scrolly's 5 px × 1 px at 13 px). */
const PILL_PAD_X = 0.3;
const PILL_PAD_Y = 0.12;
/** Bun measures the static TrueType face, Chrome draws the web woff2, and the render accepts Chrome up to 2 %
 *  wider (spec §4.1). A measure fitted to the last Bun pixel is drawn past it by that much. */
export const DRAWN_WIDER = 0.02;
/** The band every pill of one register shares, so pills of one role are one height. */
const BAND_PROBE = "ÉÀÇHxpgjq1,’";

const faceOf = (r) => ({
  fontSize: r.fontSize,
  fontWeight: r.fontWeight,
  fontFamily: r.fontFamily,
  fontStyle: r.fontStyle === "italic" ? "italic" : "normal",
});

/** A line's width as the composition's width agreement reads it (spec §4.1). */
export function widthOf(text, r) {
  return measureText(text, faceOf(r)) + Number(r.letterSpacing ?? 0) * Math.max(0, [...text].length - 1);
}
const bandOf = (text, r) => measureTextBand(text, faceOf(r));

/** THE FRAME'S TOP AND BOTTOM MARGIN — `frameInsetFor`'s own rule, read on the frame's HEIGHT. */
export function verticalInsetFor(size) {
  const row = sizeFor(size);
  return Math.max(Math.round(MARGIN_RATIO * row.height), row.minTypePx * 2);
}

/** The display register at another size, its tracking and lead scaled with it. */
const displayAt = (display, fontSize) => ({
  ...display,
  fontSize,
  letterSpacing: (display.letterSpacing * fontSize) / display.fontSize,
  lead: (display.lead * fontSize) / display.fontSize,
});

/** Words wrapped greedily to `measure`, each line's width measured. */
export function wrap(text, r, measure) {
  const lines = [];
  let current = "";
  for (const word of text.split(/\s+/)) {
    const trial = current ? `${current} ${word}` : word;
    if (current && widthOf(trial, r) > measure) {
      lines.push(current);
      current = word;
    } else current = trial;
  }
  if (current) lines.push(current);
  return lines.map((t) => ({ text: t, width: widthOf(t, r) }));
}

/**
 * A CARD'S WORDS: the first form, in the display register, that wraps into at most `CARD_MAX_LINES` lines
 * of the measure; a form may step its size down by quarter pixels, never to or under the largest other
 * register — a headline smaller than the voice under it has stopped being the headline.
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
      const r = quarter / 4 === drawn.fontSize ? drawn : displayAt(drawn, quarter / 4);
      const lines = wrap(text, r, measure);
      if (lines.length <= maxLines && lines.every((l) => l.width <= measure)) return { form, register: r, lines };
    }
  }
  throw new Error(`no card form wraps into ${maxLines} lines of ${measure}px above ${lowestQuarter / 4}px in ${drawn.fontFamily}`);
}

/** The longest form that holds one line. */
function oneLineFor(forms, r, measure) {
  for (let form = 0; form < forms.length; form++) {
    const text = applyCase(forms[form], r.transform);
    const width = widthOf(text, r);
    if (width <= measure) return { form, text, width };
  }
  throw new Error(`no form holds one line of ${measure}px in ${r.fontFamily} ${r.fontSize}px`);
}

/** A name set as a pill: the word, its padding, one height per register. */
export function pillOf(text, r) {
  const cased = applyCase(text, r.transform);
  const textWidth = widthOf(cased, r);
  const band = bandOf(BAND_PROBE, r);
  const padX = PILL_PAD_X * r.fontSize;
  const padY = PILL_PAD_Y * r.fontSize;
  return {
    text: cased,
    textWidth,
    width: textWidth + 2 * padX,
    height: band.ascent + band.descent + 2 * padY,
    textX: padX,
    baseline: padY + band.ascent,
  };
}

/**
 * @param {{ registers: Record<string, any>, copy: {
 *   eyebrow: string, title: string[], claim: string[], counterSteps: string[], breaks: string[], unit: string,
 *   missingLabel: string, source: string[] }, size: "landscape" }} input
 *   `registers` from `videoRegistersOf`; `copy` NOT cased — each slot is cased by its own register here.
 */
export function layoutFor({ registers, copy, size }) {
  if (size !== "landscape") throw new Error(`the choropleth video lays out at landscape only, not ${JSON.stringify(size)}`);
  const row = sizeFor(size);
  const frame = { width: row.width, height: row.height };
  const inset = frameInsetFor(size);
  const vInset = verticalInsetFor(size);
  const content = frame.width - 2 * inset;
  for (const [name, r] of Object.entries(registers))
    if (!(r.fontSize >= row.minTypePx)) throw new Error(`register ${name} is ${r.fontSize}px, under the ${row.minTypePx}px floor`);
  const { eyebrow: eyebrowR, value, axis } = registers;
  const line = (text, r, x, y, width = widthOf(text, r)) => ({ text, x, y, width });
  const measure = (CARD_MEASURE * content) / (1 + DRAWN_WIDER);

  // ── 1. THE TITLE CARD: eyebrow and title, a block centred on the frame's height, set from the inset ──────
  const title = cardTextFor(copy.title, registers, { measure });
  const eyebrowText = applyCase(copy.eyebrow, eyebrowR.transform);
  const eyebrowBand = bandOf(eyebrowText, eyebrowR);
  const titleBand = bandOf(title.lines.map((l) => l.text).join(" "), title.register);
  const titleBlock = eyebrowBand.ascent + eyebrowBand.descent + EYEBROW_TO_DISPLAY * eyebrowR.lead + titleBand.ascent + (title.lines.length - 1) * title.register.lead + titleBand.descent;
  const titleTop = Math.round((frame.height - titleBlock) / 2);
  const eyebrowLine = line(eyebrowText, eyebrowR, inset, titleTop + eyebrowBand.ascent);
  const firstTitleBaseline = eyebrowLine.y + eyebrowBand.descent + EYEBROW_TO_DISPLAY * eyebrowR.lead + titleBand.ascent;
  const titleLines = title.lines.map((l, i) => line(l.text, title.register, inset, firstTitleBaseline + i * title.register.lead, l.width));

  // ── 3. THE END CARD: the claim, a block centred on the frame's height; the source on the bottom margin ───
  const claim = cardTextFor(copy.claim, registers, { measure });
  const claimBand = bandOf(claim.lines.map((l) => l.text).join(" "), claim.register);
  const claimBlock = claimBand.ascent + (claim.lines.length - 1) * claim.register.lead + claimBand.descent;
  const src = oneLineFor(copy.source, axis, content / (1 + DRAWN_WIDER));
  const sourceBand = bandOf(src.text, axis);
  const sourceLine = { ...line(src.text, axis, inset, frame.height - vInset - sourceBand.descent, src.width), form: src.form };
  const claimTop = Math.min(Math.round((frame.height - claimBlock) / 2), sourceLine.y - sourceBand.ascent - CLAIM_TO_SOURCE * axis.lead - claimBlock);
  const claimLines = claim.lines.map((l, i) => line(l.text, claim.register, inset, claimTop + claimBand.ascent + i * claim.register.lead, l.width));

  // ── 2. THE PANEL: the count over the key, laid out at its own origin ──────────────────────────────────────
  const pad = PANEL_PAD * axis.lead;
  const counterTexts = copy.counterSteps.map((t) => applyCase(t, value.transform));
  const counterWidths = counterTexts.map((t) => widthOf(t, value));
  const counterBand = counterTexts.map((t) => bandOf(t, value)).reduce((a, b) => ({ ascent: Math.max(a.ascent, b.ascent), descent: Math.max(a.descent, b.descent) }));
  const counterBaseline = pad + counterBand.ascent;
  const counter = counterTexts.map((t, i) => line(t, value, pad, counterBaseline, counterWidths[i]));

  const breaks = copy.breaks.map((b) => applyCase(b, axis.transform));
  const breakWidths = breaks.map((b) => widthOf(b, axis));
  const swatchW = Math.max(...breakWidths) + SWATCH_AIR * axis.lead;
  const swatchH = SWATCH_HEIGHT * axis.lead;
  const join = SWATCH_JOIN * axis.lead;
  const classCount = breaks.length + 1;
  const keyBand = bandOf(BAND_PROBE, axis);
  const swatchTop = counterBaseline + counterBand.descent + COUNTER_TO_KEY * axis.lead;
  const swatches = Array.from({ length: classCount }, (_, i) => ({ x: pad + i * swatchW, y: swatchTop, width: swatchW - join, height: swatchH }));
  const borneBaseline = swatchTop + swatchH + keyBand.ascent;
  const bornes = breaks.map((text, i) => line(text, axis, pad + (i + 1) * swatchW - breakWidths[i] / 2, borneBaseline, breakWidths[i]));
  const unitText = applyCase(copy.unit, axis.transform);
  const unit = line(unitText, axis, pad, borneBaseline + axis.lead);
  const missingText = applyCase(copy.missingLabel, axis.transform);
  const missingBaseline = unit.y + axis.lead;
  const missingSwatch = { x: pad, y: missingBaseline - swatchH, width: swatchW - join, height: swatchH };
  const missingLabel = line(missingText, axis, pad + swatchW + MISSING_GAP * axis.lead, missingBaseline);
  const panelWidth = Math.ceil(pad + Math.max(...counterWidths, classCount * swatchW, unit.width, missingLabel.x - pad + missingLabel.width) * (1 + DRAWN_WIDER) + pad);
  const panelHeight = Math.ceil(missingBaseline + keyBand.descent + pad);

  return {
    frame,
    inset,
    vInset,
    content,
    registers,
    /** The story's map: the whole frame. */
    stage: { x: 0, y: 0, width: frame.width, height: frame.height },
    titleCard: { form: title.form, register: title.register, eyebrow: eyebrowLine, title: titleLines },
    endCard: { form: claim.form, register: claim.register, claim: claimLines, source: sourceLine },
    panel: { width: panelWidth, height: panelHeight, counter, swatches, bornes, unit, missingSwatch, missingLabel },
  };
}
