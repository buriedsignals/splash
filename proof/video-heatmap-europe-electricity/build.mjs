// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the grid, every row's shares and classes, the
// route slots, the heads and families, the share column, the brackets, the key, the counter, the colours and the states.
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
import { BAND_PROBE, bandOf, CREDIT_ONE_LINE, DRAWN_WIDER, haloOf, keyFor, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf } from "../../skills/chart-video/scripts/shots.mjs";
import { videoRegistersOf } from "../../skills/chart-video/scripts/video-registers.mjs";
import { statesFor } from "./states.mjs";
import { ABOVE, BREAKS, FAMILY_COLUMNS, FLOOR, loadSubject, MERGED_COLUMNS, ROUTES, ROWS_DRAWN, SOURCES } from "./subject.mjs";
import { HEATMAP_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
/** The size this run exports at — `--size`, landscape when nothing asks. R2 names three and
 *  everything under it already answered per size; only this line pinned the beat to one. */
export const SIZE = videoExportSize();
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
const LABEL_GAP = 0.4;
/**
 * THE COLUMNS THIS FRAME DRAWS. At 16:9 they are the nine sources, one column each. At 936px of content they are
 * the six of `MERGED_COLUMNS` — the last rung, and the credit says it. `of` is which of the nine each column adds.
 */
export const COLUMNS = {
  landscape: SOURCES.map((s) => ({ label: s.label, family: s.family, of: [s.key] })),
  portrait: MERGED_COLUMNS,
  square: FAMILY_COLUMNS,
}[videoExportSize()];
const SOURCE_AT = Object.fromEntries(SOURCES.map((s, i) => [s.key, i]));
/** One drawn column's share of a row's whole: the sources it gathers, added. */
const shareIn = (row, column) => column.of.reduce((sum, key) => sum + row.shares[SOURCE_AT[key]], 0);
/** The column the nuclear family occupies — the one the video rings. */
export const NUCLEAR_AT = COLUMNS.findIndex((c) => c.family === "nucléaire");
/**
 * WHERE THE BRACKET'S WORDS STAND. Beside the grid at 16:9: a column at the right holding each route's name and
 * the running count, which is what 1824px of content affords. At 936px that column wants 407–487px of the frame
 * — « renouvelables » alone is 357 at the type floor — and the grid is left nothing (measured 2026-09-24). A
 * column that has run out of column becomes a CAPTION: the route's name set over its own group, from the frame's
 * own inset, across the names the gap row leaves empty; the bracket keeps its tick at the right margin.
 */
const CAPTIONS = videoExportSize() !== "landscape";
/** The gap that parts two routes, × the row pitch. The grid reserves it twice, half over the rows and half under.
 *  A captioned frame parts them by a whole row, because the caption stands in that gap. */
export const GAP_ROWS = CAPTIONS ? 0.85 : 0.5;
/**
 * HOW MANY ROWS THE FRAME DRAWS. Twelve is the beat's own rule — the seven that clear the floor and the five
 * biggest producers behind them. A 1:1 frame has 936px of height, of which three lines of heads take 290–318 and
 * the key with the credit 177–195: twelve rows and their parting want 660px of the 475–523 that leaves
 * (measured 2026-09-24). So square draws the seven and the biggest producer behind them, and the credit says it.
 */
export const ROWS_AT = { landscape: ROWS_DRAWN, portrait: ROWS_DRAWN, square: ABOVE + 1 }[SIZE];
/** The least air between two heads on one line, and between two family names, × the axis lead. */
const HEAD_AIR = 0.8;
const FAMILY_AIR = 0.6;

export function loadBeat() {
  const subject = drawn(loadSubject());
  return { subject, states: statesFor(), copy: copyOf(subject) };
}

/** The rows this frame draws: every country past the floor, then the biggest producers, as many as `ROWS_AT`
 *  holds. The rule that chose the twelve and both of its assertions are the subject's own and run over all of
 *  them, so what is dropped here is drawing, never evidence. */
function drawn(subject) {
  if (ROWS_AT >= subject.rows.length) return subject;
  if (ROWS_AT < ABOVE) throw new Error(`the frame holds ${ROWS_AT} rows and ${ABOVE} countries clear the floor`);
  const kept = new Set(subject.rows.map((_, i) => i).filter((i) => subject.route[i] !== null));
  subject.rows
    .map((r, i) => [r, i])
    .filter(([, i]) => subject.route[i] === null)
    .sort((a, b) => b[0].total - a[0].total)
    .slice(0, ROWS_AT - kept.size)
    .forEach(([, i]) => kept.add(i));
  const order = [...kept].sort((a, b) => a - b);
  return { ...subject, rows: order.map((i) => subject.rows[i]), route: order.map((i) => subject.route[i]) };
}

const percent = (v) => `${v.toFixed(1).replace(".", ",")}${NB}%`;

/** WHAT THIS FRAME DREW LESS OF, IN THE PLATE'S OWN WORDS. Every form of the credit carries them, so no rung of
 *  the credit's own ladder can leave a reduction unsaid. */
const REDUCTIONS = [
  ...(COLUMNS.length === SOURCES.length ? [] : [`neuf sources en ${COLUMNS.length === 3 ? "trois familles" : "six"}`]),
  ...(ROWS_AT === ROWS_DRAWN ? [] : [`${ABOVE} pays sur ${ROWS_DRAWN}`]),
];

export function copyOf(subject) {
  return {
    eyebrow: `Énergie${NB}· Europe`,
    title: [`Sept pays européens dépassent ${FLOOR}${NB}% d’électricité bas-carbone, par trois chemins`, "Trois chemins vers une électricité bas-carbone"],
    count: (n) => `${n}${NB}pays`,
    floor: `${FLOOR}${NB}%`,
    share: percent,
    shareHead: "bas-carbone",
    breaks: BREAKS.map((b, i) => (i === BREAKS.length - 1 ? `${b}${NB}%` : String(b))),
    routes: ROUTES,
    /** Only a family that spans more than one drawn column takes a rule and a name: a family that IS a column is
     *  named by that column's own head, which is what makes six columns nameable in 936px. */
    families: [...new Set(COLUMNS.map((c) => c.family))].filter((f) => COLUMNS.filter((c) => c.family === f).length > 1 || !CAPTIONS),
    /** THE REDUCTION IS SAID ON THE PLATE. A frame that draws six columns instead of nine carries the clause in
     *  every form of its credit, so no form of the ladder can leave it unsaid. */
    source: [
      "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
      "Source : Ember, Energy Institute, via Our World in Data",
      "Source : Ember, via Our World in Data",
      "Ember, via OWID",
    ].map((form) => [form, ...REDUCTIONS].join(`${NB}· `)),
    names: subject.rows.map((r) => r.label),
  };
}

export function textPerRegisterOf(copy) {
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: `${copy.families.join(" ")} ${copy.routes.join(" ")}`,
    value: `${copy.count(7)} 0123456789,${NB}%`,
    axis: `${copy.names.join(" ")} ${SOURCES.map((s) => s.label).join(" ")} ${COLUMNS.map((c) => c.label).join(" ")} ${copy.breaks.join(" ")} ${copy.floor} ${copy.shareHead} ${copy.source.join(" ")}`,
  };
}

