// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the axes, every country's two seats and its
// arc, the names seated by measurement, the counters and the key, France's two moves, the colours and the states.
//
// Runs in Bun only.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { adjustToContrast, mix, NON_TEXT_CONTRAST_MIN, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { frameInsetFor, sizeFor } from "#shared/chart-video/sizes.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { EYEBROW_TO_DISPLAY, registerOf } from "#shared/design-base/register.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { applyCase } from "../../skills/chart-video/scripts/registers.mjs";
import { BAND_PROBE, bandOf, CREDIT_ONE_LINE, DRAWN_WIDER, haloOf, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf } from "../../skills/chart-video/scripts/shots.mjs";
import { videoRegistersOf } from "../../skills/chart-video/scripts/video-registers.mjs";
import { arcAt } from "../scrolly-connected-scatter-lowcarbon/scatter-layout.mjs";
import { seatOf } from "./scene.mjs";
import { statesFor } from "./states.mjs";
import { FROM, loadSubject, SUBJECT, TO } from "./subject.mjs";
import { CONNECTED_SCATTER_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
export const SIZE = "landscape";
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
const LABEL_GAP = 0.4;
/** How far past its first seat a name may be pushed, in the axis register's leads; past a short push it gets a leader. */
const PUSHES = [0, 0.25, 0.5, 1, 1.5, 2, 3, 4, 5.5, 7];
const LEADER_PAST = 0.4;
/** The close-up's x domain and its ticks: the scrolly's own. */
const CLOSE = 12;
const CLOSE_TICKS = [0, 3, 6, 9, 12];
const ANGLES = [0, 180, -90, 90, -45, -135, 45, 135, -22.5, 22.5, -157.5, 157.5, -67.5, -112.5, 67.5, 112.5];

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject) };
}

const one = (v) => Math.abs(v).toFixed(1).replace(".", ",");

export function copyOf(subject) {
  const n = subject.entities.length;
  return {
    eyebrow: `Énergie${NB}· Europe`,
    title: [`Tous plus propres chez eux, ${subject.lighter.length} plus légers en Europe`, "Plus propres chez eux, plus légers en Europe"],
    yName: `bas-carbone dans sa propre électricité, en${NB}%`,
    xName: `part du bas-carbone des ${n}${NB}pays, en${NB}%`,
    cleaner: (k) => `${k} sur ${n} plus propres`,
    lighter: (k) => `${k} plus légers`,
    years: [FROM, TO],
    across: `−${one(subject.moves.weight)}${NB}pts`,
    up: `+${one(subject.moves.ownMix)}${NB}pts`,
    source: ["Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data", "Source : Ember, Energy Institute, via Our World in Data", "Source : Ember, via Our World in Data"],
  };
}

export function textPerRegisterOf(copy, subject) {
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: "",
    value: `${copy.cleaner(16)} ${copy.lighter(5)} ${copy.across} ${copy.up} 0123456789`,
    axis: `${copy.yName} ${copy.xName} ${subject.entities.map((e) => `${e.name} ${e.code}`).join(" ")} 0 3 6 9 10 12 20 25 30 40 50 75 100 ${copy.years.join(" ")}`,
  };
}

const overlaps = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
const inside = (a, b) => a.x0 >= b.x0 && a.x1 <= b.x1 && a.y0 >= b.y0 && a.y1 <= b.y1;
const around = ([x, y], r) => ({ x0: x - r, y0: y - r, x1: x + r, y1: y + r });

/** Points along a segment, `step` apart. */
function along(a, b, step) {
  const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
  return Array.from({ length: n + 1 }, (_, i) => [a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n]);
}

