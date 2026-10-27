// EVERYTHING ONE CELL-GRID GESTURE VIDEO IS HANDED, BUILT IN BUN — the grid laid out at the video size, every word
// measured (row and column labels, the key's breaks, the notes, the title card, the credit), the colours, and the six
// event states the scheduler (./gesture-cell-video.mjs) places the three gestures in.
//
// THE LAYOUT ADAPTS; IT NEVER REFUSES THE DATA'S SHAPE (craft/gestures/GRAMMAR.md §7.1): the cells take the width and
// height they have; column heads take their short form, then stagger onto two lines, when a cell is narrower than its
// name; a note longer than the content width wraps onto further caption lines. Its refusals are the words' (a title or
// a credit no card or line holds) and the scheduler's gesture refusals.
//
// Runs in Bun only. Mirrors the bar gesture video's build.mjs: direction resolved against the beat's own words,
// registers at the video size, the shared title card and credit from the chart-video skill's shots.
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { adjustToContrast, mix, NON_TEXT_CONTRAST_MIN, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { frameInsetFor, sizeFor } from "#shared/chart-video/sizes.mjs";
import { EYEBROW_TO_DISPLAY, registerOf } from "#shared/design-base/register.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { skillScriptFrom } from "#shared/design-base/skill-script.mjs";
import { classOf, implicitOutline, noteLine, outlineOf } from "./gesture-family-cell.mjs";
import { EVENTS, scheduleCellVideo } from "./gesture-cell-video.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const chartVideo = (...parts) => skillScriptFrom(HERE, "chart-video", "scripts", ...parts);
const { applyCase } = await import(chartVideo("registers.mjs"));
const { BAND_PROBE, bandOf, cardTextFor, CREDIT_MAX_LINES, CREDIT_ONE_LINE, DRAWN_WIDER, haloOf, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf, wrap } = await import(chartVideo("shots.mjs"));
const { videoRegistersOf } = await import(chartVideo("video-registers.mjs"));
const { assertEventStates } = await import(chartVideo("choreography.mjs"));

export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];

const band = (r) => {
  const b = bandOf(BAND_PROBE, r);
  return { ascent: b.ascent, descent: b.descent, height: b.ascent + b.descent };
};

/** The words every register will draw, for resolving the direction's families against this beat's own text. */
export function textPerRegisterOf(copy, grid, notes) {
  return {
    display: copy.title,
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: notes.join(" ") || grid.rows.map((r) => r.label).join(" "),
    value: `${copy.bins.join(" ")} 0123456789`,
    axis: `${grid.rows.map((r) => r.label).join(" ")} ${copy.cols.join(" ")} ${copy.unit} ${copy.source.join(" ")}`,
  };
}

function titleCardOf({ registers, eyebrow, title, size }) {
  try {
    return titleCardFor({ registers, eyebrow, title: [title], size, eyebrowToDisplay: EYEBROW_TO_DISPLAY });
  } catch {
    const row = sizeFor(size);
    const inset = frameInsetFor(size);
    const measure = (row.width - 2 * inset) / (1 + DRAWN_WIDER);
    const card = cardTextFor([title], registers, { measure, maxLines: 6 });
    const eyebrowR = registers.eyebrow;
    const eyebrowText = applyCase(eyebrow, eyebrowR.transform);
    const eb = bandOf(eyebrowText, eyebrowR);
    const tb = bandOf(card.lines.map((l) => l.text).join(" "), card.register);
    const gap = EYEBROW_TO_DISPLAY * eyebrowR.lead;
    const block = eb.ascent + eb.descent + gap + tb.ascent + (card.lines.length - 1) * card.register.lead + tb.descent;
    const top = Math.round((row.height - block) / 2);
    const eyebrowY = top + eb.ascent;
    const first = eyebrowY + eb.descent + gap + tb.ascent;
    return {
      form: 0,
      register: card.register,
      eyebrow: { text: eyebrowText, x: inset, y: eyebrowY, width: widthOf(eyebrowText, eyebrowR) },
      title: card.lines.map((l, i) => ({ text: l.text, x: inset, y: first + i * card.register.lead, width: l.width })),
    };
  }
}

function creditOf({ registers, forms, size, k }) {
  try {
    return sourceCreditFor({ registers, forms, size, k, ...CREDIT_ONE_LINE });
  } catch {
    return sourceCreditFor({ registers, forms, size, k, measure: 1, maxLines: CREDIT_MAX_LINES });
  }
}

/**
 * @param chosen  the run's direction, unresolved (video.mjs `pickDirection`)
 * @param grid    gridOf's output
 * @param plan, orders  planCells' output (three gestures)
 * @param copy    { eyebrow, title, source: forms, unit, format, cols: [column words], shortCols, bins: [key words] }
 * @param timing  the kit's timing contract
 */
