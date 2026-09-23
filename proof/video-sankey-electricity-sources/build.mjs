// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the two rails on one scale, every ribbon's two
// ends, the whole bar, the copy's two places, the share's two places inside the ribbon, every counter text
// measured and keyed, the colours and the states.
//
// Runs in Bun only.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { adjustToContrast, contrast, mix, NON_TEXT_CONTRAST_MIN, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { frameInsetFor, sizeFor, videoExportSize } from "#shared/chart-video/sizes.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { EYEBROW_TO_DISPLAY, registerOf } from "#shared/design-base/register.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { applyCase } from "../../skills/chart-video/scripts/registers.mjs";
import { BAND_PROBE, bandOf, CREDIT_ONE_LINE, DRAWN_WIDER, haloOf, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf } from "../../skills/chart-video/scripts/shots.mjs";
import { videoRegistersOf } from "../../skills/chart-video/scripts/video-registers.mjs";
import { edgesAt, shareText, twhText } from "./scene.mjs";
import { statesFor } from "./states.mjs";
import { loadSubject } from "./subject.mjs";
import { SANKEY_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
/** The size this run exports at — `--size`, landscape when nothing asks. R2 names three and
 *  everything under it already answered per size; only this line pinned the beat to one. */
export const SIZE = videoExportSize();
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
/** The static's rail (9 px), gap (7 px) and alphas, at its 960-wide plate; scaled to the frame here. */
const STATIC_WIDTH = 960;
const RAIL = 9;
const NODE_GAP = 7;
const RIBBON_ALPHA = 0.55;
const TRACKED_ALPHA = 0.85;
/** The whole bar and its copy are this many rails wide — wide enough to read as a bar, not a rail. */
const WIDE = 3;
/** A flow under this many px is still drawn at it; its stacking keeps its true height. */
const MIN_RIBBON = 1;

/**
 * THE NARROW FRAME DRAWS THE SAME ARGUMENT DIFFERENTLY.
 *
 * At 1920 the two label gutters fit beside the rails. At 1080 they do not, and the arithmetic is
 * not close: measured 2026-09-24, the widest source label (« Hydraulique 346,2 » on one line) is
 * 527px and the widest country label 473px, so 527 + 473 + two 72px margins + the rail leave the
 * ribbons MINUS 102px of frame. That is why the beat refused at portrait and at square with « the
 * share has no place inside the accent ribbon »: there was no ribbon left to place it in.
 *
 * So a narrow frame re-cuts the drawing rather than shrinking it. The rails move out to the
 * margins and every node's label moves INSIDE the field, stacked on two lines — the name over its
 * total — against its own rail, struck in the ground so it reads over the ribbons it crosses.
 * Stacked, the widest source label is 441px and the widest country label 305px: 746px of the
 * 916px field, 170px clear between the two columns, and the whole field for the ribbons.
 */
const NARROW = SIZE !== "landscape";

/**
 * THE NARROW RAIL — R8, AND THE ONE RE-ORDERING THAT MAKES THE CLAIM PLACEABLE.
 *
 * Two changes, both measured, both stated on the plate.
 *
 * FEWER. A stacked label is 105px tall at 1080 and the square's plot is 794px, so nine of them want
 * 945px and cannot be spaced apart; and « Autres renouv. » at 450px is what pushes the left column
 * into the field the share needs. Two merges inside the rail's own families bring it to six and the
 * widest name down to « Hydraulique »: bioenergy joins the other renewables as « Autres », and the
 * three fossils become one « Fossiles ». The credit says out loud that nine sources are drawn as six.
 *
 * FIRST. The tracked ribbon runs from the top of nuclear's node to nuclear's band inside France.
 * With nuclear fifth on the rail that ribbon falls 350px across the frame, and a falling ribbon is
 * a thin one to write in: over the 153px « 84 % » needs, its two edges shift by more than the 175px
 * the ribbon is thick, so at 1080 there is no abscissa anywhere along it where the word fits between
 * them — which is the refusal this beat carried. Measured over the whole span: the band is 160px at
 * the ends and 65px in the middle, against the 81px the word needs, and the ends are where the two
 * label columns stand.
 *
 * Nuclear leading the rail is the arrangement that answers it. France leads the country rail
 * already (the subject asserts it), so with nuclear first the ribbon leaves the top of one rail and
 * lands on the top of the other: it is HORIZONTAL, 175px thick over its whole length, and the share
 * has a straight band to sit in between the two label columns. The rail's families still read —
 * nuclear, then the renewables, then the fossils — and nothing about any quantity moves.
 */
const NARROW_RAIL = [
  { at: "Nuclear", keys: ["Nuclear"], label: "Nucléaire" },
  { at: "Wind", keys: ["Wind"], label: "Éolien" },
  { at: "Solar", keys: ["Solar"], label: "Solaire" },
  { at: "Hydropower", keys: ["Hydropower"], label: "Hydraulique" },
  { at: "Bioenergy", keys: ["Bioenergy", "Other renewables"], label: "Autres" },
  { at: "Gas", keys: ["Gas", "Coal", "Oil"], label: "Fossiles" },
];

/** The rail this frame draws: the subject's nine sources in its own order at landscape, the six of
 *  `NARROW_RAIL` in theirs under it — with every flow re-keyed onto the group it now belongs to, so
 *  conservation is the same sum it was and no value is rounded on the way. */
export function railFor(subject) {
  if (!NARROW) return { sources: subject.sources, flows: subject.flows };
  const groupOf = new Map();
  for (const g of NARROW_RAIL) for (const key of g.keys) groupOf.set(key, g.at);
  for (const s of subject.sources) if (!groupOf.has(s.key)) throw new Error(`the narrow rail has no place for ${s.key}`);
  const sources = NARROW_RAIL.map((g) => ({
    key: g.at,
    label: g.label,
    total: subject.sources.filter((n) => g.keys.includes(n.key)).reduce((sum, n) => sum + n.total, 0),
  }));
  const flows = [];
  const index = new Map();
  for (const g of NARROW_RAIL)
    for (const f of subject.flows.filter((x) => g.keys.includes(x.from))) {
      const at = index.get(`${g.at}|${f.to}`);
      if (at === undefined) {
        index.set(`${g.at}|${f.to}`, flows.length);
        flows.push({ from: g.at, to: f.to, value: f.value });
      } else flows[at].value += f.value;
    }
  const grouped = sources.reduce((sum, n) => sum + n.total, 0);
  if (Math.abs(grouped - subject.grand) > 1e-9) throw new Error(`the narrow rail loses ${(subject.grand - grouped).toFixed(3)} TWh of the whole`);
  if (sources[0].key !== subject.biggest.key) throw new Error(`the narrow rail must lead with ${subject.biggest.key}, or the tracked ribbon is not horizontal`);
  return { sources, flows };
}

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject) };
}

