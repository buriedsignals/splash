// THE VIDEO FRAME IN ROWS, MEASURED IN BUN — the scrolly's picture at 1920 × 1080.
//
// Top to bottom, between `frameInsetFor("landscape")` on every side: the HEADER (eyebrow, the title on one
// line), the COUNTER row (right-aligned, its room reserved from frame 0), the MAP STAGE (all the height
// that is left, the whole content width), the KEY row (six swatches with their bornes beneath, the unit
// and the « donnée non rapportée » swatch beside them — the scrolly's key grid), the SOURCE row (one line).
// Nothing sits over the map.
//
// Every width is `measureText` on the face the composition embeds, plus the register's tracking; every
// baseline sits at its row's top plus the ink ascent resvg measures; every gap is a multiple of the lead
// of the register named beside it. The composition draws at these coordinates and only checks the widths
// back (spec §4.1).
//
// Runs in Bun only (resvg).

import { measureText, measureTextBand } from "#shared/chart-beat/render-still.mjs";
import { applyCase } from "#shared/chart-beat/registers.mjs";
import { frameInsetFor, sizeFor } from "#shared/chart-video/sizes.mjs";
import { EYEBROW_TO_DISPLAY } from "#shared/design-base/register.mjs";

/** The register each slot is set in. */
export const SLOT_REGISTERS = Object.freeze({
  eyebrow: "eyebrow",
  title: "display",
  counter: "value",
  key: "axis",
  source: "axis",
  name: "axis",
  oddName: "value",
  water: "annot",
});

// ── the rhythm: every gap a multiple of the lead of the register named beside it ───────────────────────
const ROW_GAP = 0.5; // × axis lead: title → counter row, stage → key row, key row → source
const COUNTER_GAP = 0.25; // × axis lead: counter row → stage (the counter belongs to the map)
const SWATCH_HEIGHT = 0.5; // × axis lead
const SWATCH_AIR = 0.5; // × axis lead: a swatch is its widest borne plus this
const SWATCH_JOIN = 0.05; // × axis lead: the hairline of ground between two swatches
const KEY_COLUMN_GAP = 1; // × axis lead: swatch strip → unit column
const MISSING_GAP = 0.25; // × axis lead: « non rapportée » swatch → its label
/** A pill's padding around its word, as shares of the register's size (the scrolly's 5 px × 1 px at 13 px). */
const PILL_PAD_X = 0.3;
const PILL_PAD_Y = 0.12;
/** THE ONE-LINE BUDGET KEEPS THE WIDTH AGREEMENT'S ROOM. Bun measures the static TrueType face, Chrome draws
 *  the web woff2, and the render accepts Chrome up to 2 % wider (spec §4.1; Merriweather Italic measured
 *  1.2–1.6 % wider). A line fitted to the last Bun pixel of the content width is drawn past the inset by
 *  that much, so a one-line slot is fitted to the content width less that share. */
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

/** The display register at another size, its tracking and lead scaled with it. */
const displayAt = (display, fontSize) => ({
  ...display,
  fontSize,
  letterSpacing: (display.letterSpacing * fontSize) / display.fontSize,
  lead: (display.lead * fontSize) / display.fontSize,
});

/**
 * THE TITLE LADDER. The longest form that holds ONE line across the content width; a form may step its
 * size down by quarter pixels, but never to or under the largest other register — a headline smaller
 * than the voice under it has stopped being the headline — and never under the floor.
 */
export function titleFor(forms, registers, { content, minTypePx }) {
  const drawn = registers.display;
  const others = Object.entries(registers).filter(([name]) => name !== "display");
  const largest = Math.max(...others.map(([, r]) => r.fontSize));
  if (!(drawn.fontSize > largest))
    throw new Error(`the display register is ${drawn.fontSize}px, not larger than every other register (${largest}px)`);
  const lowestQuarter = Math.max(Math.ceil(minTypePx * 4), Math.floor(largest * 4) + 1);
  const tried = [];
  for (let form = 0; form < forms.length; form++) {
    const text = applyCase(forms[form], drawn.transform);
    const full = widthOf(text, drawn);
    let quarter = Math.min(Math.floor(drawn.fontSize * 4), Math.floor(((drawn.fontSize * content) / full) * 4));
    while (quarter >= lowestQuarter) {
      const r = quarter === Math.floor(drawn.fontSize * 4) && quarter / 4 === drawn.fontSize ? drawn : displayAt(drawn, quarter / 4);
      const width = widthOf(text, r);
      if (width <= content) return { form, text, register: r, width };
      quarter -= 1;
    }
    tried.push(`form ${form + 1} needs ${((drawn.fontSize * content) / full).toFixed(1)}px`);
  }
  throw new Error(
    `no title form holds one line of ${content}px above ${lowestQuarter / 4}px in ${drawn.fontFamily}: ${tried.join("; ")}`,
  );
}

/** The longest source form that holds one line. */
function sourceFor(forms, r, content) {
  for (let form = 0; form < forms.length; form++) {
    const text = applyCase(forms[form], r.transform);
    const width = widthOf(text, r);
    if (width <= content) return { form, text, width };
  }
  throw new Error(`no source form holds one line of ${content}px in ${r.fontFamily} ${r.fontSize}px`);
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
    /** From the pill's left edge and top edge to the text's start and baseline. */
    textX: padX,
    baseline: padY + band.ascent,
  };
}

/**
 * @param {{ registers: Record<string, any>, copy: {
 *   eyebrow: string, title: string[], counter: string, countTo: number, breaks: string[], unit: string,
 *   missingLabel: string, source: string[] }, size: "landscape" }} input
 *   `registers` from `videoRegistersOf`; `copy` NOT cased — each slot is cased by its own register here.
 */
