// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the grid, every row's shares and classes, the
// route slots, the heads and families, the share column, the brackets, the key, the counter, the colours and the states.
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
import { BAND_PROBE, bandOf, CREDIT_ONE_LINE, DRAWN_WIDER, haloOf, keyFor, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf } from "../../skills/chart-video/scripts/shots.mjs";
import { videoRegistersOf } from "../../skills/chart-video/scripts/video-registers.mjs";
import { statesFor } from "./states.mjs";
import { ABOVE, BREAKS, FLOOR, loadSubject, NUCLEAR_COLUMN, ROUTES, SOURCES } from "./subject.mjs";
import { HEATMAP_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
export const SIZE = "landscape";
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
const LABEL_GAP = 0.4;
/** The gap that parts two routes, × the row pitch. The grid reserves it twice, half over the rows and half under. */
export const GAP_ROWS = 0.5;
/** The least air between two heads on one line, and between two family names, × the axis lead. */
const HEAD_AIR = 0.8;
const FAMILY_AIR = 0.6;

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject) };
}

const percent = (v) => `${v.toFixed(1).replace(".", ",")}${NB}%`;

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
    families: [...new Set(SOURCES.map((s) => s.family))],
    source: ["Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data", "Source : Ember, Energy Institute, via Our World in Data"],
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
    axis: `${copy.names.join(" ")} ${SOURCES.map((s) => s.label).join(" ")} ${copy.breaks.join(" ")} ${copy.floor} ${copy.shareHead} ${copy.source.join(" ")}`,
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
  // leaves the key its room.
  const key = keyFor({ registers, k, counters: [], breaks: copy.breaks });
  const keyAt = { x: stage.width - inset - key.width, y: stage.height - vInset - key.height };
  const credits = copy.source.map((_, i) => sourceCreditFor({ registers, forms: copy.source.slice(i), size: SIZE, k, ...CREDIT_ONE_LINE }));
  const fitting = credits.findIndex((c) => inset + c.width + 2 * gap < keyAt.x);
  if (fitting === -1) throw new Error("the credit and the key do not fit side by side under the matrix");
  const { register: sourceRegister, ...credit } = { ...credits[fitting], form: fitting };
  const creditAt = { x: inset, y: stage.height - vInset - credit.height };
  const bandTop = Math.min(creditAt.y, keyAt.y);

  // THE COLUMNS: the names at the left, nine sources, the share column, the bracket and its words at the right. The share
  // column's head stands on the heads' upper line, right-aligned over its values.
  const names = subject.rows.map((r) => measure(r.label, axis));
  const shares = subject.rows.map((r) => measure(copy.share(r.lowCarbon), value));
  const shareHead = measure(copy.shareHead, axis);
  const counts = Object.fromEntries(Array.from({ length: ABOVE + 1 }, (_, i) => [String(i), measure(copy.count(i), value)]));
  const routeNames = copy.routes.map((t) => measure(t, annot));
  const tick = 0.3 * axis.lead;
  const labelRoom = drawnWidth(Math.max(...Object.values(counts).map((c) => c.width), ...routeNames.map((w) => w.width)));
  const shareRoom = drawnWidth(Math.max(...shares.map((s) => s.width)));
  const gridLeft = inset + drawnWidth(Math.max(...names.map((w) => w.width))) + gap;
  const labelX = stage.width - inset - labelRoom;
  const bracketX = labelX - gap;
  const shareRight = bracketX - tick - gap;
  const gridRight = shareRight - shareRoom - gap;
  const cellW = (gridRight - gridLeft) / SOURCES.length;

  // THE HEADS: on as few lines as keep every head a word apart from its neighbours — one line when they fit, else a stagger
  // over two or three lines, the column j on line j mod the count — never rotated. The share column's head takes the first
  // line that holds it apart. Two heads closer than HEAD_AIR read as one phrase (« Charbon bas-carbone »).
  /** A column that is its family alone is named by the family over its rule; it takes no second head. */
  const alone = SOURCES.map((s) => SOURCES.filter((t) => t.family === s.family).length === 1);
  const heads = SOURCES.map((s) => measure(s.label, axis));
  const headGap = Math.max(Math.min(cellW, axis.lead) * 0.07, k);
  const air = HEAD_AIR * axis.lead;
  const centreOf = (j) => gridLeft + j * cellW + (cellW - headGap) / 2;
  const spans = heads.map((h, j) => ({ j, text: h.text, left: centreOf(j) - drawnWidth(h.width) / 2, right: centreOf(j) + drawnWidth(h.width) / 2 }));
  const shareSpan = { j: SOURCES.length, text: shareHead.text, left: shareRight - drawnWidth(shareHead.width), right: shareRight };
  const clear = (on) => on.every((h, i) => i === 0 || on[i - 1].right + air <= h.left);
  const staggerOf = (lines) => {
    const on = (line) => spans.filter((s) => !alone[s.j] && s.j % lines === line);
    if (!Array.from({ length: lines }, (_, line) => clear(on(line))).every(Boolean)) return null;
    const shareLine = Array.from({ length: lines }, (_, line) => line).find((line) => clear([...on(line), shareSpan]));
    return shareLine === undefined ? null : { lines, shareLine };
  };
  const stagger = [1, 2, 3].map(staggerOf).find(Boolean);
  if (!stagger) throw new Error(`the source heads do not stand a word apart on three lines of a ${cellW.toFixed(1)}px column`);
  if (Math.min(...spans.filter((s) => !alone[s.j]).map((s) => s.left)) < inset) throw new Error("a source head runs off the frame");
  /** A head's line, counted up from the line nearest the grid. */
  const lineOf = (j) => j % stagger.lines;
  const familyBaseline = vInset + Math.max(annotBand.ascent, axisBand.ascent);
  const ruleY = familyBaseline + Math.max(annotBand.descent, axisBand.descent) + 0.25 * axis.lead;
  const headBaseline = ruleY + 0.3 * axis.lead + axisBand.ascent + (stagger.lines - 1) * axis.lead;

  // THE ROWS: twelve, and the two gaps a route parting takes. A row owes the band of the words it carries.
  const top = headBaseline + axisBand.descent + gap;
  const bottom = bandTop - gap;
  const n = subject.rows.length;
  const pitch = (bottom - top) / (n + 2 * GAP_ROWS);
  const gapH = GAP_ROWS * pitch;
  const cellGap = Math.max(Math.min(cellW, pitch) * 0.07, k);
  const heightOf = (texts, r) => {
    const b = bandOf(texts.join(" "), r);
    return b.ascent + b.descent;
  };
  const owed = Math.max(heightOf(names.map((w) => w.text), axis), heightOf([...shares, ...Object.values(counts)].map((w) => w.text), value), heightOf(routeNames.map((w) => w.text), annot));
  if (!(pitch - cellGap >= owed)) throw new Error(`a row is ${pitch.toFixed(1)}px, too short to carry its words (${owed.toFixed(1)}px)`);
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
    const from = SOURCES.findIndex((s) => s.family === name);
    const to = SOURCES.findLastIndex((s) => s.family === name);
    const w = measure(name, annot);
    const x1 = xOf(from);
    const x2 = xOf(to + 1) - cellGap;
    return { name: { ...w, x: familyX(x1, x2, drawnWidth(w.width), from === 0 ? "start" : to === SOURCES.length - 1 ? "end" : "middle"), y: familyBaseline }, x1, x2, y: ruleY };
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
    sources: SOURCES.map((s) => ({ lowCarbon: s.family !== "fossiles" })),
    rows: subject.rows.map((r, i) => ({
      lowCarbon: r.lowCarbon,
      route: subject.route[i],
      routeSlot: subject.route[i] === null ? i : routeOrder.indexOf(i),
      shares: r.shares,
      cells: r.shares.map((share) => ({ bin: binOf(share) })),
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
    bracket: { x: bracketX, tick, labelX },
    counter: { texts: counts, dy: centred(valueBand), near: r1(gridRight + gap) },
    routeNames: routeNames.map((w) => ({ ...w, dy: centred(annotBand) })),
    nuclear: { x: xOf(NUCLEAR_COLUMN), w: cellW - cellGap, pad: 0.12 * axis.lead },
    legend: { ...key, at: keyAt },
    strokes: { outline: (direction.stroke?.rule ?? 1) * k * 1.6, hairline: (direction.stroke?.hairline ?? 0.5) * k },
    halo: { value: haloOf(value, k), axis: haloOf(axis, k), annot: haloOf(annot, k) },
    states,
    timing: HEATMAP_VIDEO_TIMING,
  };
  return { id, direction, props, report: { k, titleForm: titleCard.form, sourceForm: credit.form, cell: `${cellW.toFixed(1)}×${pitch.toFixed(1)}`, headLines: stagger.lines } };
}
