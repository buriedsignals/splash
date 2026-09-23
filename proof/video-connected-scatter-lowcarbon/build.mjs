// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the axes, every country's two seats and its
// arc, the names seated by measurement, the counters and the key, France's two moves, the colours and the states.
//
// Runs in Bun only.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { adjustToContrast, mix, NON_TEXT_CONTRAST_MIN, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { frameInsetFor, sizeFor, videoExportSize } from "#shared/chart-video/sizes.mjs";
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
/** The size this run exports at — `--size`, landscape when nothing asks. R2 names three and
 *  everything under it already answered per size; only this line pinned the beat to one. */
export const SIZE = videoExportSize();
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
const LABEL_GAP = 0.4;
/** How far past its first seat a name may be pushed, in the axis register's leads; past a short push it gets a leader. */
const PUSH_LADDER = [0, 0.25, 0.5, 1, 1.5, 2, 3, 4, 5.5, 7];
const ANGLE_LADDER = [0, 180, -90, 90, -45, -135, 45, 135, -22.5, 22.5, -157.5, 157.5, -67.5, -112.5, 67.5, 112.5];
/**
 * A NARROW FRAME SEARCHES FURTHER AND FINER FOR A SEAT. Measured 2026-09-23: at portrait the plot is 850px wide
 * where landscape gives 1680, and every name is drawn half again as large, so Autriche — a country the title's
 * count obliges the picture to name — exhausted both ladders and the beat refused.
 *
 * AND THE LADDERS ARE PER SIZE, not simply longer. The seating is sequential: each name takes its seat out of the
 * room left for the ones after it. Appending three long rungs for everybody moved a landscape name off its code
 * and onto a leader at 9 leads — a delivered frame changed by a rung meant for another frame. Landscape keeps the
 * two ladders it was tuned on, to the rung.
 */
