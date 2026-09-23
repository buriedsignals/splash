// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the six columns on one TWh scale and one share scale,
// the names over them and the totals under them, the nine source names in the gutter, the strip the coal pours into, the
// texts, colours and states.
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
import { percentText } from "./scene.mjs";
import { statesFor } from "./states.mjs";
import { loadSubject, SOURCES, TRACKED, YEAR } from "./subject.mjs";
import { MARIMEKKO_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
/** The size this run exports at — `--size`, landscape when nothing asks. R2 names three and
 *  everything under it already answered per size; only this line pinned the beat to one. */
export const SIZE = videoExportSize();
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
const LABEL_GAP = 0.4;
/** The static beat refuses a column under 26 px of its 960 px frame. That is a SHARE of the frame and not a pixel count —
 *  52 px at 1920 is the same rule read on a wider canvas — so every frame asks it again rather than carrying 1920's answer. */
const NARROWEST_COLUMN_RATIO = 26 / 960;

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
  //
  // WHERE THE KEY GOES IS A MEASURE, NOT A PLACE. The gutter is the better key — a leader from each of the last column's own
  // bands to its name is direct annotation, not a legend to look things up in. It costs width, and width is the only thing a
  // marimekko encodes with: measured 2026-09-23 on nocturne, the gutter takes 373px of 1920 and leaves the narrowest column
  // at 66px, but takes 373px of 1080 and leaves it at 23.7px — under the floor, which is to say the column has stopped saying
  // how large Switzerland is. So the gutter is kept while the columns can still pay for it, and where they cannot the nine
  // names go into a band across the top and the plot takes the whole width back. The only width reserved then is the strip's
  // own « 12 % », which has to sit at the strip's end for the number to be about the strip.
  const keyWords = SOURCES.map((s) => ({ key: s.column, ...measure(s.label, axis) }));
  const gutter = drawn(Math.max(...keyWords.map((w) => w.width))) + 2 * gap;
  const stripWord = measure(percentText(subject.coal.share), axis);
  const colGap = 0.75 * gap;
  const n = subject.columns.length;
  const narrowestColumnPx = NARROWEST_COLUMN_RATIO * stage.width;
  const roomNeeded = (narrowestColumnPx / Math.min(...subject.columns.map((c) => c.total))) * subject.grand;
  const plotLeft = inset;
  const content = stage.width - 2 * inset;
  const inGutter = content - gutter - (n - 1) * colGap >= roomNeeded;
  const keyX = stage.width - inset - drawn(Math.max(...keyWords.map((w) => w.width)));
  const plotRight = stage.width - inset - (inGutter ? gutter : drawn(stripWord.width) + gap);
  const room = plotRight - plotLeft - (n - 1) * colGap;
  const u = room / subject.grand;
  let cum = 0;
  const laid = subject.columns.map((c, i) => {
    const box = { ...c, cum, x: plotLeft + cum * u + i * colGap, w: c.total * u };
    cum += c.total;
    return box;
  });
  const narrowest = Math.min(...laid.map((c) => c.w));
  if (narrowest < narrowestColumnPx) throw new Error(`the narrowest column is ${narrowest.toFixed(1)}px; this form stops encoding its width under ${narrowestColumnPx.toFixed(1)}px`);

  // THE TOP BAND: the names centred on their columns, pushed apart where a column is narrower than its name and pulled back
  // inside the plot's right edge; « 2024 » over the gutter, or at the frame's right shoulder where there is none.
  const topBaseline = vInset + Math.max(band.ascent, valueBand.ascent);
  const yearWord = measure(copy.year, value);
  const year = { ...yearWord, x: inGutter ? keyX : stage.width - inset - drawn(yearWord.width), y: topBaseline };
  // HOW MANY LINES THE NAMES TAKE IS A MEASURE TOO. Six names centred on six columns hold on one line at 1920 — 1061px of
  // words and their gaps against 1750px of plot. At 1080 the same six want 1152px against 936px (measured 2026-09-23), so
  // the push-apart has nowhere left to push and the first name walks off the left inset. They are then dealt onto two
  // lines, alternating, each line pushed apart and pulled back on its own; the leader tick each displaced name already
  // carries is what says which column it belongs to, so a second line costs the reader nothing it did not already read.
  const namePitch = band.ascent + band.descent + 0.25 * gap;
  /** A word is pulled back inside the plot's right edge where the gutter holds the key, and inside the frame's own inset
   *  where it does not — the gutter is the key's room, and nothing else's. */
  const wordEdge = inGutter ? plotRight : stage.width - inset;
  const placeOn = (words, lines) => {
    const all = laid.map((c, i) => ({ word: words[i], x: c.x + c.w / 2, half: drawn(words[i].width) / 2, line: i % lines }));
    for (let L = 0; L < lines; L++) {
      const idx = all.map((_, i) => i).filter((i) => all[i].line === L);
      for (let j = 1; j < idx.length; j++) all[idx[j]].x = Math.max(all[idx[j]].x, all[idx[j - 1]].x + all[idx[j - 1]].half + all[idx[j]].half + gap);
      const tail = all[idx.at(-1)];
      const overflow = tail.x + tail.half - wordEdge;
      if (overflow > 0) {
        tail.x -= overflow;
        for (let j = idx.length - 2; j >= 0; j--) all[idx[j]].x = Math.min(all[idx[j]].x, all[idx[j + 1]].x - all[idx[j + 1]].half - all[idx[j]].half - gap);
      }
      if (!(all[idx[0]].x - all[idx[0]].half >= inset - 1e-6)) return null;
    }
    return all;
  };
  const nameWords = laid.map((c) => measure(c.name, axis));
  let nameLines = 0;
  let placed = null;
  for (const lines of [1, 2, 3]) {
    placed = placeOn(nameWords, lines);
    if (placed) {
      nameLines = lines;
      break;
    }
  }
  if (!placed) throw new Error("the column names do not hold on one line, nor dealt onto two or three");

  // THE BOTTOM: the credit at the inset; the totals over it, each under its column's brace; the plot above. The strip the coal
  // pours into lies under the plot, over the totals and the credit — neither is on screen while it is.
  // The plot's foot is the higher of two: where the totals and the credit put it, and where a strip 12,3 % of the plot's own
  // height still holds over the bottom inset (foot + gap + share × (foot − top) ≤ limit).
  // THE TOTALS, BY THE SAME RULE AS THE NAMES. A total sits under its own column while the column is wide enough to hold it,
  // which is the picture at 1920. At 1080 Switzerland's column is 36px and « 78 » is 45px wide (measured 2026-09-23), so the
  // row is dealt onto two lines, each pushed apart and pulled back, and a displaced total is tied to its brace by the same
  // leader the names use. One line is tried FIRST and left exactly as it was, so nothing already delivered moves.
  const totalWords = laid.map((c) => measure(whole(c.total), axis));
  const tooWide = totalWords.findIndex((t, i) => !(drawn(t.width) <= laid[i].w + colGap));
  let totalLines = 1;
  let totals = laid.map((c, i) => ({ word: totalWords[i], x: c.x + c.w / 2, half: drawn(totalWords[i].width) / 2, line: 0 }));
  if (tooWide !== -1) {
    let dealt = null;
    for (const lines of [2, 3]) {
      dealt = placeOn(totalWords, lines);
      if (dealt) {
        totalLines = lines;
        break;
      }
    }
    if (!dealt) throw new Error(`${laid[tooWide].name}'s total does not hold under its column, on one line nor dealt onto two or three`);
    totals = dealt;
  }

  const tickH = gap / 2;
  const underPlot = gap / 2 + tickH + gap / 2 + band.ascent + (totalLines - 1) * namePitch + band.descent + gap / 2;
  const share = subject.coal.share;

  // THE KEY AS A BAND, where the gutter was not paid for: the nine names run left to right under the year, wrapped into as
  // many lines as the content width takes, each behind a swatch of its own step of the ramp; the first line stops short of
  // the year. Nothing here runs at 16:9, where `inGutter` holds and the band is empty.
  //
  // ITS RHYTHM IS A LADDER, because every line the band takes is a line of plot. The strip the coal pours into is `share`
  // of the plot's own height and has to carry « Allemagne » inside it, so the plot can never be shorter than
  // (ascent + descent + gap/2) / share — 414.3px at 1080, where the roomiest rhythm's four lines left 372.0 (measured
  // 2026-09-23). The swatch, its lead to the word and the air between entries therefore step down together until the band
  // packs into few enough lines for the plot to still name the strip, and the arithmetic is thrown when none of them does.
  const keyPitch = band.ascent + band.descent + 0.35 * gap;
  const swatchH = 0.55 * band.ascent;
  const KEY_RHYTHMS = [
    { swatch: 1.1, lead: 0.5, between: 1.2 },
    { swatch: 0.9, lead: 0.4, between: 0.95 },
    { swatch: 0.75, lead: 0.33, between: 0.8 },
    { swatch: 0.65, lead: 0.28, between: 0.6 },
  ];
  /** A name drawn INSIDE the strip needs this much of it; drawn UNDER the strip it costs the frame's foot this much. */
  const nameInStrip = band.ascent + band.descent + gap / 2;
  const underStripBand = gap / 2 + band.ascent + band.descent;
  const shapeFor = (rhythm, reserve) => {
    const swatchW = rhythm ? rhythm.swatch * band.ascent : 0;
    const swatchLead = rhythm ? rhythm.lead * gap : 0;
    const keyBand = [];
    if (rhythm) {
      const between = rhythm.between * gap;
      const edge = (line) => (line === 0 ? year.x - 2 * gap : stage.width - inset);
      let x = inset;
      let line = 0;
      for (const word of keyWords) {
        const wide = swatchW + swatchLead + drawn(word.width);
        if (x > inset && x + wide > edge(line)) {
          line += 1;
          x = inset;
        }
        keyBand.push({ ...word, line, x });
        x += wide + between;
      }
      for (const w of keyBand) if (!(w.x + swatchW + swatchLead + drawn(w.width) <= stage.width - inset + 1e-6)) throw new Error(`« ${w.text} » does not hold on its line of the key band`);
    }
    const keyLines = keyBand.length ? keyBand.at(-1).line + 1 : 0;
    const bandBaseline = keyLines ? topBaseline + (keyLines - 1) * keyPitch + band.descent + gap + band.ascent : topBaseline;
    const plotTop = bandBaseline + (nameLines - 1) * namePitch + band.descent + 1.5 * gap;
    const plotBottom = Math.min(creditAt.y - underPlot - gap, (stage.height - vInset - gap - reserve + share * plotTop) / (1 + share));
    return { swatchW, swatchLead, keyBand, keyLines, bandBaseline, plotTop, plotBottom, H: plotBottom - plotTop };
  };
  let shape = null;
  const triedRhythms = [];
  if (inGutter) shape = { ...shapeFor(null, 0), namesUnder: false };
  else {
    for (const rhythm of KEY_RHYTHMS) {
      const trial = shapeFor(rhythm, 0);
      if (share * trial.H >= nameInStrip) {
        shape = { ...trial, namesUnder: false };
        break;
      }
      triedRhythms.push(`a ${trial.keyLines}-line band leaves a ${trial.H.toFixed(1)}px plot and a ${(share * trial.H).toFixed(1)}px strip`);
    }
    // THE LAST RUNG. No rhythm leaves a strip thick enough to set « Allemagne » inside it — at 1080x1080 the tightest band
    // still only buys a 50px strip against the 59px a name needs (measured 2026-09-23). The two names then come OUT of the
    // strip and sit under it: the strip keeps the height its area owes it, which is the thing the shot is about, and the
    // reader still reads whose coal it is. The frame's foot pays for the line instead of the plot.
    if (!shape) {
      const trial = shapeFor(KEY_RHYTHMS.at(-1), underStripBand);
      if (!(trial.H > 0))
        throw new Error(
          `the nine source names in a band leave no plot at all (${triedRhythms.join("; ")}), and naming the strip under ` +
            `itself costs a further ${underStripBand.toFixed(1)}px: the frame is ${stage.height}px and this beat cannot be drawn in it`,
        );
      shape = { ...trial, namesUnder: true };
    }
  }
  const { swatchW, swatchLead, keyBand, keyLines, bandBaseline, plotTop, plotBottom, H, namesUnder } = shape;
  const braceTop = plotBottom + gap / 2;
  const totalsBaseline = braceTop + tickH + gap / 2 + band.ascent;
  const stripTop = plotBottom + gap;
  const stripH = share * H;
  if (!(stripTop + stripH + (namesUnder ? underStripBand : 0) <= stage.height - vInset + 1e-6)) throw new Error("the coal strip does not hold under the plot");
  if (!(totalsBaseline + (totalLines - 1) * namePitch + band.descent <= creditAt.y + 1e-6)) throw new Error("the totals run into the credit");

  const columns = laid.map((c, i) => {
    const t = totals[i];
    const p = placed[i];
    return {
      key: c.key,
      total: c.total,
      cum: c.cum,
      x: c.x,
      w: c.w,
      bands: c.bands.map((b) => ({ key: b.key, share: b.share })),
      name: { ...p.word, x: p.x - p.half, y: bandBaseline + p.line * namePitch },
      tick: Math.abs(p.x - (c.x + c.w / 2)) > 1 ? { x1: p.x, y1: bandBaseline + (nameLines - 1) * namePitch + band.descent + gap / 4, x2: c.x + c.w / 2, y2: plotTop - gap / 4 } : null,
      totalWord: { ...t.word, x: t.x - t.half, y: totalsBaseline + t.line * namePitch },
      totalTick: Math.abs(t.x - (c.x + c.w / 2)) > 1 ? { x1: c.x + c.w / 2, y1: braceTop + tickH + gap / 4, x2: t.x, y2: totalsBaseline - band.ascent - gap / 4 } : null,
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
      if (!(drawn(word.width) + 2 * gap <= w)) throw new Error(`${c.name} does not hold across its piece of the strip (${drawn(word.width).toFixed(1)}px + ${(2 * gap).toFixed(1)}px of air in ${w.toFixed(1)}px)`);
      if (!namesUnder && !(nameInStrip <= stripH)) throw new Error(`${c.name} does not hold inside the strip (${nameInStrip.toFixed(1)}px in ${stripH.toFixed(1)}px)`);
      piece.name = namesUnder
        ? { ...word, x: piece.x + w / 2 - drawn(word.width) / 2, y: stripTop + stripH + gap / 2 + band.ascent }
        : { ...word, x: piece.x + w / 2 - drawn(word.width) / 2, y: stripTop + stripH / 2 + shift };
    }
    return piece;
  });
  const stripLabel = { ...stripWord, x: plotLeft + room + gap, y: stripTop + stripH / 2 + shift };
  if (!(stripLabel.x + drawn(stripWord.width) <= stage.width - inset)) throw new Error("the strip's share does not hold at its end");

  // THE KEY: the nine names against the last column's own bands, pushed apart, pulled back over the plot's foot — or, where
  // the gutter was not paid for, the band laid out above, each name behind its swatch and pointing at nothing.
  const last = laid.at(-1);
  const pitch = band.ascent + band.descent + gap / 4;
  let legend;
  if (inGutter) {
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
    legend = keyRows.map((r) => ({ key: r.key, from: r.from, mid: r.y, swatch: null, line: { text: r.word.text, width: r.word.width, x: keyX, y: r.y + shift } }));
  } else {
    legend = keyBand.map((w) => {
      const y = topBaseline + w.line * keyPitch;
      return {
        key: w.key,
        from: null,
        mid: null,
        swatch: { x: w.x, y: y - band.ascent / 2 - swatchH / 2, width: swatchW, height: swatchH },
        line: { text: w.text, width: w.width, x: w.x + swatchW + swatchLead, y },
      };
    });
  }

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
    strip: { top: stripTop, h: stripH, pieces, label: stripLabel, namesUnder },
    legend,
    year,
    strokes: { hairline: (direction.stroke?.hairline ?? 0.6) * k, rule: (direction.stroke?.rule ?? 1) * k, ring: (direction.stroke?.rule ?? 1) * k * 1.4 },
    halo: { axis: haloOf(axis, k) },
    states,
    timing: MARIMEKKO_VIDEO_TIMING,
  };
  return { id, direction, props, report: { k, titleForm: titleCard.form, sourceForm: credit.form, H: H.toFixed(1), u: u.toFixed(3), narrowest: narrowest.toFixed(1), key: inGutter ? "gutter" : `band of ${keyLines}`, nameLines, totalLines, namesUnder } };
}
