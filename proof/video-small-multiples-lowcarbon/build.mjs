// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the sixteen panels and their one scale, the row
// they are cut from, both orders, every counter text a panel can show, the key, the rings, the colours and the states.
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
import { BAND_PROBE, bandOf, CREDIT_ONE_LINE, DRAWN_WIDER, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf } from "../../skills/chart-video/scripts/shots.mjs";
import { videoRegistersOf } from "../../skills/chart-video/scripts/video-registers.mjs";
import { countText } from "./scene.mjs";
import { statesFor } from "./states.mjs";
import { correlationOf, FROM, loadSubject, TO } from "./subject.mjs";
import { SMALL_MULTIPLES_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
/** The size this run exports at — `--size`, landscape when nothing asks. R2 names three and
 *  everything under it already answered per size; only this line pinned the beat to one. */
export const SIZE = videoExportSize();
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
const LABEL_GAP = 0.4;
/** The grid's first rung. A number of columns is a choice a frame makes, not a constant: see the ladder below. */
export const COLS = 4;
/** The rungs the grid steps down, widest cell last. Four columns is the 16:9 reading. */
const COL_RUNGS = [COLS, 3, 2];
/** A 2000 or 2024 bar's width, its gap to its pair, and the baseline's reach past the pair — × the axis lead. */
const BAR_W = 1.1;
const BAR_GAP = 0.25;
const OVERHANG = 0.15;

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject) };
}

export function copyOf(subject) {
  return {
    eyebrow: `Énergie${NB}· Europe`,
    title: [
      `Électricité bas-carbone${NB}: les seize ont tous progressé, les plus bas le plus vite`,
      `Bas-carbone${NB}: tous ont progressé, les plus bas le plus vite`,
    ],
    // THE UNIT IS A LADDER TOO, AND IT IS THE ONE THAT BUYS THE KEY'S LINE BACK. Measured 2026-09-24
    // at 1080 wide: the first form is 571–613px drawn and the key 330px, which is 7px more than the
    // band holds under `rapport` and 43px more under `nocturne` — so the key dropped to a line of its
    // own and the grid lost 60–69px of height for two words. Folding « part » and then the subject
    // itself into the title's own wording gets both back onto one baseline. Landscape clears at the
    // first form, so nothing there moves.
    unit: [`part bas-carbone, 0–${subject.ceiling}${NB}%`, `bas-carbone, 0–${subject.ceiling}${NB}%`, `0–${subject.ceiling}${NB}%`],
    key: [String(FROM), String(TO)],
    source: ["Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data", "Source : Ember, Energy Institute, via Our World in Data"],
    /** `REMOVAL_LADDER`'s R8 said in the beat's own voice: the reader is told how many of the sixteen
     *  the frame drew, and on which axis they were taken, so a thinned grid states its own thinning.
     *
     *  IT IS A LADDER BECAUSE IT RIDES ON THE CREDIT, AND THE CREDIT HAS A LINE BUDGET. Measured
     *  2026-09-24: the full sentence after the short source form wants more than the two lines of
     *  918px a 1080px frame allows, so the wording steps down — how they were taken, then the fact
     *  that some were not drawn at all. The count itself is never dropped. */
    drawn: (n, total) => [
      `${n} des ${total} pays, pris régulièrement du plus bas au plus haut départ`,
      `${n} des ${total} pays, du plus bas au plus haut départ`,
      `${n} des ${total} pays`,
    ],
  };
}

