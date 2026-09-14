// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the rows, every track's points, the end names,
// India's rank texts, the passes, the colours and the states.
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
import { BAND_PROBE, bandOf, DRAWN_WIDER, haloOf, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf } from "../../skills/chart-video/scripts/shots.mjs";
import { videoRegistersOf } from "../../skills/chart-video/scripts/video-registers.mjs";
import { statesFor } from "./states.mjs";
import { FIRST, FRENCH, LAST, loadSubject, SLOTS, SUBJECT } from "./subject.mjs";
import { BUMP_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
export const SIZE = "landscape";
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
const LABEL_GAP = 0.4;

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject) };
}

export function copyOf(subject) {
  return {
    eyebrow: "Climat · Monde",
    title: [`L’Inde est passée du ${subject.from}e au ${subject.to}e rang mondial des émetteurs de CO₂`, `L’Inde, du ${subject.from}e au ${subject.to}e rang des émetteurs`],
    end: (rank, entity) => `${rank} ${FRENCH[entity]}`,
    tip: (rank) => `${FRENCH[SUBJECT]} · ${rank}e`,
    source: [`Source : Global Carbon Budget (2025), via Our World in Data · combustibles fossiles et industrie`, `Source : Global Carbon Budget (2025), via Our World in Data`].map((f) => f.replace(" · ", `${NB}· `)),
  };
}

export function textPerRegisterOf(copy, subject) {
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: Object.values(FRENCH).join(" "),
    value: `${copy.tip(8)} 0123456789`,
    axis: `${Object.values(FRENCH).map((n) => `10 ${n}`).join(" ")} 1990 1995 2000 2005 2010 2015 2020 2024 ${copy.source.join(" ")}`,
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
  const gap = LABEL_GAP * axis.lead;
  const band = bandOf(BAND_PROBE, axis);
  const valueBand = bandOf(BAND_PROBE, value);

  const titleCard = titleCardFor({ registers, eyebrow: copy.eyebrow, title: copy.title, size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });
  const { register: sourceRegister, ...credit } = sourceCreditFor({ registers, forms: copy.source, size: SIZE, k });

  const { years, tracks, top } = subject;
  const leftNames = top.get(FIRST).map((e, i) => ({ entity: e, ...measure(copy.end(i + 1, e), axis) }));
  const rightNames = top.get(LAST).map((e, i) => ({ entity: e, ...measure(copy.end(i + 1, e), axis) }));
  const leftWidth = Math.max(...leftNames.map((t) => t.width)) * (1 + DRAWN_WIDER);
  const rightWidth = Math.max(...rightNames.map((t) => t.width)) * (1 + DRAWN_WIDER);
  const tipTexts = Object.fromEntries([...new Set(tracks.find((t) => t.entity === SUBJECT).ranks.filter(Boolean))].map((r) => [String(r), measure(copy.tip(r), value)]));
  const plot = {
    left: inset + leftWidth + gap,
    right: stage.width - inset - rightWidth - gap,
    top: vInset + band.ascent,
    bottom: stage.height - vInset - credit.height - gap - band.ascent - band.descent - 1.6 * gap,
  };
  const xs = years.map((y) => plot.left + ((y - FIRST) / (LAST - FIRST)) * (plot.right - plot.left));
  const yOf = (rank) => plot.top + ((rank - 1) / (SLOTS - 1)) * (plot.bottom - plot.top);
  const shift = (band.ascent - band.descent) / 2;

  const { ground, accent } = direction;
  const { ink, muted, grid } = deriveFurniture(ground);
  const walked = (c, floor, what) => {
    const w = adjustToContrast(c, ground, floor);
    if (!w) throw new Error(`${what} has no variant that reads at ${floor}:1 on ${ground}`);
    return w;
  };
  const passedKeys = new Set(subject.stillIn.map((p) => p.entity));
  const roleOf = (e) => (e === SUBJECT ? "subject" : passedKeys.has(e) ? "passed" : "other");
  const colours = {
    ground,
    grid,
    subject: walked(accent, NON_TEXT_CONTRAST_MIN, "India's line"),
    passed: walked(mix(ink, muted, 0.35), NON_TEXT_CONTRAST_MIN, "a passed country's line"),
    other: walked(mix(muted, ground, 0.25), NON_TEXT_CONTRAST_MIN, "a line"),
    text: {
      eyebrow: walked(registers.eyebrow.fill ?? accent, TEXT_CONTRAST_MIN, "the eyebrow"),
      title: walked(registers.display.fill ?? ink, TEXT_CONTRAST_MIN, "the title"),
      subject: walked(accent, TEXT_CONTRAST_MIN, "India's name"),
      passed: walked(ink, TEXT_CONTRAST_MIN, "a passed country's name"),
      other: walked(muted, TEXT_CONTRAST_MIN, "a name"),
      axis: walked(muted, TEXT_CONTRAST_MIN, "the years"),
    },
  };

  const index = new Map(years.map((y, i) => [y, i]));
  const india = tracks.find((t) => t.entity === SUBJECT);
  const props = {
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, value, axis, source: sourceRegister },
    titleCard,
    credit: { ...credit, at: { x: inset, y: stage.height - vInset - credit.height } },
    colours,
    strokes: { line: (direction.stroke?.data ?? 2) * k * 0.9, subject: (direction.stroke?.data ?? 2) * k * 1.6, grid: (direction.stroke?.hairline ?? 0.6) * k },
    plot,
    xs: xs.map((x) => Math.round(x * 10) / 10),
    rows: Array.from({ length: SLOTS }, (_, i) => yOf(i + 1)),
    tracks: tracks.map((t) => ({ key: t.entity, role: roleOf(t.entity), ys: t.ranks.map((r) => (r === null ? null : yOf(r))) })),
    subject: SUBJECT,
    leftNames: leftNames.map((t, i) => ({ ...t, role: roleOf(t.entity), x: plot.left - gap - t.width, y: yOf(i + 1) + shift })),
    rightNames: rightNames.map((t, i) => ({ ...t, role: roleOf(t.entity), x: plot.right + gap, y: yOf(i + 1) + shift })),
    tipTexts,
    tipRanks: india.ranks,
    tipOffset: gap / 2,
    tipRise: valueBand.descent + gap / 2,
    passes: subject.passed.map((p) => ({ entity: p.entity, index: index.get(p.year), x: xs[index.get(p.year)], y: yOf(india.ranks[index.get(p.year)]) })),
    ticks: years.filter((y) => y % 5 === 0 || y === LAST).map((y) => {
      const t = measure(String(y), axis);
      return { ...t, x: xs[index.get(y)] - t.width / 2, y: plot.bottom + 1.6 * gap + band.ascent };
    }),
    dotR: 0.14 * axis.lead,
    halo: haloOf(value, k),
    layoutInset: { x: inset, y: vInset },
    states,
    timing: BUMP_VIDEO_TIMING,
  };
  return { id, direction, props, report: { k, titleForm: titleCard.form, sourceForm: credit.form, tracks: tracks.length, passes: subject.passed.length } };
}