export function layoutFor({ registers, copy, size }) {
  if (size !== "landscape") throw new Error(`the choropleth video lays out at landscape only, not ${JSON.stringify(size)}`);
  const row = sizeFor(size);
  const frame = { width: row.width, height: row.height };
  const inset = frameInsetFor(size);
  const content = frame.width - 2 * inset;
  for (const [name, r] of Object.entries(registers))
    if (!(r.fontSize >= row.minTypePx)) throw new Error(`register ${name} is ${r.fontSize}px, under the ${row.minTypePx}px floor`);

  const budget = content / (1 + DRAWN_WIDER);
  const title = titleFor(copy.title, registers, { content: budget, minTypePx: row.minTypePx });
  const drawn = { ...registers, display: title.register };
  const { eyebrow: eyebrowR, display, value, axis } = drawn;
  const line = (text, r, x, y, width = widthOf(text, r)) => ({ text, x, y, width });

  // ── header ──────────────────────────────────────────────────────────────────────────────────────────
  const eyebrowText = applyCase(copy.eyebrow, eyebrowR.transform);
  const eyebrowBand = bandOf(eyebrowText, eyebrowR);
  const eyebrow = line(eyebrowText, eyebrowR, inset, inset + eyebrowBand.ascent);
  const titleBand = bandOf(title.text, display);
  const titleBaseline = eyebrow.y + eyebrowBand.descent + EYEBROW_TO_DISPLAY * eyebrowR.lead + titleBand.ascent;
  const titleLine = line(title.text, display, inset, titleBaseline, title.width);
  const headerBottom = titleBaseline + titleBand.descent;

  // ── counter row: every count it will show, right-aligned, one band for all ─────────────────────────────
  const counterTop = headerBottom + ROW_GAP * axis.lead;
  const counterTexts = Array.from({ length: copy.countTo + 1 }, (_, n) => applyCase(copy.counter.replace("{n}", String(n)), value.transform));
  const counterBand = counterTexts.map((t) => bandOf(t, value)).reduce((a, b) => ({ ascent: Math.max(a.ascent, b.ascent), descent: Math.max(a.descent, b.descent) }));
  const counterBaseline = counterTop + counterBand.ascent;
  const counter = counterTexts.map((text) => {
    const width = widthOf(text, value);
    // Anchored at its END in the composition, so a count drawn wider in Chrome grows leftward, never past
    // the inset; `x` is the right edge.
    return line(text, value, inset + content, counterBaseline, width);
  });
  const counterBottom = counterBaseline + counterBand.descent;

  // ── source row, from the foot ───────────────────────────────────────────────────────────────────────
  const src = sourceFor(copy.source, axis, budget);
  const sourceBand = bandOf(src.text, axis);
  const source = line(src.text, axis, inset, frame.height - inset - sourceBand.descent, src.width);
  const sourceTop = source.y - sourceBand.ascent;

  // ── key row, above the source ───────────────────────────────────────────────────────────────────────
  const keyBand = bandOf(BAND_PROBE, axis);
  const keyBottom = sourceTop - ROW_GAP * axis.lead;
  const keyTop = keyBottom - (keyBand.ascent + axis.lead + keyBand.descent);
  const unitBaseline = keyTop + keyBand.ascent;
  const lowerBaseline = unitBaseline + axis.lead;
  const breaks = copy.breaks.map((b) => applyCase(b, axis.transform));
  const breakWidths = breaks.map((b) => widthOf(b, axis));
  const swatchW = Math.max(...breakWidths) + SWATCH_AIR * axis.lead;
  const swatchH = SWATCH_HEIGHT * axis.lead;
  const join = SWATCH_JOIN * axis.lead;
  const classCount = breaks.length + 1;
  const swatches = Array.from({ length: classCount }, (_, i) => ({
    x: inset + i * swatchW,
    y: unitBaseline - swatchH,
    width: swatchW - join,
    height: swatchH,
  }));
  const bornes = breaks.map((text, i) => line(text, axis, inset + (i + 1) * swatchW - breakWidths[i] / 2, lowerBaseline, breakWidths[i]));
  const columnX = inset + classCount * swatchW + KEY_COLUMN_GAP * axis.lead;
  const unit = line(applyCase(copy.unit, axis.transform), axis, columnX, unitBaseline);
  const missingSwatch = { x: columnX, y: lowerBaseline - swatchH, width: swatchW - join, height: swatchH };
  const missingLabel = line(applyCase(copy.missingLabel, axis.transform), axis, columnX + swatchW + MISSING_GAP * axis.lead, lowerBaseline);

  // ── the stage: everything that is left ─────────────────────────────────────────────────────────────
  const stageTop = counterBottom + COUNTER_GAP * axis.lead;
  const stageBottom = keyTop - ROW_GAP * axis.lead;
  const stage = { x: inset, y: Math.ceil(stageTop), width: content, height: Math.floor(stageBottom) - Math.ceil(stageTop) };
  if (!(stage.height > 0)) throw new Error(`the rows leave the map no height (${stage.height}px)`);

  return {
    frame,
    inset,
    content,
    registers: drawn,
    title: { form: title.form, fontSize: display.fontSize, drawnFontSize: registers.display.fontSize },
    source: { form: src.form },
    lines: { eyebrow, title: titleLine, counter, bornes, unit, missingLabel, source },
    swatches,
    missingSwatch,
    stage,
    rows: {
      header: { top: inset, bottom: headerBottom },
      counter: { top: counterTop, bottom: counterBottom },
      stage: { top: stage.y, bottom: stage.y + stage.height },
      key: { top: keyTop, bottom: keyBottom },
      source: { top: sourceTop, bottom: source.y + sourceBand.descent },
    },
  };
}
