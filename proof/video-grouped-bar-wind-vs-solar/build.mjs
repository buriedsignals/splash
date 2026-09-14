// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the six groups and their bars, every share text a
// bar can count through, the lead count, the colours and the states.
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
import { shareText } from "./scene.mjs";
import { statesFor } from "./states.mjs";
import { loadSubject, SUBJECT } from "./subject.mjs";
import { GROUPED_BAR_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
export const SIZE = "landscape";
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
const LABEL_GAP = 0.4;
/** Of a group's band, the share its two bars take; between the two bars, a seam of the ground. */
const PAIR = 0.74;

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject) };
}

const SPELLED = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six"];

export function copyOf(subject) {
  const n = subject.groups.length;
  return {
    eyebrow: `Énergie${NB}· Europe, 2024`,
    title: [`Dans ${SPELLED[subject.lead]} de ces ${SPELLED[n]} pays l’éolien devance le solaire, la ${SUBJECT} est l’exception`, `L’éolien devance le solaire, sauf en ${SUBJECT}`],
    series: ["Éolien", "Solaire"],
    lead: (k) => `éolien devant${NB}: ${k}${NB}sur${NB}${n}`,
    /** The shares print bare over their bars — with « % » each one is wider than its bar — and the unit is said once,
     *  after the two series' names. */
    share: (text) => text,
    unit: `·${NB}en${NB}% de l’électricité`,
    source: ["Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data", "Source : Ember, Energy Institute, via Our World in Data"],
  };
}