export function textPerRegisterOf(copy, subject) {
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: "",
    value: `${countText(74)} 0123456789`,
    // EVERY FORM, NOT THE ONE THIS FRAME HAPPENS TO TAKE: the face is chosen by coverage, so a form
    // the ladder might reach later has to be covered now — including R8's sentence, asked for at the
    // full count so the probe carries its wording rather than one rung's arithmetic.
    axis: `${copy.unit.join(" ")} ${copy.key.join(" ")} ${subject.rows.map((r) => r.name).join(" ")} ${copy.source.join(" ")} ${copy.drawn(subject.rows.length, subject.rows.length).join(" ")}`,
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
  // THE BAND OVER THE GRID — what every panel shares, stated once: the scale at the left; the key at the right, two
  // swatches, each followed by its year.
  const bandBaseline = vInset + band.ascent;
  const words = copy.key.map((d) => measure(d, axis));
  const swatchW = band.ascent;
  const keyWidth = words.reduce((w, d, i) => w + swatchW + gap / 2 + d.width * (1 + DRAWN_WIDER) + (i < words.length - 1 ? 1.5 * gap : 0), 0);
  const keyX = stage.width - inset - keyWidth;
  // THE KEY DROPS TO A LINE OF ITS OWN WHEN THE BAND CANNOT HOLD BOTH — AND THE UNIT SPENDS ITS OWN
  // WORDS FIRST. At 1920 the unit and the two swatches sit at opposite ends of one baseline with room
  // to spare. At 1080 the band is 936px of content and the first unit form plus the key want more
  // than it: side by side they would touch, which is the one arrangement that makes a key read as
  // part of the unit. Stacked, the reading is the same and the picture pays a line of height for it —
  // 69px under `rapport`, 60px under `nocturne`, measured 2026-09-24 — and that line is height the
  // grid needs more than the unit needs its first word. So the unit steps down its forms until the
  // key can share its baseline, and only a unit that is still too wide at its shortest form drops the
  // key. Landscape clears at the first form, so nothing there moves.
  const unitForms = copy.unit.map((t) => measure(t, axis));
  const sharesTheBand = (m) => inset + m.width * (1 + DRAWN_WIDER) + 2 * gap < keyX;
  const unitAt = unitForms.findIndex(sharesTheBand);
  const keyOnTheBand = unitAt !== -1;
  const unitForm = keyOnTheBand ? unitAt : unitForms.length - 1;
  const unitLine = { ...unitForms[unitForm], x: inset, y: bandBaseline };
  if (!keyOnTheBand && !(keyX >= inset)) throw new Error("the scale and the key do not fit on one line, and the key does not fit on a line of its own either");
  const keyBaseline = keyOnTheBand ? bandBaseline : bandBaseline + band.descent + gap + band.ascent;
  let cursor = keyX;
  const legend = words.map((d) => {
    const swatch = { x: cursor, y: keyBaseline - band.ascent, w: swatchW, h: band.ascent };
    const word = { ...d, x: cursor + swatchW + gap / 2, y: keyBaseline };
    cursor = word.x + d.width * (1 + DRAWN_WIDER) + 1.5 * gap;
    return { swatch, word };
  });

  // THE GRID. Each panel: its pair of bars from the ceiling line to its own baseline, the name level with the ceiling and
  // the gain on the baseline beside the pair. Every panel's bars are drawn against the SAME 0–100 % height.
  const overhang = OVERHANG * axis.lead;
  const barGap = BAR_GAP * axis.lead;
  const textGap = 1.25 * gap;
  const blockAt = (w) => 2 * w + barGap + overhang + textGap;
  const top = keyBaseline + band.descent + 2 * gap;
  const rowGap = 2.5 * gap;
  // The gain on the panel's baseline and the name just over it: the two words of one panel stand a half gap apart, and
  // far from the panel above — proximity is the grouping on a grid (the static beat's defect: a name level with the
  // ceiling stood nearer the gain of the panel above than its own).
  if (!(rowGap >= 2 * textGap)) throw new Error("the rows of panels stand closer than twice the gap inside one");

  // ── HOW MANY PANELS ARE DRAWN IS THE LAST LADDER, AND THE PLATE SAYS WHAT IT TOOK — `REMOVAL_LADDER`'s R8 ──
  //
  // Measured 2026-09-24 on a 1080x1080 frame, with every rung above this one already spent: the title
  // is on its short form, the unit steps down until the key shares its baseline, the bar width and the
  // column count are ladders of their own. What is left is 776–788px of room between the band and the
  // credit, a panel that owes 98–111px to stack its name over its gain, and rows that stand a 46–50px
  // gap apart — five rows, at most. Sixteen panels want eight rows at two columns; three columns puts
  // them in six but the names no longer fit a 312px cell, and four columns in four but a 234px cell is
  // narrower still. Every arrangement of SIXTEEN is refused by arithmetic, not by taste.
  //
  // So the grid draws fewer and SAYS SO, which is the rung the earlier passes never spent. The count
  // is itself a ladder — the whole set first — and the sentence the credit carries is written from the
  // rung actually taken, never from a number typed here. Landscape takes the first rung, so nothing
  // already delivered moves and no sentence is added there.
  const total = subject.rows.length;
  const DRAWN_RUNGS = [total, 14, 12, 10, 8].filter((n, i) => i === 0 || (n < total && n >= 4));
  /**
   * THE COUNTRIES ONE RUNG DRAWS — taken at even steps along the order of the 2000 start, which is the
   * order the grid ends in and the axis the claim is made on, so a thinned grid keeps the whole range
   * and the gradient across it rather than a huddle at one end. The two the beat rings are forced in:
   * they are the largest and the smallest gain, the sentence the last shot is about.
   */
  const keysAt = (n) => {
    const order = subject.byStart;
    if (n >= order.length) return order.slice();
    const seats = Array.from({ length: n }, (_, i) => Math.round((i * (order.length - 1)) / (n - 1)));
    for (const key of subject.rings) {
      const want = order.indexOf(key);
      if (seats.includes(want)) continue;
      let nearest = 0;
      for (let i = 1; i < seats.length; i++) if (Math.abs(seats[i] - want) < Math.abs(seats[nearest] - want)) nearest = i;
      seats[nearest] = want;
    }
    const seen = [...new Set(seats)].sort((a, b) => a - b);
    if (seen.length !== n) throw new Error(`taking ${n} of ${order.length} at even steps, with the two ringed countries forced in, lands twice on the same country`);
    return seen.map((i) => order[i]);
  };
  const attempt = (n) => {
    const keys = new Set(keysAt(n));
    const drawnRows = subject.rows.filter((r) => keys.has(r.key));
    for (const key of subject.rings) if (!keys.has(key)) throw new Error(`this rung drops ${key}, which the last shot rings`);
    // A REDUCTION MAY NOT COST THE ARGUMENT. The title says the lowest starters rose the most, and that
    // is a correlation over the whole set, not a pair of examples — a thinned grid that no longer shows
    // it is a picture of a different claim, so the rung is refused rather than drawn.
    const correlation = correlationOf(drawnRows.map((p) => p.from), drawnRows.map((p) => p.delta));
    if (!(correlation < -0.5)) throw new Error(`the correlation between start and gain falls to ${correlation.toFixed(2)} over these ${n}, and the title's claim stops being visible`);
    // THE SOURCE GIVES WAY BEFORE THE SENTENCE DOES. Both are ladders and the credit takes the first
    // pairing that fits, so the order runs the reduction's longest wording against every source form
    // before it shortens the reduction: what the plate owes the reader most is that it drew fewer.
    const said = n < total ? copy.drawn(n, total) : null;
    const forms = said ? said.flatMap((sentence) => copy.source.map((line) => `${line} · ${sentence}`)) : copy.source;
    const { register: sourceRegister, ...credit } = sourceCreditFor({ registers, forms, size: SIZE, k, ...CREDIT_ONE_LINE });
    const creditAt = { x: inset, y: stage.height - vInset - credit.height };
    const bottom = creditAt.y - 1.5 * gap;
    const names = drawnRows.map((r) => measure(r.name, axis));
    const countWidths = {};
    for (const r of drawnRows) for (let v = 0; v <= Math.round(r.delta); v++) countWidths[countText(v)] = widthOf(applyCase(countText(v), value.transform), value);
    // THE BAR'S WIDTH IS A LADDER TOO, AND IT IS THE GRID'S. `BAR_W × lead` is the 16:9 reading; at 1080
    // wide sixteen bars side by side get a 58px slot and 1.1 leads is 62px before the overhang the
    // baseline needs either side, so the establishing row will not stand. Narrowing the bar narrows the
    // panel's pair as well, which is the other half of what the cell has to hold — so the two ladders
    // are run together below, widest bar and most columns first. Drawing fewer panels widens the slot,
    // so this ladder is re-run inside each count rung rather than once outside them.
    const slotW = (stage.width - 2 * inset) / drawnRows.length;
    const barRungs = [BAR_W, 0.9, 0.75, 0.6, 0.5].map((f) => f * axis.lead).filter((w) => slotW > w + 2 * overhang);
    if (barRungs.length === 0) throw new Error(`${drawnRows.length} bars do not stand side by side in one row: a slot is ${slotW.toFixed(0)}px and the narrowest bar the ladder names is ${(0.5 * axis.lead).toFixed(0)}px plus ${(2 * overhang).toFixed(0)}px of overhang`);
    const panelWords = drawnRows.map((r, i) => Math.max(names[i].width, ...Array.from({ length: Math.round(r.delta) + 1 }, (_, v) => countWidths[countText(v)])) * (1 + DRAWN_WIDER));
    const widestWord = Math.max(...panelWords);
    // THE NUMBER OF COLUMNS IS A LADDER, NOT A CONSTANT. Four across is what 1920 wide affords and what
    // sixteen panels read best as. At 1080 the cell is 234px and one panel's block — a pair of bars,
    // then its name over its gain — measures 418: the name would sit nearer its neighbour's bars than
    // its own, which is the one thing a grid may never do. Stepping to three and then two widens the
    // cell and deepens the grid; the panel's own height is the counter-pressure, since fewer columns
    // means more rows, so a rung is taken only when the cell holds the block AND the panel still
    // stacks its name over its gain. Landscape clears at four, so nothing there moves.
    const gridAt = (barW, cols) => {
      const blockW = blockAt(barW) + widestWord;
      const rowCount = Math.ceil(drawnRows.length / cols);
      const cellW = (stage.width - 2 * inset) / cols;
      const cellH = (bottom - top + rowGap) / rowCount;
      const barsH = cellH - rowGap;
      const countBaseline = barsH;
      const nameBaseline = countBaseline - valueBand.ascent - 0.5 * gap - band.descent;
      return { barW, cols, blockW, rowCount, cellW, cellH, barsH, countBaseline, nameBaseline, wide: cellW - blockW >= 2 * textGap, tall: nameBaseline - band.ascent >= 0 };
    };
    const tried = barRungs.flatMap((w) => COL_RUNGS.map((c) => gridAt(w, c)));
    const rung = tried.find((g) => g.wide && g.tall);
    if (!rung) {
      const narrowest = gridAt(barRungs.at(-1), COL_RUNGS.at(-1));
      const tallest = gridAt(barRungs.at(-1), COL_RUNGS[0]);
      throw new Error(
        narrowest.wide
          ? `a panel of ${narrowest.barsH.toFixed(0)}px cannot stack its name over its gain, at any rung the grid names (${COL_RUNGS.join(", ")} columns, bars down to ${barRungs.at(-1).toFixed(0)}px)`
          : `a panel is ${narrowest.blockW.toFixed(0)}px wide in a ${narrowest.cellW.toFixed(0)}px cell: its name would read as its neighbour's, and the widest rung the grid names (${narrowest.cols} columns) leaves a panel ${narrowest.barsH.toFixed(0)}px tall where ${(tallest.barsH - narrowest.barsH).toFixed(0)}px more is needed to stack its name over its gain`,
      );
    }
    return { n, said: said && forms[credit.form], keys, drawnRows, sourceRegister, credit, creditAt, bottom, names, countWidths, slotW, panelWords, rung, correlation };
  };
  let taken = null;
  const refusedCounts = [];
  for (const n of DRAWN_RUNGS) {
    try {
      taken = attempt(n);
      break;
    } catch (error) {
      refusedCounts.push(`${n} of ${total} — ${error.message}`);
    }
  }
  if (!taken) throw new Error(`no number of panels holds in ${stage.width}x${stage.height}: ${refusedCounts.join("; ")}`);
  const { said, drawnRows, sourceRegister, credit, creditAt, bottom, names, countWidths, slotW, panelWords, rung } = taken;
  const { cols, cellW, cellH, barsH, countBaseline, nameBaseline, blockW } = rung;
  const barW = rung.barW;
  const pairW = 2 * barW + barGap;
  const textDx = pairW + overhang + textGap;
  const blocks = panelWords.map((w) => textDx + w);
  const cells = drawnRows.map((_, i) => ({ x: inset + overhang + (i % cols) * cellW, top: top + Math.floor(i / cols) * cellH }));

  // THE ROW THE GRID IS CUT FROM: every drawn country's 2000 bar side by side on one baseline, centred in the grid's
  // height, each in a slot of its own the baseline runs through unbroken.
  const rowTop = top + (bottom - top - barsH) / 2;
  const seats = drawnRows.map((_, i) => ({ x: inset + i * slotW + (slotW - barW) / 2, top: rowTop }));

  // THE RINGS: around the whole panel, inside half the air between panels.
  const pad = Math.min(0.6 * gap, rowGap / 3, (cellW - blockW) / 3);
  const rings = new Set(subject.rings);

  const { ground, accent } = direction;
  const { ink, muted, grid } = deriveFurniture(ground);
  const walked = (c, floor, what) => {
    const w = adjustToContrast(c, ground, floor);
    if (!w) throw new Error(`${what} has no variant that reads at ${floor}:1 on ${ground}`);
    return w;
  };
  const colours = {
    ground,
    pale: mix(accent, ground, 0.62),
    full: walked(accent, NON_TEXT_CONTRAST_MIN, `the ${TO} bar`),
    rule: grid,
    ring: walked(ink, NON_TEXT_CONTRAST_MIN, "the ring"),
    text: {
      eyebrow: walked(registers.eyebrow.fill ?? accent, TEXT_CONTRAST_MIN, "the eyebrow"),
      title: walked(registers.display.fill ?? ink, TEXT_CONTRAST_MIN, "the title"),
      name: walked(ink, TEXT_CONTRAST_MIN, "a name"),
      axis: walked(muted, TEXT_CONTRAST_MIN, "a muted word"),
      accent: walked(accent, TEXT_CONTRAST_MIN, "a thread word"),
    },
  };

  const r1 = (v) => Math.round(v * 10) / 10;
  const props = {
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, value, axis, source: sourceRegister },
    titleCard,
    credit: { ...credit, at: creditAt },
    colours,
    before: subject.before.filter((key) => taken.keys.has(key)),
    byStart: subject.byStart.filter((key) => taken.keys.has(key)),
    rings: subject.rings,
    rows: drawnRows.map((r, i) => ({
      key: r.key,
      from: r.from,
      to: r.to,
      delta: r.delta,
      thread: rings.has(r.key),
      name: names[i],
      ring: { x: r1(-overhang - pad), y: r1(-pad), w: r1(blocks[i] + overhang + 2 * pad), h: r1(barsH + 2 * pad) },
    })),
    ceiling: subject.ceiling,
    cells,
    seats,
    barsH: r1(barsH),
    barW: r1(barW),
    barGap: r1(barGap),
    overhang: r1(overhang),
    slotW: r1(slotW),
    textDx: r1(textDx),
    nameBaseline: r1(nameBaseline),
    countBaseline: r1(countBaseline),
    countWidths,
    unitLine,
    legend,
    strokes: { ring: (direction.stroke?.rule ?? 1) * k * 1.4, rule: (direction.stroke?.rule ?? 1) * k },
    states,
    timing: SMALL_MULTIPLES_VIDEO_TIMING,
  };
  return {
    id,
    direction,
    props,
    report: { k, titleForm: titleCard.form, sourceForm: credit.form, panel: `${cellW.toFixed(0)}x${barsH.toFixed(0)}px`, air: (cellW - blockW).toFixed(0), unitForm, drawn: drawnRows.length, total, said },
  };
}
