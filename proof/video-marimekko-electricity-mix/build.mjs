// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the six columns on one TWh scale and one share scale,
// the names over them and the totals under them, the nine source names in the gutter, the strip the coal pours into, the
// texts, colours and states.
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
import { percentText } from "./scene.mjs";
import { statesFor } from "./states.mjs";
import { loadSubject, SOURCES, TRACKED, YEAR } from "./subject.mjs";
import { MARIMEKKO_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
export const SIZE = "landscape";
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
const LABEL_GAP = 0.4;
/** The static beat refuses a column under 26 px of its 960 px frame; the same share of this 1920 px one. */
const NARROWEST_COLUMN_PX = 52;

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject) };
}

const whole = (v) => Math.round(v).toLocaleString("fr-FR").replace(/[\s\u202F]/g, NB);

export function copyOf(subject) {
  const pct = Math.round(subject.coal.share * 100);
  return {
    eyebrow: `Énergie${NB}· Europe`,
    title: [
      `Le charbon, ${pct}${NB}% de l’électricité de six pays, tient dans deux colonnes`,
      `Le charbon, ${pct}${NB}% de six pays, tient dans deux colonnes`,
    ],
    year: String(YEAR),
    whole: `${whole(subject.grand)}${NB}TWh`,
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
    axis: `${subject.columns.map((c) => c.name).join(" ")} ${SOURCES.map((s) => s.label).join(" ")} ${copy.whole} 0123456789, % ${copy.source.join(" ")}`,
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

  // THE HORIZONTAL: the columns from the left inset | a leader's room | the nine source names, set once, in the gutter.
  const keyWords = SOURCES.map((s) => ({ key: s.column, ...measure(s.label, axis) }));
  const keyX = stage.width - inset - drawn(Math.max(...keyWords.map((w) => w.width)));
  const plotLeft = inset;
  const plotRight = keyX - 2 * gap;
  const colGap = 0.75 * gap;
  const n = subject.columns.length;
  const room = plotRight - plotLeft - (n - 1) * colGap;
  const u = room / subject.grand;
  let cum = 0;
  const laid = subject.columns.map((c, i) => {
    const box = { ...c, cum, x: plotLeft + cum * u + i * colGap, w: c.total * u };
    cum += c.total;
    return box;
  });
  const narrowest = Math.min(...laid.map((c) => c.w));
  if (narrowest < NARROWEST_COLUMN_PX) throw new Error(`the narrowest column is ${narrowest.toFixed(1)}px; this form stops encoding its width under ${NARROWEST_COLUMN_PX}px`);

  // THE TOP BAND: the names centred on their columns, pushed apart where a column is narrower than its name and pulled back
  // inside the plot's right edge; « 2024 » over the gutter.
  const bandBaseline = vInset + Math.max(band.ascent, valueBand.ascent);
  const year = { ...measure(copy.year, value), x: keyX, y: bandBaseline };
  const placed = laid.map((c) => {
    const word = measure(c.name, axis);
    return { word, x: c.x + c.w / 2, half: drawn(word.width) / 2 };
  });
  for (let i = 1; i < placed.length; i++) placed[i].x = Math.max(placed[i].x, placed[i - 1].x + placed[i - 1].half + placed[i].half + gap);
  const overflow = placed.at(-1).x + placed.at(-1).half - plotRight;
  if (overflow > 0) {
    placed.at(-1).x -= overflow;
    for (let i = placed.length - 2; i >= 0; i--) placed[i].x = Math.min(placed[i].x, placed[i + 1].x - placed[i + 1].half - placed[i].half - gap);
  }
  if (!(placed[0].x - placed[0].half >= inset - 1e-6)) throw new Error("the column names do not hold on one line");
  const plotTop = bandBaseline + band.descent + 1.5 * gap;

  // THE BOTTOM: the credit at the inset; the totals over it, each under its column's brace; the plot above. The strip the coal
  // pours into lies under the plot, over the totals and the credit — neither is on screen while it is.
  // The plot's foot is the higher of two: where the totals and the credit put it, and where a strip 12,3 % of the plot's own
  // height still holds over the bottom inset (foot + gap + share × (foot − top) ≤ limit).
  const tickH = gap / 2;
  const underPlot = gap / 2 + tickH + gap / 2 + band.ascent + band.descent + gap / 2;
  const share = subject.coal.share;
  const plotBottom = Math.min(creditAt.y - underPlot - gap, (stage.height - vInset - gap + share * plotTop) / (1 + share));
  const braceTop = plotBottom + gap / 2;
  const totalsBaseline = braceTop + tickH + gap / 2 + band.ascent;
  const H = plotBottom - plotTop;
  const stripTop = plotBottom + gap;
  const stripH = share * H;
  if (!(stripTop + stripH <= stage.height - vInset + 1e-6)) throw new Error("the coal strip does not hold under the plot");
  if (!(totalsBaseline + band.descent <= creditAt.y + 1e-6)) throw new Error("the totals run into the credit");

  const columns = laid.map((c, i) => {
    const total = measure(whole(c.total), axis);
    if (!(drawn(total.width) <= c.w + colGap)) throw new Error(`${c.name}'s total does not hold under its column`);
    const p = placed[i];
    return {
      key: c.key,
      total: c.total,
      cum: c.cum,
      x: c.x,
      w: c.w,
      bands: c.bands.map((b) => ({ key: b.key, share: b.share })),
      name: { ...p.word, x: p.x - p.half, y: bandBaseline },
      tick: Math.abs(p.x - (c.x + c.w / 2)) > 1 ? { x1: p.x, y1: bandBaseline + band.descent + gap / 4, x2: c.x + c.w / 2, y2: plotTop - gap / 4 } : null,
      totalWord: { ...total, x: c.x + c.w / 2 - drawn(total.width) / 2, y: totalsBaseline },
    };
  });
  const wholeWord = measure(copy.whole, axis);

  // THE STRIP: each column's coal, in column order, as wide as its share of all the coal — the width its area has at the
  // strip's height. Germany and Poland are named in their pieces; the strip's height at its end.
  let cursor = plotLeft;
  const pieces = laid.map((c) => {
    const coal = c.bands.find((b) => b.key === TRACKED).value;
    const w = (coal / subject.coal.total) * room;
    const piece = { key: c.key, x: cursor, w, name: null };
    cursor += w;
    if (subject.coal.holders.includes(c.key)) {
      const word = measure(c.name, axis);
      if (!(drawn(word.width) + 2 * gap <= w && band.ascent + band.descent + gap / 2 <= stripH)) throw new Error(`${c.name} does not hold in its piece of the strip`);
      piece.name = { ...word, x: piece.x + w / 2 - drawn(word.width) / 2, y: stripTop + stripH / 2 + shift };
    }
    return piece;
  });
  const stripWord = measure(percentText(subject.coal.share), axis);
  const stripLabel = { ...stripWord, x: plotLeft + room + gap, y: stripTop + stripH / 2 + shift };
  if (!(stripLabel.x + drawn(stripWord.width) <= stage.width - inset)) throw new Error("the strip's share does not hold at its end");

  // THE KEY: the nine names against the last column's own bands, pushed apart, pulled back over the plot's foot.
  const last = laid.at(-1);
  const pitch = band.ascent + band.descent + gap / 4;
  let foot = 0;
  const keyRows = SOURCES.map((s, i) => {
    const h = last.bands[i].share * H;
    const from = plotBottom - foot - h / 2;
    foot += h;
    return { key: s.column, word: keyWords[i], from, y: Math.min(from, plotBottom - shift - band.descent) };
  }).sort((a, b) => b.y - a.y);
  for (let i = 1; i < keyRows.length; i++) keyRows[i].y = Math.min(keyRows[i].y, keyRows[i - 1].y - pitch);
  const highest = plotTop + band.ascent - shift;
  if (keyRows.at(-1).y < highest) {
    keyRows.at(-1).y = highest;
    for (let i = keyRows.length - 2; i >= 0; i--) keyRows[i].y = Math.max(keyRows[i].y, keyRows[i + 1].y + pitch);
  }
  if (keyRows[0].y + shift + band.descent > plotBottom + 1e-6) throw new Error("the nine source names do not hold beside the plot");
  const legend = keyRows.map((r) => ({ key: r.key, from: r.from, mid: r.y, line: { text: r.word.text, width: r.word.width, x: keyX, y: r.y + shift } }));

  // ONE HUE, NINE STEPS — the static plate's own ramp (PALETTE.md), from a dark accent-tinted pole at coal to a pale one at wind.
  const { ground, accent } = direction;
  const { ink, muted } = deriveFurniture(ground);
  const walked = (c, on, floor, what) => {
    const w = adjustToContrast(c, on, floor);
    if (!w) throw new Error(`${what} has no variant that reads at ${floor}:1 on ${on}`);
    return w;
  };
  const darkPole = mix(accent, ink, 0.62);
  const lightPole = mix(accent, ground, 0.74);
  const fill = Object.fromEntries(SOURCES.map((s, i) => [s.column, mix(darkPole, lightPole, i / (SOURCES.length - 1))]));
  if (!(contrast(fill[TRACKED], ground) >= NON_TEXT_CONTRAST_MIN)) throw new Error(`coal's step does not read at ${NON_TEXT_CONTRAST_MIN}:1 on ${ground}`);
  const onCoal = contrast(ink, fill[TRACKED]) >= contrast(ground, fill[TRACKED]) ? ink : ground;
  const colours = {
    ground,
    fill,
    whole: walked(mix(darkPole, lightPole, 0.5), ground, NON_TEXT_CONTRAST_MIN, "the whole block"),
    rule: walked(muted, ground, NON_TEXT_CONTRAST_MIN, "a brace"),
    ring: walked(ink, ground, NON_TEXT_CONTRAST_MIN, "the ring"),
    text: {
      eyebrow: walked(registers.eyebrow.fill ?? accent, ground, TEXT_CONTRAST_MIN, "the eyebrow"),
      title: walked(registers.display.fill ?? ink, ground, TEXT_CONTRAST_MIN, "the title"),
      name: walked(ink, ground, TEXT_CONTRAST_MIN, "a name"),
      axis: walked(muted, ground, TEXT_CONTRAST_MIN, "a muted word"),
      onCoal: walked(onCoal, fill[TRACKED], TEXT_CONTRAST_MIN, "a name on the coal strip"),
    },
  };

  const props = {
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, value, axis, source: sourceRegister },
    titleCard,
    credit: { ...credit, at: creditAt },
    colours,
    tracked: TRACKED,
    rings: subject.coal.holders.slice().sort(),
    plotLeft,
    plotRight,
    plotTop,
    plotBottom,
    H,
    u,
    room,
    colGap,
    gap,
    tickH,
    braceTop,
    columns,
    whole: { ...wholeWord, x: plotLeft + room / 2 - drawn(wholeWord.width) / 2, y: totalsBaseline },
    strip: { top: stripTop, h: stripH, pieces, label: stripLabel },
    legend,
    year,
    strokes: { hairline: (direction.stroke?.hairline ?? 0.6) * k, rule: (direction.stroke?.rule ?? 1) * k, ring: (direction.stroke?.rule ?? 1) * k * 1.4 },
    halo: { axis: haloOf(axis, k) },
    states,
    timing: MARIMEKKO_VIDEO_TIMING,
  };
  return { id, direction, props, report: { k, titleForm: titleCard.form, sourceForm: credit.form, H: H.toFixed(1), u: u.toFixed(3), narrowest: narrowest.toFixed(1) } };
}