export function textPerRegisterOf(copy, subject) {
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: "",
    value: `${copy.lead(5)} ${copy.share("28,5")} 0123456789`,
    axis: `${copy.series.join(" ")} ${copy.unit} ${subject.groups.map((g) => g.name).join(" ")} ${copy.source.join(" ")}`,
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
  const { register: sourceRegister, ...credit } = sourceCreditFor({ registers, forms: copy.source, size: SIZE, k, ...CREDIT_ONE_LINE });
  const creditAt = { x: inset, y: stage.height - vInset - credit.height };

  // THE BAND OVER THE BARS: the two series named in their inks, and the lead count, on one line.
  const series = copy.series.map((s) => measure(s, axis));
  const leads = Object.fromEntries(Array.from({ length: subject.groups.length + 1 }, (_, i) => [String(i), measure(copy.lead(i), value)]));
  const bandBaseline = vInset + valueBand.ascent;
  // Each series' name follows a swatch of its bars; the unit follows both.
  const unitWord = measure(copy.unit, axis);
  const swatch = band.ascent;
  const seriesLine = [];
  const swatches = [];
  let x = inset;
  for (const [i, s] of [series[0], series[1], unitWord].entries()) {
    if (i < 2) {
      swatches.push({ x, y: bandBaseline - swatch, size: swatch });
      x += swatch + gap / 2;
    }
    seriesLine.push({ ...s, x, y: bandBaseline });
    x += s.width * (1 + DRAWN_WIDER) + (i === 0 ? 2 * gap : gap);
  }
  const leadWidth = Math.max(...Object.values(leads).map((t) => t.width)) * (1 + DRAWN_WIDER);
  const leadAt = { x: stage.width - inset - leadWidth, y: bandBaseline };
  if (!(seriesLine[2].x + unitWord.width * (1 + DRAWN_WIDER) + 2 * gap < leadAt.x)) throw new Error("the series names and the lead count do not fit on one line");

  // THE GROUPS: six bands, a name under each, a share over each bar.
  const names = subject.groups.map((g) => measure(g.name, axis));
  const slot = (stage.width - 2 * inset) / subject.groups.length;
  for (const [i, n] of names.entries()) if (!(n.width * (1 + DRAWN_WIDER) < slot - gap)) throw new Error(`${subject.groups[i].name} does not hold under its group`);
  const nameBaseline = creditAt.y - gap - band.descent;
  const baseline = nameBaseline - band.ascent - gap;
  const top = bandBaseline + valueBand.descent + 1.5 * gap + valueBand.ascent + valueBand.descent + gap;
  const most = Math.max(...subject.groups.flatMap((g) => [g.wind, g.solar]));
  const unit = (baseline - top) / most;
  /** Two cameras: the whole mix to 100 % across the plot, and the close-up where the largest share fills it. */
  const units = { whole: (baseline - top) / 100, close: unit };
  const seam = Math.max(2 * k, 0.1 * axis.lead);
  const barW = (slot * PAIR - seam) / 2;
  const centre = (i) => inset + slot * (i + 0.5);

  const shares = new Set();
  for (let d = 0; d <= Math.ceil(most * 10); d++) shares.add(copy.share(shareText(d / 10)));
  const shareWidths = Object.fromEntries([...shares].map((t) => [t, widthOf(applyCase(t, value.transform), value)]));
  // Two shares in one group never touch: at their final heights, the lower one's box stays under the higher one's.
  subject.groups.forEach((g, i) => {
    const w = [g.wind, g.solar].map((v) => shareWidths[copy.share(shareText(v))] * (1 + DRAWN_WIDER));
    if (w.some((x) => !(x <= barW))) throw new Error(`${g.name}'s shares are wider than their bars`);
    const sideBySide = w[0] / 2 + w[1] / 2 < barW + seam;
    const apart = Math.abs(g.wind - g.solar) * unit >= valueBand.ascent + valueBand.descent;
    if (!(sideBySide || apart)) throw new Error(`${g.name}'s two shares collide over their bars`);
  });

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
    wind: walked(accent, NON_TEXT_CONTRAST_MIN, "wind's bars"),
    solar: walked(muted, NON_TEXT_CONTRAST_MIN, "solar's bars"),
    faded: mix(ground, ink, 0.12),
    /** Every other source of the mix: two neutrals, alternating, so the column reads as parts. */
    others: [mix(ground, ink, 0.2), mix(ground, ink, 0.3)],
    text: {
      eyebrow: walked(registers.eyebrow.fill ?? accent, TEXT_CONTRAST_MIN, "the eyebrow"),
      title: walked(registers.display.fill ?? ink, TEXT_CONTRAST_MIN, "the title"),
      wind: walked(accent, TEXT_CONTRAST_MIN, "wind's words"),
      solar: walked(muted, TEXT_CONTRAST_MIN, "solar's words"),
      name: walked(ink, TEXT_CONTRAST_MIN, "a name"),
      axis: walked(muted, TEXT_CONTRAST_MIN, "a muted word"),
      count: walked(ink, TEXT_CONTRAST_MIN, "the count"),
    },
  };

  const r1 = (v) => Math.round(v * 10) / 10;
  const props = {
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, value, axis, source: sourceRegister },
    titleCard,
    credit: { ...credit, at: creditAt },
    colours,
    subject: SUBJECT,
    groups: subject.groups.map((g, i) => ({
      name: g.name,
      wind: g.wind,
      solar: g.solar,
      mix: g.mix,
      colX: r1(centre(i) - seam / 2 - barW),
      windX: r1(centre(i) - seam / 2 - barW),
      solarX: r1(centre(i) + seam / 2),
      label: { ...names[i], x: centre(i) - names[i].width / 2, y: nameBaseline },
    })),
    barW: r1(barW),
    colW: r1(2 * barW + seam),
    units,
    seam: r1(seam),
    baseline: r1(baseline),
    unit,
    left: inset,
    right: stage.width - inset,
    series: seriesLine,
    swatches,
    leads,
    leadAt,
    shareWidths,
    shareGap: gap / 2 + valueBand.descent,
    strokes: { grid: (direction.stroke?.hairline ?? 0.6) * k },
    halo: { value: haloOf(value, k) },
    states,
    timing: GROUPED_BAR_VIDEO_TIMING,
  };
  return { id, direction, props, report: { k, titleForm: titleCard.form, sourceForm: credit.form, barW: barW.toFixed(1) } };
}