export function buildDirection(id, { subject, states, copy }) {
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, `${id}.md`)), textPerRegisterOf(copy, subject));
  const resolved = Object.fromEntries(REGISTER_NAMES.map((name) => [name, registerOf(direction, name)]));
  const registers = videoRegistersOf(resolved, SIZE);
  const k = registers.axis.fontSize / resolved.axis.fontSize;
  const row = sizeFor(SIZE);
  const stage = { width: row.width, height: row.height };
  const inset = frameInsetFor(SIZE);
  const vInset = verticalInsetFor(SIZE);
  for (const [name, r] of Object.entries(registers)) if (!(r.fontSize >= row.minTypePx)) throw new Error(`register ${name} is ${r.fontSize}px, under the ${row.minTypePx}px floor`);
  const { axis, value } = registers;
  const measure = (t, r) => {
    const cased = applyCase(t, r.transform);
    return { text: cased, width: widthOf(cased, r) };
  };
  const gap = LABEL_GAP * axis.lead;
  const band = bandOf(BAND_PROBE, axis);
  const valueBand = bandOf(BAND_PROBE, value);
  const halo = haloOf(axis, k);
  const valueHalo = haloOf(value, k);

  const titleCard = titleCardFor({ registers, eyebrow: copy.eyebrow, title: copy.title, size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });
  // The credit shares the bottom row with the x axis name: one line, in the room the name leaves.
  const xNameRoom = measure(copy.xName, axis).width * (1 + DRAWN_WIDER) + 3 * LABEL_GAP * axis.lead;
  const { register: sourceRegister, ...credit } = sourceCreditFor({ registers, forms: copy.source, size: SIZE, k, ...CREDIT_ONE_LINE, measure: (stage.width - 2 * inset - xNameRoom) / (stage.width - 2 * inset) });
  const creditAt = { x: inset, y: stage.height - vInset - credit.height };

  // THE AXES. The x name sits right of the credit on the bottom row, the ticks above both, the y name over the plot.
  const xName = measure(copy.xName, axis);
  const xNameLine = { ...xName, x: stage.width - inset - xName.width * (1 + DRAWN_WIDER), y: stage.height - vInset - band.descent };
  if (!(creditAt.x + credit.width + 2 * gap < xNameLine.x)) throw new Error("the x axis name and the credit do not fit side by side on the bottom row");
  const tickBaseline = Math.min(creditAt.y, xNameLine.y - band.ascent) - gap - band.descent;
  const yTickValues = [0, 25, 50, 75, 100];
  const yTicks = yTickValues.map((v) => ({ v, ...measure(String(v), axis) }));
  const R = 4.2 * k;
  const plot = {
    left: inset + Math.max(...yTicks.map((t) => t.width)) * (1 + DRAWN_WIDER) + gap,
    right: stage.width - inset - R,
    top: vInset + band.ascent + band.descent + gap + band.ascent / 2,
    bottom: tickBaseline - band.ascent - gap,
  };
  const top = Math.max(...subject.entities.flatMap((e) => [e.from.weight, e.to.weight]));
  const xTickValues = [0, 10, 20, 30, 40].filter((t) => t <= top + 8);
  const domain = { whole: Math.max(top * 1.05, xTickValues[xTickValues.length - 1]), close: CLOSE };
  const crowd = subject.entities.filter((e) => Math.max(e.from.weight, e.to.weight) < CLOSE);
  const outside = subject.entities.filter((e) => !crowd.includes(e)).map((e) => e.code).sort();
  if (outside.join() !== "DEU,FRA") throw new Error(`the close-up leaves France and Germany out of the frame and holds every other country; it leaves out ${outside.join(", ")}`);
  const yOf = (v) => plot.bottom - (v / 100) * (plot.bottom - plot.top);
  const shift = (band.ascent - band.descent) / 2;
  const bowCap = 1.2 * axis.lead;
  const data = subject.entities.map((e) => ({ e, code: e.code, from: e.from.weight, to: e.to.weight, y0: yOf(e.from.ownMix), y1: yOf(e.to.ownMix) }));
  const layoutAt = (xMax) => data.map((d) => ({ ...d, ...seatOf(d, xMax, plot, bowCap), inView: Math.max(d.from, d.to) <= xMax }));

  const strokeReach = 2 * k;
  /** The marks a word must not cover at one scale: every ring, disc and arc in view. */
  const marksOf = (seats) => {
    const marks = [];
    for (const s of seats.filter((x) => x.inView)) {
      marks.push(around(s.p0, R + strokeReach), around(s.p1, R + strokeReach));
      for (let i = 1; i < 24; i++) marks.push(around(arcAt(s.p0, s.c, s.p1, i / 24).point, strokeReach));
    }
    return marks;
  };
  const whole = layoutAt(domain.whole);
  const closeUp = layoutAt(domain.close);
  const france = whole.find((s) => s.code === SUBJECT);

  // FRANCE'S TWO MOVES, at the whole scale: across from its ring to under its disc, then up to it.
  const corner = [france.p1[0], france.p0[1]];
  const across = measure(copy.across, value);
  const up = measure(copy.up, value);
  const legs = {
    from: france.p0,
    corner,
    to: france.p1,
    across: { ...across, x: (france.p0[0] + corner[0]) / 2 - across.width / 2, y: corner[1] + gap + valueBand.ascent },
    up: { ...up, x: corner[0] - gap - up.width * (1 + DRAWN_WIDER), y: (corner[1] + france.p1[1]) / 2 + (valueBand.ascent - valueBand.descent) / 2 },
  };
  const boxOfLine = (l, b, h) => ({ x0: l.x - h / 2, x1: l.x + l.width * (1 + DRAWN_WIDER) + h / 2, y0: l.y - b.ascent - h / 2, y1: l.y + b.descent + h / 2 });
  const wholeMarks = marksOf(whole);
  for (const p of [...along(legs.from, corner, R), ...along(corner, legs.to, R)]) wholeMarks.push(around(p, strokeReach));
  const closeMarks = marksOf(closeUp);
  const legWords = [boxOfLine(legs.across, valueBand, valueHalo), boxOfLine(legs.up, valueBand, valueHalo)];

  // THE PANEL: the two counters and the key, seated in the plot's first corner that covers no mark at either scale.
  const counterTexts = {
    cleaner: Object.fromEntries(Array.from({ length: data.length + 1 }, (_, i) => [String(i), measure(copy.cleaner(i), value)])),
    lighter: Object.fromEntries(Array.from({ length: subject.lighter.length + 1 }, (_, i) => [String(i), measure(copy.lighter(i), value)])),
  };
  const years = copy.years.map((y) => measure(y, axis));
  const glyph = 2 * R;
  const keyGap = gap / 2;
  const secondAt = glyph + keyGap + years[0].width * (1 + DRAWN_WIDER) + 2 * gap;
  const keyWidth = secondAt + glyph + keyGap + years[1].width;
  const counterWidth = Math.max(...[...Object.values(counterTexts.cleaner), ...Object.values(counterTexts.lighter)].map((t) => t.width));
  const panelW = Math.max(counterWidth, keyWidth) * (1 + DRAWN_WIDER) + valueHalo;
  const counterStep = valueBand.ascent + valueBand.descent + 0.4 * axis.lead;
  const panelH = valueHalo / 2 + valueBand.ascent + counterStep + valueBand.descent + 0.4 * axis.lead + band.ascent + band.descent + halo / 2;
  const corners = [
    { x: plot.right - panelW, y: plot.bottom - panelH },
    { x: plot.right - panelW, y: plot.top + (plot.bottom - plot.top) / 2 - panelH / 2 },
  ];
  const panelAt = corners.find((p) => {
    const box = { x0: p.x, y0: p.y, x1: p.x + panelW, y1: p.y + panelH };
    return ![...wholeMarks, ...closeMarks, ...legWords].some((m) => overlaps(box, m));
  });
  if (!panelAt) throw new Error("the counters and the key find no corner of the plot clear of every mark at both scales");
  const panelBox = { x0: panelAt.x, y0: panelAt.y, x1: panelAt.x + panelW, y1: panelAt.y + panelH };
  const firstBaseline = valueHalo / 2 + valueBand.ascent;
  const keyBaseline = firstBaseline + counterStep + valueBand.descent + 0.4 * axis.lead + band.ascent;
  const panel = {
    at: panelAt,
    cleaner: { x: valueHalo / 2, y: firstBaseline },
    lighter: { x: valueHalo / 2, y: firstBaseline + counterStep },
    key: {
      cy: keyBaseline - shift,
      ring: valueHalo / 2 + R,
      disc: valueHalo / 2 + secondAt + R,
      years: [
        { ...years[0], x: valueHalo / 2 + glyph + keyGap, y: keyBaseline },
        { ...years[1], x: valueHalo / 2 + secondAt + glyph + keyGap, y: keyBaseline },
      ],
    },
  };

  // THE NAMES, SEATED BY MEASUREMENT, once per scale. At the whole scale France comes first — its seat must hold at its
  // 2000 ring too, where it is named from the start — then the five, largest loss first, each sure to be named; the rest
  // take a seat beside their disc or stay unnamed. In the close-up every country in view is named: its name beside its
  // disc, then pushed with a leader, then its code.
  const lighterSet = new Set(subject.lighter);
  // A name stays inside the plot, or rises into the row above it clear of the y axis name.
  const yNameRight = plot.left + widthOf(applyCase(copy.yName, axis.transform), axis) * (1 + DRAWN_WIDER) + gap;
  const bounds = { x0: plot.left, y0: plot.top - band.ascent / 2, x1: stage.width - inset, y1: plot.bottom };
  const fits = (box) => inside(box, bounds) || (box.x0 > yNameRight && inside(box, { ...bounds, y0: vInset }));
  const near = PUSHES.filter((p) => p <= LEADER_PAST);
  const far = PUSHES.filter((p) => p > LEADER_PAST);
  const legLine = [...along(legs.from, corner, 2), ...along(corner, legs.to, 2)];
  const seatNames = (seats, marks, taken, triesOf, mustHold) => {
    const order = [...seats.filter((s) => s.inView)].sort((a, b) => {
      const rank = (s) => (s.code === SUBJECT ? 0 : lighterSet.has(s.code) ? 1 + subject.lighter.indexOf(s.code) : 10);
      return rank(a) - rank(b) || b.to - a.to;
    });
    const names = {};
    const leaders = [];
    for (const s of order) {
      let seated = null;
      for (const { text, push } of triesOf(s)) {
        const word = measure(text, axis);
        const w = word.width * (1 + DRAWN_WIDER) + halo;
        const h = band.ascent + band.descent + halo;
        for (const deg of ANGLES) {
          const a = (deg * Math.PI) / 180;
          const reach = R + gap / 2 + push * axis.lead;
          const cx = s.p1[0] + Math.cos(a) * (reach + w / 2);
          const cy = s.p1[1] + Math.sin(a) * (reach + h / 2);
          const box = { x0: cx - w / 2, y0: cy - h / 2, x1: cx + w / 2, y1: cy + h / 2 };
          if (!fits(box)) continue;
          if (s.code === SUBJECT && seats === whole) {
            const [ox, oy] = [s.p0[0] - s.p1[0], s.p0[1] - s.p1[1]];
            if (!fits({ x0: box.x0 + ox, x1: box.x1 + ox, y0: box.y0 + oy, y1: box.y1 + oy })) continue;
          }
          if (marks.some((m) => overlaps(box, m)) || taken.some((t) => overlaps(box, t))) continue;
          const leader = push > LEADER_PAST ? [[s.p1[0] + Math.cos(a) * (R + strokeReach), s.p1[1] + Math.sin(a) * (R + strokeReach)], [cx - Math.cos(a) * (w / 2), cy - Math.sin(a) * (h / 2)]] : null;
          const crosses = (p) =>
            taken.some((t) => overlaps(around(p, 1), t)) ||
            seats.some((o) => o !== s && o.inView && Math.hypot(p[0] - o.p1[0], p[1] - o.p1[1]) < R + strokeReach) ||
            (seats === whole && legLine.some((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 3 * strokeReach));
          if (leader && along(leader[0], leader[1], 4).slice(1, -1).some(crosses)) continue;
          seated = { word, box, leader };
          break;
        }
        if (seated) break;
      }
      if (!seated) {
        if (mustHold(s)) throw new Error(`${s.e.name} finds no seat for its name or its code at x 0–${(seats[0].p1 && seats === whole ? domain.whole : domain.close).toFixed(0)} %`);
        continue;
      }
      taken.push(seated.box);
      if (seated.leader) {
        leaders.push({ code: s.code, dx0: seated.leader[0][0] - s.p1[0], dy0: seated.leader[0][1] - s.p1[1], dx1: seated.leader[1][0] - s.p1[0], dy1: seated.leader[1][1] - s.p1[1] });
        for (const p of along(seated.leader[0], seated.leader[1], 4)) taken.push(around(p, 1));
      }
      const x = seated.box.x0 + halo / 2;
      const y = seated.box.y0 + halo / 2 + band.ascent;
      names[s.code] = { text: seated.word.text, width: seated.word.width, dx: x - s.p1[0], dy: y - s.p1[1], box: seated.box };
    }
    return { names, leaders };
  };
  const sure = (s) => [
    ...near.map((p) => ({ text: s.e.name, push: p })),
    ...far.map((p) => ({ text: s.e.name, push: p })),
    ...near.map((p) => ({ text: s.code, push: p })),
    ...far.map((p) => ({ text: s.code, push: p })),
  ];
  const wholeSeating = seatNames(whole, wholeMarks, [...legWords, panelBox], (s) => (s.code === SUBJECT || lighterSet.has(s.code) ? sure(s) : near.map((p) => ({ text: s.e.name, push: p }))), (s) => s.code === SUBJECT || lighterSet.has(s.code));
  const closeSeating = seatNames(closeUp, closeMarks, [panelBox], sure, () => true);

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
    context: walked(mix(accent, ground, 0.42), NON_TEXT_CONTRAST_MIN, "a country's marks"),
    faded: mix(ground, ink, 0.18),
    picked: walked(mix(mix(accent, ground, 0.42), accent, 0.6), NON_TEXT_CONTRAST_MIN, "a picked country's marks"),
    subject: walked(accent, NON_TEXT_CONTRAST_MIN, "France's marks"),
    text: {
      eyebrow: walked(registers.eyebrow.fill ?? accent, TEXT_CONTRAST_MIN, "the eyebrow"),
      title: walked(registers.display.fill ?? ink, TEXT_CONTRAST_MIN, "the title"),
      name: walked(muted, TEXT_CONTRAST_MIN, "a name"),
      picked: walked(ink, TEXT_CONTRAST_MIN, "a picked name"),
      subject: walked(accent, TEXT_CONTRAST_MIN, "France's name"),
      axis: walked(muted, TEXT_CONTRAST_MIN, "the axes"),
      count: walked(ink, TEXT_CONTRAST_MIN, "the counters"),
    },
  };

  const rankOf = new Map(subject.arrivals.map((c, i) => [c, i]));
  const r1 = (v) => Math.round(v * 10) / 10;
  const dropBox = ({ box, ...rest }) => rest;
  const props = {
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, value, axis, source: sourceRegister },
    titleCard,
    credit: { ...credit, at: creditAt },
    colours,
    strokes: { arc: (direction.stroke?.hairline ?? 0.6) * k * 1.6, ring: (direction.stroke?.hairline ?? 0.6) * k * 1.8, grid: (direction.stroke?.hairline ?? 0.6) * k, leg: (direction.stroke?.rule ?? 1) * k * 1.2 },
    dash: [0.12 * axis.lead, 0.12 * axis.lead].map(r1),
    R,
    plot,
    bowCap,
    domain,
    grid: yTicks.map((t) => ({ y: yOf(t.v), label: { text: t.text, width: t.width, x: plot.left - gap - t.width * (1 + DRAWN_WIDER), y: yOf(t.v) + shift } })),
    xTicks: {
      whole: xTickValues.map((v) => ({ v, ...measure(String(v), axis) })),
      close: CLOSE_TICKS.map((v) => ({ v, ...measure(String(v), axis) })),
      y: tickBaseline,
    },
    xName: xNameLine,
    yName: { ...measure(copy.yName, axis), x: plot.left, y: vInset + band.ascent },
    entities: data.map((d) => ({
      code: d.code,
      rank: rankOf.get(d.code),
      from: d.from,
      to: d.to,
      y0: r1(d.y0),
      y1: r1(d.y1),
      names: { whole: wholeSeating.names[d.code] ? dropBox(wholeSeating.names[d.code]) : null, close: closeSeating.names[d.code] ? dropBox(closeSeating.names[d.code]) : null },
    })),
    leaders: { whole: wholeSeating.leaders, close: closeSeating.leaders },
    subject: SUBJECT,
    lighter: subject.lighter,
    legs,
    panel: { ...panel, counterTexts },
    halo: { axis: halo, value: valueHalo },
    states,
    timing: CONNECTED_SCATTER_VIDEO_TIMING,
  };
  return {
    id,
    direction,
    props,
    report: {
      k,
      titleForm: titleCard.form,
      sourceForm: credit.form,
      named: `${Object.keys(wholeSeating.names).length} named whole (${wholeSeating.leaders.length} leaders), ${Object.keys(closeSeating.names).length} in the close-up (${closeSeating.leaders.length} leaders, ${Object.values(closeSeating.names).filter((n) => /^[A-Z]{3}$/.test(n.text)).length} codes)`,
    },
    geometry: { whole, closeUp, wholeMarks, closeMarks, panelBox, legWords, wholeSeating, closeSeating, bounds },
  };
}
