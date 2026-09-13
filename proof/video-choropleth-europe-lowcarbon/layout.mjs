// THE VIDEO FRAME IN ROWS, MEASURED IN BUN — the scrolly's picture at 1920 × 1080.
//
// Laid out from both ends so the map takes every pixel the words do not need. TOP-DOWN from the top margin:
// the eyebrow, then the title on one line; the counter right-aligned on the title's line when both fit, else
// on the eyebrow's line, else on a row of its own. BOTTOM-UP from the bottom margin: the source line, then
// the key's two lines (swatches; bornes, the key's label straight after « 94 % », and the « donnée non
// rapportée » swatch) — the source beside the key when it fits. The MAP STAGE is exactly what is left between,
// the whole content width. Nothing sits over the map.
//
// Every width is `measureText` on the face the composition embeds, plus the register's tracking; every
// baseline sits at its row's edge plus the ink ascent resvg measures; every gap is a multiple of the lead
// of the register named beside it. The composition draws at these coordinates and only checks the widths
// back (spec §4.1).
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
  counter: "value",
  key: "axis",
  source: "axis",
  name: "axis",
  oddName: "value",
  water: "annot",
});

// ── the rhythm: every gap a multiple of the lead of the register named beside it ───────────────────────
const ROW_GAP = 0.5; // × axis lead: title → a counter row of its own
const HEADER_TO_STAGE = 0.25; // × axis lead: the header (or the counter) → the map
const STAGE_TO_KEY = 0.35; // × axis lead: the map → the key's swatches
const KEY_TO_SOURCE = 0.25; // × axis lead: the key → a source line of its own
const GUTTER = 1; // × axis lead: between two things sharing a line
const SWATCH_HEIGHT = 0.4; // × axis lead
const SWATCH_AIR = 0.5; // × axis lead: a swatch is its widest borne plus this
const SWATCH_JOIN = 0.05; // × axis lead: the hairline of ground between two swatches
const LABEL_GAP = 0.5; // × axis lead: « 94 % » → the key's label
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