export function buildDirection(id, { subject, states, copy }) {
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, `${id}.md`)), textPerRegisterOf(copy));
  const resolved = Object.fromEntries(REGISTER_NAMES.map((name) => [name, registerOf(direction, name)]));
  const registers = videoRegistersOf(resolved, SIZE);
  const k = registers.axis.fontSize / resolved.axis.fontSize;
  const row = sizeFor(SIZE);
  const stage = { width: row.width, height: row.height };
  const inset = frameInsetFor(SIZE);
  const vInset = verticalInsetFor(SIZE);
  for (const [name, r] of Object.entries(registers)) if (!(r.fontSize >= row.minTypePx)) throw new Error(`register ${name} is ${r.fontSize}px, under the ${row.minTypePx}px floor`);
  const { axis, value, annot } = registers;
  const measure = (t, r) => {
    const cased = applyCase(t, r.transform);
    return { text: cased, width: widthOf(cased, r) };
  };
  const drawnWidth = (w) => w * (1 + DRAWN_WIDER);
  const gap = LABEL_GAP * axis.lead;
  const axisBand = bandOf(BAND_PROBE, axis);
  const valueBand = bandOf(BAND_PROBE, value);
  const annotBand = bandOf(BAND_PROBE, annot);
  const centred = (band) => (band.ascent - band.descent) / 2;
  const r1 = (v) => Math.round(v * 10) / 10;

  const titleCard = titleCardFor({ registers, eyebrow: copy.eyebrow, title: copy.title, size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });
  // THE BAND UNDER THE MATRIX: the credit at the left, the key at the right, no plate. The credit takes the longest form that
  // leaves the key its room — AND WHEN THE FRAME HAS NO SIDE-BY-SIDE LEFT, THE BAND STACKS. Measured
  // 2026-09-23: 1824px of landscape content seats the shortest credit (851px) beside the five-class key
  // and keeps 900px of air; a square or portrait frame offers 936px and the key alone takes 630, so no
  // form of the credit fits beside it. A row that has run out of row becomes a column — the key over the
  // credit, both set from the frame's inset — which is the same band read top to bottom, not a squeezed
  // one. Landscape still fits side by side at the first rung, so nothing already delivered moves.
  const key = keyFor({ registers, k, counters: [], breaks: copy.breaks });
  const credits = copy.source.map((_, i) => sourceCreditFor({ registers, forms: copy.source.slice(i), size: SIZE, k, ...CREDIT_ONE_LINE }));
  const keyRight = stage.width - inset - key.width;
  const fitting = credits.findIndex((c) => inset + c.width + 2 * gap < keyRight);
  const stacked = fitting === -1;
  if (stacked && !(inset + key.width <= stage.width - inset))
    throw new Error(`the key is ${key.width.toFixed(0)}px and the frame gives it ${(stage.width - 2 * inset).toFixed(0)}px, stacked or not`);
  const { register: sourceRegister, ...credit } = stacked ? { ...credits[0] } : { ...credits[fitting], form: fitting };
  const creditAt = { x: inset, y: stage.height - vInset - credit.height };
  const keyAt = stacked ? { x: inset, y: creditAt.y - gap - key.height } : { x: keyRight, y: stage.height - vInset - key.height };
  const bandTop = Math.min(creditAt.y, keyAt.y);

  // THE COLUMNS: the names at the left, nine sources, the share column, the bracket and its words at the right. The share
  // column's head stands on the heads' upper line, right-aligned over its values.
  const names = subject.rows.map((r) => measure(r.label, axis));
  const shares = subject.rows.map((r) => measure(copy.share(r.lowCarbon), value));
  const shareHead = measure(copy.shareHead, axis);
  const counts = Object.fromEntries(Array.from({ length: ABOVE + 1 }, (_, i) => [String(i), measure(copy.count(i), value)]));
  const routeNames = copy.routes.map((t) => measure(t, annot));
  const tick = 0.3 * axis.lead;
  const labelRoom = CAPTIONS ? 0 : drawnWidth(Math.max(...Object.values(counts).map((c) => c.width), ...routeNames.map((w) => w.width)));
  const shareRoom = drawnWidth(Math.max(...shares.map((s) => s.width)));
  const gridLeft = inset + drawnWidth(Math.max(...names.map((w) => w.width))) + gap;
  /** Captioned, the words stand at the frame's own inset and the bracket at its right margin. */
  const labelX = CAPTIONS ? inset : stage.width - inset - labelRoom;
  const bracketX = CAPTIONS ? stage.width - inset : labelX - gap;
  const shareRight = bracketX - tick - gap;
  const gridRight = shareRight - shareRoom - gap;
  const cellW = (gridRight - gridLeft) / COLUMNS.length;

  // THE HEADS: on as few lines as keep every head a word apart from its neighbours — one line when they fit, else a stagger
  // over as many lines as the frame costs, the column j on line j mod the count — never rotated. The share column's head
  // takes the first line that holds it apart. Two heads closer than HEAD_AIR read as one phrase (« Charbon bas-carbone »).
  /** A column that is its family alone is named by the family over its rule; it takes no second head. Captioned, that
   *  rule is not drawn — a family of one column would stand its name over a 63px rule — so the column keeps its head. */
  const alone = COLUMNS.map((c) => !CAPTIONS && COLUMNS.filter((t) => t.family === c.family).length === 1);
  const heads = COLUMNS.map((c) => measure(c.label, axis));
  const headGap = Math.max(Math.min(cellW, axis.lead) * 0.07, k);
  const air = HEAD_AIR * axis.lead;
  const centreOf = (j) => gridLeft + j * cellW + (cellW - headGap) / 2;
  const spans = heads.map((h, j) => ({ j, text: h.text, left: centreOf(j) - drawnWidth(h.width) / 2, right: centreOf(j) + drawnWidth(h.width) / 2 }));
  const shareSpan = { j: COLUMNS.length, text: shareHead.text, left: shareRight - drawnWidth(shareHead.width), right: shareRight };
  const clear = (on) => on.every((h, i) => i === 0 || on[i - 1].right + air <= h.left);
  const staggerOf = (lines) => {
    const on = (line) => spans.filter((s) => !alone[s.j] && s.j % lines === line);
    if (!Array.from({ length: lines }, (_, line) => clear(on(line))).every(Boolean)) return null;
    const shareLine = Array.from({ length: lines }, (_, line) => line).find((line) => clear([...on(line), shareSpan]));
    return shareLine === undefined ? null : { lines, shareLine };
  };
  /** HOW MANY LINES THE STAGGER MAY TAKE IS A MEASURE, NOT A NUMBER. Three lines is what 1824px of landscape
   *  content costs nine heads. At 936px six heads over a 63px column need one line each before they stand a word
   *  apart (measured 2026-09-24), so a narrow frame buys the stagger the lines it costs — never more than one per
   *  drawn column, which is the point where staggering stops meaning anything. */
  const stagger = Array.from({ length: CAPTIONS ? COLUMNS.length : 3 }, (_, i) => i + 1)
    .map(staggerOf)
    .find(Boolean);
  if (!stagger)
    throw new Error(
      `the source heads do not stand a word apart on three lines of a ${cellW.toFixed(1)}px column — the widest head ` +
        `wants ${Math.max(...heads.map((h) => drawnWidth(h.width))).toFixed(0)}px. ${COLUMNS.length} columns are left ` +
        `${(gridRight - gridLeft).toFixed(0)}px of the ${(stage.width - 2 * inset).toFixed(0)}px this frame gives, because the ` +
        `names take ${(gridLeft - inset).toFixed(0)}, the low-carbon column ${(shareRoom + gap).toFixed(0)} and the bracket with its ` +
        `route names ${(labelRoom + tick + 2 * gap).toFixed(0)}`,
    );
  if (Math.min(...spans.filter((s) => !alone[s.j]).map((s) => s.left)) < inset) throw new Error("a source head runs off the frame");
  /** A head's line, counted up from the line nearest the grid. */
  const lineOf = (j) => j % stagger.lines;
  // The family row and its rules cost the top of the frame a name's band and a rule's air. A frame where every
  // family IS a column draws none of them, so it reserves none: the heads start at the frame's own inset.
  const familyRow = copy.families.length > 0;
  const familyBaseline = vInset + Math.max(annotBand.ascent, axisBand.ascent);
  const ruleY = familyRow ? familyBaseline + Math.max(annotBand.descent, axisBand.descent) + 0.25 * axis.lead : vInset;
  const headBaseline = ruleY + (familyRow ? 0.3 * axis.lead : 0) + axisBand.ascent + (stagger.lines - 1) * axis.lead;

  // THE ROWS: twelve, and the two gaps a route parting takes. A row owes the band of the words it carries.
  // The first route's caption stands over the grid's own first row, so a captioned frame reserves its band here:
  // the routes part the rows below it, but nothing parts the top of the grid from the heads.
  const captionRoom = CAPTIONS ? annotBand.ascent + annotBand.descent : 0;
  const top = headBaseline + axisBand.descent + gap + captionRoom;
  const bottom = bandTop - gap;
  const n = subject.rows.length;
  const pitch = (bottom - top) / (n + 2 * GAP_ROWS);
  const gapH = GAP_ROWS * pitch;
  const cellGap = Math.max(Math.min(cellW, pitch) * 0.07, k);
  const heightOf = (texts, r) => {
    const b = bandOf(texts.join(" "), r);
    return b.ascent + b.descent;
  };
  /** Captioned, a route's name stands over its group and not in a row, so no row owes it its band. */
  const owed = Math.max(heightOf(names.map((w) => w.text), axis), heightOf([...shares, ...Object.values(counts)].map((w) => w.text), value), CAPTIONS ? 0 : heightOf(routeNames.map((w) => w.text), annot));
  if (!(pitch - cellGap >= owed))
    throw new Error(
      `a row is ${pitch.toFixed(1)}px, too short to carry its words (${owed.toFixed(1)}px): ${n} rows and ${2 * GAP_ROWS} row of parting ` +
        `share ${(bottom - top).toFixed(0)}px, because ${stagger.lines} lines of heads take ${top.toFixed(0)}px off the top of the frame ` +
        `and the credit with the key ${(stage.height - vInset - bandTop).toFixed(0)}px off its foot`,
    );
  const grid = { left: gridLeft, right: gridRight, top, pitch, gapH, cellW, gap: cellGap };
  const xOf = (j) => gridLeft + j * cellW;
  const W = gridRight - gridLeft;

  // THE ROUTE SLOTS: the seven by route, rank kept within a route; the others keep their rank.
  const routeOrder = subject.route
    .map((g, r) => [g, r])
    .filter(([g]) => g !== null)
    .sort((a, b) => a[0] - b[0] || a[1] - b[1])
    .map(([, r]) => r);
  const binOf = (share) => BREAKS.filter((b) => share >= b).length;

  /** The first family's name stands at its rule's start, the last at its end, a middle one centred: the names spread out. */
  const familyX = (x1, x2, w, anchor) => (anchor === "start" ? x1 : anchor === "end" ? x2 - w : (x1 + x2) / 2 - w / 2);
  const families = copy.families.map((name) => {
    const from = COLUMNS.findIndex((c) => c.family === name);
    const to = COLUMNS.findLastIndex((c) => c.family === name);
    const w = measure(name, annot);
    const x1 = xOf(from);
    const x2 = xOf(to + 1) - cellGap;
    return { name: { ...w, x: familyX(x1, x2, drawnWidth(w.width), from === 0 ? "start" : to === COLUMNS.length - 1 ? "end" : "middle"), y: familyBaseline }, x1, x2, y: ruleY };
  });
  families.forEach((f, i) => {
    if (i > 0 && !(families[i - 1].name.x + drawnWidth(families[i - 1].name.width) + FAMILY_AIR * axis.lead <= f.name.x)) throw new Error(`the family names « ${families[i - 1].name.text} » and « ${f.name.text} » collide`);
  });

  const { ground, accent } = direction;
  const { ink, muted, grid: hairline } = deriveFurniture(ground);
  const walked = (c, floor, what) => {
    const w = adjustToContrast(c, ground, floor);
    if (!w) throw new Error(`${what} has no variant that reads at ${floor}:1 on ${ground}`);
    return w;
  };
  const low = mix(accent, ground, 0.9);
  const high = mix(accent, ink, 0.3);
  const bins = BREAKS.length + 1;
  const colours = {
    ground,
    ramp: Array.from({ length: bins }, (_, i) => mix(low, high, i / (bins - 1))),
    hairline,
    /** The bar before it splits: its low-carbon sources in the accent, its fossil sources in a neutral. */
    lowBar: walked(accent, NON_TEXT_CONTRAST_MIN, "a low-carbon segment"),
    fossilBar: walked(mix(muted, ground, 0.3), NON_TEXT_CONTRAST_MIN, "a fossil segment"),
    stepped: mix(ground, ink, 0.1),
    /** The 94 % line, the brackets and the ring are the ink, outside the ramp, so none reads as a value. */
    outline: walked(ink, NON_TEXT_CONTRAST_MIN, "the line and the brackets"),
    text: {
      eyebrow: walked(registers.eyebrow.fill ?? accent, TEXT_CONTRAST_MIN, "the eyebrow"),
      title: walked(registers.display.fill ?? ink, TEXT_CONTRAST_MIN, "the title"),
      axis: walked(muted, TEXT_CONTRAST_MIN, "the names and heads"),
      ink: walked(ink, TEXT_CONTRAST_MIN, "the counts"),
      accent: walked(accent, TEXT_CONTRAST_MIN, "the seven's shares"),
    },
  };

  const props = {
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, value, axis, annot, source: sourceRegister },
    titleCard,
    credit: { ...credit, at: creditAt },
    colours,
    grid,
    gapRows: GAP_ROWS,
    floor: FLOOR,
    sources: COLUMNS.map((c) => ({ lowCarbon: c.family !== "fossiles" })),
    rows: subject.rows.map((r, i) => ({
      lowCarbon: r.lowCarbon,
      route: subject.route[i],
      routeSlot: subject.route[i] === null ? i : routeOrder.indexOf(i),
      shares: COLUMNS.map((c) => shareIn(r, c)),
      cells: COLUMNS.map((c) => ({ bin: binOf(shareIn(r, c)) })),
      name: { ...names[i], x: r1(gridLeft - gap - drawnWidth(names[i].width)), dy: r1((pitch - cellGap) / 2 + centred(axisBand)) },
      share: { ...shares[i], x: r1(shareRight - drawnWidth(shares[i].width)), dy: r1((pitch - cellGap) / 2 + centred(valueBand)) },
    })),
    heads: heads.map((h, j) => ({ ...h, x: r1(xOf(j) + (cellW - cellGap) / 2 - h.width / 2), y: r1(headBaseline - lineOf(j) * axis.lead) })).filter((_, j) => !alone[j]),
    families,
    shareHead: { ...shareHead, x: r1(shareRight - drawnWidth(shareHead.width)), y: r1(headBaseline - stagger.shareLine * axis.lead) },
    floorLine: (() => {
      const x = gridLeft + (FLOOR / 100) * W;
      const w = measure(copy.floor, axis);
      return { x, top, bottom: top + (n + 2 * GAP_ROWS) * pitch, label: { ...w, x: x - w.width / 2, y: headBaseline } };
    })(),
    /** `caption`: captioned, a route's name and the count stand this far OVER their span's top, at `labelX`,
     *  instead of beside it — one lift per voice, so neither sits on the row under it. */
    bracket: { x: bracketX, tick, labelX, caption: CAPTIONS ? { annot: r1(annotBand.descent + 0.2 * annot.lead), value: r1(valueBand.descent + 0.2 * value.lead) } : null },
    counter: { texts: counts, dy: centred(valueBand), near: r1(gridRight + gap) },
    routeNames: routeNames.map((w) => ({ ...w, dy: centred(annotBand) })),
    nuclear: { x: xOf(NUCLEAR_AT), w: cellW - cellGap, pad: 0.12 * axis.lead },
    legend: { ...key, at: keyAt },
    strokes: { outline: (direction.stroke?.rule ?? 1) * k * 1.6, hairline: (direction.stroke?.hairline ?? 0.5) * k },
    halo: { value: haloOf(value, k), axis: haloOf(axis, k), annot: haloOf(annot, k) },
    states,
    timing: HEATMAP_VIDEO_TIMING,
  };
  return { id, direction, props, report: { k, titleForm: titleCard.form, sourceForm: credit.form, cell: `${cellW.toFixed(1)}×${pitch.toFixed(1)}`, headLines: stagger.lines } };
}
