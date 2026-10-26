// EVERYTHING ONE GESTURE VIDEO IS HANDED, BUILT IN BUN — the rows the frame has room for, every word measured (names,
// counts, notes, captions, every figure a count climbs through), the colours, and the six event states the video
// scheduler (`./gesture-video.mjs`) places the three gestures in.
//
// THE LAYOUT ADAPTS; IT NEVER REFUSES THE DATA'S SHAPE (craft/gestures/GRAMMAR.md §7.1):
//   - many rows: the frame draws as many as its row pitch holds, every row a gesture acts on always among them,
//     the rest stated in one line under the rows ("6 / 40", or the beat's own `scope` sentence);
//   - long names: names stand above their bars instead of in a column beside them;
//   - long notes: a note that leaves the bars too little room moves to a caption line above the rows;
//   - more rows a gesture names than the frame holds: they are all drawn, thinner, and only the names that fit
//     without touching are printed;
//   - zero and negative values: bars from one zero rule, a negative bar's count before its tip.
// Its refusals are the words' (a title or a credit no card or line holds), and the scheduler's gesture refusals.
//
// Runs in Bun only. Mirrors video/bar-and-column/build.mjs (the per-type kit): direction resolved against the beat's
// own words, registers at the video size, the shared title card and credit from the chart-video skill's shots.
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { adjustToContrast, mix, NON_TEXT_CONTRAST_MIN, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { frameInsetFor, sizeFor } from "#shared/chart-video/sizes.mjs";
import { EYEBROW_TO_DISPLAY, registerOf } from "#shared/design-base/register.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { skillScriptFrom } from "#shared/design-base/skill-script.mjs";
import { countedTexts, EVENTS, scheduleVideo, valueText } from "./gesture-video.mjs";
import { GESTURE_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const chartVideo = (...parts) => skillScriptFrom(HERE, "chart-video", "scripts", ...parts);
const { applyCase } = await import(chartVideo("registers.mjs"));
const { BAND_PROBE, bandOf, cardTextFor, CREDIT_MAX_LINES, CREDIT_ONE_LINE, DRAWN_WIDER, haloOf, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf, wrap } = await import(chartVideo("shots.mjs"));
const { videoRegistersOf } = await import(chartVideo("video-registers.mjs"));
const { assertEventStates } = await import(chartVideo("choreography.mjs"));

export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const LABEL_GAP = 0.4;
const BAR_SHARE = 0.6;
/** A name column wider than this share of the content width puts the names above their bars. */
const NAME_COLUMN_MAX = 0.32;
/** Under this share of the content width for the bars, the row notes move to caption lines. */
const SPAN_MIN = 0.3;
/** A row never grows past this many times the pitch its words need (six rows are not six slabs). */
const PITCH_MAX = 2.6;

const band = (r) => {
  const b = bandOf(BAND_PROBE, r);
  return { ascent: b.ascent, descent: b.descent, height: b.ascent + b.descent };
};

/** The words every register will draw, for resolving the direction's families against this beat's own text. */
export function textPerRegisterOf(copy, rows, gestures) {
  const notes = gestures.map((g) => g.note).filter(Boolean);
  return {
    display: copy.title,
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: notes.join(" ") || rows.map((r) => r.name).join(" "),
    value: `${copy.unit(valueText(Math.max(...rows.map((r) => Math.abs(r.value))), copy.format))} 0123456789${copy.format.decimal}${copy.format.group}`,
    axis: `${rows.map((r) => r.name).join(" ")} ${copy.source.join(" ")} ${copy.scope(rows.length, rows.length)}`,
  };
}

/** The title card: the takeaway, word for word. A takeaway longer than the card's three lines takes the content's
 *  whole width and up to six lines rather than a shorter form (the card must carry the journalist's sentence). */
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

/** The credit: one line of the content width (the rule since 2026-09-14), else up to three lines of it. */
function creditOf({ registers, forms, size, k }) {
  try {
    return sourceCreditFor({ registers, forms, size, k, ...CREDIT_ONE_LINE });
  } catch {
    return sourceCreditFor({ registers, forms, size, k, measure: 1, maxLines: CREDIT_MAX_LINES });
  }
}

/**
 * @param chosen    the run's direction, unresolved (video.mjs `pickDirection`)
 * @param rows      every row of beat.mjs, in its order: [{ name, value }]
 * @param gestures  validateGestures' `gestures`
 * @param copy      { eyebrow, title, source: forms, unit(text), unitWord, format, scope(shown, all) }
 * @param size      landscape | square | portrait
 */
export function buildGestureVideo({ id, chosen, rows: allRows, gestures, copy, size }) {
  const direction = resolveDirectionFamilies(chosen, textPerRegisterOf(copy, allRows, gestures));
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
  const gap = LABEL_GAP * axis.lead;
  const tick = gap * 0.6;
  const wide = (w) => w * (1 + DRAWN_WIDER);
  const bAxis = band(axis);
  const bValue = band(value);
  const bAnnot = band(annot);
  const rowText = Math.max(bAxis.height, bValue.height, bAnnot.height);

  const titleCard = titleCardOf({ registers, eyebrow: copy.eyebrow, title: copy.title, size });
  const { register: sourceRegister, ...creditBlock } = creditOf({ registers, forms: copy.source, size, k });
  const creditAt = { x: inset, y: stage.height - vInset - creditBlock.height };

  const countText = (v) => copy.unit(valueText(v, copy.format));
  const countWidth = (text) => widthOf(applyCase(text, value.transform), value);
  const noteLine = (text) => {
    const t = applyCase(text, annot.transform);
    return { text: t, width: widthOf(t, annot) };
  };
  const split = (g) => {
    const ofCount = Array.isArray(g.of) ? g.of.length : 0;
    return g.marks.slice(0, g.marks.length - ofCount);
  };
  /** A row note's words: its own, else (annotate) the row's value. A name without words is its ring around the bar
   *  whose count already prints the value. */
  const rowNoteOf = (g) => {
    const lead = split(g)[0];
    const v = allRows.find((r) => r.name === lead)?.value;
    if (g.note !== undefined && String(g.note).trim()) return String(g.note);
    if (g.do === "annotate") return countText(v);
    return null;
  };

  // Every row a gesture acts on is drawn, whatever else the frame has to leave out.
  const keep = new Set(gestures.flatMap((g) => g.marks));

  function attempt({ mode, notesInCaption }) {
    // ── caption lines, top of the plot: counts, reference rules, whole-chart gestures' notes (and the row notes when
    //    the bars would otherwise be too short to read)
    const captionLead = Math.max(annot.lead, value.lead);
    const captions = [];
    gestures.forEach((g, i) => {
      const own = ["count", "reference", "reveal", "reorder", "rescale", "pull-back"].includes(g.do);
      const text = own ? (g.note !== undefined && String(g.note).trim() ? String(g.note) : null) : notesInCaption && g.do !== "bracket" ? rowNoteOf(g) : null;
      if (!text && g.do !== "count") return;
      const lines = text ? wrap(applyCase(text, annot.transform), annot, content.width / (1 + DRAWN_WIDER)) : [];
      captions.push({ item: i, kind: g.do === "count" ? "count" : g.do === "reference" ? "rule" : "note", lines, rows: Math.max(1, lines.length) });
    });
    let y = vInset;
    for (const c of captions) {
      c.y = y + Math.max(bAnnot.ascent, c.kind === "count" ? bValue.ascent : 0);
      y += c.rows * captionLead;
    }
    const plotTop = captions.length ? y + gap : vInset;

    // ── the rows the frame has room for
    const rowsPitch = mode === "column" ? rowText + gap : bAxis.height + gap * 0.5 + rowText + gap;
    const remainderH = bAxis.height + gap;
    const bottomOf = (withRemainder) => creditAt.y - gap - (withRemainder ? remainderH : 0);
    let drawn = allRows;
    let thin = false;
    const capacityAt = (bottom) => Math.max(1, Math.floor((bottom - plotTop) / rowsPitch));
    if (allRows.length > capacityAt(bottomOf(false))) {
      const capacity = capacityAt(bottomOf(true));
      if (keep.size > capacity) {
        drawn = allRows.filter((r) => keep.has(r.name));
        thin = true;
      } else {
        const fill = allRows.filter((r) => !keep.has(r.name)).sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, capacity - keep.size);
        const chosen = new Set([...keep, ...fill.map((r) => r.name)]);
        drawn = allRows.filter((r) => chosen.has(r.name));
      }
    }
    const restRows = allRows.filter((r) => !drawn.includes(r));
    const rest = { count: restRows.length, sum: restRows.reduce((s, r) => s + r.value, 0) };
    const plotBottom = bottomOf(rest.count > 0);
    const pitch = Math.min(PITCH_MAX * rowsPitch, (plotBottom - plotTop) / drawn.length);

    // ── names
    const names = drawn.map((r) => {
      const t = applyCase(r.name, axis.transform);
      return { text: t, width: widthOf(t, axis) };
    });
    const namesW = mode === "column" ? Math.max(...names.map((n) => wide(n.width))) : 0;
    if (mode === "column" && namesW > NAME_COLUMN_MAX * content.width) return { why: "names wider than the column allows" };

    // ── each row's chain past its bar: its count, then its notes in story order
    const counts = drawn.map((r) => {
      const text = countText(r.value);
      return { text, width: countWidth(text) };
    });
    const notes = [];
    if (!notesInCaption)
      gestures.forEach((g, i) => {
        if (!["highlight", "name", "annotate", "filter", "zoom", "compare"].includes(g.do)) return;
        const text = rowNoteOf(g);
        if (!text) return;
        notes.push({ item: i, row: drawn.findIndex((r) => r.name === split(g)[0]), ...noteLine(text) });
      });
    const chainOf = (i) => gap + wide(counts[i].width) + notes.filter((n) => n.row === i).reduce((s, n) => s + gap + wide(n.width), 0);
    const brackets = gestures.map((g, i) => ({ g, i })).filter(({ g }) => g.do === "bracket");
    const bracketLabels = [];
    const negatives = drawn.map((r, i) => (r.value < 0 ? i : -1)).filter((i) => i >= 0);
    const leftReserve = negatives.length ? Math.max(...negatives.map((i) => wide(counts[i].width))) + gap : 0;
    const plotLeft = mode === "column" ? content.left + namesW + gap : content.left;
    const valueLeft = plotLeft + leftReserve;
    const chains = drawn.map((_, i) => chainOf(i));
    const rightReserve = Math.max(...chains) + (brackets.length ? gap + tick + gap : 0);

    // The bracket's figures: the texts its count climbs through, then its note by a cut.
    const scheduled = scheduleVideo({ gestures, rows: drawn, rest });
    const climbing = countedTexts(scheduled.plan, copy.format).map(copy.unit);
    for (const { g, i } of brackets) {
      const item = scheduled.plan[i];
      const widths = item.steps.map((v) => wide(countWidth(countText(v))));
      const note = g.note !== undefined && String(g.note).trim() ? noteLine(String(g.note)) : null;
      bracketLabels.push({ item: i, note, width: Math.max(...widths, note ? wide(note.width) : 0) });
    }
    const labelReserve = bracketLabels.length ? Math.max(...bracketLabels.map((b) => b.width)) : 0;
    const span = content.right - valueLeft - rightReserve - labelReserve;
    if (span < SPAN_MIN * content.width && !notesInCaption) return { why: `the notes leave the bars ${Math.round(span)}px` };

    // ── rows' vertical rhythm
    let barTop;
    let barH;
    let nameDy;
    if (mode === "column") {
      barH = pitch * BAR_SHARE;
      barTop = (pitch - barH) / 2;
      nameDy = barTop + barH / 2 + (bAxis.ascent - bAxis.descent) / 2;
    } else {
      barTop = bAxis.height + gap * 0.5;
      barH = Math.max(rowText * 0.8, (pitch - barTop - gap) * 0.85);
      nameDy = bAxis.ascent;
    }
    // Thin rows: print a name and a count only where it touches no other printed one (gesture rows first).
    const labelled = drawn.map(() => true);
    if (thin && pitch < rowsPitch) {
      labelled.fill(false);
      const priority = [...new Set([...gestures.map((g) => split(g)[0]), ...drawn.map((r) => r.name)])];
      const taken = [];
      for (const name of priority) {
        const i = drawn.findIndex((r) => r.name === name);
        if (i < 0) continue;
        if (taken.every((j) => Math.abs(j - i) * pitch >= rowText)) {
          labelled[i] = true;
          taken.push(i);
        }
      }
    }
    const scope = rest.count ? applyCase(copy.scope(drawn.length, allRows.length), axis.transform) : null;
    return {
      mode,
      notesInCaption,
      drawn,
      rest,
      scheduled,
      climbing,
      captions,
      layout: {
        mode,
        content,
        plotTop,
        plotBottom,
        plotLeft,
        valueLeft,
        span: Math.max(span, 0.1 * content.width),
        pitch,
        barTop,
        barH,
        nameDy,
        countShift: (bValue.ascent - bValue.descent) / 2,
        gap,
        tick,
        captionLead,
      },
      rows: drawn.map((r, i) => ({
        key: r.name,
        name: { ...names[i], x: mode === "column" ? plotLeft - gap - wide(names[i].width) : content.left },
        value: r.value,
        count: counts[i],
        labelled: labelled[i],
        rank: [...drawn].sort((a, b) => b.value - a.value).indexOf(r),
      })),
      notes,
      bracketLabels,
      scope: scope ? { text: scope, width: widthOf(scope, axis), x: content.left, y: plotBottom + gap + bAxis.ascent } : null,
    };
  }

  const ladder = [
    { mode: "column", notesInCaption: false },
    { mode: "above", notesInCaption: false },
    { mode: "column", notesInCaption: true },
    { mode: "above", notesInCaption: true },
  ];
  let built = null;
  const why = [];
  for (const rung of ladder) {
    const got = attempt(rung);
    if (got.why) why.push(`${rung.mode}${rung.notesInCaption ? " + captions" : ""}: ${got.why}`);
    else {
      built = got;
      break;
    }
  }
  // The last rung never refuses: names above, every note on a caption line.
  if (!built) throw new Error(`no layout rung held, a kit bug: ${why.join("; ")}`);

  const { scheduled } = built;
  assertEventStates(scheduled.states, [...EVENTS]);

  const captionLines = built.captions.map((c) => ({ ...c, lines: c.lines.map((l) => ({ ...l })) }));
  const countWidths = Object.fromEntries(built.climbing.map((t) => [t, countWidth(t)]));

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
    column: walked(mix(accent, ground, 0.42), NON_TEXT_CONTRAST_MIN, "a bar"),
    first: walked(accent, NON_TEXT_CONTRAST_MIN, "a highlighted bar"),
    copy: walked(mix(ink, ground, 0.35), NON_TEXT_CONTRAST_MIN, "a compare's copy"),
    faded: mix(ground, ink, 0.14),
    rule: walked(muted, NON_TEXT_CONTRAST_MIN, "a reference rule"),
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
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, value, axis, annot, source: sourceRegister },
    titleCard,
    credit: { ...creditBlock, at: creditAt },
    colours,
    layout: built.layout,
    rows: built.rows,
    notes: built.notes,
    captions: captionLines,
    bracketLabels: built.bracketLabels,
    scope: built.scope,
    plan: scheduled.plan,
    hasReveal: gestures.some((g) => g.do === "reveal"),
    states: scheduled.states,
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
  return {
    id,
    direction,
    props,
    report: { mode: built.mode, notesInCaption: built.notesInCaption, drawn: built.drawn.length, of: allRows.length, pitch: built.layout.pitch.toFixed(1), span: Math.round(built.layout.span), titleLines: titleCard.title.length },
  };
}