/** THE FRAME'S TOP AND BOTTOM MARGIN — `frameInsetFor`'s own rule, read on the frame's HEIGHT. The helper
 *  returns `max(round(MARGIN_RATIO × width), 2 × minTypePx)`: a margin proportional to the canvas, never
 *  thinner than the smallest word is tall twice. Its one number is the width's (85 px at 1920); read on the
 *  1080 px height the same rule gives max(48, 60) = 60 — and the 50 px it returns to the map is the empty band
 *  under the source. The sides keep `frameInsetFor`. */
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
  const vInset = verticalInsetFor(size);
  const content = frame.width - 2 * inset;
  const right = inset + content;
  for (const [name, r] of Object.entries(registers))
    if (!(r.fontSize >= row.minTypePx)) throw new Error(`register ${name} is ${r.fontSize}px, under the ${row.minTypePx}px floor`);

  const budget = content / (1 + DRAWN_WIDER);
  const title = titleFor(copy.title, registers, { content: budget, minTypePx: row.minTypePx });
  const drawn = { ...registers, display: title.register };
  const { eyebrow: eyebrowR, display, value, axis } = drawn;
  const line = (text, r, x, y, width = widthOf(text, r)) => ({ text, x, y, width });
  const gutter = GUTTER * axis.lead;

  // ── TOP-DOWN: the header, and the counter where it fits ─────────────────────────────────────────────────
  const counterTexts = Array.from({ length: copy.countTo + 1 }, (_, n) => applyCase(copy.counter.replace("{n}", String(n)), value.transform));
  const counterWidths = counterTexts.map((t) => widthOf(t, value));
  const counterWidest = Math.max(...counterWidths);
  const counterBand = counterTexts.map((t) => bandOf(t, value)).reduce((a, b) => ({ ascent: Math.max(a.ascent, b.ascent), descent: Math.max(a.descent, b.descent) }));
  const eyebrowText = applyCase(copy.eyebrow, eyebrowR.transform);
  const eyebrowWidth = widthOf(eyebrowText, eyebrowR);
  const eyebrowBand = bandOf(eyebrowText, eyebrowR);
  const titleBand = bandOf(title.text, display);
  /** THE COUNTER'S PLACE, in order: on the title's line, right-aligned, when title, gutter and count hold one
   *  line; else on the eyebrow's line, right-aligned — still above the map, and it costs the stage only the
   *  count's extra ascent instead of a row; else a row of its own. */
  const counterPlace = title.width + gutter + counterWidest <= budget ? "title" : eyebrowWidth + gutter + counterWidest <= budget ? "eyebrow" : "row";
  const firstAscent = counterPlace === "eyebrow" ? Math.max(eyebrowBand.ascent, counterBand.ascent) : eyebrowBand.ascent;
  const eyebrowBaseline = vInset + firstAscent;
  const eyebrow = line(eyebrowText, eyebrowR, inset, eyebrowBaseline, eyebrowWidth);
  const titleTop = eyebrowBaseline + eyebrowBand.descent + EYEBROW_TO_DISPLAY * eyebrowR.lead;
  const titleBaseline = titleTop + titleBand.ascent;
  const titleLine = line(title.text, display, inset, titleBaseline, title.width);
  let headerBottom = titleBaseline + titleBand.descent;
  let counterBaseline;
  if (counterPlace === "title") {
    counterBaseline = titleBaseline;
    headerBottom = Math.max(headerBottom, titleBaseline + counterBand.descent);
  } else if (counterPlace === "eyebrow") {
    counterBaseline = eyebrowBaseline;
    if (counterBaseline + counterBand.descent > titleTop) throw new Error("the count on the eyebrow's line would reach into the title");
  } else {
    counterBaseline = headerBottom + ROW_GAP * axis.lead + counterBand.ascent;
    headerBottom = counterBaseline + counterBand.descent;
  }
  // Anchored at its END in the composition, so a count drawn wider in Chrome grows leftward; `x` is the right edge.
  const counter = counterTexts.map((text, n) => line(text, value, right, counterBaseline, counterWidths[n]));

  // ── BOTTOM-UP: the key's two lines, and the source beside them where it fits ───────────────────────────
  // Line A carries the swatches (their foot on its baseline); line B, one axis lead lower, the five bornes
  // under the swatch boundaries and, straight after « 94 % », the key's label, then the « non rapportée »
  // swatch and its words when line B can hold them (else they close line A, after the swatches).
  const breaks = copy.breaks.map((b) => applyCase(b, axis.transform));
  const breakWidths = breaks.map((b) => widthOf(b, axis));
  const swatchW = Math.max(...breakWidths) + SWATCH_AIR * axis.lead;
  const swatchH = SWATCH_HEIGHT * axis.lead;
  const join = SWATCH_JOIN * axis.lead;
  const classCount = breaks.length + 1;
  const unitText = applyCase(copy.unit, axis.transform);
  const unitWidth = widthOf(unitText, axis);
  const missingText = applyCase(copy.missingLabel, axis.transform);
  const missingWidth = widthOf(missingText, axis);
  const stripEnd = inset + classCount * swatchW;
  const lastBorneEnd = stripEnd - swatchW + breakWidths.at(-1) / 2;
  const unitX = lastBorneEnd + LABEL_GAP * axis.lead;
  const missingOnB = unitX + unitWidth + gutter + swatchW + MISSING_GAP * axis.lead + missingWidth <= right;
  const missingX = missingOnB ? unitX + unitWidth + gutter : stripEnd + gutter;
  const lineAEnd = missingOnB ? stripEnd : missingX + swatchW + MISSING_GAP * axis.lead + missingWidth;
  const keyBand = bandOf(BAND_PROBE, axis);

  /** The longest source form that holds one line — beside line A when it fits there, else on its own line. */
  const sourceForms = copy.source.map((f) => applyCase(f, axis.transform));
  const sharedForm = sourceForms.findIndex((f) => lineAEnd + gutter + widthOf(f, axis) <= inset + budget);
  const src = sourceFor(copy.source, axis, budget);
  const sourceShared = sharedForm !== -1 && sharedForm <= src.form;
  let lineB;
  let source;
  let sourceTop;
  if (sourceShared) {
    lineB = frame.height - vInset - keyBand.descent;
    const text = sourceForms[sharedForm];
    source = { ...line(text, axis, right, lineB - axis.lead), anchor: "end", form: sharedForm };
    sourceTop = null;
  } else {
    const sourceBand = bandOf(src.text, axis);
    source = { ...line(src.text, axis, inset, frame.height - vInset - sourceBand.descent, src.width), anchor: "start", form: src.form };
    sourceTop = source.y - sourceBand.ascent;
    lineB = sourceTop - KEY_TO_SOURCE * axis.lead - keyBand.descent;
  }
  const lineA = lineB - axis.lead;
  const lineATop = lineA - Math.max(swatchH, missingOnB && !sourceShared ? 0 : keyBand.ascent);
  const swatches = Array.from({ length: classCount }, (_, i) => ({ x: inset + i * swatchW, y: lineA - swatchH, width: swatchW - join, height: swatchH }));
  const bornes = breaks.map((text, i) => line(text, axis, inset + (i + 1) * swatchW - breakWidths[i] / 2, lineB, breakWidths[i]));
  const unit = line(unitText, axis, unitX, lineB, unitWidth);
  const missingBaseline = missingOnB ? lineB : lineA;
  const missingSwatch = { x: missingX, y: missingBaseline - swatchH, width: swatchW - join, height: swatchH };
  const missingLabel = line(missingText, axis, missingX + swatchW + MISSING_GAP * axis.lead, missingBaseline, missingWidth);
  const keyTop = lineATop;
  const keyBottom = lineB + keyBand.descent;

  // ── the stage: exactly the space between ────────────────────────────────────────────────────────────
  const stageTop = Math.ceil(headerBottom + HEADER_TO_STAGE * axis.lead);
  const stageBottom = Math.floor(keyTop - STAGE_TO_KEY * axis.lead);
  const stage = { x: inset, y: stageTop, width: content, height: stageBottom - stageTop };
  if (!(stage.height > 0)) throw new Error(`the rows leave the map no height (${stage.height}px)`);

  return {
    frame,
    inset,
    vInset,
    content,
    registers: drawn,
    title: { form: title.form, fontSize: display.fontSize, drawnFontSize: registers.display.fontSize },
    source: { form: source.form, shared: sourceShared },
    counterPlace,
    missingOnB,
    lines: { eyebrow, title: titleLine, counter, bornes, unit, missingLabel, source },
    swatches,
    missingSwatch,
    stage,
    rows: {
      header: { top: vInset, bottom: headerBottom },
      stage: { top: stage.y, bottom: stage.y + stage.height },
      key: { top: keyTop, bottom: keyBottom },
      source: sourceShared ? { top: keyTop, bottom: keyBottom } : { top: sourceTop, bottom: frame.height - vInset },
    },
  };
}