const PUSHES = SIZE === "landscape" ? PUSH_LADDER : [...PUSH_LADDER, 9, 11, 13.5];
const ANGLES = SIZE === "landscape" ? ANGLE_LADDER : [...ANGLE_LADDER, -11.25, 11.25, -33.75, 33.75, -56.25, 56.25, -78.75, 78.75, -101.25, 101.25, -123.75, 123.75, -146.25, 146.25, -168.75, 168.75];
const LEADER_PAST = 0.4;
/** The close-up's x domain and its ticks: the scrolly's own. */
const CLOSE = 12;
const CLOSE_TICKS = [0, 3, 6, 9, 12];

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
    yName: [`bas-carbone dans sa propre électricité, en${NB}%`, `bas-carbone dans son électricité, en${NB}%`, `bas-carbone chez soi, en${NB}%`],
    xName: `part du bas-carbone des ${n}${NB}pays, en${NB}%`,
    cleaner: (k) => `${k} sur ${n} plus propres`,
    lighter: (k) => `${k} plus légers`,
    // THE COUNTERS' LINE BREAKS ARE A LADDER, NOT A LINE. Each counter set on one line is a statement about
    // 1680px of landscape plot: measured 2026-09-24 at square, « 16 sur 16 plus propres » is drawn 586-609px
    // wide, which is what makes the whole block 604x227 against an 832x610 plot, and no seat in it — corner or
    // sweep — is clear of sixteen countries' marks at both scales. Broken where the sentence itself breaks, the
    // widest line falls to 332-354px and the block becomes 350x310: the same two readings, the same words, laid
    // out for a frame that is tall rather than wide. Landscape takes the first rung, so nothing delivered moves.
    // R8's OWN SENTENCE. The ladder's last rung reduces what is drawn and says so on the plate; here what is reduced
    // is the NAMING, so the plate states how many of the countries in view carry their name. It is written only when
    // the rung fires — landscape and portrait name everyone and say nothing.
    named: (k, shown) => `${k} des ${shown} pays nommés`,
    counters: [
      { cleaner: (k) => [`${k} sur ${n} plus propres`], lighter: (k) => [`${k} plus légers`] },
      { cleaner: (k) => [`${k} sur ${n}`, `plus propres`], lighter: (k) => [`${k} plus légers`] },
    ],
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
    axis: `${copy.yName.join(" ")} ${copy.xName} ${subject.entities.map((e) => `${e.name} ${e.code}`).join(" ")} 0 3 6 9 10 12 20 25 30 40 50 75 100 ${copy.years.join(" ")}`,
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
  // THE BOTTOM ROW IS A LADDER, NOT A ROW. The credit shares the bottom row with the x axis name — one line, in the
  // room the name leaves — and that is a statement about 1750px of landscape content. Measured 2026-09-23: « part du
  // bas-carbone des 16 pays, en % » wants 743-869px of a 936px frame, so the room it leaves the credit is 90px at
  // creme and MINUS 13 at nocturne, and every direction refused at portrait and at square with « no form wraps into
  // 2 lines of -13.2px ». The name then takes a row of ITS OWN over the credit: the same two readings in the same
  // corner of the frame, stacked where the frame is too narrow to set them side by side.
  const xName = measure(copy.xName, axis);
  const xNameWidth = xName.width * (1 + DRAWN_WIDER);
  const content = stage.width - 2 * inset;
  const creditIn = (share) => sourceCreditFor({ registers, forms: copy.source, size: SIZE, k, ...CREDIT_ONE_LINE, measure: share });
  let bottomRow = null;
  const bottomRungs = [];
  try {
    const { register, ...block } = creditIn((content - (xNameWidth + 3 * LABEL_GAP * axis.lead)) / content);
    const at = { x: inset, y: stage.height - vInset - block.height };
    const line = { ...xName, x: stage.width - inset - xNameWidth, y: stage.height - vInset - band.descent };
    if (!(at.x + block.width + 2 * gap < line.x)) throw new Error("the x axis name and the credit do not fit side by side on the bottom row");
    bottomRow = { register, block, at, line };
  } catch (error) {
    bottomRungs.push(`side by side — ${error.message}`);
  }
  if (!bottomRow) {
    if (!(xNameWidth <= content)) throw new Error(`the x axis name is ${Math.round(xNameWidth)}px and a row of this frame is ${Math.round(content)}px: ${bottomRungs.join("; ")}`);
    const { register, ...block } = creditIn(1);
    const at = { x: inset, y: stage.height - vInset - block.height };
    bottomRow = { register, block, at, line: { ...xName, x: stage.width - inset - xNameWidth, y: at.y - gap - band.descent } };
  }
  const { register: sourceRegister, block: credit, at: creditAt, line: xNameLine } = bottomRow;

  // THE AXES. The ticks sit above the bottom row, the y name over the plot.
  const tickBaseline = Math.min(creditAt.y, xNameLine.y - band.ascent) - gap - band.descent;
  const yTickValues = [0, 25, 50, 75, 100];
  const yTicks = yTickValues.map((v) => ({ v, ...measure(String(v), axis) }));
  const R = 4.2 * k;
  // THE PLOT'S FLOOR IS A LADDER, NOT A LINE. The drawing runs down to the tick row at landscape, where the
  // counters and the key find a corner of its own 1680x800 to sit in. Measured 2026-09-24 at square: the plot is
  // 832x610, 58 % of it clear of marks, but that clear part is a WIDE SHALLOW band — the largest empty rectangle
  // is 508x128 and the widest band 250px tall is 224px, while the block needs 164px of height at any line count.
  // So at a frame that narrow the block leaves the drawing altogether and takes a strip of its own under it, and
  // the plot is re-cut to the floor that strip leaves. Landscape is seated inside the plot by the first corner,
  // so its floor is the first rung and nothing delivered moves.
  const plotFloor = tickBaseline - band.ascent - gap;
  const plotTo = (bottom) => ({
    left: inset + Math.max(...yTicks.map((t) => t.width)) * (1 + DRAWN_WIDER) + gap,
    right: stage.width - inset - R,
    top: vInset + band.ascent + band.descent + gap + band.ascent / 2,
    bottom,
  });
  const plotWidth = stage.width - inset - R - (inset + Math.max(...yTicks.map((t) => t.width)) * (1 + DRAWN_WIDER) + gap);
  // THE Y AXIS NAME stands over the plot, set from the plot's own left edge. A NARROW FRAME MOVES IT, AND IF IT MUST,
  // SHORTENS IT. Measured 2026-09-23: the long form is 909-1047px against a 936px content width, and at portrait it
  // ran off the right of the frame (looked at, before this ladder existed). It is set from the plot's left edge
  // first, then from the frame's own margin, then in the next and shorter form — the last rung says the same thing
  // in fewer words, never in smaller type, which the floor forbids anyway. Landscape takes the first rung.
  // AND ITS LENGTH IS ALSO A LADDER THE NAMES PULL ON, not only the frame. The row the y name stands in is the room
  // a country's name rises into when the plot has none above its disc, and `fits` only lets it rise clear of that
  // name. Measured 2026-09-24 at square: France's 2023 disc sits 22px under the plot's own top, the y name ran to
  // 800px of a 1008px row, and 513 of the 832 seats the ladders offer France were rejected for leaving the bounds
  // — the beat refused with « France finds no seat for its name or its code ». So the form is stepped down when a
  // name that MUST hold cannot, and not before: landscape and portrait seat every name on the first form and keep
  // the words they were delivered with.
  const yNameSeats = (() => {
    const seats = [];
    const tried = [];
    for (const form of copy.yName) {
      const m = measure(form, axis);
      const w = m.width * (1 + DRAWN_WIDER);
      for (const x of [stage.width - inset - R - plotWidth, inset]) if (x + w <= stage.width - inset) seats.push({ ...m, x, y: vInset + band.ascent, drawnWidth: w });
      if (!seats.length) tried.push(`« ${m.text} » is ${Math.round(w)}px from a left edge at ${Math.round(inset)}px`);
    }
    if (!seats.length) throw new Error(`no y axis name form holds this frame's ${Math.round(stage.width - 2 * inset)}px: ${tried.join("; ")}`);
    return seats;
  })();
  let yNameSeat = yNameSeats[0];

  const top = Math.max(...subject.entities.flatMap((e) => [e.from.weight, e.to.weight]));
  const xTickValues = [0, 10, 20, 30, 40].filter((t) => t <= top + 8);
  const domain = { whole: Math.max(top * 1.05, xTickValues[xTickValues.length - 1]), close: CLOSE };
  const crowd = subject.entities.filter((e) => Math.max(e.from.weight, e.to.weight) < CLOSE);
  const outside = subject.entities.filter((e) => !crowd.includes(e)).map((e) => e.code).sort();
  if (outside.join() !== "DEU,FRA") throw new Error(`the close-up leaves France and Germany out of the frame and holds every other country; it leaves out ${outside.join(", ")}`);
  const shift = (band.ascent - band.descent) / 2;
  const bowCap = 1.2 * axis.lead;
  const strokeReach = 2 * k;
  const years = copy.years.map((y) => measure(y, axis));
  const glyph = 2 * R;
  const keyGap = gap / 2;
  const secondAt = glyph + keyGap + years[0].width * (1 + DRAWN_WIDER) + 2 * gap;
  const keyWidth = secondAt + glyph + keyGap + years[1].width;
  const counterStep = valueBand.ascent + valueBand.descent + 0.4 * axis.lead;
  const boxOfLine = (l, b, h) => ({ x0: l.x - h / 2, x1: l.x + l.width * (1 + DRAWN_WIDER) + h / 2, y0: l.y - b.ascent - h / 2, y1: l.y + b.descent + h / 2 });
  const downFrom = (a, b, by) => (b <= a ? [] : Array.from({ length: Math.floor((b - a) / by) + 1 }, (_, i) => b - i * by));
  /** The marks a word must not cover at one scale: every ring, disc and arc in view. */
  const marksOf = (seats) => {
    const marks = [];
    for (const s of seats.filter((x) => x.inView)) {
      marks.push(around(s.p0, R + strokeReach), around(s.p1, R + strokeReach));
      for (let i = 1; i < 24; i++) marks.push(around(arcAt(s.p0, s.c, s.p1, i / 24).point, strokeReach));
    }
    return marks;
  };

  /** THE WHOLE DRAWING, FOR ONE PLOT FLOOR. Every seat, arc and leg is measured from the plot, so re-cutting the
   *  plot for the strip means laying the drawing out again rather than nudging it. With `strip` the block has
   *  already been laid out below the drawing and no seat is searched for; without it the block must find a corner
   *  of the plot clear of every mark at both scales, and the answer is a refusal when it cannot. */
  const layoutWith = (plot, strip) => {
    const yOf = (v) => plot.bottom - (v / 100) * (plot.bottom - plot.top);
    const data = subject.entities.map((e) => ({ e, code: e.code, from: e.from.weight, to: e.to.weight, y0: yOf(e.from.ownMix), y1: yOf(e.to.ownMix) }));
    const layoutAt = (xMax) => data.map((d) => ({ ...d, ...seatOf(d, xMax, plot, bowCap), inView: Math.max(d.from, d.to) <= xMax }));

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
    const wholeMarks = marksOf(whole);
    for (const p of [...along(legs.from, corner, R), ...along(corner, legs.to, R)]) wholeMarks.push(around(p, strokeReach));
    const closeMarks = marksOf(closeUp);
    const legWords = [boxOfLine(legs.across, valueBand, valueHalo), boxOfLine(legs.up, valueBand, valueHalo)];

    // THE PANEL: the two counters and the key, seated in the plot's first corner that covers no mark at either scale.
    /** One rung of the counters' line-break ladder, measured and seated: the block's own size, and the first seat in
     *  the plot that covers no mark at either scale, or none. */
    const panelIn = (form) => {
      const counterTexts = {
        cleaner: Object.fromEntries(Array.from({ length: data.length + 1 }, (_, i) => [String(i), form.cleaner(i).map((t) => measure(t, value))])),
        lighter: Object.fromEntries(Array.from({ length: subject.lighter.length + 1 }, (_, i) => [String(i), form.lighter(i).map((t) => measure(t, value))])),
      };
      const rowsOf = (set) => Math.max(...Object.values(set).map((lines) => lines.length));
      const cleanerRows = rowsOf(counterTexts.cleaner);
      const lighterRows = rowsOf(counterTexts.lighter);
      const rows = cleanerRows + lighterRows;
      const counterWidth = Math.max(...[...Object.values(counterTexts.cleaner), ...Object.values(counterTexts.lighter)].flat().map((t) => t.width));
      const panelW = Math.max(counterWidth, keyWidth) * (1 + DRAWN_WIDER) + valueHalo;
      const panelH = valueHalo / 2 + valueBand.ascent + (rows - 1) * counterStep + valueBand.descent + 0.4 * axis.lead + band.ascent + band.descent + halo / 2;
      // THE CORNERS THE PANEL IS TRIED IN, in order. The first two are landscape's and are tried first, so nothing already
      // delivered moves; the rest were added 2026-09-23, when a square frame's plot — 850x560 against landscape's
      // 1680x800 — left the panel's own 400x200 no room on the right at either scale and every direction refused.
      const corners = [
        { x: plot.right - panelW, y: plot.bottom - panelH },
        { x: plot.right - panelW, y: plot.top + (plot.bottom - plot.top) / 2 - panelH / 2 },
        { x: plot.right - panelW, y: plot.top },
        { x: plot.left, y: plot.top },
        { x: plot.left, y: plot.top + (plot.bottom - plot.top) / 2 - panelH / 2 },
        { x: plot.left, y: plot.bottom - panelH },
        { x: plot.left + (plot.right - plot.left) / 2 - panelW / 2, y: plot.top },
        { x: plot.left + (plot.right - plot.left) / 2 - panelW / 2, y: plot.bottom - panelH },
      ];
      // AND, WHERE NONE OF THEM IS CLEAR, A SWEEP. The corners are the seats a designer reaches for first; on a square
      // frame the plot measures 832x610 against landscape's 1680x800 while the panel is still 604x227, and every corner
      // sits under a mark at one scale or the other. The sweep offers every other seat the plot has room for, on a
      // quarter-panel grid, nearest the bottom right first — the corners keep their precedence, so landscape is still
      // seated by the first of them and nothing delivered moves.
      const sweep = downFrom(plot.top, plot.bottom - panelH, panelH / 4).flatMap((y) => downFrom(plot.left, plot.right - panelW, panelW / 4).map((x) => ({ x, y })));
      const at = [...corners, ...sweep].find((p) => {
        const box = { x0: p.x, y0: p.y, x1: p.x + panelW, y1: p.y + panelH };
        return ![...wholeMarks, ...closeMarks, ...legWords].some((m) => overlaps(box, m));
      });
      const firstBaseline = valueHalo / 2 + valueBand.ascent;
      const keyBaseline = firstBaseline + (rows - 1) * counterStep + valueBand.descent + 0.4 * axis.lead + band.ascent;
      return {
        at,
        rows,
        panelW,
        panelH,
        counterTexts,
        panel: at && {
          at,
          cleaner: Array.from({ length: cleanerRows }, (_, i) => ({ x: valueHalo / 2, y: firstBaseline + i * counterStep })),
          lighter: Array.from({ length: lighterRows }, (_, i) => ({ x: valueHalo / 2, y: firstBaseline + (cleanerRows + i) * counterStep })),
          key: {
            cy: keyBaseline - shift,
            ring: valueHalo / 2 + R,
            disc: valueHalo / 2 + secondAt + R,
            years: [
              { ...years[0], x: valueHalo / 2 + glyph + keyGap, y: keyBaseline },
              { ...years[1], x: valueHalo / 2 + secondAt + glyph + keyGap, y: keyBaseline },
            ],
          },
        },
      };
    };
      const common = { plot, yOf, data, whole, closeUp, france, legs, wholeMarks, closeMarks, legWords };
      if (strip) return { ...common, ...strip };
      const rungs = [];
      for (const form of copy.counters) {
        const tried = panelIn(form);
        if (tried.at) return { ...common, panel: tried.panel, counterTexts: tried.counterTexts, panelW: tried.panelW, panelH: tried.panelH, counterRows: tried.rows, panelAt: tried.at };
        rungs.push(`on ${tried.rows} lines it is ${Math.round(tried.panelW)}x${Math.round(tried.panelH)}px`);
      }
      return { refusal: `on a ${Math.round(plot.right - plot.left)}x${Math.round(plot.bottom - plot.top)}px plot, ${rungs.join("; ")}` };
  };

  // RUNG 1 — the block inside the drawing, where landscape has always put it.
  let laid = layoutWith(plotTo(plotFloor), null);
  const floorRungs = [];
  if (laid.refusal) {
    floorRungs.push(laid.refusal);
    // RUNG 2 — THE BLOCK LEAVES THE DRAWING AND TAKES A STRIP UNDER IT. Laid out for a strip it is wide rather than
    // tall: the two counters stacked at the left, the key set beside the second of them, which measures 661-709px
    // against the 936px a square frame's row gives — where stacked under the counters it was 227px tall and the
    // drawing's own clear band is 128. The strip costs the plot its height, so the whole drawing is laid out again
    // against the floor the strip leaves, rather than drawn once and nudged.
    const form = copy.counters[0];
    const lineOf = (f, n) => Array.from({ length: n + 1 }, (_, i) => f(i).map((t) => measure(t, value)));
    const cleanerLines = lineOf(form.cleaner, subject.entities.length);
    const lighterLines = lineOf(form.lighter, subject.lighter.length);
    const widest = (sets) => Math.max(...sets.flat().map((t) => t.width)) * (1 + DRAWN_WIDER);
    const keyLeft = valueHalo / 2 + widest(lighterLines) + 2 * gap;
    // THE STRIP RESERVES R8's SENTENCE, whether or not it is written. Which countries seat is only known after the
    // drawing is laid out against the floor the strip leaves, and the floor cannot wait for it, so the room is
    // measured from the longest the sentence can ever be and the words are set into it afterwards, or not at all.
    const noteRoom = Math.max(...subject.entities.map((_, i) => measure(copy.named(i, subject.entities.length), axis).width)) * (1 + DRAWN_WIDER);
    const stripW = Math.max(valueHalo / 2 + widest(cleanerLines), keyLeft + keyWidth * (1 + DRAWN_WIDER), valueHalo / 2 + noteRoom) + valueHalo / 2;
    const stripH = valueHalo / 2 + valueBand.ascent + counterStep + valueBand.descent + gap + band.ascent + band.descent + halo / 2;
    const content = stage.width - 2 * inset;
    if (!(stripW <= content))
      throw new Error(`the counters and the key find no corner of the drawing (${laid.refusal}) and their strip is ${Math.round(stripW)}px against a ${Math.round(content)}px row`);
    const stripY = plotFloor - stripH;
    const firstBaseline = valueHalo / 2 + valueBand.ascent;
    const keyBaseline = firstBaseline + counterStep - (valueBand.ascent - band.ascent);
    laid = layoutWith(plotTo(stripY - gap), {
      panelAt: { x: inset, y: stripY },
      panelW: stripW,
      panelH: stripH,
      counterRows: 2,
      counterTexts: {
        cleaner: Object.fromEntries(cleanerLines.map((lines, i) => [String(i), lines])),
        lighter: Object.fromEntries(lighterLines.map((lines, i) => [String(i), lines])),
      },
      panel: {
        at: { x: inset, y: stripY },
        cleaner: [{ x: valueHalo / 2, y: firstBaseline }],
        lighter: [{ x: valueHalo / 2, y: firstBaseline + counterStep }],
        noteSeat: { x: valueHalo / 2, y: firstBaseline + counterStep + valueBand.descent + gap + band.ascent },
        key: {
          cy: keyBaseline - shift,
          ring: keyLeft + R,
          disc: keyLeft + secondAt + R,
          years: [
            { ...years[0], x: keyLeft + glyph + keyGap, y: keyBaseline },
            { ...years[1], x: keyLeft + secondAt + glyph + keyGap, y: keyBaseline },
          ],
        },
      },
    });
  }
  if (laid.refusal) throw new Error(`the counters and the key find no seat: ${[...floorRungs, laid.refusal].join(" — and under the drawing, ")}`);
  const { plot, yOf, data, whole, closeUp, france, legs, wholeMarks, closeMarks, legWords, panel, counterTexts, panelW, panelH, counterRows, panelAt } = laid;
  const panelBox = { x0: panelAt.x, y0: panelAt.y, x1: panelAt.x + panelW, y1: panelAt.y + panelH };

  // THE NAMES, SEATED BY MEASUREMENT, once per scale. At the whole scale France comes first — its seat must hold at its
  // 2000 ring too, where it is named from the start — then the five, largest loss first, each sure to be named; the rest
  // take a seat beside their disc or stay unnamed. In the close-up every country in view is named: its name beside its
  // disc, then pushed with a leader, then its code.
  const lighterSet = new Set(subject.lighter);
  // A name stays inside the plot, or rises into the row above it clear of the y axis name.
  let yNameRight = yNameSeat.x + yNameSeat.drawnWidth + gap;
  const bounds = { x0: plot.left, y0: plot.top - band.ascent / 2, x1: stage.width - inset, y1: plot.bottom };
  const fits = (box) => inside(box, bounds) || (box.x0 > yNameRight && inside(box, { ...bounds, y0: vInset }));
  const near = PUSHES.filter((p) => p <= LEADER_PAST);
  const far = PUSHES.filter((p) => p > LEADER_PAST);
  const legLine = [...along(legs.from, legs.corner, 2), ...along(legs.corner, legs.to, 2)];
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
  // THE TWO MOVES' WORDS ARE AN ARRANGEMENT, NOT A SEAT. « −2,4 pts » sits along the horizontal leg and « +6,1 pts »
  // beside the vertical one, which is what 1680px of landscape affords. Measured 2026-09-24 at square: the vertical
  // leg is 18px long, its word is 200px wide, and the 200px of ground it takes west of France's 2023 disc is the
  // only ground France's own name can hold — 68 of the 832 seats its ladders offer were rejected for it, and with
  // those words out of the way France seats at once. So at a frame that narrow both words stack UNDER the horizontal
  // leg, in the move's own order, and the vertical leg is read from the picture rather than labelled beside itself.
  const legsWith = (stacked) => {
    if (!stacked) return legs;
    const midX = (legs.from[0] + legs.corner[0]) / 2;
    const first = legs.corner[1] + gap + valueBand.ascent;
    const centred = (l, y) => ({ ...l, x: midX - (l.width * (1 + DRAWN_WIDER)) / 2, y });
    return { ...legs, across: centred(legs.across, first), up: centred(legs.up, first + counterStep) };
  };
  // HOW MANY NAMES THE FRAME HOLDS IS `REMOVAL_LADDER`'s R8, AND IT IS THE LAST RUNG SPENT. Every country in view is
  // named in the close-up and each of the seven lighter ones at the whole scale, which is what 1680x800 of landscape
  // affords. Measured 2026-09-24 at square, with the words re-arranged and the block out of the drawing and even
  // with the plot given its whole 832x610 back: Autriche finds no seat for its name or its code among the 832 the
  // ladders offer it at the whole scale, and Portugal none in the close-up. The argument is FRANCE'S move against a
  // field of sixteen, not sixteen labels, so the last rung names as many as the frame holds — France always — and
  // R8's condition is met by WRITING THE COUNT ON THE PLATE. Landscape and portrait seat every name on the first
  // rung and the sentence is never written.
  const HOLD_LADDER = [
    { what: "every country in view", whole: (s) => s.code === SUBJECT || lighterSet.has(s.code), close: () => true },
    { what: "France and the countries the frame holds", whole: (s) => s.code === SUBJECT, close: (s) => s.code === SUBJECT },
  ];
  let wholeSeating = null;
  let closeSeating = null;
  let legsUsed = legs;
  let legWordsUsed = legWords;
  let held = HOLD_LADDER[0];
  const seatRungs = [];
  outer: for (const hold of HOLD_LADDER) {
    for (const stacked of [false, true]) {
      const tryLegs = legsWith(stacked);
      const tryWords = [boxOfLine(tryLegs.across, valueBand, valueHalo), boxOfLine(tryLegs.up, valueBand, valueHalo)];
      for (const seat of yNameSeats) {
        yNameSeat = seat;
        yNameRight = seat.x + seat.drawnWidth + gap;
        try {
          wholeSeating = seatNames(whole, wholeMarks, [...tryWords, panelBox], (s) => (s.code === SUBJECT || lighterSet.has(s.code) ? sure(s) : near.map((p) => ({ text: s.e.name, push: p }))), hold.whole);
          closeSeating = seatNames(closeUp, closeMarks, [panelBox], sure, hold.close);
          legsUsed = tryLegs;
          legWordsUsed = tryWords;
          held = hold;
          break outer;
        } catch (error) {
          wholeSeating = null;
          closeSeating = null;
          seatRungs.push(`naming ${hold.what}, with « ${seat.text} » from x ${Math.round(seat.x)} and the moves' words ${stacked ? "stacked under the leg" : "along their own legs"} — ${error.message}`);
        }
      }
    }
  }
  if (!wholeSeating || !closeSeating) throw new Error(seatRungs.join("; "));
  // AND THE SENTENCE IS WRITTEN FROM WHAT WAS ACTUALLY SEATED, never from the rung's name: the close-up is the shot
  // that claims to name the field, so it is the field the count is taken against.
  // France and Germany never enter the close-up — its x runs to 12 % — so the count is taken over the whole beat:
  // a country the reader can put a name to in EITHER shot is named, and the sentence is written when any of the
  // sixteen is not. At landscape the two shots together name all sixteen and nothing is written.
  const namedAnywhere = new Set([...Object.keys(wholeSeating.names), ...Object.keys(closeSeating.names)]);
  const reduced = namedAnywhere.size < subject.entities.length;
  if (!wholeSeating.names[SUBJECT]) throw new Error("the picture does not name France, whose move is the argument");
  const note = reduced ? { ...measure(copy.named(namedAnywhere.size, subject.entities.length), axis), x: panel.noteSeat?.x, y: panel.noteSeat?.y } : null;
  if (reduced && !(note.x >= 0)) throw new Error(`the picture names only ${namedAnywhere.size} of the ${subject.entities.length} countries and the plate has nowhere to say so`);

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
    yName: { text: yNameSeat.text, width: yNameSeat.width, x: yNameSeat.x, y: yNameSeat.y },
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
    legs: legsUsed,
    panel: { ...panel, counterTexts, note },
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
      counterRows,
      naming: note ? `${namedAnywhere.size} of ${subject.entities.length} named, said on the plate` : "all named",
      named: `${Object.keys(wholeSeating.names).length} named whole (${wholeSeating.leaders.length} leaders), ${Object.keys(closeSeating.names).length} in the close-up (${closeSeating.leaders.length} leaders, ${Object.values(closeSeating.names).filter((n) => /^[A-Z]{3}$/.test(n.text)).length} codes)`,
    },
    geometry: { whole, closeUp, wholeMarks, closeMarks, panelBox, legWords, wholeSeating, closeSeating, bounds },
  };
}