/** The static's own rounding (`toLocaleString`), which rounds 268,15 up where `toFixed` sets 268,1. */
export const valueOf = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).replace(/[\u202f\u00a0]/g, "\u00A0");

export function copyOf(subject) {
  const share = Math.round(subject.share * 100);
  return {
    eyebrow: `Énergie${NB}· Europe`,
    title: [`Le nucléaire de ces six pays est français à ${share}${NB}%`],
    share,
    // R8's own sentence. A narrow frame draws six sources where the landscape draws nine, so the
    // credit names the reduction rather than letting the plate imply the rail is the whole list.
    // The forms shorten as usual, and the last one exists so the statement survives the shortest
    // credit this frame can hold.
    source: NARROW
      ? [
          "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data · les neuf sources sont réunies en six",
          "Source : Ember, Energy Institute – Statistical Review of World Energy, via Our World in Data · les neuf sources sont réunies en six",
          "Source : Ember, Energy Institute, via Our World in Data · les neuf sources sont réunies en six",
          "Ember, via Our World in Data · neuf sources réunies en six",
        ]
      : [
          "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
          "Source : Ember, Energy Institute – Statistical Review of World Energy, via Our World in Data",
          "Source : Ember, Energy Institute, via Our World in Data",
        ],
  };
}

export function textPerRegisterOf(copy, subject) {
  const nodes = [...subject.sources, ...subject.countries];
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: nodes.map((n) => n.label).join(" "),
    value: `${nodes.map((n) => valueOf(n.total)).join(" ")} ${twhText(Math.round(subject.grand))} 0123456789 ${shareText(copy.share)}`,
    axis: copy.source.join(" "),
  };
}

