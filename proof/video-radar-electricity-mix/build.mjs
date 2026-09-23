// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the wheel (its radius the largest that seats
// every spoke's words inside the frame, clear of the key, the credit and each other), the two bars on the wheel's own
// px-per-% scale, every text measured, the colours with their contrast floors, and the states.
//
// Runs in Bun only.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { adjustToContrast, NON_TEXT_CONTRAST_MIN, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { frameInsetFor, sizeFor, videoExportSize } from "#shared/chart-video/sizes.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { EYEBROW_TO_DISPLAY, registerOf } from "#shared/design-base/register.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { applyCase } from "../../skills/chart-video/scripts/registers.mjs";
import { BAND_PROBE, bandOf, CREDIT_ONE_LINE, DRAWN_WIDER, haloOf, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf } from "../../skills/chart-video/scripts/shots.mjs";
import { videoRegistersOf } from "../../skills/chart-video/scripts/video-registers.mjs";
import { spokeAngle } from "./scene.mjs";
import { statesFor } from "./states.mjs";
import { loadSubject, YEAR } from "./subject.mjs";
import { RADAR_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
/** The size this run exports at — `--size`, landscape when nothing asks. R2 names three and
 *  everything under it already answered per size; only this line pinned the beat to one. */
export const SIZE = videoExportSize();
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
/** The static plate is 960 wide; its strokes are scaled to the frame by this. */
const STATIC_WIDTH = 960;
/** The static's fills, subject then the other. */
const FILL = [0.18, 0.22];
/** Shares of the wheel's radius: a bar's thickness, the cut's gap, a landed part's width. */
const BAR = 0.075;
const CUT = 0.022;
const PART = 0.028;
/** Shares of a register's lead: a word's gap to what it names, between a spoke's two lines. */
const LABEL_GAP = 0.45;
const LINE_GAP = 0.12;
/** The ring around a spoke's shares, as shares of the value register's size. */
const RING_PAD = { x: 0.32, y: 0.14 };
/** The camera's largest magnification of the bars, and the air between the two names, × their band. */
const ZOOM = 1.6;
const NAME_AIR = 1.1;

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject) };
}

const fr = (v, digits = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).replace(/[\u202F\u00A0\u2009]/g, NB);

export function copyOf() {
  return {
    eyebrow: `Énergie${NB}· Europe`,
    title: [
      `La France et l’Allemagne produisent presque autant d’électricité, avec des mix opposés`,
      `France et Allemagne${NB}: autant d’électricité, des mix opposés`,
    ],
    twh: (v) => `${fr(v)}${NB}TWh`,
    full: `100${NB}%`,
    ceiling: (v) => `${fr(v, 0)}${NB}%`,
    shares: (a, b) => [fr(a), `${NB}·${NB}`, fr(b)],
    /** A SHORTER NAME FOR A SPOKE, WHERE THE FULL ONE LEAVES NO WHEEL. The nine names stand at the rim, so a horizontal
     *  spoke's name is spent out of the half-frame the wheel has to share with it: « Autres renouv. » is 367px of 875 at
     *  1920 and 441px of 468 at 1080 (measured 2026-09-23), which leaves a radius of nothing. The full names are tried
     *  first and 1920 keeps them; these are the fallback, and the same device `video-parallel-coordinates` uses for
     *  « R.-U. » where a full country name would cross a neighbouring rail. */
    shortSpoke: {
      Hydropower: `Hydro.`,
      Bioenergy: `Bio.`,
      "Other renewables": `Autres`,
      Nuclear: `Nucl.`,
    },
    source: [
      "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
      "Source : Ember, Energy Institute – Statistical Review of World Energy, via Our World in Data",
      "Source : Ember, Energy Institute, via Our World in Data",
    ],
  };
}

export function textPerRegisterOf(copy, subject) {
  const { spokes, countries, ceiling } = subject;
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: `${spokes.map((s) => s.label).join(" ")} ${countries.map((c) => c.name).join(" ")}`,
    value: `${spokes.map((_, j) => copy.shares(countries[0].shares[j], countries[1].shares[j]).join("")).join(" ")} ${countries.map((c) => copy.twh(c.total)).join(" ")} ${copy.full}`,
    axis: `${copy.ceiling(ceiling)} ${copy.source.join(" ")}`,
  };
}

const overlap = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

