// EVERYTHING ONE STACK GESTURE VIDEO IS HANDED, BUILT IN BUN — the bars the frame has room for with every segment
// in value units, every word measured (names, totals, segment values, notes, captions, every figure a count or a
// bracket climbs through), the colours, and the six event states the Stack video scheduler
// (`./gesture-stack-video.mjs`) places the three gestures in. One file for the three Stack types (`variant`): rows
// for stacked-bar and diverging-stacked-bar-likert, columns for waterfall-bridge.
//
// THE LAYOUT ADAPTS; IT NEVER REFUSES THE DATA'S SHAPE (craft/gestures/GRAMMAR.md §7.1): many bars draw as many as
// the pitch holds, every bar a gesture acts on among them, the rest stated in one line; a segment too narrow for its
// number keeps it off (the bar's total and the notes still say it); long notes wrap in their lane.
// Runs in Bun only.
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { adjustToContrast, mix, NON_TEXT_CONTRAST_MIN, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { frameInsetFor, sizeFor } from "#shared/chart-video/sizes.mjs";
import { EYEBROW_TO_DISPLAY, registerOf } from "#shared/design-base/register.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { skillScriptFrom } from "#shared/design-base/skill-script.mjs";
import { countedTexts, EVENTS, scheduleStackVideo, valueText } from "./gesture-stack-video.mjs";
import { GESTURE_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const chartVideo = (...parts) => skillScriptFrom(HERE, "chart-video", "scripts", ...parts);
const { applyCase } = await import(chartVideo("registers.mjs"));
const { BAND_PROBE, bandOf, cardTextFor, CREDIT_MAX_LINES, CREDIT_ONE_LINE, DRAWN_WIDER, haloOf, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf, wrap } = await import(chartVideo("shots.mjs"));
const { videoRegistersOf } = await import(chartVideo("video-registers.mjs"));
const { assertEventStates } = await import(chartVideo("choreography.mjs"));

export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const PITCH_MAX = 2.2;
const LANE = 0.27;

const band = (r) => {
  const b = bandOf(BAND_PROBE, r);
  return { ascent: b.ascent, descent: b.descent, height: b.ascent + b.descent };
};

/** The words every register will draw, for resolving the direction's families against this beat's own text. */
export function textPerRegisterOf(copy, stack, gestures) {
  const notes = gestures.map((g) => g.note).filter(Boolean);
  return {
    display: copy.title,
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: [...notes, ...stack.parts].join(" ") || stack.names.join(" "),
    value: `${copy.unit(valueText(Math.max(...stack.marks.map((m) => Math.abs(m.value))), copy.format))} 0123456789${copy.format.decimal}${copy.format.group}`,
    axis: `${stack.names.join(" ")} ${copy.source.join(" ")} ${copy.scope(stack.names.length, stack.names.length)}`,
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
 * @param chosen    the run's direction, unresolved (video.mjs `pickDirection`)
 * @param stack     the family model; `gestures` validateStack's; `subject` its subject bar
 * @param copy      { eyebrow, title, source: forms, unit(text), unitWord, format, scope(shown, all) }
 * @param decrease  a bridge's decrease ink (the second recorded accent), or undefined
 */
export function buildStackVideo({ id, chosen, stack, gestures, subject, copy, size, decrease }) {
  const variant = stack.variant;
  const rowsMode = variant !== "waterfall-bridge";
  const direction = resolveDirectionFamilies(chosen, textPerRegisterOf(copy, stack, gestures));
  const resolved = Object.fromEntries(REGISTER_NAMES.map((name) => [name, registerOf(direction, name)]));
  const registers = videoRegistersOf(resolved, size);
  const k = registers.axis.fontSize / resolved.axis.fontSize;
  const row = sizeFor(size);
  const stage = { width: row.width, height: row.height };
  for (const [name, r] of Object.entries(registers)) if (!(r.fontSize >= row.minTypePx)) throw new Error(`register ${name} is ${r.fontSize}px, under the ${row.minTypePx}px floor`);
  const { axis, value, annot } = registers;
  const inset = frameInsetFor(size);
  const vInset = verticalInsetFor(size);
  const content = { left: inset, right: stage.width - inset, width: stage.width - 2 * inset };
  const gap = 0.4 * axis.lead;
  const wide = (w) => w * (1 + DRAWN_WIDER);
  const bAxis = band(axis);
  const bValue = band(value);
  const bAnnot = band(annot);
  const measured = (text, r) => {
    const t = applyCase(String(text), r.transform);
    return { text: t, width: widthOf(t, r) };
  };

  const titleCard = titleCardOf({ registers, eyebrow: copy.eyebrow, title: copy.title, size });
  const { register: sourceRegister, ...creditBlock } = creditOf({ registers, forms: copy.source, size, k });
  const creditAt = { x: inset, y: stage.height - vInset - creditBlock.height };

  const { ground, accent } = direction;
  const { ink, muted, grid } = deriveFurniture(ground);
  const walked = (c, floor, what) => {
    const w = adjustToContrast(c, ground, floor);
    if (!w) throw new Error(`${what} has no variant that reads at ${floor}:1 on ${ground}`);
    return w;
  };
  const parts = stack.parts;
  const fillOf = (bar, part) => {
    if (variant === "stacked-bar") {
      const i = parts.indexOf(part);
      const t = parts.length === 1 ? 0 : 1 - i / (parts.length - 1);
      return mix(accent, ground, 0.62 * t);
    }
    if (variant === "diverging-stacked-bar-likert") {
      const side = stack.sideOf(part);
      if (side === "centre") return mix(ground, ink, 0.14);
      const list = side === "left" ? stack.left : stack.right;
      const t = (list.indexOf(part) + 1) / list.length;
      return side === "left" ? mix(mix(muted, ground, 0.2), ink, t * 0.6) : mix(mix(accent, ground, 0.7), accent, t);
    }
    if (bar === stack.names[0]) return muted;
    return stack.valueOf(bar, bar) >= 0 ? accent : decrease ?? mix(ink, ground, 0.35);
  };
  const inkOn = (fill) => adjustToContrast(ink, fill, TEXT_CONTRAST_MIN);

  // ── words: notes by where they sit
  const split = (g) => g.marks.slice(0, g.marks.length - (Array.isArray(g.of) ? g.of.length : 0));
  const keep = new Set([...(subject ? [subject] : []), ...gestures.flatMap((g) => g.marks.map(stack.barOf))]);
  const captionDo = new Set(["count", "reference", "reveal", "reorder", "pull-back", ...(rowsMode ? ["filter"] : ["highlight", "name", "annotate", "compare", "filter"])]);
  const noteText = (g) => {
    if (g.note !== undefined && String(g.note).trim()) return String(g.note);
    if (g.do === "annotate") return copy.unit(valueText(stack.unit(split(g)).value, copy.format));
    return null;
  };

  // ── captions at the top (and, for a bridge, every note)
  const captionLead = Math.max(annot.lead, value.lead);
  const captions = [];
  gestures.forEach((g, i) => {
    if (!captionDo.has(g.do)) return;
    const text = noteText(g);
    if (!text && g.do !== "count") return;
    const lines = text ? wrap(applyCase(text, annot.transform), annot, content.width / (1 + DRAWN_WIDER)) : [];
    captions.push({ item: i, kind: g.do === "count" ? "count" : "note", lines, rows: Math.max(1, lines.length) });
  });
  let y = vInset;
  for (const c of captions) {
    c.y = y + Math.max(bAnnot.ascent, c.kind === "count" ? bValue.ascent : 0);
    y += c.rows * captionLead;
  }
  const afterCaptions = captions.length ? y + gap : vInset;

  // ── the key (rows): every part's word in its own fill, flowed
  const swatch = bAnnot.ascent * 0.8;
  const keyOrder = variant === "diverging-stacked-bar-likert" ? [...[...stack.left].reverse(), ...(stack.centre ? [stack.centre] : []), ...stack.right] : parts;
  const key = [];
  if (rowsMode) {
    let x = 0;
    let line = 0;
    for (const p of keyOrder) {
      const word = measured(p, annot);
      const w = swatch + gap + wide(word.width) + 2 * gap;
      if (x && x + w > content.width) {
        x = 0;
        line += 1;
      }
      const fill = fillOf(stack.names[0], p);
      key.push({ ...word, x: content.left + x, line, fill, text_: walked(fill, TEXT_CONTRAST_MIN, `the key word ${p}`) });
      x += w;
    }
  }
  const keyLines = rowsMode ? Math.max(1, ...key.map((k2) => k2.line + 1)) : 0;
  key.forEach((k2) => (k2.y = afterCaptions + bAnnot.ascent + k2.line * annot.lead));
  const plotTop = afterCaptions + (rowsMode ? keyLines * annot.lead + gap : 0);

  const valueFmt = (v) => copy.unit(valueText(v, copy.format));
  const plain = (v) => valueText(v, copy.format);

  // ── the bars the frame has room for
  const rowNeed = Math.max(bAxis.height, bValue.height, bAnnot.height) + gap;
  const remainderH = bAxis.height + gap;
  const bottomOf = (withRemainder) => creditAt.y - gap - (withRemainder ? remainderH : 0) - (rowsMode ? 0 : bAxis.height * 2 + gap);
  let drawn = stack.names;
  if (rowsMode) {
    const capacityAt = (bottom) => Math.max(1, Math.floor((bottom - plotTop) / rowNeed));
    if (drawn.length > capacityAt(bottomOf(false))) {
      const capacity = capacityAt(bottomOf(true));
      const kept = drawn.filter((b) => keep.has(b));
      const fill = drawn.filter((b) => !keep.has(b)).slice(0, Math.max(0, capacity - kept.length));
      drawn = drawn.filter((b) => kept.includes(b) || fill.includes(b));
    }
  }
  const restCount = stack.names.length - drawn.length;
  const plotBottom = bottomOf(restCount > 0);

  const scheduled = scheduleStackVideo({ gestures, stack, drawn, subject });
  assertEventStates(scheduled.states, [...EVENTS]);

  // ── the value domain: every segment, the closing level, every copy and rule (one scale, never moved)
  const laid = [...stack.domain, ...scheduled.plan.filter((p) => p.do === "compare").flatMap((p) => [p.from, p.to]), ...scheduled.plan.filter((p) => p.do === "reference").map((p) => p.value)];
  let domain = [Math.min(0, ...laid), Math.max(0, ...laid) || 1];
  if (variant === "diverging-stacked-bar-likert") {
    const m = Math.max(-domain[0], domain[1]);
    domain = [-m, m];
  }

  // ── notes in the lane (rows) and bracket labels
  const laneNotes = rowsMode ? gestures.map((g, i) => ({ g, i })).filter(({ g }) => !captionDo.has(g.do) && g.do !== "bracket" && noteText(g)) : [];
  const brackets = gestures.map((g, i) => ({ g, i })).filter(({ g }) => g.do === "bracket");
  const laneW = rowsMode && (laneNotes.length || brackets.length) ? LANE * content.width : 0;
  const notes = laneNotes.map(({ g, i }) => {
    const bar = g.do === "compare" ? scheduled.plan[i].onto : stack.barOf(split(g)[0]);
    return { item: i, bar, lines: wrap(applyCase(noteText(g), annot.transform), annot, laneW / (1 + DRAWN_WIDER)) };
  });
  const climbing = countedTexts(scheduled.plan, copy.format).map(copy.unit);
  const bracketLabels = brackets.map(({ g, i }) => ({
    item: i,
    note: g.note !== undefined && String(g.note).trim() ? wrap(applyCase(String(g.note), annot.transform), annot, (rowsMode ? laneW : content.width * 0.5) / (1 + DRAWN_WIDER)) : null,
  }));

  // ── geometry
  let layout;
  const ends = [];
  if (rowsMode) {
    const names = drawn.map((b) => measured(b, axis));
    const namesW = Math.max(...names.map((n) => wide(n.width)));
    const leftEnd = variant === "diverging-stacked-bar-likert" ? Math.max(...drawn.map((b) => wide(widthOf(plain(stack.sideTotal(b, "left")), axis)))) + gap : 0;
    const rightEnd = variant === "stacked-bar" ? Math.max(...drawn.map((b) => wide(widthOf(plain(stack.whole(b)), value)))) + gap : Math.max(...drawn.map((b) => wide(widthOf(plain(stack.sideTotal(b, "right")), axis)))) + gap;
    const plotLeft = content.left + namesW + gap + leftEnd;
    const spineX = content.right - laneW - (laneW ? gap * 2 : 0);
    const plotRight = spineX - (brackets.some(({ g }) => true) ? gap : 0) - rightEnd - gap;
    const pitch = Math.min(PITCH_MAX * rowNeed, (plotBottom - plotTop) / drawn.length);
    layout = { mode: "rows", plotTop, plotBottom, plotLeft, plotRight, pitch, barH: pitch * 0.62, gap, content, spineX, laneX: content.right - laneW, captionLead, nameRight: content.left + namesW, countShift: (bValue.ascent - bValue.descent) / 2, annotShift: (bAnnot.ascent - bAnnot.descent) / 2, axisShift: (bAxis.ascent - bAxis.descent) / 2 };
    drawn.forEach((b, i) => {
      if (variant === "stacked-bar") ends.push([{ side: "right", ...measured(plain(stack.whole(b)), value), register: "value" }]);
      else ends.push([{ side: "left", ...measured(plain(stack.sideTotal(b, "left")), axis), register: "axis" }, { side: "right", ...measured(plain(stack.sideTotal(b, "right")), axis), register: "axis" }]);
    });
  } else {
    const cols = drawn.length + 1;
    const slot = content.width / cols;
    const bracketRoom = brackets.length ? bValue.height + gap * 2 + Math.max(1, ...bracketLabels.map((b) => b.note?.length ?? 1)) * annot.lead : bValue.height + gap;
    layout = { mode: "columns", plotTop: afterCaptions + bracketRoom, plotBottom, plotLeft: content.left, plotRight: content.right, slot, colW: slot * 0.62, gap, content, captionLead, countShift: (bValue.ascent - bValue.descent) / 2, annotShift: (bAnnot.ascent - bAnnot.descent) / 2, axisShift: (bAxis.ascent - bAxis.descent) / 2 };
  }
  const span = rowsMode ? layout.plotRight - layout.plotLeft : layout.plotBottom - layout.plotTop;
  const px = (v0, v1) => (Math.abs(v1 - v0) / (domain[1] - domain[0])) * span;

  let markIndex = 0;
  const bars = drawn.map((b, i) => {
    const segs = stack.partsOf(b).map((p, j) => {
      const [from, to] = stack.segment(b, p);
      const fill = fillOf(b, p);
      const label = running(stack) ? (i === 0 ? plain(stack.valueOf(b, p)) : `${stack.valueOf(b, p) >= 0 ? "+" : "−"}${plain(Math.abs(stack.valueOf(b, p)))}`) : plain(Math.abs(stack.valueOf(b, p)));
      const word = measured(label, rowsMode ? annot : value);
      const fits = rowsMode ? wide(word.width) + gap <= px(from, to) : true;
      return { mark: stack.markName(b, p), markIndex: markIndex++, part: p, from, to, order: rowsMode ? parts.indexOf(p) : i, down: !rowsMode && i > 0 && stack.valueOf(b, p) < 0, fill, labelInk: rowsMode ? inkOn(fill) : null, label: word };
    });
    return { key: b, name: measured(b, axis), segs, ends: ends[i] ?? [] };
  });
  if (!rowsMode) {
    // The closing level: a column from zero, shown with the last step.
    const c = stack.closing;
    bars.push({ key: c.name, closing: true, name: measured(c.name, axis), ends: [], segs: [{ mark: c.name, markIndex: -1, part: c.name, from: Math.min(0, c.value), to: Math.max(0, c.value), order: drawn.length - 1, down: false, fill: muted, label: measured(plain(c.value), value) }] });
  }
  bars.forEach((b) => b.segs.forEach((s) => (s.fits = rowsMode ? wide(s.label.width) + gap <= px(s.from, s.to) : true)));
  const names = bars.map((b) => (rowsMode ? [b.name] : wrap(b.name.text, axis, layout.slot * 0.95 / (1 + DRAWN_WIDER)).slice(0, 2)));

  const countWidths = Object.fromEntries(climbing.map((t) => [t, widthOf(applyCase(t, value.transform), value)]));
  const scope = restCount ? measured(copy.scope(drawn.length, stack.names.length), axis) : null;

  const colours = {
    ground,
    grid,
    copy: walked(mix(ink, ground, 0.2), NON_TEXT_CONTRAST_MIN, "a compare's copy"),
    faded: mix(ground, ink, 0.14),
    rule: walked(muted, NON_TEXT_CONTRAST_MIN, "a reference rule"),
    ring: walked(ink, NON_TEXT_CONTRAST_MIN, "a ring"),
    text: {
      eyebrow: walked(registers.eyebrow.fill ?? accent, TEXT_CONTRAST_MIN, "the eyebrow"),
      title: walked(registers.display.fill ?? ink, TEXT_CONTRAST_MIN, "the title"),
      name: walked(ink, TEXT_CONTRAST_MIN, "a name"),
      axis: walked(muted, TEXT_CONTRAST_MIN, "a muted word"),
      first: walked(accent, TEXT_CONTRAST_MIN, "a highlighted word"),
      count: walked(ink, TEXT_CONTRAST_MIN, "a count"),
    },
  };

  // Every row-slot field must exist for the closing column too (it never moves).
  const props = {
    variant,
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, value, axis, annot, source: sourceRegister },
    titleCard,
    credit: { ...creditBlock, at: creditAt },
    colours,
    layout,
    domain,
    partCount: rowsMode ? parts.length : drawn.length,
    bars,
    names,
    legend: key,
    notes,
    captions,
    bracketLabels,
    scope: scope ? { ...scope, x: content.left, y: plotBottom + gap + bAxis.ascent + (rowsMode ? 0 : bAxis.height * 2) } : null,
    plan: scheduled.plan,
    states: scheduled.states.map((s) => ({ ...s, [`slot${drawn.length}`]: drawn.length, [`accent${drawn.length}`]: 0, [`ring${drawn.length}`]: 0, [`back${drawn.length}`]: 0, "mring-1": 0 })),
    windows: scheduled.windows,
    linear: scheduled.linear,
    unit: copy.unitWord,
    format: copy.format,
    countWidths,
    strokes: { rule: (direction.stroke?.rule ?? 1) * k * 1.4, grid: (direction.stroke?.hairline ?? 0.6) * k },
    dash: [0.2 * axis.lead, 0.14 * axis.lead],
    halo: { value: haloOf(value, k), axis: haloOf(axis, k), annot: haloOf(annot, k) },
    timing: GESTURE_VIDEO_TIMING,
  };
  return { id, direction, props, report: { mode: layout.mode, drawn: drawn.length, of: stack.names.length, pitch: (layout.pitch ?? layout.slot).toFixed(1), titleLines: titleCard.title.length } };
}

const running = (stack) => stack.anchorMode === "running";
