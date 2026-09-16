// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the two rails on one scale, every ribbon's two
// ends, the whole bar, the copy's two places, the share's two places inside the ribbon, every counter text
// measured and keyed, the colours and the states.
//
// Runs in Bun only.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { adjustToContrast, contrast, mix, NON_TEXT_CONTRAST_MIN, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { frameInsetFor, sizeFor } from "#shared/chart-video/sizes.mjs";
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
export const SIZE = "landscape";
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
    source: [
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

  const titleCard = titleCardFor({ registers, eyebrow: copy.eyebrow, title: copy.title, size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });

  // THE CREDIT, ON ONE LINE UNDER THE PICTURE.
  const { register: sourceRegister, ...credit } = sourceCreditFor({ registers, forms: copy.source, size: SIZE, k, ...CREDIT_ONE_LINE });
  const creditAt = { x: inset, y: stage.height - vInset - credit.height };

  // THE LABELS: « name value » on one line, the name in the annot voice, the total in the value voice.
  const space = 0.3 * value.fontSize;
  const labelOf = (n) => ({ name: measure(n.label, annot), value: measure(valueOf(n.total), value) });
  const roomOf = (nodes) => Math.max(...nodes.map((n) => { const l = labelOf(n); return wider(l.name.width) + space + wider(l.value.width); }));
  const rail = { w: RAIL * px, wide: RAIL * px * WIDE };
  const leftRail = inset + roomOf(subject.sources) + gap / 2;
  const rightRail = stage.width - inset - roomOf(subject.countries) - gap / 2 - rail.w;

  // THE TWO RAILS, ON ONE SCALE.
  const nodeGap = NODE_GAP * px;
  const plotTop = vInset + band.ascent / 2;
  const plotBottom = creditAt.y - gap - band.descent;
  const scale = (plotBottom - plotTop - nodeGap * (Math.max(subject.sources.length, subject.countries.length) - 1)) / subject.grand;
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
  const sources = stack(subject.sources, leftRail);
  const countries = stack(subject.countries, rightRail).map(({ yWhole, ...c }) => c);

  // CONSERVATION IS DRAWN: every flow a ribbon, stacked in the other rail's order on both ends, true heights.
  const order = (list, key) => list.findIndex((n) => n.key === key);
  const offsets = new Map();
  const flows = subject.flows
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
  if (Math.abs(tracked.by - (holder.y0 + subject.bandStart * scale)) > 1e-6) throw new Error("the tracked ribbon does not land on the country's own nuclear band");
  if (Math.abs(tracked.ay - nuclear.y0) > 1e-6) throw new Error("the tracked ribbon is not the top of the nuclear bar");

  // THE LABELS SPACED, NOT DROPPED: the register's band as the minimum pitch, pushed down then pulled back inside.
  const pitch = band.ascent + band.descent + 0.15 * value.fontSize;
  const spaced = (boxes, bottom) => {
    const ys = boxes.map((b) => b.y0 + b.h / 2);
    ys[0] = Math.max(ys[0], vInset + band.ascent - baselineShift);
    for (let i = 1; i < ys.length; i++) ys[i] = Math.max(ys[i], ys[i - 1] + pitch);
    const limit = bottom - band.descent - baselineShift;
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
      const y = ys[i] + baselineShift;
      if (side === "left") {
        const valueX = leftRail - gap / 2 - wider(l.value.width);
        return { ...b, name: { ...l.name, x: valueX - space - wider(l.name.width), y }, value: { ...l.value, x: valueX, y } };
      }
      const nameX = rightRail + rail.w + gap / 2;
      return { ...b, name: { ...l.name, x: nameX, y }, value: { ...l.value, x: nameX + wider(l.name.width) + space, y } };
    });

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
  const placeFrom = (start, step) => {
    for (let cx = start; cx - halfW > tracked.x0 && cx + halfW < tracked.x1; cx += step) {
      const x0 = cx - halfW;
      const x1 = cx + halfW;
      const a = edgesAt(tracked, x0);
      const b = edgesAt(tracked, x1);
      const top = Math.max(a.top, b.top);
      const bottom = Math.min(a.bottom, b.bottom);
      const y0 = (top + bottom) / 2 - (valueBand.ascent + valueBand.descent) / 2 - pad;
      const y1 = y0 + valueBand.ascent + valueBand.descent + 2 * pad;
      if (top <= y0 && bottom >= y1) return { ...share, cx, x: cx - share.width / 2, y: y0 + pad + valueBand.ascent, box: { x0, x1, y0, y1 } };
    }
    throw new Error("the share has no place inside the accent ribbon");
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
    sources: withLabels(sources, leftYs, "left"),
    countries: withLabels(countries, rightYs, "right"),
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