export function buildDirection(id, { subject, states, copy }) {
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, `${id}.md`)), textPerRegisterOf(copy, subject));
  const resolved = Object.fromEntries(REGISTER_NAMES.map((name) => [name, registerOf(direction, name)]));
  const registers = videoRegistersOf(resolved, SIZE);
  const k = registers.axis.fontSize / resolved.axis.fontSize;
  const row = sizeFor(SIZE);
  const stage = { width: row.width, height: row.height };
  const S = stage.width / STATIC_WIDTH;
  const inset = frameInsetFor(SIZE);
  const vInset = verticalInsetFor(SIZE);
  for (const [name, r] of Object.entries(registers)) if (!(r.fontSize >= row.minTypePx)) throw new Error(`register ${name} is ${r.fontSize}px, under the ${row.minTypePx}px floor`);
  const { axis, value, annot } = registers;
  const measure = (t, r) => {
    const cased = applyCase(t, r.transform);
    return { text: cased, width: widthOf(cased, r) };
  };
  const drawn = (m) => m.width * (1 + DRAWN_WIDER);
  const aBand = bandOf(BAND_PROBE, axis);
  const vBand = bandOf(BAND_PROBE, value);
  const nBand = bandOf(BAND_PROBE, annot);
  const { spokes, countries, ceiling, rings } = subject;
  const n = spokes.length;

  const titleCard = titleCardFor({ registers, eyebrow: copy.eyebrow, title: copy.title, size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });
  const { register: sourceRegister, ...credit } = sourceCreditFor({ registers, forms: copy.source, size: SIZE, k, ...CREDIT_ONE_LINE });
  const creditAt = { x: inset, y: stage.height - vInset - credit.height };
  const creditBox = { x0: creditAt.x, x1: creditAt.x + credit.width, y0: creditAt.y, y1: creditAt.y + credit.height };

  // ── THE KEY: the two names in the top-left corner, one line each ──
  const names = countries.map((c) => measure(c.name, annot));
  const keys = names.map((m, i) => ({ ...m, x: inset, y: vInset + nBand.ascent + i * annot.lead }));
  const keyBox = { x0: inset, x1: inset + Math.max(...names.map(drawn)), y0: vInset, y1: vInset + nBand.ascent + annot.lead + nBand.descent };

  // ── THE SPOKES' WORDS: the name, the two shares under it, at the spoke's outer end ──
  const labelsFor = (form) => {
    const made = spokes.map((sp, j) => ({
      name: measure(form === 0 ? sp.label : (copy.shortSpoke[sp.column] ?? sp.label), annot),
      parts: copy.shares(countries[0].shares[j], countries[1].shares[j]).map((t) => applyCase(t, value.transform)),
    }));
    for (const l of made) l.values = { text: l.parts.join(""), width: widthOf(l.parts.join(""), value) };
    return made;
  };
  const nameGap = LABEL_GAP * annot.lead;
  const lineGap = LINE_GAP * value.lead;
  const seatLabels = (labels, cx, cy, R) =>
    labels.map((l, j) => {
      const theta = spokeAngle(j, n);
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);
      const out = { x: cx + cos * (R + nameGap), y: cy + sin * (R + nameGap) };
      const blockH = nBand.ascent + nBand.descent + lineGap + vBand.ascent + vBand.descent;
      const top = sin < -0.75 ? out.y - blockH : sin > 0.75 ? out.y : out.y - blockH / 2;
      const nameBaseline = top + nBand.ascent;
      const valuesTop = top + nBand.ascent + nBand.descent + lineGap;
      const place = (m) => (Math.abs(cos) < 0.25 ? out.x - drawn(m) / 2 : cos > 0 ? out.x : out.x - drawn(m));
      const w = Math.max(drawn(l.name), drawn(l.values));
      const x0 = Math.abs(cos) < 0.25 ? out.x - w / 2 : cos > 0 ? out.x : out.x - w;
      const valuesX = place(l.values);
      return {
        name: { ...l.name, x: place(l.name), y: nameBaseline },
        values: { ...l.values, parts: l.parts, x: valuesX, y: valuesTop + vBand.ascent },
        box: { x0, x1: x0 + w, y0: top, y1: top + blockH },
        valuesBox: { x0: valuesX, x1: valuesX + drawn(l.values), y0: valuesTop, y1: valuesTop + vBand.ascent + vBand.descent },
      };
    });

  // ── THE WHEEL: centred on the frame's width; the largest radius whose words sit inside the frame, clear of all else ──
  const cx = stage.width / 2;
  const bottomLimit = creditAt.y - LABEL_GAP * axis.lead;
  // THE BARS ASK FOR THE FRAME'S WIDTH TOO, and they are drawn on the WHEEL's own scale — 100 % is `pxPerPct × 100` — so a
  // radius the spokes' words allow can still be a radius the bars cannot be drawn at. Measured 2026-09-23: at 1080 two
  // directions seated their nine spokes at a radius that then left the bars and their words needing 1.02x to 1.14x the
  // frame, and the beat refused after the wheel had been chosen. The two demands are one ladder and not two: a radius is
  // taken only where the bars hold the frame at it unmagnified.
  const barLabelGap = LABEL_GAP * value.lead;
  const barTotals = countries.map((c) => [measure(copy.twh(c.total), value), measure(copy.full, value)]);
  const barWords = Math.max(...names.map(drawn)) + nameGap + barLabelGap + Math.max(...barTotals.flat().map(drawn));
  const barsHold = (R) => stage.width - 2 * inset - barWords >= (100 * R) / ceiling + (n - 1) * CUT * R;
  let wheel = null;
  let labels = null;
  let labelForm = 0;
  const refusals = [];
  for (let form = 0; form < 2 && !wheel; form++) {
    const made = labelsFor(form);
    for (let R = Math.floor((stage.height - 2 * vInset) / 2); R > 150; R -= 4) {
      const probe = seatLabels(made, cx, 0, R);
      const top = Math.min(...probe.map((l) => l.box.y0));
      const bottom = Math.max(...probe.map((l) => l.box.y1));
      if (bottom - top > bottomLimit - vInset) {
        refusals.push(`${form === 0 ? "full" : "short"} ${R}: too tall`);
        continue;
      }
      const cy = Math.round(vInset + (bottomLimit - vInset - (bottom - top)) / 2 - top);
      const seated = seatLabels(made, cx, cy, R);
      const boxes = seated.map((l) => l.box);
      const why =
        boxes.some((b) => b.x0 < inset || b.x1 > stage.width - inset) ? "a spoke's words leave the frame"
        : boxes.some((b) => overlap(b, keyBox) || overlap(b, creditBox)) ? "a spoke's words run into the key or the credit"
        : boxes.some((b, i) => boxes.some((o, j) => j > i && overlap(b, o))) ? "two spokes' words collide"
        : null;
      if (why) {
        refusals.push(`${form === 0 ? "full" : "short"} ${R}: ${why}`);
        continue;
      }
      if (!barsHold(R)) {
        refusals.push(`${form === 0 ? "full" : "short"} ${R}: the bars and their words run wider than the frame`);
        continue;
      }
      wheel = { x: cx, y: cy, radius: R, pxPerPct: R / ceiling, labels: seated };
      labels = made;
      labelForm = form;
      break;
    }
  }
  if (!wheel) throw new Error(`no wheel radius fits this frame: ${refusals.slice(-3).join("; ")}`);
  const { radius: R } = wheel;

  /** The ceiling's number, inside the ceiling ring, half a spoke's angle past twelve o'clock — empty by construction. */
  const ceilingText = measure(copy.ceiling(ceiling), axis);
  const halfSpoke = spokeAngle(0, n) + Math.PI / n;
  const inside = R - LABEL_GAP * axis.lead;
  const ceilingLine = { ...ceilingText, x: wheel.x + Math.cos(halfSpoke) * inside - drawn(ceilingText), y: wheel.y + Math.sin(halfSpoke) * inside + aBand.ascent };

  /** The ring around the named spoke's two shares. */
  const named = wheel.labels[subject.named].valuesBox;
  const pad = { x: RING_PAD.x * value.fontSize, y: RING_PAD.y * value.fontSize };
  const ring = { x: named.x0 - pad.x, y: named.y0 - pad.y, width: named.x1 - named.x0 + 2 * pad.x, height: named.y1 - named.y0 + 2 * pad.y };
  ring.rx = ring.height / 2;
  const ringBox = { x0: ring.x, x1: ring.x + ring.width, y0: ring.y, y1: ring.y + ring.height };
  wheel.labels.forEach((l, j) => {
    if (j !== subject.named && overlap(l.box, ringBox)) throw new Error(`the ring around ${spokes[subject.named].label} runs into ${spokes[j].label}`);
  });
  if (overlap(ringBox, creditBox)) throw new Error("the ring runs into the credit");

  // ── THE BARS: 100 % is the wheel's px per % × 100; France's total that long, Germany's on the same TWh scale ──
  const [first] = countries;
  if (!(first.total === Math.max(...countries.map((c) => c.total)))) throw new Error("the first bar must be the longest");
  const L100 = 100 * wheel.pxPerPct;
  const thickness = BAR * R;
  const gap = CUT * R;
  const labelGap = barLabelGap;
  const totals = barTotals;
  const widest = Math.max(...totals.flat().map(drawn));
  const namesWidth = Math.max(...names.map(drawn));
  const words = namesWidth + nameGap + labelGap + widest;
  /** THE CAMERA: the two bars are seen magnified (the largest zoom up to ZOOM whose bars and words fit the frame's width),
   *  and the camera pulls back to the wheel as it arrives — every mark scaled by one factor, the words not. */
  const zoom = Math.min(ZOOM, (stage.width - 2 * inset - words) / (L100 + (n - 1) * gap));
  if (!(zoom >= 1)) throw new Error(`the bars and their words run wider than the frame (zoom ${zoom.toFixed(2)})`);
  const nameBand = nBand.ascent + nBand.descent;
  const between = Math.max(0.6 * thickness, (NAME_AIR * nameBand) / zoom - thickness);
  const barLeft = (stage.width - (words + zoom * (L100 + (n - 1) * gap))) / 2 + namesWidth + nameGap;
  const x0 = wheel.x + (barLeft - wheel.x) / zoom;
  const landedWidth = Math.max(3, PART * R);
  const seated = countries.map((c, i) => ({
    subject: i === 0,
    side: i === 0 ? -1 : 1,
    total: c.total,
    shares: c.shares,
    bar: { y: wheel.y + (i === 0 ? -1 : 1) * (thickness / 2 + between / 2) },
    name: { ...names[i], dx: -nameGap - drawn(names[i]), dy: (nBand.ascent - nBand.descent) / 2 },
    key: keys[i],
    totals: { dy: (vBand.ascent - vBand.descent) / 2, twh: totals[i][0], full: totals[i][1] },
  }));
  if (!(barLeft - nameGap - namesWidth >= inset - 0.5)) throw new Error("a bar's name leaves the frame");

  // ── THE COLOURS ──
  const { ground, accent } = direction;
  const { ink, muted, grid } = deriveFurniture(ground);
  const walked = (col, floor, what) => {
    const w = adjustToContrast(col, ground, floor);
    if (!w) throw new Error(`${what} has no variant that reads at ${floor}:1 on ${ground}`);
    return w;
  };
  const hairline = (direction.stroke?.hairline ?? 0.6) * S;
  const rule = (direction.stroke?.rule ?? 1) * S;

  const props = {
    frame: stage,
    inset,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, axis, value, annot, source: sourceRegister },
    titleCard,
    credit: { ...credit, at: creditAt },
    colours: {
      ground,
      marks: [walked(accent, NON_TEXT_CONTRAST_MIN, "the accent"), walked(muted, NON_TEXT_CONTRAST_MIN, "the neutral")],
      fills: FILL,
      grid,
      ceiling: walked(muted, NON_TEXT_CONTRAST_MIN, "the ceiling ring"),
      text: {
        eyebrow: walked(registers.eyebrow.fill ?? accent, TEXT_CONTRAST_MIN, "the eyebrow"),
        title: walked(registers.display.fill ?? ink, TEXT_CONTRAST_MIN, "the title"),
        items: [walked(accent, TEXT_CONTRAST_MIN, "France's words"), walked(muted, TEXT_CONTRAST_MIN, "Germany's words")],
        muted: walked(muted, TEXT_CONTRAST_MIN, "a spoke's name"),
      },
    },
    strokes: { hairline, rule, outline: rule * 2, dot: rule * 1.6, dash: [3 * S, 4 * S], ring: rule * 1.5 },
    halo: haloOf(axis, k),
    wheel: { ...wheel, rings: rings.map((v) => ({ value: v, r: v * wheel.pxPerPct, ceiling: v === ceiling })), ceiling: ceilingLine, ring },
    bars: { x0, zoom, pxPerTwh: L100 / first.total, gap, thickness, labelGap, landed: { width: landedWidth, offset: landedWidth / 2 } },
    countries: seated,
    states,
    timing: RADAR_VIDEO_TIMING,
  };
  return {
    id,
    direction,
    props,
    report: { k, labelForm, titleForm: titleCard.form, sourceForm: credit.form, radius: R, zoom: zoom.toFixed(2), year: YEAR },
  };
}
