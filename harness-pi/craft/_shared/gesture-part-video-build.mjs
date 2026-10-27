// EVERYTHING ONE PART-TO-WHOLE GESTURE VIDEO IS HANDED, BUILT IN BUN — the parts the frame has room for laid out once
// (squarified tiles, marimekko columns or donut arcs: gesture-family-part.mjs), every word measured (each part's value
// and name where they fit, a donut's outside labels, a marimekko's column names and key, every caption and every
// figure a count or bracket climbs through), the colours, and the six event states (./gesture-part-video.mjs).
//
// THE LAYOUT ADAPTS; IT NEVER REFUSES THE DATA'S SHAPE (GRAMMAR.md §7.1): what the frame has no room for is folded
// into one remainder part carrying its own figure; a part too small for its words carries none (the gestures' words
// are on caption lines above the plot). Its refusals are the words' (a title or a credit no card or line holds), and
// the scheduler's gesture refusals. Runs in Bun only. Mirrors video/bar-and-column.gestures/build.mjs.
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { adjustToContrast, contrast, mix, NON_TEXT_CONTRAST_MIN, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { frameInsetFor, sizeFor } from "#shared/chart-video/sizes.mjs";
import { EYEBROW_TO_DISPLAY, registerOf } from "#shared/design-base/register.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { skillScriptFrom } from "#shared/design-base/skill-script.mjs";
import { anchorOf, layoutPart, REST, restName, shareText } from "./gesture-family-part.mjs";
import { climbingTexts, EVENTS, schedulePartVideo } from "./gesture-part-video.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const chartVideo = (...parts) => skillScriptFrom(HERE, "chart-video", "scripts", ...parts);
const { applyCase } = await import(chartVideo("registers.mjs"));
const { BAND_PROBE, bandOf, cardTextFor, CREDIT_MAX_LINES, CREDIT_ONE_LINE, DRAWN_WIDER, haloOf, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf, wrap } = await import(chartVideo("shots.mjs"));
const { videoRegistersOf } = await import(chartVideo("video-registers.mjs"));
const { assertEventStates } = await import(chartVideo("choreography.mjs"));

export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
/** Parts drawn beside the ones the gestures name, before the rest is folded into one remainder. */
const EXTRA = { treemap: 8, "pie-and-donut": 5, "marimekko-mosaic-plot": 10 };

const band = (r) => {
  const b = bandOf(BAND_PROBE, r);
  return { ascent: b.ascent, descent: b.descent, height: b.ascent + b.descent };
};

/** The words every register will draw, for resolving the direction's families against this beat's own text. */
export function textPerRegisterOf(copy, marks, gestures) {
  const notes = gestures.map((g) => g?.note).filter(Boolean);
  return {
    display: copy.title,
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: `${notes.join(" ")} ${marks.map((m) => m.series ?? m.name).join(" ")} ${copy.restLabel}`,
    value: `${marks.map((m) => copy.format(m.value)).join(" ")} 0123456789 % · /`,
    axis: `${marks.map((m) => m.key ?? "").join(" ")} ${copy.source.join(" ")} ${copy.unit}`,
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
 * @param chosen   the run's direction, unresolved (video.mjs `pickDirection`)
 * @param variant  treemap | marimekko-mosaic-plot | pie-and-donut
 * @param marks    every mark
 * @param gestures validatePart's `valid`
 * @param copy     { eyebrow, title, source: forms, unit, restLabel, format(v) }
 * @param size     landscape | square | portrait
 */
export function buildPartVideo({ id, chosen, variant, marks, gestures, copy, size }) {
  const direction = resolveDirectionFamilies(chosen, textPerRegisterOf(copy, marks, gestures));
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
  const word = (text, r) => {
    const t = applyCase(String(text), r.transform);
    return { text: t, width: widthOf(t, r) };
  };

  const titleCard = titleCardOf({ registers, eyebrow: copy.eyebrow, title: copy.title, size });
  const { register: sourceRegister, ...creditBlock } = creditOf({ registers, forms: copy.source, size, k });
  const creditAt = { x: inset, y: stage.height - vInset - creditBlock.height };

  // ── the schedule (it also chooses the parts drawn: every named one, then the largest)
  const named = new Set(gestures.flatMap((g) => g.marks));
  const namedCount = variant === "marimekko-mosaic-plot" ? new Set(marks.filter((m) => named.has(m.name)).map((m) => m.key)).size : named.size;
  const scheduled = schedulePartVideo({ variant, gestures, marks, capacity: namedCount + EXTRA[variant] });
  assertEventStates(scheduled.states, [...EVENTS]);
  const { parts, rest, groups, plan, whole } = scheduled;
  const valueOf = new Map(marks.map((m) => [m.name, m.value]));

  // ── caption lines above the plot: the unit and the whole, then each gesture's words (its note, else its figure)
  const captionLead = Math.max(annot.lead, value.lead);
  const derived = (p) =>
    p.do === "bracket"
      ? `${copy.format(p.steps.at(-1))} · ${shareText(copy.format, p.share)}`
      : p.do === "compare"
        ? `${copy.format(valueOf.get(p.onto))} / ${copy.format(p.value)}`
        : p.do === "count"
          ? copy.format(p.steps.at(-1))
          : p.marks.length === 1 && ["highlight", "name", "annotate", "filter"].includes(p.do)
            ? `${p.marks[0]}: ${copy.format(valueOf.get(p.marks[0]))} · ${shareText(copy.format, valueOf.get(p.marks[0]) / whole)}`
            : "";
  const unitLine = { ...word(`${copy.unit} · ${copy.format(whole)}`, axis), x: content.left, y: vInset + bAxis.ascent };
  let y = vInset + bAxis.height + gap;
  const captions = [];
  for (const p of plan) {
    const text = p.note ?? derived(p);
    if (!text) continue;
    const lines = wrap(applyCase(text, annot.transform), annot, content.width / (1 + DRAWN_WIDER));
    if (p.steps && (p.do === "count" || p.do === "bracket")) p.stepTexts = p.steps.map((v) => copy.format(v));
    const cy = y + Math.max(bAnnot.ascent, bValue.ascent);
    captions.push({ item: p.index, kind: p.do, lines: lines.map((l, j) => ({ ...l, x: content.left, y: cy + j * captionLead })), y: cy });
    y += Math.max(1, lines.length) * captionLead;
  }
  const plotTop = y + gap;
  const plotBottom = creditAt.y - gap * 2;

  // ── the plot box, by variant
  const partName = (p) => (p.rest ? (variant === "marimekko-mosaic-plot" ? p.series : restName(copy.restLabel, rest)) : variant === "marimekko-mosaic-plot" ? p.series : p.name);
  const series = [...new Set(parts.map((p) => p.series).filter(Boolean))];
  let box;
  if (variant === "pie-and-donut") {
    const widest = Math.max(0, ...parts.map((p) => Math.max(wide(word(partName(p), annot).width), wide(word(copy.format(p.value), value).width))));
    const r = Math.max(40, Math.min((plotBottom - plotTop) / 2, (content.width - 2 * (widest + gap * 4)) / 2));
    const cy = (plotTop + plotBottom) / 2;
    box = { x: stage.width / 2 - r, y: cy - r, w: 2 * r, h: 2 * r };
  } else if (variant === "marimekko-mosaic-plot") {
    const keyW = Math.max(0, ...series.map((s) => wide(word(s, annot).width))) + gap * 3;
    box = { x: content.left, y: plotTop, w: content.width - keyW, h: plotBottom - plotTop - 2 * (bAxis.height + gap) - gap };
  } else box = { x: content.left, y: plotTop, w: content.width, h: plotBottom - plotTop };
  const shapes = layoutPart({ variant, parts, box, groups });

  // ── each part's words: inside its shape where they fit (a tile, a band), outside the ring for a donut
  const rank = [...parts.keys()].sort((a, b) => parts[b].value - parts[a].value);
  const drawnParts = parts.map((p, i) => {
    const s = shapes.get(p.name);
    const v = word(copy.format(p.value), value);
    const nm = word(partName(p), annot);
    const base = { name: p.name, value: p.value, rank: rank.indexOf(i), shape: s, rest: !!p.rest, labels: [] };
    if (!s || !(p.value > 0)) return base;
    if (s.kind === "rect") {
      const pad = gap * 0.6;
      const fitsV = wide(v.width) <= s.w - 2 * pad && bValue.height <= s.h - 2 * pad;
      const fitsN = fitsV && wide(nm.width) <= s.w - 2 * pad && bValue.height + bAnnot.height <= s.h - 2 * pad;
      if (fitsV) base.labels.push({ ...v, x: s.x + pad, y: s.y + pad + bValue.ascent, register: "value" });
      if (fitsN) base.labels.push({ ...nm, x: s.x + pad, y: s.y + pad + bValue.height + bAnnot.ascent, register: "annot", quiet: true });
    }
    return base;
  });
  const leaders = [];
  if (variant === "pie-and-donut") {
    const lineH = bValue.height + bAnnot.height + gap * 0.3;
    for (const side of ["left", "right"]) {
      const list = drawnParts
        .map((d, i) => ({ d, i, a: anchorOf(d.shape) }))
        .filter(({ d, a }) => d.shape && d.value > 0 && (Math.sin(a.angle) >= 0) === (side === "right") && ((d.shape.a1 - d.shape.a0) * d.shape.r1 >= lineH * 0.5 || named.has(d.name)))
        .sort((x, z) => x.a.outer.y - z.a.outer.y);
      let top = plotTop;
      for (const l of list) {
        l.y = Math.max(l.a.outer.y - lineH / 2, top);
        top = l.y + lineH;
      }
      let bottom = plotBottom;
      for (let j = list.length - 1; j >= 0; j--) {
        list[j].y = Math.min(list[j].y, bottom - lineH);
        bottom = list[j].y;
      }
      for (const l of list) {
        const r1 = l.d.shape.r1;
        const x = l.d.shape.cx + (side === "right" ? 1 : -1) * (r1 + gap * 3);
        const v = word(copy.format(l.d.value), value);
        const nm = word(partName(parts[l.i]), annot);
        const align = (w) => (side === "right" ? x : x - wide(w));
        l.d.labels.push({ ...v, x: align(v.width), y: l.y + bValue.ascent, register: "value", outside: true });
        l.d.labels.push({ ...nm, x: align(nm.width), y: l.y + bValue.height + bAnnot.ascent, register: "annot", quiet: true, outside: true });
        leaders.push({ part: l.i, x1: l.a.outer.x, y1: l.a.outer.y, x2: x + (side === "right" ? -gap : gap), y2: l.y + bValue.height / 2 });
      }
    }
  }
  const columns = [];
  const keys = [];
  if (variant === "marimekko-mosaic-plot") {
    // Column names under their columns, on the first of two staggered rows where they overlap no other.
    const placed = [[], []];
    const keysOrder = [...new Set(parts.map((p) => p.key))];
    for (const key of keysOrder) {
      const cell = drawnParts.find((d) => parts.find((p) => p.name === d.name)?.key === key)?.shape;
      if (!cell) continue;
      const nm = word(key === REST ? restName(copy.restLabel, rest) : key, axis);
      const span = [cell.x, cell.x + wide(nm.width)];
      const rowAt = placed.findIndex((list) => !list.some(([a, b]) => span[0] < b + gap && a < span[1] + gap));
      if (rowAt < 0) continue;
      placed[rowAt].push(span);
      columns.push({ ...nm, x: cell.x, y: box.y + box.h + gap + bAxis.ascent + rowAt * (bAxis.height + gap * 0.5) });
    }
    const last = keysOrder.at(-1);
    const keyed = series
      .map((s) => {
        const d = drawnParts.find((x) => parts.find((p) => p.name === x.name && p.key === last && p.series === s));
        return d?.shape ? { s, y: d.shape.y + d.shape.h / 2, from: { x: d.shape.x + d.shape.w, y: d.shape.y + d.shape.h / 2 } } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.y - b.y);
    let top = box.y;
    for (const kk of keyed) {
      kk.y = Math.max(kk.y - bAnnot.height / 2, top);
      top = kk.y + bAnnot.height;
    }
    let bottom = box.y + box.h;
    for (let j = keyed.length - 1; j >= 0; j--) {
      keyed[j].y = Math.min(keyed[j].y, bottom - bAnnot.height);
      bottom = keyed[j].y;
    }
    for (const kk of keyed) {
      const nm = word(kk.s, annot);
      keys.push({ ...nm, x: box.x + box.w + gap * 2, y: kk.y + bAnnot.ascent, series: kk.s });
      leaders.push({ part: -1, x1: kk.from.x, y1: kk.from.y, x2: box.x + box.w + gap * 1.6, y2: kk.y + bAnnot.height / 2 });
    }
  }

  // ── each bracket's outline: a treemap block's one rect, a marimekko's member cells, a donut's band over its arcs
  const outlines = plan
    .filter((p) => p.do === "bracket")
    .map((p) => {
      const list = p.members.map((n) => shapes.get(n)).filter(Boolean);
      if (!list.length) return { item: p.index, kind: "rects", rects: [] };
      if (list[0].kind === "arc") return { item: p.index, kind: "arc", arc: { ...list[0], a0: Math.min(...list.map((s) => s.a0)), a1: Math.max(...list.map((s) => s.a1)), r0: list[0].r1 + gap * 0.4, r1: list[0].r1 + gap * 0.8 } };
      if (variant === "treemap" && list.length > 1) {
        const x0 = Math.min(...list.map((s) => s.x));
        const y0 = Math.min(...list.map((s) => s.y));
        const x1 = Math.max(...list.map((s) => s.x + s.w));
        const y1 = Math.max(...list.map((s) => s.y + s.h));
        return { item: p.index, kind: "rects", rects: [{ x: x0, y: y0, w: x1 - x0, h: y1 - y0 }] };
      }
      return { item: p.index, kind: "rects", rects: list.map((s) => ({ x: s.x, y: s.y, w: s.w, h: s.h })) };
    });

  const { ground, accent } = direction;
  const { ink, muted, grid } = deriveFurniture(ground);
  const walked = (c, floor, what) => {
    const w = adjustToContrast(c, ground, floor);
    if (!w) throw new Error(`${what} has no variant that reads at ${floor}:1 on ${ground}`);
    return w;
  };
  const accentFill = walked(accent, NON_TEXT_CONTRAST_MIN, "an accented part");
  const colours = {
    ground,
    grid,
    field: [mix(ground, ink, 0.1), mix(ground, ink, 0.17), mix(ground, ink, 0.24)],
    accent: accentFill,
    onAccent: contrast(ink, accentFill) >= contrast(ground, accentFill) ? ink : ground,
    ring: walked(ink, NON_TEXT_CONTRAST_MIN, "a ring"),
    text: {
      eyebrow: walked(registers.eyebrow.fill ?? accent, TEXT_CONTRAST_MIN, "the eyebrow"),
      title: walked(registers.display.fill ?? ink, TEXT_CONTRAST_MIN, "the title"),
      ink: walked(ink, TEXT_CONTRAST_MIN, "a value"),
      axis: walked(muted, TEXT_CONTRAST_MIN, "a muted word"),
      accent: walked(accent, TEXT_CONTRAST_MIN, "an accented word"),
    },
  };
  const fieldOf = (p) => (variant === "marimekko-mosaic-plot" ? colours.field[series.indexOf(p.series) % colours.field.length] : colours.field[0]);
  drawnParts.forEach((d, i) => (d.fill = fieldOf(parts[i])));

  const countWidths = Object.fromEntries(climbingTexts(plan).map((t) => [t, widthOf(applyCase(t, value.transform), value)]));
  return {
    id,
    direction,
    props: {
      variant,
      frame: stage,
      registers: { display: titleCard.register, eyebrow: registers.eyebrow, value, axis, annot, source: sourceRegister },
      titleCard,
      credit: { ...creditBlock, at: creditAt },
      colours,
      box,
      unitLine,
      parts: drawnParts,
      leaders,
      columns,
      keys,
      outlines,
      captions,
      plan,
      hasReveal: gestures.some((g) => g.do === "reveal"),
      states: scheduled.states,
      windows: scheduled.windows,
      linear: scheduled.linear,
      countWidths,
      strokes: { rule: (direction.stroke?.rule ?? 1) * k * 1.4, grid: (direction.stroke?.hairline ?? 0.6) * k },
      halo: { value: haloOf(value, k), axis: haloOf(axis, k), annot: haloOf(annot, k) },
    },
    report: { drawn: parts.length, of: marks.length, rest: rest.count, titleLines: titleCard.title.length, captions: captions.length },
  };
}
