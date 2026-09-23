// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the world ring on one px-per-Gt scale in both
// years, the names seated clear of the ring they name, the rings' seats in their grid with their words, every text
// measured, the colours (the past measured the way the static plate measures it) and the states.
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
import { BAND_PROBE, bandOf, CREDIT_ONE_LINE, DRAWN_WIDER, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf } from "../../skills/chart-video/scripts/shots.mjs";
import { videoRegistersOf } from "../../skills/chart-video/scripts/video-registers.mjs";
import { statesFor } from "./states.mjs";
import { FROM, loadSubject, NAMED, SUBJECT, TO } from "./subject.mjs";
import { DONUT_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
/** The size this run exports at — `--size`, landscape when nothing asks. R2 names three and
 *  everything under it already answered per size; only this line pinned the beat to one. */
export const SIZE = videoExportSize();
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
const TURN = 2 * Math.PI;
const LABEL_GAP = 0.4;
/** The static plate's ring: 7 px of stroke and 3.5 px between the two arcs on a ~54 px ring, as shares of the radius. */
const RING_WIDTH = 0.1;
const RING_GAP = 0.4;
/** The world ring is drawn thicker than a country's, and its members parted by a seam of ground. */
const WORLD_WIDTH = 2;
const SEAM = 0.3;
/** A ring's radius as a share of its slot — the static plate's 0.42, opened where the video's frame has the room. */
const SLOT_SHARE = 0.46;

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject) };
}

const fr = (v, digits) => v.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).replace(/[\u202F\u00A0\u2009]/g, NB);

export function copyOf(subject) {
  return {
    eyebrow: "Climat · Monde",
    title: [
      `En ${FROM} les États-Unis émettaient un quart du CO₂ mondial et la Chine un septième${NB}; en ${TO}, c’est l’inverse`,
      `La Chine et les États-Unis ont échangé leurs parts du CO₂ mondial`,
      `Les parts du CO₂ mondial, ${FROM} et ${TO}`,
    ],
    share: (v) => `${fr(v, 1)}${NB}%`,
    label: (name, v) => `${name} ${fr(v, 1)}${NB}%`,
    world: (year, gt) => `${year} · ${fr(gt, 1)}${NB}Gt`,
    tonnes: [(year, gt) => `${year} · ${fr(gt, 1)}${NB}Gt`, (_, gt) => `${fr(gt, 1)}${NB}Gt`],
    /** THE CREDIT, AND — WHEN THE FRAME MADE THE BEAT DRAW FEWER RINGS — THE SENTENCE THAT SAYS SO.
     *
     *  `REMOVAL_LADDER`'s R8 recovers by drawing less, on Horak §2.4.5's condition that the reader is
     *  TOLD it happened. So the count the ring ladder actually took is written into the plate, and it
     *  leads the credit rather than trailing it: a credit is read left to right and the one sentence a
     *  reader must not miss is the one that says what is not on the plate. Every reduced form carries
     *  it, including the shortest, so the fitting ladder cannot drop the clause to win a line. */
    source: (drawn, total) => {
      const filed = [`Sources : Global Carbon Budget 2025 · population, via Our World in Data`, `Sources : Global Carbon Budget, Our World in Data`];
      if (drawn >= total) return filed;
      const said = `Les ${drawn} premiers émetteurs de ${TO}`;
      return [...filed.map((f) => `${said} · ${f}`), `${said} · Global Carbon Budget, Our World in Data`];
    },
  };
}

