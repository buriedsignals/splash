// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the six rows on one scale, the left edge the whole
// bars grow from and the anchor they slide onto, the tracks France's bar parts into, the texts, colours and states.
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
import { shareText } from "./scene.mjs";
import { statesFor } from "./states.mjs";
import { loadSubject, YEAR } from "./subject.mjs";
import { DIVERGING_STACKED_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
export const SIZE = "landscape";
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
const LABEL_GAP = 0.4;
/** A bar's share of its row: two bars and the gap between them must hold in one row when France's bar parts. */
const BAR = 0.44;

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf() };
}

export function copyOf() {
  return {
    eyebrow: `Énergie${NB}· Europe`,
    title: ["En France, le nucléaire pèse plus que le fossile et le renouvelable réunis", "En France, le nucléaire pèse plus que fossile et renouvelable réunis"],
    year: String(YEAR),
    hundred: `100${NB}%`,
    sides: { left: "Fossile", centre: "Nucléaire", right: "Renouvelable" },
    source: ["Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data", "Source : Ember, Energy Institute, via Our World in Data"],
  };
}

export function textPerRegisterOf(copy, subject) {
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: "",
    value: `${copy.year} 0123456789`,
    axis: `${subject.rows.map((r) => r.name).join(" ")} ${Object.values(copy.sides).join(" ")} ${copy.hundred} 0123456789, ${copy.source.join(" ")}`,
  };
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
  const drawn = (w) => w * (1 + DRAWN_WIDER);
  const gap = LABEL_GAP * axis.lead;
  const band = bandOf(BAND_PROBE, axis);
  const valueBand = bandOf(BAND_PROBE, value);
  const shift = (band.ascent - band.descent) / 2;

  const titleCard = titleCardFor({ registers, eyebrow: copy.eyebrow, title: copy.title, size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });
  const { register: sourceRegister, ...credit } = sourceCreditFor({ registers, forms: copy.source, size: SIZE, k, ...CREDIT_ONE_LINE });
  const creditAt = { x: inset, y: stage.height - vInset - credit.height };

  // THE HORIZONTAL: name | the left totals | the plot | the right totals. One scale holds the widest lean on each side of the
  // anchor; the whole 100 % bars grow from the plot's left edge, which is where the furthest left lean begins.
  const names = subject.rows.map((r) => measure(r.name, axis));
  const lefts = subject.rows.map((r) => measure(shareText(r.fossil), axis));
  const rights = subject.rows.map((r) => measure(shareText(r.renewable), axis));
  const nameRoom = drawn(Math.max(...names.map((n) => n.width)));
  const plotLeft = inset + nameRoom + gap + gap / 2 + drawn(Math.max(...lefts.map((w) => w.width)));
  const plotRight = stage.width - inset - gap / 2 - drawn(Math.max(...rights.map((w) => w.width)));
  const reachLeft = Math.max(...subject.rows.map((r) => r.fossil + r.centre / 2));
  const reachRight = Math.max(...subject.rows.map((r) => r.renewable + r.centre / 2));
  const unit = (plotRight - plotLeft) / (reachLeft + reachRight);
  const anchor = plotLeft + reachLeft * unit;
  if (!(plotLeft + 100 * unit <= plotRight + 1e-6)) throw new Error("a whole 100 % bar does not hold in the plot");

  // THE BAND: « 2024 » over the names; « 100 % » over the whole bars' common end; then the three sides over the anchor.
  const bandBaseline = vInset + Math.max(valueBand.ascent, band.ascent);
  const year = { ...measure(copy.year, value), x: inset, y: bandBaseline };
  const hundredWord = measure(copy.hundred, axis);
  const hundred = { ...hundredWord, x: plotLeft + 100 * unit - drawn(hundredWord.width), y: bandBaseline };
  const sideWords = Object.fromEntries(Object.entries(copy.sides).map(([key, t]) => [key, measure(t, axis)]));
  const sides = {
    left: { ...sideWords.left, x: plotLeft, y: bandBaseline },
    centre: { ...sideWords.centre, x: anchor - drawn(sideWords.centre.width) / 2, y: bandBaseline },
    right: { ...sideWords.right, x: plotRight - drawn(sideWords.right.width), y: bandBaseline },
  };
  if (!(year.x + drawn(year.width) + gap <= Math.min(sides.left.x, hundred.x))) throw new Error("« 2024 » runs into the band beside it");
  if (!(sides.left.x + drawn(sides.left.width) + gap <= sides.centre.x && sides.centre.x + drawn(sides.centre.width) + gap <= sides.right.x)) throw new Error("the three side names do not hold on one line");

  // THE VERTICAL: six rows between the band and the credit; France's bar parts into two tracks inside its own row.
  const top = bandBaseline + Math.max(valueBand.descent, band.descent) + 1.5 * gap;
  const bottom = creditAt.y - gap;
  const pitch = (bottom - top) / subject.rows.length;
  if (!(pitch >= axis.lead)) throw new Error(`a row is ${pitch.toFixed(1)}px, shorter than its words`);
  const barH = pitch * BAR;
  const trackGap = gap / 2;
  const lift = (barH + trackGap) / 2;
  if (!(lift + barH / 2 + gap / 2 <= pitch - barH / 2)) throw new Error("France's two tracks run into the next row's bar");

  const sumWord = measure(shareText(subject.rows.find((r) => r.key === subject.subject).fossil + subject.rows.find((r) => r.key === subject.subject).renewable), axis);
  const rows = subject.rows.map((r, i) => {
    const mid = top + i * pitch + pitch / 2;
    const centreWord = measure(shareText(r.centre), axis);
    const holds = r.centre * unit >= drawn(centreWord.width) + gap;
    if (r.key === subject.subject) {
      if (!holds) throw new Error(`${r.name}'s nuclear share does not hold inside its bar`);
      if (!(anchor - (r.centre / 2) * unit + (r.fossil + r.renewable) * unit + gap / 2 + drawn(sumWord.width) <= anchor + (r.centre / 2) * unit)) throw new Error("the sum of France's two sides does not hold under its nuclear");
    }
    return {
      key: r.key,
      fossil: r.fossil,
      centre: r.centre,
      renewable: r.renewable,
      left: r.left.map((l) => l.key),
      right: r.right.map((l) => l.key),
      mid,
      y: mid - barH / 2,
      segments: [
        ...r.left.slice().reverse().map((l) => ({ key: l.key, group: "left", share: l.share })),
        { key: "Nuclear", group: "centre", share: r.centre },
        ...r.right.map((l) => ({ key: l.key, group: "right", share: l.share })),
      ],
      name: { ...names[i], x: inset + nameRoom - drawn(names[i].width), y: mid + shift },
      leftTotal: { ...lefts[i], y: mid + shift },
      rightTotal: { ...rights[i], y: mid + shift },
      centreValue: holds ? { ...centreWord, y: mid + shift } : null,
    };
  });

  // TWO RAMPS AND A NEUTRAL, the static plate's own (PALETTE.md): fossil toward the ink, renewables toward the accent,
  // nuclear an achromatic pale grey — edged, so its extent reads on the bare ground when France's bar parts.
  const { ground, accent } = direction;
  const { ink, muted } = deriveFurniture(ground);
  const walked = (c, on, floor, what) => {
    const w = adjustToContrast(c, on, floor);
    if (!w) throw new Error(`${what} has no variant that reads at ${floor}:1 on ${on}`);
    return w;
  };
  const leftFill = (i, n) => mix(mix(muted, ground, 0.2), ink, (n > 1 ? i / (n - 1) : 0.5) * 0.6);
  const rightFill = (j, n) => mix(mix(accent, ground, 0.7), accent, n > 1 ? j / (n - 1) : 0.5);
  const firstRow = subject.rows[0];
  const fill = {
    Nuclear: mix(ground, ink, 0.14),
    ...Object.fromEntries(firstRow.left.map((l, i) => [l.key, leftFill(i, firstRow.left.length)])),
    ...Object.fromEntries(firstRow.right.map((l, j) => [l.key, rightFill(j, firstRow.right.length)])),
  };
  for (const key of [firstRow.left.at(-1).key, firstRow.right.at(-1).key])
    if (!(contrast(fill[key], ground) >= NON_TEXT_CONTRAST_MIN)) throw new Error(`${key}, the deepest step of its side, does not read at ${NON_TEXT_CONTRAST_MIN}:1 on ${ground}`);
  const colours = {
    ground,
    fill,
    edge: walked(mix(ground, ink, 0.3), ground, NON_TEXT_CONTRAST_MIN, "the nuclear's edge"),
    anchor: walked(ink, ground, NON_TEXT_CONTRAST_MIN, "the anchor"),
    ring: walked(accent, ground, NON_TEXT_CONTRAST_MIN, "France's ring"),
    text: {
      eyebrow: walked(registers.eyebrow.fill ?? accent, ground, TEXT_CONTRAST_MIN, "the eyebrow"),
      title: walked(registers.display.fill ?? ink, ground, TEXT_CONTRAST_MIN, "the title"),
      name: walked(ink, ground, TEXT_CONTRAST_MIN, "a name"),
      subject: walked(accent, ground, TEXT_CONTRAST_MIN, "France's name"),
      axis: walked(muted, ground, TEXT_CONTRAST_MIN, "a muted word"),
      renewable: walked(accent, ground, TEXT_CONTRAST_MIN, "the renewable side's name"),
      onCentre: walked(contrast(ink, fill.Nuclear) >= contrast(ground, fill.Nuclear) ? ink : ground, fill.Nuclear, TEXT_CONTRAST_MIN, "a nuclear share"),
      sum: walked(ink, ground, TEXT_CONTRAST_MIN, "the sum"),
    },
  };

  const props = {
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, value, axis, source: sourceRegister },
    titleCard,
    credit: { ...credit, at: creditAt },
    colours,
    subject: subject.subject,
    rows,
    plotLeft,
    anchor,
    unit,
    barH,
    lift,
    gap,
    plot: { top: rows[0].y - gap / 2, bottom: rows.at(-1).y + barH + gap / 2 },
    year,
    hundred,
    sides,
    sum: sumWord,
    strokes: { anchor: (direction.stroke?.rule ?? 1) * k * 1.2, edge: (direction.stroke?.hairline ?? 0.6) * k, ring: (direction.stroke?.rule ?? 1) * k * 1.4 },
    halo: { axis: haloOf(axis, k) },
    states,
    timing: DIVERGING_STACKED_VIDEO_TIMING,
  };
  return { id, direction, props, report: { k, titleForm: titleCard.form, sourceForm: credit.form, pitch: pitch.toFixed(1), unit: unit.toFixed(2) } };
}
