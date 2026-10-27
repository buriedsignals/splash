// EVERYTHING ONE PAIRED GESTURE VIDEO IS HANDED, BUILT IN BUN — the keys the frame has room for, every word measured
// (names, figures, the legend, every gesture's note, every figure a bracket climbs through), the colours, and the six
// event states the paired video scheduler (`./gesture-paired-video.mjs`) places the three gestures in. Identical in the
// five paired video kits; the variant is the runner's.
//
// THE LAYOUT ADAPTS; IT NEVER REFUSES THE DATA'S SHAPE (craft/gestures/GRAMMAR.md §7.1): many keys — the frame draws
// as many as its row pitch holds, every key a gesture acts on always among them, the rest stated in one line under
// the rows; the pyramid keeps every band and prints only the band names that do not touch; negative values grow left
// of the zero with their figure before the tip; a missing value is a gap (no mark, "n/a" beside the band). Every
// gesture's words sit on caption lines above the plot, so no note is ever drawn through a mark.
//
// Runs in Bun only.
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { adjustToContrast, mix, NON_TEXT_CONTRAST_MIN, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { frameInsetFor, sizeFor } from "#shared/chart-video/sizes.mjs";
import { EYEBROW_TO_DISPLAY, registerOf } from "#shared/design-base/register.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { skillScriptFrom } from "#shared/design-base/skill-script.mjs";
import { domainOf, keysToDraw, layoutPaired, SERIES_TONE } from "./gesture-family-paired.mjs";
import { countedTexts, EVENTS, schedulePairedVideo, valueText } from "./gesture-paired-video.mjs";
import { GESTURE_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const chartVideo = (...parts) => skillScriptFrom(HERE, "chart-video", "scripts", ...parts);
const { applyCase } = await import(chartVideo("registers.mjs"));
const { BAND_PROBE, bandOf, cardTextFor, CREDIT_MAX_LINES, CREDIT_ONE_LINE, DRAWN_WIDER, haloOf, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf, wrap } = await import(chartVideo("shots.mjs"));
const { videoRegistersOf } = await import(chartVideo("video-registers.mjs"));
const { assertEventStates } = await import(chartVideo("choreography.mjs"));

export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const LABEL_GAP = 0.4;
const PITCH_MAX = 2.6;
const NA = "n/a";

const band = (r) => {
  const b = bandOf(BAND_PROBE, r);
  return { ascent: b.ascent, descent: b.descent, height: b.ascent + b.descent };
};

/** The words every register will draw, for resolving the direction's families against this beat's own text. */
export function textPerRegisterOf(copy, keys, gestures) {
  const notes = gestures.map((g) => g?.note).filter(Boolean);
  const values = keys.flatMap((k) => k.values ?? [k.value]).filter((v) => Number.isFinite(v));
  return {
    display: copy.title,
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: [...notes, copy.unitWord, ...copy.series].filter(Boolean).join(" ") || keys.map((k) => k.name).join(" "),
    value: `${values.map((v) => valueText(v, copy.format)).join(" ")} 0123456789${copy.format.decimal}${copy.format.group}`,
    axis: `${keys.map((k) => k.name).join(" ")} ${copy.source.join(" ")} ${copy.scope(keys.length, keys.length)}`,
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
 * @param variant   the paired type
 * @param chosen    the run's direction, unresolved (video.mjs `pickDirection`)
 * @param keys      every key of beat.mjs, in its order: [{ name, values }]
 * @param marks     every mark (marksOf)
 * @param series    the series names
 * @param gestures  validateGestures' `gestures`
 * @param copy      { eyebrow, title, source: forms, unitWord, format, scope(shown, all), series }
 * @param size      landscape | square | portrait
 */
export function buildPairedVideo({ id, variant, chosen, keys: allKeys, marks: allMarks, series, gestures, claim, copy, size, ceiling }) {
  const direction = resolveDirectionFamilies(chosen, textPerRegisterOf(copy, allKeys, gestures));
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
  const wide = (w) => w * (1 + DRAWN_WIDER);
  const bAxis = band(axis);
  const bValue = band(value);
  const bAnnot = band(annot);
  const pyramid = variant === "population-pyramid";
  const two = series.length === 2;
  const F = (v) => valueText(v, copy.format);
  const word = (text, r) => {
    const t = applyCase(text, r.transform);
    return { text: t, width: widthOf(t, r) };
  };

  const titleCard = titleCardOf({ registers, eyebrow: copy.eyebrow, title: copy.title, size });
  const { register: sourceRegister, ...creditBlock } = creditOf({ registers, forms: copy.source, size, k });
  const creditAt = { x: inset, y: stage.height - vInset - creditBlock.height };

  // ── which keys the frame holds: every key a gesture acts on, then the extremes of the order
  const byName = new Map(allMarks.map((m) => [m.name, m]));
  const keep = [...new Set(gestures.flatMap((g) => g.marks.map((n) => byName.get(n)?.key)).filter(Boolean))];
  const perMark = variant === "grouped-bar" || variant === "lollipop";
  const rowNeed = pyramid ? 4 : perMark ? 2 * bValue.height * 1.05 : Math.max(bAxis.height, bValue.height) + gap * 0.5;

  // ── the legend (series names and unit) and every gesture's words, on caption lines above the plot
  const captionLead = Math.max(annot.lead, value.lead);
  const legend = [];
  if (copy.unitWord) legend.push({ kind: "unit", ...word(copy.unitWord, annot) });
  if (two && !pyramid) series.forEach((s, j) => legend.push({ kind: "series", j, ...word(s, annot) }));
  const swatch = annot.fontSize * 0.9;
  const legendRows = legend.length ? 1 : 0;

  function attempt(drawnKeys) {
    const keySet = new Set(drawnKeys);
    const keys = allKeys.filter((kk) => keySet.has(kk.name));
    const marks = allMarks.filter((m) => keySet.has(m.key));
    const scheduled = schedulePairedVideo({ gestures, keys, marks, series, variant, claim, format: F });
    const captions = [];
    scheduled.plan.forEach((p) => {
      // A name or annotate without words writes its marks' values — here as "Key : First 1, Second 2", never with an
      // arrow (the video faces carry no "→", and a pyramid's two sides are not a before and an after).
      if (["name", "annotate"].includes(p.do) && (gestures[p.index].note === undefined || !String(gestures[p.index].note).trim())) {
        const ms = p.marks.map((n) => byName.get(n)).filter(Boolean);
        p.note = ms.length === 2 && ms[0].key === ms[1].key
          ? `${ms[0].key}${copy.colon ?? ": "}${series[ms[0].j]} ${F(ms[0].value)}, ${series[ms[1].j]} ${F(ms[1].value)}`
          : ms.map((m) => `${m.name} ${F(m.value)}`).join(", ");
      }
      if (!p.note || p.do === "bracket") return;
      // A note that does not name its subject's key is prefixed with it: a caption line has no row to stand on.
      const lead = p.onto ? byName.get(p.onto)?.key : p.keys.length === 1 ? p.keys[0] : null;
      const lonely = lead && !p.note.includes(lead) ? `${lead}${copy.colon ?? ": "}${p.note}` : p.note;
      const lines = wrap(applyCase(lonely, annot.transform), annot, content.width / (1 + DRAWN_WIDER));
      captions.push({ item: p.index, lines, rows: lines.length });
    });
    let y = vInset + legendRows * captionLead;
    for (const c of captions) {
      c.y = y + bAnnot.ascent;
      y += c.rows * captionLead;
    }
    const legendY = vInset + bAnnot.ascent;
    const headerRows = pyramid && two ? captionLead : 0;
    const plotTop = y + gap + headerRows;
    const rest = allKeys.length - keys.length;
    const plotBottom = creditAt.y - gap - (rest ? bAxis.height + gap : 0);
    return { keys, marks, scheduled, captions, legendY, plotTop, plotBottom, rest };
  }

  let drawn = allKeys.map((kk) => kk.name);
  let built = attempt(drawn);
  const capacity = Math.max(1, Math.floor((built.plotBottom - built.plotTop) / rowNeed));
  if (drawn.length > capacity) {
    drawn = keysToDraw({ variant, order: drawn, keep, capacity: Math.max(capacity, keep.length) });
    built = attempt(drawn);
  }
  const { keys, marks, scheduled, captions, legendY, plotTop, plotBottom, rest } = built;
  assertEventStates(scheduled.states, [...EVENTS]);

  // ── names and figures
  const names = keys.map((kk) => ({ key: kk.name, ...word(kk.name, axis) }));
  const nameW = Math.max(...names.map((nm) => wide(nm.width)));
  // The pyramid's bands are too many to print every figure: only the marks a name, annotate or compare points at.
  const labelled = new Set(pyramid ? scheduled.plan.filter((p) => ["name", "annotate", "compare"].includes(p.do)).flatMap((p) => p.marks) : marks.map((m) => m.name));
  if (variant === "bullet") for (const m of marks) if (m.j === 0) labelled.delete(m.name);
  // A signed value says its sign: a rise is "+0,03", never a bare "0,03" beside "-0,52".
  const signed = (v) => (variant === "diverging-bar" && v > 0 ? `+${F(v)}` : F(v));
  const figures = marks.map((m) => ({ mark: m.name, ...word(signed(m.value), value) }));
  const figW = Math.max(0, ...figures.filter((x) => labelled.has(x.mark)).map((x) => wide(x.width)));
  const negW = Math.max(0, ...figures.filter((x) => labelled.has(x.mark) && byName.get(x.mark).value < 0).map((x) => wide(x.width)));
  const gaps = keys.filter((kk) => kk.values.some((v) => v === null)).map((kk) => kk.name);
  const naW = gaps.length ? wide(word(NA, value).width) : 0;

  // the bracket's figures: every text its count climbs through, and its note
  const climbing = countedTexts(scheduled.plan, copy.format);
  const bracketLabels = scheduled.plan
    .filter((p) => p.do === "bracket")
    .map((p) => {
      const note = p.note ? word(p.note, annot) : null;
      return { item: p.index, note, width: Math.max(...climbing.map((t) => wide(widthOf(t, value))), note ? wide(note.width) : 0) };
    });
  const bracketReserve = bracketLabels.length ? gap * 3 + Math.max(...bracketLabels.map((b) => b.width)) : 0;

  let plot;
  let nameX;
  let spine = 0;
  if (pyramid) {
    spine = nameW + 2 * gap;
    const reserve = figW + gap;
    plot = { x: content.left + reserve, y: plotTop, width: content.width - 2 * reserve - bracketReserve, height: plotBottom - plotTop, gutter: spine };
  } else {
    nameX = content.left;
    const left = content.left + nameW + gap + (negW ? negW + gap : 0);
    const right = content.right - Math.max(figW, naW) - gap - bracketReserve;
    plot = { x: left, y: plotTop, width: right - left, height: plotBottom - plotTop };
  }
  const pitch = plot.height / keys.length;
  if (!pyramid && pitch > PITCH_MAX * rowNeed) {
    const h = PITCH_MAX * rowNeed * keys.length;
    plot = { ...plot, height: h };
  }
  const domain = domainOf({ variant, marks, states: scheduled.pictures, ceiling });
  const geo = layoutPaired({ variant, keys: keys.map((kk) => kk.name), marks, series, state: { order: keys.map((kk) => kk.name) }, frame: plot, domain });

  // pyramid: band names that do not touch, the gestured ones first
  const namePrinted = new Set(keys.map((kk) => kk.name));
  if (pyramid && geo.pitch < bAxis.height + gap * 0.3) {
    namePrinted.clear();
    const order = [...new Set([...scheduled.plan.flatMap((p) => p.keys), ...keys.map((kk) => kk.name)])];
    const taken = [];
    for (const name of order) {
      const i = keys.findIndex((kk) => kk.name === name);
      if (i >= 0 && taken.every((j) => Math.abs(j - i) * geo.pitch >= bAxis.height + gap * 0.3)) {
        namePrinted.add(name);
        taken.push(i);
      }
    }
  }

  const { ground, accent } = direction;
  const { ink, muted, grid } = deriveFurniture(ground);
  const walked = (c, floor, what) => {
    const w = adjustToContrast(c, ground, floor);
    if (!w) throw new Error(`${what} has no variant that reads at ${floor}:1 on ${ground}`);
    return w;
  };
  const tones = SERIES_TONE[variant];
  // Every mark is held to the non-text floor; the paler series is walked from a lighter mix so the two stay apart.
  const neutral = tones.map((t, j) => walked(mix(ground, ink, 0.25 + 0.4 * t), NON_TEXT_CONTRAST_MIN, `series ${j + 1}`));
  const accented = tones.map((t, j) => walked(t >= 1 ? accent : mix(ground, accent, 0.55), NON_TEXT_CONTRAST_MIN, `series ${j + 1} in the accent`));
  const colours = {
    ground,
    grid,
    neutral,
    accented,
    copy: walked(mix(ink, ground, 0.35), NON_TEXT_CONTRAST_MIN, "a compare's copy"),
    faded: mix(ground, ink, 0.12),
    track: mix(ground, ink, 0.08),
    rule: walked(muted, NON_TEXT_CONTRAST_MIN, "a reference rule"),
    ring: walked(ink, NON_TEXT_CONTRAST_MIN, "a ring"),
    text: {
      eyebrow: walked(registers.eyebrow.fill ?? accent, TEXT_CONTRAST_MIN, "the eyebrow"),
      title: walked(registers.display.fill ?? ink, TEXT_CONTRAST_MIN, "the title"),
      name: walked(ink, TEXT_CONTRAST_MIN, "a name"),
      axis: walked(muted, TEXT_CONTRAST_MIN, "a muted word"),
      first: walked(accent, TEXT_CONTRAST_MIN, "a highlighted word"),
      count: walked(ink, TEXT_CONTRAST_MIN, "a figure"),
    },
  };

  // legend positions (one line), and the pyramid's half headers
  let lx = content.left;
  const legendLine = legend.map((l) => {
    const at = { ...l, x: l.kind === "series" ? lx + swatch + gap * 0.5 : lx, y: legendY, swatch: l.kind === "series" ? { x: lx, y: legendY - swatch * 0.8, size: swatch } : null };
    lx = at.x + wide(l.width) + gap * 2;
    return at;
  });
  const headers = pyramid && two
    ? series.map((s, j) => {
        const w = word(s, annot);
        return { ...w, j, x: j === 0 ? geo.spine[0] - gap - wide(w.width) : geo.spine[1] + gap, y: plotTop - gap - bAnnot.descent };
      })
    : [];
  const unitLine = null;

  const scope = rest ? { ...word(copy.scope(keys.length, allKeys.length), axis), x: content.left, y: plotBottom + gap + bAxis.ascent } : null;
  const countWidths = Object.fromEntries(climbing.map((t) => [t, widthOf(t, value)]));

  const props = {
    variant,
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, value, axis, annot, source: sourceRegister },
    titleCard,
    credit: { ...creditBlock, at: creditAt },
    colours,
    layout: {
      plot,
      domain,
      content,
      gap,
      nameX,
      nameW,
      spine: geo.spine,
      countShift: (bValue.ascent - bValue.descent) / 2,
      nameShift: (bAxis.ascent - bAxis.descent) / 2,
      captionLead,
      bracketX: plot.x + plot.width + Math.max(figW, naW) + gap * 2,
      ceiling: variant === "bullet" ? domain[1] : null,
    },
    keys: keys.map((kk) => ({ name: kk.name, gap: kk.values.some((v) => v === null) })),
    names: names.map((nm) => ({ ...nm, printed: namePrinted.has(nm.key) })),
    na: gaps.length ? word(NA, value) : null,
    marks,
    series,
    figures: figures.map((x) => ({ ...x, labelled: labelled.has(x.mark), by: pyramid ? scheduled.plan.filter((p) => ["name", "annotate", "compare"].includes(p.do) && p.marks.includes(x.mark)).map((p) => p.index) : null })),
    legend: legendLine,
    headers,
    unitLine,
    captions,
    bracketLabels,
    scope,
    plan: scheduled.plan,
    hasReveal: gestures.some((g) => g.do === "reveal"),
    states: scheduled.states,
    windows: scheduled.windows,
    linear: scheduled.linear,
    unit: "",
    format: copy.format,
    countWidths,
    strokes: { rule: (direction.stroke?.rule ?? 1) * k * 1.4, grid: (direction.stroke?.hairline ?? 0.6) * k, stem: Math.max(2, (direction.stroke?.series ?? 2.5) * k) },
    dash: [0.2 * axis.lead, 0.14 * axis.lead],
    halo: { value: haloOf(value, k), axis: haloOf(axis, k), annot: haloOf(annot, k) },
    timing: GESTURE_VIDEO_TIMING,
  };
  return {
    id,
    direction,
    props,
    report: { drawn: keys.length, of: allKeys.length, pitch: geo.pitch.toFixed(1), span: Math.round(plot.width), titleLines: titleCard.title.length, captions: captions.length },
  };
}
