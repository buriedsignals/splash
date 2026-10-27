// EVERYTHING ONE TIME-SERIES GESTURE VIDEO IS HANDED, BUILT IN BUN — the plot box, every series' readings in the
// variant's y-units, every word measured (end labels, ticks, notes, captions, every time the playhead can print),
// the colours walked to their floors, and the six event states the video scheduler (./gesture-time-video.mjs)
// places the three gestures in. Mirrors video/bar-and-column.gestures/build.mjs: the direction resolved against the
// beat's own words, registers at the video size, the shared title card and credit from the chart-video skill.
//
// THE LAYOUT ADAPTS; IT NEVER REFUSES THE DATA'S SHAPE: any number of series (end labels spread down the right
// gutter), gaps (the line breaks, a dotted bridge marks it, its words written once), long notes (wrapped into caption
// lines above the plot when they carry no reading). Runs in Bun only.
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { adjustToContrast, mix, NON_TEXT_CONTRAST_MIN, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { frameInsetFor, sizeFor } from "#shared/chart-video/sizes.mjs";
import { EYEBROW_TO_DISPLAY, registerOf } from "#shared/design-base/register.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { skillScriptFrom } from "#shared/design-base/skill-script.mjs";
import { niceTicks, pictureOf } from "./gesture-family-time.mjs";
import { EVENTS, scheduleTimeVideo } from "./gesture-time-video.mjs";

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
export function textPerRegisterOf(copy, model, gestures) {
  const notes = gestures.map((g) => g?.note).filter(Boolean);
  return {
    display: copy.title,
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: `${model.series.join(" ")} ${notes.join(" ")}`,
    value: `${model.series.slice(0, 12).join(" ")} 0123456789,.`,
    axis: `${model.times.slice(0, 40).join(" ")} ${copy.unit} ${copy.source.join(" ")}`,
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
 * @param model     timeModel's output
 * @param valid     validateTime's gestures (exactly three)
 * @param subject   validateTime's subject series
 * @param copy      { eyebrow, title, source: forms, unit, format(v) }
 * @param timing    the kit's timing contract
 */
export function buildTimeVideo({ id, chosen, model, valid, subject, copy, size, timing, gestures }) {
  const direction = resolveDirectionFamilies(chosen, textPerRegisterOf(copy, model, gestures ?? valid));
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
  const gap = 0.5 * axis.lead;
  const wide = (w) => w * (1 + DRAWN_WIDER);
  const word = (text, r) => {
    const t = applyCase(String(text), r.transform);
    return { text: t, width: widthOf(t, r) };
  };

  const titleCard = titleCardOf({ registers, eyebrow: copy.eyebrow, title: copy.title, size });
  const { register: sourceRegister, ...creditBlock } = creditOf({ registers, forms: copy.source, size, k });
  const creditAt = { x: inset, y: stage.height - vInset - creditBlock.height };

  const variant = model.variant;
  const line = variant === "line" || variant === "bump-ranking-over-time";
  const { accent, items } = pictureOf(model, valid, { format: copy.format, subject });
  const F = copy.format;

  // ── captions: the notes no reading carries (a reveal's, a filter's, a zoom's factor), above the plot
  const captions = [];
  let y = vInset + band(annot).ascent;
  const captionOf = new Map();
  items.forEach((it) => {
    const anchored = it.at || it.a || (it.kind === "crossing" && it.crossings?.length) || it.do === "reference" || it.do === "bracket";
    if (!it.note || anchored) return;
    const lines = wrap(applyCase(it.note, annot.transform), annot, content.width / (1 + DRAWN_WIDER));
    const placed = lines.map((l, j) => ({ text: l.text, width: l.width, y: y + j * annot.lead }));
    captionOf.set(it.k, placed);
    captions.push(...placed);
    y += lines.length * annot.lead;
  });
  // The unit, above the value axis.
  const unit = copy.unit ? word(copy.unit, axis) : null;
  const unitY = y + (captions.length ? gap : 0);
  const plotTop = unitY + (unit ? axis.lead : 0) + gap;
  const xAxisH = axis.lead * 1.4;
  const plotBottom = creditAt.y - gap - xAxisH;

  // ── the value axis: fitted ticks (line), from zero (area), ranks (bump), none (stream)
  const [lo, hi] = model.domain;
  const tickText = (v) => (Number.isInteger(v) ? F(v).replace(/[.,]0+$/, "") : F(v));
  const yTicks = variant === "line" || variant === "area-and-stacked-area" ? niceTicks(lo, hi, 5).map((v) => ({ v, ...word(tickText(v), axis) })) : variant === "bump-ranking-over-time" ? Array.from({ length: model.slots }, (_, i) => ({ v: i + 1, ...word(String(i + 1), axis) })) : [];
  const leftGutter = yTicks.length ? Math.max(...yTicks.map((t) => wide(t.width))) + gap : 0;

  // ── end labels down the right gutter, spread apart
  const pitch = annot.lead * 0.95;
  const lastOf = (s) => [...model.geometry.get(s)].reverse().find((p) => !p.gap);
  const ends = model.series.map((s) => {
    const p = lastOf(s);
    const text = variant === "bump-ranking-over-time" ? s : `${s} ${p ? F(model.measureOf.get(`${p.key} · ${s}`) ?? NaN) : ""}`.trim();
    const shown = p && !(variant === "bump-ranking-over-time" && p.t !== model.t1);
    return { s, p, shown, ...word(text.replace(/ NaN$/, ""), annot) };
  });
  const rightGutter = Math.min(content.width * 0.32, Math.max(0, ...ends.filter((e) => e.shown).map((e) => wide(e.width))) + gap);
  const plot = { left: content.left + leftGutter, right: content.right - rightGutter - gap, top: plotTop, bottom: plotBottom };
  const Y = (v) => plot.bottom - ((v - lo) / (hi - lo || 1)) * (plot.bottom - plot.top);
  const Xfull = (t) => plot.left + ((t - model.t0) / (model.t1 - model.t0 || 1)) * (plot.right - plot.left);
  const yOfPt = (p) => (line || model.series.length === 1 ? Y(p.y1) : Y((p.y0 + p.y1) / 2));
  const labelled = ends.filter((e) => e.shown).map((e) => ({ ...e, y: yOfPt(e.p) + (bandOf("Hx", annot).ascent / 2) })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < labelled.length; i++) if (labelled[i].y - labelled[i - 1].y < pitch) labelled[i].y = labelled[i - 1].y + pitch;
  const maxY = plot.bottom;
  if (labelled.length && labelled.at(-1).y > maxY) {
    labelled.at(-1).y = maxY;
    for (let i = labelled.length - 2; i >= 0; i--) if (labelled[i + 1].y - labelled[i].y < pitch) labelled[i].y = labelled[i + 1].y - pitch;
  }

  // ── the time axis: the whole span's ticks and a zoom window's
  const ticksOver = (a, b) => {
    const n = Math.max(3, Math.min(8, Math.floor((plot.right - plot.left) / 180)));
    let ts = niceTicks(a, b, n).filter((t) => Number.isInteger(t) || b - a < 6);
    if (!ts.length) ts = [a, b];
    return ts.map((t) => ({ t, ...word(String(t), axis) }));
  };
  const zoom = items.find((it) => it.do === "zoom");
  const xTicks = { full: ticksOver(model.t0, model.t1), zoom: zoom ? ticksOver(zoom.window[0], zoom.window[1]) : [] };

  // ── each gesture's marks in the y-units, its note measured and placed beside its anchor (nudged clear)
  const placedNotes = [];
  const clear = (n) =>
    !placedNotes.some((m) => Math.min(m.x + m.width, n.x + n.width) - Math.max(m.x, n.x) > -2 * gap && Math.abs(m.y - n.y) < annot.lead * 0.9);
  const noteBeside = (text, ax, ay) => {
    const w = word(text, annot);
    const right = ax + gap + wide(w.width) <= plot.right;
    const dx = right ? gap : -gap - wide(w.width);
    let dy = -gap;
    for (const step of [0, -1, 1, -2, 2, -3, 3, 4, -4]) {
      const cand = { x: ax + dx, y: ay - gap + step * annot.lead, width: wide(w.width) };
      if (cand.y - annot.lead < plot.top) continue;
      if (clear(cand)) {
        dy = -gap + step * annot.lead;
        break;
      }
    }
    placedNotes.push({ x: ax + dx, y: ay + dy, width: wide(w.width) });
    return { ...w, dx, dy, leader: Math.abs(dy + gap) > annot.lead * 1.2 };
  };
  const ptOf = (p) => (p ? { t: p.t, y: line || model.series.length === 1 ? p.y1 : (p.y0 + p.y1) / 2 } : null);
  const linearDo = new Set(["compare", "bracket", "reference", "trace", "reveal"]);
  // Notes at fixed places (a bracket's, a rule's) are placed first, so the notes beside readings step clear of them.
  const fixedFirst = [...items].sort((a, b) => Number(!["bracket", "reference"].includes(a.do)) - Number(!["bracket", "reference"].includes(b.do)));
  const byIndex = new Map();
  for (const it of fixedFirst) byIndex.set(it.k, placeItem(it));
  const propsItems = items.map((it) => byIndex.get(it.k));
  function placeItem(it) {
    const out = { k: it.k, do: it.do, kind: it.kind, linear: linearDo.has(it.do) };
    if (it.at) out.at = ptOf(it.at);
    if (it.do === "name") out.ring = true;
    const text = it.do === "name" || it.do === "annotate" ? it.text : it.note;
    if (it.kind === "level") {
      out.a = ptOf(it.a);
      out.b = ptOf(it.b);
    } else if (it.kind === "copy") {
      out.a = { t: it.a.t, y0: it.a.y0 };
      out.b = { t: it.b.t, y0: it.b.y0, y1: it.b.y1 };
    } else if (it.kind === "crossing") {
      out.points = it.crossings.map((c) => ({ t: c.t, y: line ? c.level : c.y }));
    } else if (it.do === "bracket") {
      Object.assign(out, { from: it.from, to: it.to, tint: it.layers.includes(accent) });
    } else if (it.do === "reference") out.value = it.value;
    if (captionOf.has(it.k)) out.caption = captionOf.get(it.k);
    else if (it.do === "bracket") {
      const t = text ?? (it.ofWhole ? `${F(it.sum)} · ${it.share.toFixed(1)} %` : F(it.sum));
      const w = word(t, annot);
      const cx = (Xfull(it.from) + Xfull(it.to)) / 2;
      out.note = { ...w, x: Math.max(plot.left, Math.min(plot.right - wide(w.width), cx - wide(w.width) / 2)), y: plot.top + annot.lead * 1.2 };
      placedNotes.push({ x: out.note.x, y: out.note.y, width: wide(w.width) });
    } else if (it.do === "reference" && text) {
      const w = word(text, annot);
      out.note = { ...w, x: plot.left + gap, y: Y(it.value) - gap };
      placedNotes.push({ x: out.note.x, y: out.note.y, width: wide(w.width) });
    } else if (text) {
      if (it.kind === "level") {
        // A rewound level's words sit under the lower of its two readings, clear of the level and the gap tick.
        const low = Y(out.a.y) > Y(out.b.y) ? out.a : out.b;
        const n = noteBeside(text, Xfull(out.a.t), Y(low.y) + annot.lead * 1.3);
        out.note = { ...n, dy: n.dy + (Y(low.y) - Y(out.a.y)) + annot.lead * 1.3 };
      } else {
        const anchor = out.at ?? (it.kind === "copy" ? { t: it.a.t, y: it.a.y0 } : out.a) ?? out.points?.[0];
        if (anchor) out.note = noteBeside(text, Xfull(anchor.t), Y(anchor.y));
      }
    }
    return out;
  }

  const scheduled = scheduleTimeVideo({ items, accent, series: model.series, t0: model.t0, t1: model.t1 });
  assertEventStates(scheduled.states, [...EVENTS]);
  const traced = new Set(items.filter((it) => it.do === "trace").flatMap((it) => it.traced ?? []));

  const keys = model.times.map((t) => [t, model.keyOf.get(t)]);
  const keyWidths = Object.fromEntries(keys.map(([, key]) => [applyCase(key, value.transform), widthOf(applyCase(key, value.transform), value)]));

  const { ground } = direction;
  const { ink, muted, grid } = deriveFurniture(ground);
  const walked = (c, floor, what) => {
    const w = adjustToContrast(c, ground, floor);
    if (!w) throw new Error(`${what} has no variant that reads at ${floor}:1 on ${ground}`);
    return w;
  };
  const colours = {
    ground,
    grid,
    neutral: walked(mix(ground, ink, 0.42), NON_TEXT_CONTRAST_MIN, "a series"),
    neutralLight: mix(ground, ink, 0.24),
    accent: walked(direction.accent, NON_TEXT_CONTRAST_MIN, "the accent series"),
    accentTint: mix(ground, direction.accent, 0.45),
    faded: mix(ground, ink, 0.14),
    ring: walked(mix(ground, ink, 0.8), NON_TEXT_CONTRAST_MIN, "a ring"),
    rule: walked(muted, NON_TEXT_CONTRAST_MIN, "a rule"),
    base: mix(ground, ink, 0.5),
    text: {
      eyebrow: walked(registers.eyebrow.fill ?? direction.accent, TEXT_CONTRAST_MIN, "the eyebrow"),
      title: walked(registers.display.fill ?? ink, TEXT_CONTRAST_MIN, "the title"),
      name: walked(ink, TEXT_CONTRAST_MIN, "a name"),
      axis: walked(muted, TEXT_CONTRAST_MIN, "a muted word"),
      accent: walked(direction.accent, TEXT_CONTRAST_MIN, "an accented word"),
    },
  };

  const props = {
    frame: stage,
    variant,
    single: model.stacked && model.series.length === 1,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, value, axis, annot, source: sourceRegister },
    titleCard,
    credit: { ...creditBlock, at: creditAt },
    colours,
    plot,
    domain: model.domain,
    t0: model.t0,
    t1: model.t1,
    zoomSpan: zoom ? zoom.window[1] - zoom.window[0] : undefined,
    accent,
    series: model.series.map((s) => ({
      name: s,
      traced: traced.has(s),
      pts: model.geometry.get(s).map((p) => [p.t, Number.isFinite(p.y0) ? p.y0 : 0, Number.isFinite(p.y1) ? p.y1 : 0, p.gap ? 1 : 0]),
    })),
    labels: labelled.map((e) => ({ series: model.series.indexOf(e.s), text: e.text, width: e.width, x: plot.right + gap, y: e.y })),
    yTicks,
    xTicks,
    unit: unit ? { ...unit, x: variant === "streamgraph" || !yTicks.length ? plot.left : content.left, y: unitY } : null,
    gaps: model.gaps.map((gp) => ({ series: gp.series === null ? -1 : model.series.indexOf(gp.series), from: gp.from, to: gp.to, bridged: gp.bridged })),
    gapLabel: model.gaps.length ? word(copy.gapLabel ?? model.gapLabel, axis) : null,
    items: propsItems,
    captions,
    keys,
    keyWidths,
    plan: scheduled.plan,
    states: scheduled.states,
    windows: scheduled.windows,
    linear: scheduled.linear,
    strokes: { series: (direction.stroke?.series ?? 2.5) * k * 1.2, other: 1.4 * k, rule: (direction.stroke?.rule ?? 1) * k * 1.4, grid: (direction.stroke?.hairline ?? 0.6) * k },
    dash: [0.2 * axis.lead, 0.14 * axis.lead],
    halo: { value: haloOf(value, k), axis: haloOf(axis, k), annot: haloOf(annot, k) },
    gap,
    timing,
  };
  return { id, direction, props, report: { series: model.series.length, readings: model.marks.length, titleLines: titleCard.title.length, captions: captions.length } };
}