export function buildDirection(id, { subject, states, copy }) {
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, `${id}.md`)), textPerRegisterOf(copy, subject));
  const resolved = Object.fromEntries(REGISTER_NAMES.map((name) => [name, registerOf(direction, name)]));
  const registers = videoRegistersOf(resolved, SIZE);
  const k = registers.axis.fontSize / resolved.axis.fontSize;
  const row = sizeFor(SIZE);
  const stage = { width: row.width, height: row.height };
  const px = stage.width / STATIC_WIDTH;
  const inset = frameInsetFor(SIZE);
  const vInset = verticalInsetFor(SIZE);
  for (const [name, r] of Object.entries(registers)) if (!(r.fontSize >= row.minTypePx)) throw new Error(`register ${name} is ${r.fontSize}px, under the ${row.minTypePx}px floor`);
  const { axis, value, annot } = registers;
  const measure = (t, r) => {
    const cased = applyCase(t, r.transform);
    return { text: cased, width: widthOf(cased, r) };
  };
  const wider = (w) => w * (1 + DRAWN_WIDER);
  const gap = 0.4 * axis.lead;
  const valueBand = bandOf(BAND_PROBE, value);
  const annotBand = bandOf(BAND_PROBE, annot);
  const band = { ascent: Math.max(valueBand.ascent, annotBand.ascent), descent: Math.max(valueBand.descent, annotBand.descent) };
  const baselineShift = (valueBand.ascent - valueBand.descent) / 2;

  const rail0 = railFor(subject);

  const titleCard = titleCardFor({ registers, eyebrow: copy.eyebrow, title: copy.title, size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });

  // THE CREDIT, ON ONE LINE UNDER THE PICTURE.
  const { register: sourceRegister, ...credit } = sourceCreditFor({ registers, forms: copy.source, size: SIZE, k, ...CREDIT_ONE_LINE });
  const creditAt = { x: inset, y: stage.height - vInset - credit.height };

  // THE LABELS: « name value » on one line, the name in the annot voice, the total in the value voice.
  // At a narrow frame the same two words stack, the name over the total, and the pair sits inside the
  // field against its own rail — see NARROW. `sep` is the two baselines' distance: the total's own
  // ascent plus the name's descent, plus a sixteenth of the total's size so the lines are not touching.
  const space = 0.3 * value.fontSize;
  const sep = valueBand.ascent + annotBand.descent + 0.06 * value.fontSize;
  const labelOf = (n) => ({ name: measure(n.label, annot), value: measure(valueOf(n.total), value) });
  const roomOf = (nodes) => Math.max(...nodes.map((n) => { const l = labelOf(n); return wider(l.name.width) + space + wider(l.value.width); }));
  const rail = { w: RAIL * px, wide: RAIL * px * WIDE };
  const leftRail = NARROW ? inset : inset + roomOf(rail0.sources) + gap / 2;
  const rightRail = NARROW ? stage.width - inset - rail.w : stage.width - inset - roomOf(subject.countries) - gap / 2 - rail.w;

  // THE TWO RAILS, ON ONE SCALE.
  const nodeGap = NODE_GAP * px;
  const plotTop = vInset + band.ascent / 2;
  const plotBottom = creditAt.y - gap - band.descent;
  const scale = (plotBottom - plotTop - nodeGap * (Math.max(rail0.sources.length, subject.countries.length) - 1)) / subject.grand;
  const stack = (nodes, x) => {
    let y = plotTop;
    let yWhole = plotTop;
    return nodes.map((n) => {
      const h = n.total * scale;
      const box = { key: n.key, label: n.label, total: n.total, x, y0: y, yWhole, h };
      y += h + nodeGap;
      yWhole += h;
      return box;
    });
  };
  const sources = stack(rail0.sources, leftRail);
  const countries = stack(subject.countries, rightRail).map(({ yWhole, ...c }) => c);

  // CONSERVATION IS DRAWN: every flow a ribbon, stacked in the other rail's order on both ends, true heights.
  const order = (list, key) => list.findIndex((n) => n.key === key);
  const offsets = new Map();
  const flows = rail0.flows
    .slice()
    .sort((a, b) => order(sources, a.from) - order(sources, b.from) || order(countries, a.to) - order(countries, b.to))
    .map((f) => {
      const si = order(sources, f.from);
      const from = sources[si];
      const to = countries[order(countries, f.to)];
      const hTrue = f.value * scale;
      const left = offsets.get(`L${f.from}`) ?? 0;
      const right = offsets.get(`R${f.to}`) ?? 0;
      offsets.set(`L${f.from}`, left + hTrue);
      offsets.set(`R${f.to}`, right + hTrue);
      return { from: f.from, to: f.to, value: f.value, si, hTrue, h: Math.max(hTrue, MIN_RIBBON), ay: from.y0 + left, by: to.y0 + right, x0: leftRail + rail.w, x1: rightRail, tracked: f.from === subject.biggest.key && f.to === subject.holder.key };
    });
  const tracked = flows.find((f) => f.tracked);
  const nuclear = sources.find((s) => s.key === subject.biggest.key);
  const holder = countries.find((c) => c.key === subject.holder.key);
  // The band the tracked ribbon lands on is the sum of what the sources ABOVE nuclear pour into the
  // holder, so it is read off the rail THIS frame draws — nine sources in the subject's order at
  // landscape, where it is the subject's own recorded figure, and zero under the narrow rail, where
  // nuclear leads and its band is the top of the country's node.
  const above = rail0.sources.slice(0, rail0.sources.findIndex((s) => s.key === subject.biggest.key)).map((s) => s.key);
  const bandStart = rail0.flows.filter((f) => f.to === subject.holder.key && above.includes(f.from)).reduce((sum, f) => sum + f.value, 0);
  if (!NARROW && Math.abs(bandStart - subject.bandStart) > 1e-9) throw new Error("the rail drawn at landscape is not the one the subject measured its band against");
  if (Math.abs(tracked.by - (holder.y0 + bandStart * scale)) > 1e-6) throw new Error("the tracked ribbon does not land on the country's own nuclear band");
  if (Math.abs(tracked.ay - nuclear.y0) > 1e-6) throw new Error("the tracked ribbon is not the top of the nuclear bar");

  // THE LABELS SPACED, NOT DROPPED: the register's band as the minimum pitch, pushed down then pulled back inside.
  // `labelInk` is what one label puts above and below the TOTAL's baseline — the shared band on one line, and the
  // name's line on top of it when the two stack — so the pitch and the two clamps are the same arithmetic at
  // every frame and only the number changes. `labelShift` centres that block on the node, where the one-line
  // label's own shift centres a single line; `baselineShift` stays the value line's, because the whole bar's
  // counter and the share are single lines and must not move at landscape.
  const labelInk = NARROW ? { above: sep + annotBand.ascent, below: valueBand.descent } : { above: band.ascent, below: band.descent };
  const labelShift = NARROW ? (labelInk.above - labelInk.below) / 2 : baselineShift;
  const pitch = labelInk.above + labelInk.below + 0.15 * value.fontSize;
  const spaced = (boxes, bottom) => {
    const ys = boxes.map((b) => b.y0 + b.h / 2);
    ys[0] = Math.max(ys[0], vInset + labelInk.above - labelShift);
    for (let i = 1; i < ys.length; i++) ys[i] = Math.max(ys[i], ys[i - 1] + pitch);
    const limit = bottom - labelInk.below - labelShift;
    if (ys.at(-1) > limit) {
      ys[ys.length - 1] = limit;
      for (let i = ys.length - 2; i >= 0; i--) ys[i] = Math.min(ys[i], ys[i + 1] - pitch);
    }
    return ys;
  };
  const leftYs = spaced(sources, creditAt.y - gap);
  const rightYs = spaced(countries, creditAt.y - gap);
  const withLabels = (boxes, ys, side) =>
    boxes.map((b, i) => {
      const l = labelOf(b);
      const y = ys[i] + labelShift;
      if (NARROW) {
        // Inside the field, against its own rail: the source's two lines start where its rail ends, the
        // country's two lines end where its rail begins.
        if (side === "left") {
          const x = leftRail + rail.w + gap / 2;
          return { ...b, name: { ...l.name, x, y: y - sep }, value: { ...l.value, x, y } };
        }
        const right = rightRail - gap / 2;
        return { ...b, name: { ...l.name, x: right - wider(l.name.width), y: y - sep }, value: { ...l.value, x: right - wider(l.value.width), y } };
      }
      if (side === "left") {
        const valueX = leftRail - gap / 2 - wider(l.value.width);
        return { ...b, name: { ...l.name, x: valueX - space - wider(l.name.width), y }, value: { ...l.value, x: valueX, y } };
      }
      const nameX = rightRail + rail.w + gap / 2;
      return { ...b, name: { ...l.name, x: nameX, y }, value: { ...l.value, x: nameX + wider(l.name.width) + space, y } };
    });
  const sourceNodes = withLabels(sources, leftYs, "left");
  const countryNodes = withLabels(countries, rightYs, "right");

  // THE TWO COLUMNS STAY TWO COLUMNS. Inside the field nothing but this arithmetic keeps a source's
  // total off a country's name, so it is asserted rather than eyeballed: the furthest right any source
  // label reaches, against the furthest left any country label starts.
  const boxOf = (n) => ({
    x0: Math.min(n.name.x, n.value.x),
    x1: Math.max(n.name.x + wider(n.name.width), n.value.x + wider(n.value.width)),
    y0: Math.min(n.name.y - annotBand.ascent, n.value.y - valueBand.ascent),
    y1: Math.max(n.name.y + annotBand.descent, n.value.y + valueBand.descent),
  });
  const labelBoxes = NARROW ? [...sourceNodes, ...countryNodes].map(boxOf) : [];
  const columns = NARROW
    ? { reach: Math.max(...sourceNodes.map((n) => boxOf(n).x1)), start: Math.min(...countryNodes.map((n) => boxOf(n).x0)) }
    : null;

  // THE WHOLE BAR, ITS COUNTER BESIDE IT.
  const total = Math.round(subject.grand);
  const whole = { x: leftRail, y: plotTop, h: subject.grand * scale, total, countX: leftRail + rail.wide + gap };
  const counts = Object.fromEntries(Array.from({ length: total + 1 }, (_, v) => twhText(v)).map((t) => [t, widthOf(applyCase(t, value.transform), value)]));

  // THE COPY: the nuclear bar, carried to the left of France's node, its top level with France's nuclear band.
  const copyTo = { x: rightRail - gap - rail.wide, y: tracked.by, w: rail.wide, h: nuclear.h };
  const share = measure(shareText(copy.share), value);

  // « 84 % » INSIDE THE ACCENT RIBBON: where the copy lands, just left of it; at the end, nearest the source. Each is the
  // first place, walking from its end, where the word's box sits inside both edges.
  const pad = 0.2 * value.fontSize;
  const halfW = wider(share.width) / 2 + pad;
  // THE FIELD BETWEEN THE TWO COLUMNS IS WHAT THE SHARE IS PLACED IN, so it is asserted here rather
  // than discovered 350 steps into the walk below: the columns must leave the word its own width.
  if (columns && !(columns.start - columns.reach >= 2 * halfW))
    throw new Error(
      `the two label columns leave ${(columns.start - columns.reach).toFixed(0)}px of clear field ` +
        `(${columns.reach.toFixed(0)}..${columns.start.toFixed(0)}) and « ${share.text} » needs ${(2 * halfW).toFixed(0)}px`,
    );
  // At a narrow frame the labels stand in the field the ribbon crosses, so a place is only a place when
  // the word also clears every one of them — the same walk, one more condition on it.
  const clearOfLabels = (box) => labelBoxes.every((l) => box.x1 < l.x0 || box.x0 > l.x1 || box.y1 < l.y0 || box.y0 > l.y1);
  const placeFrom = (start, step) => {
    const blocked = { ribbon: 0, label: 0 };
    for (let cx = start; cx - halfW > tracked.x0 && cx + halfW < tracked.x1; cx += step) {
      const x0 = cx - halfW;
      const x1 = cx + halfW;
      const a = edgesAt(tracked, x0);
      const b = edgesAt(tracked, x1);
      const top = Math.max(a.top, b.top);
      const bottom = Math.min(a.bottom, b.bottom);
      const y0 = (top + bottom) / 2 - (valueBand.ascent + valueBand.descent) / 2 - pad;
      const y1 = y0 + valueBand.ascent + valueBand.descent + 2 * pad;
      if (!(top <= y0 && bottom >= y1)) blocked.ribbon += 1;
      else if (!clearOfLabels({ x0, x1, y0, y1 })) blocked.label += 1;
      if (top <= y0 && bottom >= y1 && clearOfLabels({ x0, x1, y0, y1 })) return { ...share, cx, x: cx - share.width / 2, y: y0 + pad + valueBand.ascent, box: { x0, x1, y0, y1 } };
    }
    // The refusal carries its own arithmetic: how far the walk got, and whether the ribbon or a
    // label was what closed every step — otherwise the next frame size is debugged by guesswork.
    throw new Error(
      `the share has no place inside the accent ribbon: walking from ${start.toFixed(0)} by ${step}, ` +
        `${blocked.ribbon} steps were outside the ribbon's edges and ${blocked.label} were over a label, ` +
        `for a word ${(2 * halfW).toFixed(0)}px wide in a ribbon spanning ${tracked.x0.toFixed(0)}..${tracked.x1.toFixed(0)}`,
    );
  };
  const shareLine = placeFrom(copyTo.x - gap / 2 - halfW, -2);
  const mark = placeFrom(tracked.x0 + gap + halfW, 2);
  if (!(mark.cx < shareLine.cx)) throw new Error("the share's two places are in the wrong order along the ribbon");

  // COLOURS: the static's ordered ramp inside the neutral field, one accent on the tracked flow and its two nodes.
  const { ground, accent } = direction;
  const { ink, muted } = deriveFurniture(ground);
  const walked = (c, against, floor, what) => {
    const w = adjustToContrast(c, against, floor);
    if (!w) throw new Error(`${what} has no variant that reads at ${floor}:1 on ${against}`);
    return w;
  };
  const full = walked(accent, ground, NON_TEXT_CONTRAST_MIN, "the tracked flow");
  const rampTo = mix(accent, ground, 0.62);
  const mutedInk = walked(muted, ground, TEXT_CONTRAST_MIN, "a muted word");
  const ribbonFill = sources.map((_, i) => mix(muted, rampTo, sources.length > 1 ? i / (sources.length - 1) : 0));
  const railFill = ribbonFill.map((c) => adjustToContrast(c, ground, NON_TEXT_CONTRAST_MIN) ?? mutedInk);
  const markGround = mix(full, ground, 1 - TRACKED_ALPHA);
  const colours = {
    ground,
    full,
    ribbon: ribbonFill,
    rail: railFill,
    countryRail: mutedInk,
    markGround,
    text: {
      eyebrow: walked(registers.eyebrow.fill ?? accent, ground, TEXT_CONTRAST_MIN, "the eyebrow"),
      title: walked(registers.display.fill ?? ink, ground, TEXT_CONTRAST_MIN, "the title"),
      name: walked(annot.fill ?? ink, ground, TEXT_CONTRAST_MIN, "a node's name"),
      value: walked(ink, ground, TEXT_CONTRAST_MIN, "a node's total"),
      accent: walked(accent, ground, TEXT_CONTRAST_MIN, "an accented word"),
      onMark: walked(contrast(ink, markGround) >= contrast(ground, markGround) ? ink : ground, markGround, TEXT_CONTRAST_MIN, "the share on the ribbon"),
      axis: mutedInk,
    },
  };

  const props = {
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, value, annot, axis, source: sourceRegister },
    titleCard,
    credit: { ...credit, at: creditAt },
    colours,
    alpha: { ribbon: RIBBON_ALPHA, tracked: TRACKED_ALPHA },
    scale,
    gap: nodeGap,
    rail,
    whole,
    counts,
    baselineShift,
    sources: sourceNodes,
    countries: countryNodes,
    /** Null at landscape, where a label sits in its own gutter on the ground. Inside the field it is
     *  struck in the ground so the name reads over the ribbons it crosses. */
    labelHalo: NARROW ? { colour: ground, width: haloOf(annot, k) } : null,
    flows,
    subjectKey: nuclear.key,
    trackedTo: holder.key,
    copy: { from: { x: nuclear.x, y: nuclear.y0, w: rail.w, h: nuclear.h }, to: copyTo, part: tracked.hTrue },
    share: shareLine,
    mark,
    halo: haloOf(value, k),
    states,
    timing: SANKEY_VIDEO_TIMING,
  };
  return {
    id,
    direction,
    props,
    report: { k, titleForm: titleCard.form, sourceForm: credit.form, scale: scale.toFixed(4), share: (subject.share * 100).toFixed(1) },
  };
}