export function buildCellVideo({ id, chosen, grid, plan, orders, copy, size, timing }) {
  const notesText = plan.map((p) => noteLine(p, copy.format) ?? "");
  const direction = resolveDirectionFamilies(chosen, textPerRegisterOf(copy, grid, notesText.filter(Boolean)));
  const resolved = Object.fromEntries(REGISTER_NAMES.map((name) => [name, registerOf(direction, name)]));
  const registers = videoRegistersOf(resolved, size);
  const k = registers.axis.fontSize / resolved.axis.fontSize;
  const row = sizeFor(size);
  const stage = { width: row.width, height: row.height };
  for (const [name, r] of Object.entries(registers)) if (!(r.fontSize >= row.minTypePx)) throw new Error(`register ${name} is ${r.fontSize}px, under the ${row.minTypePx}px floor`);
  const { axis, annot, value } = registers;
  const inset = frameInsetFor(size);
  const vInset = verticalInsetFor(size);
  const content = { left: inset, right: stage.width - inset, width: stage.width - 2 * inset };
  const gap = 0.4 * axis.lead;
  const bAxis = band(axis);
  const bAnnot = band(annot);
  const word = (text, r) => {
    const t = applyCase(String(text), r.transform);
    return { text: t, width: widthOf(t, r) };
  };

  const titleCard = titleCardOf({ registers, eyebrow: copy.eyebrow, title: copy.title, size });
  const { register: sourceRegister, ...creditBlock } = creditOf({ registers, forms: copy.source, size, k });
  const creditAt = { x: inset, y: stage.height - vInset - creditBlock.height };

  // ── the notes, one caption block per gesture, top of the frame, each arriving with its gesture
  let y = vInset;
  const captions = notesText.map((text, i) => {
    if (!text) return { item: i, lines: [] };
    const lines = wrap(applyCase(text, annot.transform), annot, content.width / (1 + DRAWN_WIDER)).map((l, j) => ({ ...l, x: content.left, y: y + bAnnot.ascent + j * annot.lead }));
    y += lines.length * annot.lead;
    return { item: i, lines };
  });
  // ── the key: one swatch per class, each break printed under its edge, the unit after it
  const keyTop = y + gap;
  const swatchH = bAxis.ascent;
  const breakWords = grid.breaks.map((b) => word(copy.format(b), axis));
  const swatchW = Math.max(...breakWords.map((w) => w.width)) * 1.6 + gap;
  const classes = grid.breaks.length + 1;
  const legend = {
    swatches: Array.from({ length: classes }, (_, i) => ({ x: content.left + i * swatchW, y: keyTop, width: swatchW - 2, height: swatchH })),
    breaks: breakWords.map((w, i) => ({ ...w, x: content.left + (i + 1) * swatchW - w.width / 2, y: keyTop + swatchH + bAxis.ascent + 2 })),
    unit: { ...word(copy.unit, axis), x: content.left + classes * swatchW + gap, y: keyTop + swatchH * 0.85 },
  };
  const plotTop0 = keyTop + swatchH + bAxis.height + gap * 2;

  // ── the grid
  const rowWords = grid.rows.map((r) => word(r.label, axis));
  const labelW = Math.max(...rowWords.map((w) => w.width)) * (1 + DRAWN_WIDER);
  const plotLeft = content.left + labelW + gap;
  const cols = grid.cols.length;
  const cellW = (content.right - plotLeft) / cols;
  const ticks = grid.variant === "calendar-heatmap" ? [0, 4, 9, 14, 19, 24, 30] : grid.cols.map((_, i) => i);
  let colWords = copy.cols.map((t) => word(t, axis));
  if (colWords.some((w, i) => ticks.includes(i) && w.width > cellW - 4)) colWords = copy.shortCols.map((t) => word(t, axis));
  // Still wider than a cell: alternate heads drop to a second line (never rotated, never cut).
  const stagger = colWords.some((w, i) => ticks.includes(i) && w.width > cellW - 4);
  const headsH = bAxis.height * (stagger ? 2 : 1) + gap;
  const plotTop = plotTop0 + headsH;
  const plotBottom = creditAt.y - gap * 2;
  const rows = grid.rows.length;
  const cellH = Math.min((plotBottom - plotTop) / rows, grid.variant === "calendar-heatmap" ? cellW * 2 : cellW);
  const heads = colWords.map((w, i) => (ticks.includes(i) ? { ...w, x: plotLeft + i * cellW + cellW / 2 - w.width / 2, y: plotTop - gap - bAxis.descent - (stagger && i % 2 ? bAxis.height : 0) } : null)).filter(Boolean);
  const labels = rowWords.map((w) => ({ ...w, x: plotLeft - gap - w.width, dy: cellH / 2 + (bAxis.ascent - bAxis.descent) / 2 }));

  // ── the marks: each gesture's outlines (in the order rows hold when it plays), its cutoff dots, its compare
  const scheduled = scheduleCellVideo({ plan, orders, grid });
  assertEventStates(scheduled.states, [...EVENTS]);
  const orderAt = (k) => orders[k] ?? grid.rows.map((_, r) => r);
  const kinds = { highlight: "accent", name: "ring", trace: "run" };
  const byId = new Map(grid.cells.map((c) => [c.id, c]));
  const rectsOf = (ids, order) =>
    outlineOf(ids.map((i) => byId.get(i)).filter(Boolean), order).map((o) => ({ x: plotLeft + o.c0 * cellW, y: plotTop + o.r0 * cellH, width: (o.c1 - o.c0 + 1) * cellW, height: (o.r1 - o.r0 + 1) * cellH }));
  const implicit = implicitOutline(plan);
  // Per row, the runs of columns a set of cells covers: what a mark draws when rows move (a reorder is staged).
  const segsOf = (ids) => grid.rows.flatMap((_, r) => outlineOf(ids.map((i) => byId.get(i)).filter((c) => c && c.r === r), [r]).map((o) => ({ r, c0: o.c0, c1: o.c1 })));
  const outlines = [];
  plan.forEach((p, i) => {
    const order = orderAt(i);
    if (implicit?.index === i) outlines.push({ k: i, kind: "accent", rects: rectsOf(implicit.cells, order), segs: segsOf(implicit.cells) });
    if (kinds[p.do] && !(implicit?.index === i && kinds[p.do] === "accent")) outlines.push({ k: i, kind: kinds[p.do], rects: rectsOf(p.cells, order), segs: segsOf(p.cells) });
  });
  // Larger outlines first, so a ring on one cell stays visible inside a highlighted month; on equal size the accent last.
  const sizeOf = (o) => o.segs.reduce((s, g) => s + g.c1 - g.c0 + 1, 0);
  outlines.sort((x, y) => sizeOf(y) - sizeOf(x) || (x.kind === "accent" ? 1 : 0) - (y.kind === "accent" ? 1 : 0));
  const marks = {
    outlines,
    dots: plan.filter((p) => p.do === "reference").map((p) => ({ k: p.index, cells: p.cells })),
    compares: plan.filter((p) => p.do === "compare").map((p) => ({ k: p.index, a: p.a, b: p.b })),
    moves: plan.some((p) => p.do === "reorder"),
  };

  const { ground, accent } = direction;
  const { ink, muted, grid: gridInk } = deriveFurniture(ground);
  const walked = (c, floor, what) => {
    const w = adjustToContrast(c, ground, floor);
    if (!w) throw new Error(`${what} has no variant that reads at ${floor}:1 on ${ground}`);
    return w;
  };
  const ramp = Array.from({ length: classes }, (_, i) => mix(ground, accent, 0.1 + (i / Math.max(1, classes - 1)) * 0.9));
  const colours = {
    ground,
    grid: gridInk,
    ramp,
    missing: mix(ground, ink, 0.06),
    edge: mix(ground, ink, 0.22),
    ink: walked(ink, NON_TEXT_CONTRAST_MIN, "an outline"),
    accent: walked(accent, NON_TEXT_CONTRAST_MIN, "the accent outline"),
    text: {
      eyebrow: walked(registers.eyebrow.fill ?? accent, TEXT_CONTRAST_MIN, "the eyebrow"),
      title: walked(registers.display.fill ?? ink, TEXT_CONTRAST_MIN, "the title"),
      name: walked(ink, TEXT_CONTRAST_MIN, "a name"),
      axis: walked(muted, TEXT_CONTRAST_MIN, "a muted word"),
      accent: walked(accent, TEXT_CONTRAST_MIN, "an accented word"),
    },
  };
  // Reading order for a reveal: row by row, then column by column (a calendar: date order).
  const reading = [...grid.cells].sort((a, b) => a.r - b.r || a.c - b.c);
  const order = Object.fromEntries(reading.map((c, i) => [c.id, i]));
  const props = {
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, value, axis, annot, source: sourceRegister },
    titleCard,
    credit: { ...creditBlock, at: creditAt },
    colours,
    layout: { plotLeft, plotTop, cellW, cellH, cols, content },
    cells: grid.cells.map((c) => ({ id: c.id, r: c.r, c: c.c, bin: classOf(grid.breaks, c.value) })),
    order,
    rowLabels: labels,
    heads,
    legend,
    captions,
    marks,
    filters: plan.filter((p) => p.do === "filter").map((p) => ({ k: p.index, kept: p.cells })),
    plan: plan.map((p) => ({ do: p.do })),
    hasReveal: plan.some((p) => p.do === "reveal"),
    states: scheduled.states,
    windows: scheduled.windows,
    linear: scheduled.linear,
    strokes: { rule: (direction.stroke?.rule ?? 1) * k * 1.4, hairline: (direction.stroke?.hairline ?? 0.6) * k },
    timing,
  };
  return { id, direction, props, report: { cells: grid.cells.length, cellW: cellW.toFixed(1), cellH: cellH.toFixed(1), stagger, titleLines: titleCard.title.length } };
}
