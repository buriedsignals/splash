// EVERYTHING ONE UNITS GESTURE VIDEO IS HANDED, BUILT IN BUN — the groups' rows, every word measured (names, counts,
// notes, captions, every figure a count or a bracket climbs through), the colours, and the six event states the
// units video scheduler (`./gesture-units-video.mjs`) places the three gestures in.
//
// THE LAYOUT ADAPTS; IT NEVER REFUSES THE DATA'S SHAPE (craft/gestures/GRAMMAR.md §7.1): many groups make thinner
// rows (names and counts printed only where they clear their neighbours), long names wrap in the gutter, a note that
// does not fit after its row's count moves to a caption line above the rows. Its refusals are the words' (a title or
// a credit no card or line holds) and the scheduler's gesture refusals.
//
// Runs in Bun only. Mirrors video/bar-and-column.gestures/build.mjs: direction resolved against the beat's own words,
// registers at the video size, the shared title card and credit from the chart-video skill's shots.
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { adjustToContrast, mix, NON_TEXT_CONTRAST_MIN, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { frameInsetFor, sizeFor } from "#shared/chart-video/sizes.mjs";
import { EYEBROW_TO_DISPLAY, registerOf } from "#shared/design-base/register.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { skillScriptFrom } from "#shared/design-base/skill-script.mjs";
import { layoutRows } from "./gesture-family-units.mjs";
import { climbingTexts, scheduleUnitsVideo } from "./gesture-units-video.mjs";
import { EVENTS, valueText } from "./gesture-video.mjs";
import { GESTURE_VIDEO_TIMING } from "./timing-contract.ts";

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
export function textPerRegisterOf(copy, groups, gestures) {
  const notes = gestures.map((g) => g.note).filter(Boolean);
  return {
    display: copy.title,
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: notes.join(" ") || groups.map((g) => g.name).join(" "),
    value: `0123456789${copy.format.decimal}${copy.format.group}`,
    axis: `${groups.map((g) => g.name).join(" ")} ${copy.unit} ${copy.source.join(" ")}`,
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
 * @param variant   histogram | pictogram-isotype
 * @param groups    the partition's groups, in drawing order
 * @param gestures  validateGestures' gestures
 * @param copy      { eyebrow, title, source: forms, unit, format }
 */
export function buildUnitsVideo({ id, chosen, variant, groups, gestures, copy, size }) {
  const direction = resolveDirectionFamilies(chosen, textPerRegisterOf(copy, groups, gestures));
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
  const measure = (text, r) => {
    const t = applyCase(text, r.transform);
    return { text: t, width: widthOf(t, r) };
  };

  const titleCard = titleCardOf({ registers, eyebrow: copy.eyebrow, title: copy.title, size });
  const { register: sourceRegister, ...creditBlock } = creditOf({ registers, forms: copy.source, size, k });
  const creditAt = { x: inset, y: stage.height - vInset - creditBlock.height };
  const scheduled = scheduleUnitsVideo({ gestures, groups });

  // ── the words: names (wrapping in a gutter of at most 30 % of the width), counts, notes
  const gutterMax = content.width * 0.3;
  const nameLines = groups.map((g) => wrap(applyCase(g.name, axis.transform), axis, gutterMax / (1 + DRAWN_WIDER)));
  const gutter = Math.min(gutterMax, Math.max(...nameLines.flat().map((l) => wide(l.width)))) + gap;
  const counts = groups.map((g) => measure(valueText(g.count, copy.format), value));
  const countReserve = Math.max(...counts.map((c) => wide(c.width))) + gap;
  const unitLine = copy.unit ? measure(copy.unit, axis) : null;

  // ── the right column: brackets' figures and notes, a rule's words
  const brackets = scheduled.plan.filter((p) => p.do === "bracket");
  const bracketTexts = brackets.map((p) => {
    const figures = p.steps.map((v) => wide(widthOf(valueText(v, copy.format), value)));
    const note = p.note ? measure(p.note, annot) : null;
    return { item: p.index, note, width: Math.max(...figures, note ? wide(note.width) : 0) };
  });
  const rules = scheduled.plan.filter((p) => p.do === "reference");
  const ruleTexts = rules.map((p) => ({ item: p.index, line: measure(p.note ?? String(p.at), annot) }));
  // A rule's words stand past every bracket's spine, so a spine never runs through them.
  const ruleShift = bracketTexts.length * 2 * gap;
  const sideW = Math.min(content.width * 0.32, Math.max(0, ...bracketTexts.map((b) => b.width + 3 * gap), ...ruleTexts.map((r) => wide(r.line.width) + gap + ruleShift)));
  const right = content.right - sideW;

  // ── captions above the rows: count figures and notes, whole-chart notes, notes with no room on their row
  const captionLead = Math.max(annot.lead, value.lead);
  const rowNote = (p) => ["highlight", "name", "annotate", "compare"].includes(p.do) && (p.note || p.do === "annotate" || p.do === "name");
  const rowNoteText = (p) => p.note ?? `${p.marks[0]}: ${groups.find((g) => g.name === p.marks[0]).count}`;
  const build = (moved) => {
    const captions = [];
    scheduled.plan.forEach((p) => {
      let text = null;
      if (["count", "reveal", "pull-back", "filter"].includes(p.do)) text = p.note ?? null;
      else if (rowNote(p) && moved.has(p.index)) text = `${p.marks[0]}: ${rowNoteText(p)}`;
      if (!text && p.do !== "count") return;
      const lines = text ? wrap(applyCase(text, annot.transform), annot, content.width / (1 + DRAWN_WIDER)) : [];
      captions.push({ item: p.index, kind: p.do === "count" ? "count" : "note", lines, rows: Math.max(1, lines.length) });
    });
    let y = vInset;
    for (const c of captions) {
      c.y = y + Math.max(bAnnot.ascent, c.kind === "count" ? bValue.ascent : 0);
      y += c.rows * captionLead;
    }
    const plotTop = (captions.length ? y + gap : vInset) + (unitLine ? bAxis.height + gap : 0);
    const plotBottom = creditAt.y - gap * 1.5;
    const box = { x: content.left, y: plotTop, width: right - content.left - countReserve, height: Math.max(40, plotBottom - plotTop) };
    const laid = scheduled.plan.filter((p) => p.do === "compare").map((p) => p.value);
    const geo = layoutRows({ groups, variant, box, gutter, laid, gap: 0.26 });
    return { captions, plotTop, plotBottom, geo, unitY: plotTop - gap - bAxis.descent };
  };
  let moved = new Set();
  let built = build(moved);
  for (let pass = 0; pass < 2; pass++) {
    const next = new Set(moved);
    for (const p of scheduled.plan) {
      if (!rowNote(p) || next.has(p.index)) continue;
      const i = groups.findIndex((g) => g.name === p.marks[0]);
      const r = built.geo.rows[i];
      const copyP = scheduled.plan.find((q) => q.do === "compare" && q.onto === p.marks[0]);
      const end = Math.max(r.end(groups[i].count), copyP ? r.end(copyP.value) : 0);
      const w = wide(measure(rowNoteText(p), annot).width);
      const earlier = scheduled.plan.some((q) => q.index < p.index && rowNote(q) && q.marks[0] === p.marks[0] && !next.has(q.index));
      if (end + countReserve + gap + w > right || earlier || built.geo.pitch < bAnnot.height) next.add(p.index);
    }
    if (next.size === moved.size) break;
    moved = next;
    built = build(moved);
  }
  const { geo } = built;

  // Thin rows: print a name and a count only where it clears the printed one before it (gesture rows first).
  const rowText = Math.max(bAxis.height, bValue.height);
  const labelled = groups.map(() => true);
  if (geo.pitch < rowText) {
    labelled.fill(false);
    const priority = [...new Set([...gestures.flatMap((g) => g.marks), ...groups.map((g) => g.name)])];
    const taken = [];
    for (const name of priority) {
      const i = groups.findIndex((g) => g.name === name);
      if (i < 0) continue;
      if (taken.every((j) => Math.abs(j - i) * geo.pitch >= rowText)) {
        labelled[i] = true;
        taken.push(i);
      }
    }
  }

  const rows = groups.map((g, i) => {
    const r = geo.rows[i];
    const lines = nameLines[i];
    const notes = scheduled.plan
      .filter((p) => rowNote(p) && p.marks[0] === g.name && !moved.has(p.index))
      .map((p) => ({ item: p.index, ...measure(rowNoteText(p), annot) }));
    return {
      key: g.name,
      count: g.count,
      top: r.top,
      band: r.band,
      mid: r.mid,
      bandTop: r.bandTop,
      bandHeight: r.bandHeight,
      labelled: labelled[i],
      countText: counts[i],
      countY: r.mid + (bValue.ascent - bValue.descent) / 2,
      names: lines.map((l, j) => ({ text: l.text, width: l.width, x: geo.x0 - gap - wide(l.width), y: r.mid + (bAxis.ascent - bAxis.descent) / 2 + (j - (lines.length - 1) / 2) * axis.lead })),
      notes,
    };
  });
  const bracketLabels = bracketTexts.map((b, j) => ({ ...b, x: right + gap + j * gap * 2 }));
  const ruleLabels = ruleTexts.map((t) => ({ ...t, x: right + gap + ruleShift }));

  const climbing = climbingTexts(scheduled.plan, copy.format);
  const countWidths = Object.fromEntries(climbing.map((t) => [t, widthOf(applyCase(t, value.transform), value)]));
  assertEventStates(scheduled.states, [...EVENTS]);

  const { ground, accent } = direction;
  const { ink, muted, grid } = deriveFurniture(ground);
  const walked = (c, floor, what) => {
    const w = adjustToContrast(c, ground, floor);
    if (!w) throw new Error(`${what} has no variant that reads at ${floor}:1 on ${ground}`);
    return w;
  };
  const colours = {
    ground,
    grid,
    unit: walked(mix(ground, ink, 0.42), NON_TEXT_CONTRAST_MIN, "a unit"),
    first: walked(accent, NON_TEXT_CONTRAST_MIN, "a highlighted group"),
    copy: walked(mix(ink, ground, 0.35), NON_TEXT_CONTRAST_MIN, "a compare's copy"),
    faded: mix(ground, ink, 0.14),
    rule: walked(accent, NON_TEXT_CONTRAST_MIN, "a reference rule"),
    ring: walked(accent, NON_TEXT_CONTRAST_MIN, "a ring"),
    text: {
      eyebrow: walked(registers.eyebrow.fill ?? accent, TEXT_CONTRAST_MIN, "the eyebrow"),
      title: walked(registers.display.fill ?? ink, TEXT_CONTRAST_MIN, "the title"),
      name: walked(ink, TEXT_CONTRAST_MIN, "a name"),
      axis: walked(muted, TEXT_CONTRAST_MIN, "a muted word"),
      first: walked(accent, TEXT_CONTRAST_MIN, "a highlighted word"),
      count: walked(ink, TEXT_CONTRAST_MIN, "a count"),
    },
  };

  const props = {
    variant,
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, value, axis, annot, source: sourceRegister },
    titleCard,
    credit: { ...creditBlock, at: creditAt },
    colours,
    layout: { x0: geo.x0, span: geo.span, right, max: geo.max, cell: geo.cell, perLine: geo.perLine, gap, captionLead, content, plotTop: built.plotTop, plotBottom: built.plotBottom },
    rows,
    captions: built.captions,
    bracketLabels,
    ruleLabels,
    unitLine: unitLine ? { ...unitLine, x: content.left, y: built.unitY } : null,
    plan: scheduled.plan,
    states: scheduled.states,
    windows: scheduled.windows,
    linear: scheduled.linear,
    format: copy.format,
    countWidths,
    strokes: { rule: (direction.stroke?.rule ?? 1) * k * 1.4, grid: (direction.stroke?.hairline ?? 0.6) * k },
    dash: [0.2 * axis.lead, 0.14 * axis.lead],
    halo: { value: haloOf(value, k), axis: haloOf(axis, k), annot: haloOf(annot, k) },
    timing: GESTURE_VIDEO_TIMING,
  };
  return { id, direction, props, report: { groups: groups.length, pitch: geo.pitch.toFixed(1), cell: geo.cell.toFixed(1), titleLines: titleCard.title.length, captions: built.captions.length } };
}