export function textPerRegisterOf(copy, subject) {
  const { countries, world0, world1 } = subject;
  // EVERY FORM THE CREDIT COULD TAKE, not the one it takes here: `resolve-families.mjs` picks the face
  // by COVERAGE, so a letter that only appears in the reduced credit — « émetteurs » carries a lowercase
  // é the filed sources never set — has to be in the sample or the face is chosen against the wrong text.
  const credits = [...copy.source(countries.length, countries.length), ...copy.source(NAMED.length, countries.length)].join(" ");
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: credits,
    annot: countries.map((c) => c.name).join(" "),
    value: `${countries.map((c) => `${copy.label(c.name, c.share0)} ${copy.share(c.share1)}`).join(" ")} ${copy.world(FROM, world0)} ${copy.world(TO, world1)}`,
    axis: `${countries.map((c) => `${copy.tonnes[0](FROM, c.gt0)} ${copy.tonnes[0](TO, c.gt1)}`).join(" ")} ${credits}`,
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
  const { axis, value, annot } = registers;
  const measure = (t, r) => {
    const cased = applyCase(t, r.transform);
    return { text: cased, width: widthOf(cased, r) };
  };
  const drawn = (m) => m.width * (1 + DRAWN_WIDER);
  const gap = LABEL_GAP * axis.lead;
  const aBand = bandOf(BAND_PROBE, axis);
  const vBand = bandOf(BAND_PROBE, value);
  const nBand = bandOf(BAND_PROBE, annot);
  const valueBand = vBand.ascent + vBand.descent;

  const titleCard = titleCardFor({ registers, eyebrow: copy.eyebrow, title: copy.title, size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });
  const { countries, world0, world1 } = subject;
  const ringStroke = (direction.stroke?.hairline ?? 0.6) * k * 1.5;
  const centred = (m, x, y) => ({ ...m, x: x - drawn(m) / 2, y });

  // ── THE RINGS: HOW MANY, AND IN WHAT GRID — TWO LADDERS, THE OUTER ONE WALKED ONLY WHEN THE INNER RUNS OUT ──
  //
  // HOW MANY COLUMNS IS A LADDER, NOT SIX. One row of six is what 1750px of landscape content affords — 292px a
  // slot. Measured 2026-09-23 on a 1080px frame: a slot falls to 156px, which neither tonnes form holds under,
  // and whose ring leaves a 55px hole for a share that needs 83px. The argument is SIX RINGS, not six across, so
  // the row is stepped into a grid and the first arrangement whose every measurement holds is taken. Landscape
  // takes the first rung — one row of six — so nothing already delivered moves.
  //
  // The rows spread over the whole room rather than packing at its top: with one row that is the block centred
  // exactly where it was, and with two it is the frame used rather than a band of rings above a band of nothing.
  //
  // AND AT 1080x1080 THE COLUMN LADDER RUNS OUT, BECAUSE TWO ROWS CANNOT CARRY A RING THIS BEAT CAN READ.
  // Measured 2026-09-24 on the square frame, creme: 826px of room, so a row of two is 413px, of which the words
  // under a ring take 181px and the air a row owes the next one takes 38px — 97px of radius, whose hole is 74px
  // for a share that needs 90px and a China ring that needs 101px. The radius the hole demands is 133px, which
  // wants 279px of row on top of the words: no second row exists at this height. So ONE ROW is the only shape,
  // and one row of n is capped horizontally at 0.46 × (936 / n) — 133px of radius needs a 290px slot, which is
  // three columns at most.
  //
  // TWO EARLIER RUNGS WERE MEASURED AND DO NOT FIRE, so they are not built. Setting both years' tonnes ABREAST
  // instead of stacked takes one `axis.lead` off the words — 181px to 134px — and lifts a two-row radius to
  // 121px, still under the 133px the hole demands; and merging the name onto that same line takes the words to
  // 77px and the radius to 149px, but the line is then 385/437/462px wide against the 450px a two-column slot
  // affords, so nocturne refuses on width what creme won on height. A rung that recovers nothing does not fire.
  //
  // WHAT IS LEFT IS R8: DRAW FEWER RINGS AND SAY SO. `countries` arrives sorted by 2023 tonnes, so dropping from
  // the end drops the smallest emitters and never the two the world ring names. The credit states the count the
  // ladder took — never a number written here — and the reader is told what is not on the plate.
  const layoutFor = (howMany) => {
    const shown = countries.slice(0, howMany);
    const missing = NAMED.filter((code) => !shown.some((c) => c.code === code));
    if (missing.length || !shown.some((c) => c.code === SUBJECT)) throw new Error(`the world ring names ${[...NAMED, SUBJECT].join(", ")} and this rung drops ${[...new Set([...missing, ...(shown.some((c) => c.code === SUBJECT) ? [] : [SUBJECT])])].join(", ")}`);
    const { register: sourceRegister, ...credit } = sourceCreditFor({ registers, forms: copy.source(howMany, countries.length), size: SIZE, k, ...CREDIT_ONE_LINE });
    const creditY = stage.height - vInset - credit.height;
    const holes = shown.map((c) => measure(copy.share(c.share1), value));
    const names = shown.map((c) => measure(c.name, annot));
    const under = gap + nBand.ascent + nBand.descent + gap / 2 + aBand.ascent + axis.lead + aBand.descent;
    const room = creditY - gap - vInset;
    const subjectAt = shown.findIndex((c) => c.code === SUBJECT);
    const columnLadder = [...new Set([howMany, 3, 2])].filter((cols) => cols <= howMany);
    const gridIn = (cols) => {
      const rowCount = Math.ceil(shown.length / cols);
      const slot = (stage.width - 2 * inset) / cols;
      const rowPitch = room / rowCount;
      const form = copy.tonnes.findIndex((f) => shown.every((c) => [f(FROM, c.gt0), f(TO, c.gt1)].every((t) => drawn(measure(t, axis)) < slot - gap)));
      if (form === -1) throw new Error(`no tonnes form fits under a ${Math.round(slot)}px slot`);
      if (!names.every((m) => drawn(m) < slot - gap)) throw new Error(`a country's name runs wider than its ${Math.round(slot)}px slot`);
      // A ROW OWES THE NEXT ONE AIR. With one row there is none to owe and the cap is the slot's, which is what
      // landscape draws; with two the rows packed to the pixel and the last tonnes line of one row sat against the
      // ring of the next (looked at, 2026-09-23, at portrait).
      const rowAir = rowCount > 1 ? 2 * gap : 0;
      if (!(rowPitch - under - rowAir > 0)) throw new Error(`a ${Math.round(rowPitch)}px row leaves no radius under the ${Math.round(under)}px of words a ring carries`);
      const edge = Math.min(SLOT_SHARE * slot, (rowPitch - under - rowAir) / 2);
      const width = RING_WIDTH * edge;
      const small = { width, outer: edge - width / 2, inner: edge - width * 1.5 - RING_GAP * width, holeRing: 0 };
      const hole = small.inner - width / 2;
      small.holeRing = Math.hypot(drawn(holes[subjectAt]) / 2, valueBand / 2) + 0.14 * value.fontSize;
      if (!(Math.max(...holes.map((m) => Math.hypot(drawn(m) / 2, valueBand / 2))) < hole)) throw new Error(`a ring's hole (${Math.round(hole)}px) cannot hold its number (${Math.round(Math.max(...holes.map((m) => Math.hypot(drawn(m) / 2, valueBand / 2))))}px)`);
      if (!(small.holeRing + ringStroke < hole)) throw new Error(`China's ring (${Math.round(small.holeRing + ringStroke)}px) would touch its inner arc at a ${Math.round(hole)}px hole`);
      const smallestArc = (Math.min(...shown.map((c) => Math.min(c.share0, c.share1))) / 100) * TURN * small.inner;
      if (!(smallestArc >= 3)) throw new Error(`the shortest arc on a ring is ${smallestArc.toFixed(1)}px, under three`);
      const seated = shown.map((c, i) => {
        const x = inset + slot * ((i % cols) + 0.5);
        const seatY = vInset + Math.floor(i / cols) * rowPitch + (rowPitch - (2 * edge + under)) / 2 + edge;
        const nameBaseline = seatY + edge + gap + nBand.ascent;
        const tonnes0Baseline = nameBaseline + nBand.descent + gap / 2 + aBand.ascent;
        return {
          code: c.code,
          subject: c.code === SUBJECT,
          gt0: c.gt0,
          gt1: c.gt1,
          share0: c.share0,
          share1: c.share1,
          seat: { x, y: seatY },
          hole: centred(holes[i], x, seatY + (vBand.ascent - vBand.descent) / 2),
          name: centred(names[i], x, nameBaseline),
          tonnes: [centred(measure(copy.tonnes[form](FROM, c.gt0), axis), x, tonnes0Baseline), centred(measure(copy.tonnes[form](TO, c.gt1), axis), x, tonnes0Baseline + axis.lead)],
        };
      });
      return { cols, slot, edge, width, small, seated, form };
    };
    const refused = [];
    for (const cols of columnLadder) {
      try {
        return { shown, credit, sourceRegister, creditY, ...gridIn(cols) };
      } catch (error) {
        refused.push(`${cols} across — ${error.message}`);
      }
    }
    throw new Error(refused.join("; "));
  };
  let layout = null;
  const rungs = [];
  for (let howMany = countries.length; howMany >= NAMED.length; howMany--) {
    try {
      layout = layoutFor(howMany);
      break;
    } catch (error) {
      rungs.push(`${howMany} rings — ${error.message}`);
    }
  }
  if (!layout) throw new Error(`the ${countries.length} rings find no arrangement in ${stage.width}x${stage.height}: ${rungs.join("; ")}`);
  const { shown, credit, sourceRegister, creditY, slot, edge, width, small, seated, form } = layout;

  // ── THE WORLD: one ring at the centre, its circumference the world's tonnes, the grown ring the largest that holds ──
  const cx = stage.width / 2;
  const cy = stage.height / 2;
  const worldWidth = WORLD_WIDTH * width;
  const seam = SEAM * worldWidth;
  const midAngles = (shares) => {
    let start = 0;
    return shares.map((s) => {
      const sweep = (s / 100) * TURN;
      const mid = start + sweep / 2;
      start += sweep;
      return mid;
    });
  };
  const mids0 = midAngles(shown.map((c) => c.share0));
  const mids1 = midAngles(shown.map((c) => c.share1));
  const nearest = (b) => Math.hypot(Math.max(b.x0, Math.min(cx, b.x1)) - cx, Math.max(b.y0, Math.min(cy, b.y1)) - cy);
  /** A word beside its arc: pushed out along the arc's middle until the nearest point of its box clears the ring.
   *
   *  AND, WHERE THE FRAME IS TOO NARROW FOR THAT PUSH, THE FRAME'S OWN SEAT. Measured 2026-09-23: « États-Unis
   *  24,4 % » is 480px wide and its arc's middle runs out at 95° from twelve — almost due east — so on a 1080px
   *  frame the radial seat lands 250px past the right margin at every radius whose arcs are still 3px long, and
   *  the beat refused at portrait sixty-seven times over. The second seat keeps both facts the first one carried:
   *  the word is slid inside the margins and then set at the exact vertical distance that clears the ring —
   *  `hypot(dx, dy) = clear` solved for dy — above the ring when the arc's middle points up, below when it points
   *  down. It is still the word nearest its own arc, and the clearance is still MEASURED, not assumed. A landscape
   *  word's radial seat is already inside the margins, so it returns from the loop and nothing moves. */
  const beside = (m, theta, r) => {
    const clear = r + worldWidth / 2 + gap;
    const w = drawn(m);
    const inFrame = (box) => box.x0 >= inset && box.x1 <= stage.width - inset;
    let d = clear;
    for (let step = 0; step < 50; step++) {
      const px = cx + Math.sin(theta) * d;
      const py = cy - Math.cos(theta) * d;
      const bx = px + (Math.sin(theta) * w) / 2;
      const by = py - (Math.cos(theta) * valueBand) / 2;
      const box = { x0: bx - w / 2, x1: bx + w / 2, y0: by - valueBand / 2, y1: by + valueBand / 2 };
      const near = nearest(box);
      if (near >= clear) {
        if (inFrame(box)) return { ...m, x: box.x0, y: box.y0 + vBand.ascent, box };
        break;
      }
      d += clear - near + 0.5;
    }
    if (!(w <= stage.width - 2 * inset)) throw new Error(`« ${m.text} » is ${Math.round(w)}px and a line of this frame is ${stage.width - 2 * inset}px`);
    const x0 = Math.min(Math.max(cx + Math.sin(theta) * clear - w / 2, inset), stage.width - inset - w);
    const box = { x0, x1: x0 + w, y0: 0, y1: 0 };
    const dx = Math.abs(cx - Math.max(box.x0, Math.min(cx, box.x1)));
    const need = dx >= clear ? 0 : Math.sqrt(clear * clear - dx * dx);
    const up = Math.cos(theta) >= 0;
    box.y0 = up ? cy - need - valueBand : cy + need;
    box.y1 = box.y0 + valueBand;
    if (!(nearest(box) >= clear - 1e-6)) throw new Error(`« ${m.text} » finds no seat clear of its ring`);
    return { ...m, x: box.x0, y: box.y0 + vBand.ascent, box };
  };
  const overlap = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
  const within = (b) => b.x0 >= inset && b.x1 <= stage.width - inset && b.y0 >= vInset && b.y1 <= stage.height - vInset;

  let world = null;
  const refusals = [];
  // THE LARGEST RADIUS THE LADDER STARTS FROM IS THE FRAME'S SHORT SIDE, not its height: a 1080x1920 frame would
  // otherwise begin at 860px on a half-width of 468 and spend the whole ladder outside its own margins.
  for (let r1 = Math.floor(Math.min(stage.height / 2 - vInset, stage.width / 2 - inset) - worldWidth / 2); r1 > 200; r1 -= 10) {
    const r0 = (r1 * world0) / world1;
    const named = NAMED.map((code) => shown.findIndex((c) => c.code === code));
    const before = named.map((i) => ({ code: shown[i].code, ...beside(measure(copy.label(shown[i].name, shown[i].share0), value), mids0[i], r0) }));
    const after = named.map((i) => ({ code: shown[i].code, ...beside(measure(copy.label(shown[i].name, shown[i].share1), value), mids1[i], r1) }));
    if (![...before, ...after].every((l) => within(l.box)) || overlap(before[0].box, before[1].box) || overlap(after[0].box, after[1].box)) {
      refusals.push(`${r1}: a name runs out of the frame or into the other`);
      continue;
    }
    const lines = [measure(copy.world(FROM, world0), value), measure(copy.world(TO, world1), value)];
    const block = 2 * valueBand + gap / 2;
    const top = cy - block / 2;
    const centre = { before: centred(lines[0], cx, top + vBand.ascent), after: centred(lines[1], cx, top + valueBand + gap / 2 + vBand.ascent) };
    const holeR = r0 - worldWidth / 2 - gap;
    if (!(Math.hypot(Math.max(...lines.map(drawn)) / 2, block / 2) < holeR)) {
      refusals.push(`${r1}: the world's tonnes do not fit its hole`);
      continue;
    }
    world = { x: cx, y: cy, r0, r1, width: worldWidth, seam, pxPerGt: (TURN * r1) / world1, labels: { before, after }, centre };
    break;
  }
  if (!world) throw new Error(`no world radius fits this frame: ${refusals.join("; ")}`);
  const worldArc = Math.min(...shown.map((c) => (c.share0 / 100) * TURN * world.r0 - seam));
  if (!(worldArc >= 3)) throw new Error(`the shortest arc on the world ring is ${worldArc.toFixed(1)}px, under three`);

  // ── THE COLOURS: the past a tint of the accent where it can be told from both the ground and the accent, the neutral where not ──
  const { ground, accent } = direction;
  const { ink, muted } = deriveFurniture(ground);
  const walked = (col, floor, what) => {
    const w = adjustToContrast(col, ground, floor);
    if (!w) throw new Error(`${what} has no variant that reads at ${floor}:1 on ${ground}`);
    return w;
  };
  const present = walked(accent, NON_TEXT_CONTRAST_MIN, "the accent");
  const tint = mix(accent, ground, 0.62);
  const tintWorks = contrast(tint, ground) >= NON_TEXT_CONTRAST_MIN && contrast(tint, present) >= 1.5;
  const past = tintWorks ? tint : walked(mix(ground, ink, 0.35), NON_TEXT_CONTRAST_MIN, "the neutral");

  const props = {
    frame: stage,
    inset,
    slot,
    valueBand,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, axis, value, annot, source: sourceRegister },
    titleCard,
    credit: { ...credit, at: { x: inset, y: creditY } },
    colours: {
      ground,
      past,
      present,
      track: mix(ground, ink, 0.09),
      text: {
        eyebrow: walked(registers.eyebrow.fill ?? accent, TEXT_CONTRAST_MIN, "the eyebrow"),
        title: walked(registers.display.fill ?? ink, TEXT_CONTRAST_MIN, "the title"),
        name: walked(ink, TEXT_CONTRAST_MIN, "a name"),
        muted: walked(muted, TEXT_CONTRAST_MIN, "a muted word"),
        accent: walked(accent, TEXT_CONTRAST_MIN, "the subject's words"),
      },
    },
    strokes: { ring: ringStroke },
    world,
    small,
    countries: seated,
    states,
    timing: DONUT_VIDEO_TIMING,
  };
  return {
    id,
    direction,
    props,
    report: { k, titleForm: titleCard.form, sourceForm: credit.form, rings: shown.length, ofRings: countries.length, r1: Math.round(world.r1), edge: Math.round(edge), past: tintWorks ? "a tint of the accent" : "the neutral", tonnesForm: form + 1 },
  };
}
