// EVERYTHING ONE DIRECTION'S RENDER IS HANDED, BUILT IN BUN — the words, the rows the frame can hold (all 27 where it can,
// on one scale for both the levels and the changes; the rise and the largest falls where it cannot, said out loud), the zero
// lines before and after the flip, the camera's zoom, the texts, colours and states.
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
import { BAND_PROBE, bandOf, CREDIT_ONE_LINE, DRAWN_WIDER, haloOf, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf } from "../../skills/chart-video/scripts/shots.mjs";
import { videoRegistersOf } from "../../skills/chart-video/scripts/video-registers.mjs";
import { changeText } from "./scene.mjs";
import { statesFor } from "./states.mjs";
import { FROM, loadSubject, TO } from "./subject.mjs";
import { DIVERGING_BAR_VIDEO_TIMING } from "./timing-contract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
/** The size this run exports at — `--size`, landscape when nothing asks. R2 names three and
 *  everything under it already answered per size; only this line pinned the beat to one. */
export const SIZE = videoExportSize();
export const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const NB = "\u00A0";
const LABEL_GAP = 0.4;
const BAR = 0.56;
/** At the camera's closest, the one rise is this share of the half-column it grows into. */
const RISE_AT_ZOOM = 0.35;

export function loadBeat() {
  const subject = loadSubject();
  return { subject, states: statesFor(), copy: copyOf(subject) };
}

export function copyOf(subject) {
  return {
    eyebrow: `Climat${NB}· Union européenne`,
    title: [`La Croatie est le seul pays de l’UE à émettre plus de CO₂ par personne qu’en ${FROM}`, `La Croatie, seule hausse du CO₂ par personne dans l’UE depuis ${FROM}`],
    year: String(FROM),
    // THE COUNT SAYS WHAT IT COUNTED. With all 27 rows drawn it counts the falls and there is nothing else to say. With
    // R8's reduced set it counts the falls THAT ARE DRAWN, and a bare « 12 baisses depuis 1990 » would state something the
    // file denies — 26 fell. The second wording names the whole it is a part of, so the number on the plate stays the
    // number in the data.
    count: (n, of = null) => (of === null ? `${n}${NB}baisse${n > 1 ? "s" : ""} depuis ${FROM}` : `${n} des ${of}${NB}baisses depuis ${FROM}`),
    // R8's OWN SENTENCE, in the plate's voice: how many rows were drawn, out of how many, and by what rule. It is written
    // from the count the ladder actually took — never a number typed here.
    //
    // AND IT IS A LADDER OF FORMS, like the title and the credit, because a sentence's LENGTH IS A MEASURE. Measured
    // 2026-09-24: the first form runs 1318-1502px against the 936px a square line has, so a beat with one fixed wording
    // would refuse here having spent every other rung. EVERY FORM KEEPS THE RULE — the rise, and the falls taken from the
    // largest down — because a plate reading « les plus fortes baisses » over a drawing that also carries Croatia's rise
    // states something the picture contradicts (the first draft of this ladder did exactly that, at rapport and nocturne,
    // 2026-09-24). What the short forms give up is the WHOLE they are a part of, and only because the counter beside them
    // already says it: « 12 des 26 baisses depuis 1990 ».
    scope: (drawn, all) => [
      `${drawn} des ${all} États membres${NB}: la hausse et les ${drawn - 1} plus fortes baisses`,
      `${drawn} des ${all} pays${NB}: la hausse et les ${drawn - 1} plus fortes baisses`,
      `La hausse et les ${drawn - 1} plus fortes baisses, sur ${all}`,
      `La hausse et les ${drawn - 1} plus fortes baisses`,
      `La hausse et ${drawn - 1} fortes baisses`,
    ],
    unit: "tonnes de CO₂ par personne",
    zoom: (by) => `×${by}`,
    source: [`Source : Global Carbon Budget (2025), via Our World in Data${NB}· combustibles fossiles et industrie`, "Source : Global Carbon Budget (2025), via Our World in Data"],
  };
}

export function textPerRegisterOf(copy, subject) {
  return {
    display: copy.title.join(" "),
    eyebrow: copy.eyebrow,
    body: copy.source.join(" "),
    annot: "",
    value: `${copy.count(26)} ${copy.count(12, 26)} ${copy.year} ${copy.zoom(250)} 0123456789`,
    axis: `${copy.unit} ${copy.scope(12, subject.rows.length).join(" ")} ${subject.rows.map((r) => `${r.name} ${changeText(r.change)}`).join(" ")} ${copy.source.join(" ")}`,
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
  const shift = (band.ascent - band.descent) / 2;

  const titleCard = titleCardFor({ registers, eyebrow: copy.eyebrow, title: copy.title, size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });
  const { register: sourceRegister, ...credit } = sourceCreditFor({ registers, forms: copy.source, size: SIZE, k, ...CREDIT_ONE_LINE });
  const creditAt = { x: inset, y: stage.height - vInset - credit.height };

  // THE BAND OVER THE COLUMNS: the year, then the count, at the left; the unit at the right.
  //
  // THE BAND'S LINE COUNT IS A MEASURE, NOT A NUMBER. Side by side is the shape of the reading — what is
  // counted at the left, what it is counted in at the right — and it is a shape 1750px of landscape content
  // pays for. Measured 2026-09-23 on a 1080px frame: the count wants 601px and the unit 576px of a 936px
  // content width, so the pair cannot share a line at portrait or at square. The unit drops UNDER the count
  // rather than shrinking — the same two readings, stacked where the frame is narrow. Landscape still holds
  // them side by side, so nothing already delivered moves.
  const bandBaseline = vInset + valueBand.ascent;
  // The band's shape is decided on the count's FIRST wording — the one the whole set draws. R8's second wording is wider
  // (« 12 des 26 baisses » against « 12 baisses »), and letting it decide here would stack a landscape band that has room
  // for both readings side by side. The wording the plate actually draws is measured after the ladder, and held to the
  // room this shape leaves it.
  const countProbe = Array.from({ length: subject.falls + 1 }, (_, i) => measure(copy.count(i), value));
  const year = measure(copy.year, value);
  const unitWord = measure(copy.unit, axis);
  const unitDrawn = unitWord.width * (1 + DRAWN_WIDER);
  const countRoom = inset + Math.max(...countProbe.map((c) => c.width)) * (1 + DRAWN_WIDER) + 2 * gap;
  const unitBeside = stage.width - inset - unitDrawn;
  const bandStacked = !(countRoom < unitBeside);
  if (bandStacked && !(unitDrawn <= stage.width - 2 * inset)) throw new Error(`the unit is ${unitDrawn.toFixed(0)}px and a line of this frame is ${stage.width - 2 * inset}px`);
  const unitLine = bandStacked ? { ...unitWord, x: inset, y: bandBaseline + valueBand.descent + 0.5 * gap + band.ascent } : { ...unitWord, x: unitBeside, y: bandBaseline };
  const bandBottom = bandStacked ? unitLine.y + band.descent : bandBaseline + valueBand.descent;

  // R8's SENTENCE COSTS A LINE, AND THE LADDER PAYS FOR IT BEFORE IT COUNTS ITS ROWS. Measured 2026-09-24 at 1080x1080:
  // the line is 46px, which is one row of the fourteen the frame had — so a ladder that added the line AFTER choosing a
  // count would choose a count that no longer fits. The whole set is drawn without the line and every reduced set with
  // it; both tops are worked out here and each rung takes its own.
  const scopeAscent = 0.5 * gap + band.ascent;
  const topWhole = bandBottom + 1.5 * gap;
  const topReduced = bandBottom + scopeAscent + band.descent + 1.5 * gap;
  const bottom = creditAt.y - gap;

  // THE COLUMNS: name | the drawing span. The levels grow from its left edge; the changes from a zero line near its right
  // edge, room left for the rise's change past it. One scale for the levels and the changes.
  //
  // HOW MANY COLUMNS IS A LADDER, NOT A NUMBER. Two is what 1750px of landscape content affords; the argument is
  // 27 rows on one scale, and nothing in it says two. Measured 2026-09-23: a 1080x1920 frame holds all 27 in ONE
  // column (55.2px a row against a 47.5px lead) and draws them across 661px, which is the better picture; the same
  // 1080px width split in two would leave 174px of drawing. So the count is stepped from one upward and the first
  // rung whose arithmetic holds is taken — and when no rung holds, every rung's own refusal is thrown, because a
  // column count forced past its measurements is how a chart becomes a strip.
  //
  // AND WHEN NO COLUMN COUNT HOLDS, HOW MANY ROWS IS A LADDER TOO — `REMOVAL_LADDER`'s R8, the rung the 1080x1080
  // refusal of 2026-09-23 stopped one short of. Measured 2026-09-24 at square: one column gives the drawing 661px,
  // the widest it ever gets, and 677px of height, which at a 47.5-50.0px lead is thirteen to fifteen rows — so the
  // frame's only quarrel with the beat is HOW MANY ROWS, and no column count can settle it (two columns leave 449px
  // a column, 256px of which are names, against the 221px the largest fall's change and the rise's own room already
  // reserve). The rows are therefore stepped down from the whole union one at a time, and the first count whose
  // layout holds is drawn: the rise always, because it is the subject, and the falls from the largest down, because
  // a ranking read from its far end is still a ranking and the scale it sets is the real one.
  //
  // R8's CONDITION (Horak §2.4.5) IS THAT THE READER IS TOLD, and this beat tells them twice, in its own furniture:
  // the counter reads « n des 26 baisses depuis 1990 » instead of « n baisses », and `scopeLine` states the rule.
  // Both sentences are written from the count the ladder took.
  //
  // THE FLOOR IS A THIRD OF THE UNION. Below nine of twenty-seven the plate stops being a picture of the EU and
  // becomes a sample of it, which is not the claim BRIEF.md makes; the beat refuses there rather than ship it.
  const names = subject.rows.map((r) => measure(r.name, axis));
  const changes = subject.rows.map((r) => measure(changeText(r.change), axis));
  const rise = subject.rows.find((r) => r.change > 0);
  const indexOf = (r) => subject.rows.indexOf(r);
  const riseText = changes[indexOf(rise)];
  const COLUMN_LADDER = [1, 2, 3, 4];
  const ROW_FLOOR = Math.ceil(subject.rows.length / 3);
  /** The rows R8 draws at a given count: the rise, then the largest falls, left in the beat's own order. */
  const drawnRowsOf = (n) => {
    if (n >= subject.rows.length) return subject.rows;
    const kept = new Set([
      rise,
      ...subject.rows
        .filter((r) => r.change < 0)
        .sort((a, b) => a.change - b.change)
        .slice(0, n - 1),
    ]);
    return subject.rows.filter((r) => kept.has(r));
  };
  const layoutIn = (drawnRows, COLUMNS, top) => {
    const perColumn = Math.ceil(drawnRows.length / COLUMNS);
    const pitch = (bottom - top) / perColumn;
    if (!(pitch >= axis.lead)) throw new Error(`a row is ${pitch.toFixed(1)}px, shorter than its words (${axis.lead.toFixed(1)}px)`);
    const nameRoom = Math.max(...drawnRows.map((r) => names[indexOf(r)].width)) * (1 + DRAWN_WIDER);
    const gutter = 2 * gap;
    const colW = (stage.width - 2 * inset - gutter * (COLUMNS - 1)) / COLUMNS;
    const riseRoom = gap / 2 + 2 * k + gap / 2 + riseText.width * (1 + DRAWN_WIDER);
    const columns = Array.from({ length: COLUMNS }, (_, c) => {
      const x0 = inset + c * (colW + gutter);
      const start = x0 + nameRoom + gap;
      const end = x0 + colW;
      return { x0, start, end, zero: end - riseRoom, middle: start + (end - start) / 2 };
    });
    const span = columns[0].end - columns[0].start;
    if (!(span > riseRoom + gap / 2))
      throw new Error(`a column is ${colW.toFixed(0)}px and the names take ${nameRoom.toFixed(0)}px of it, leaving ${span.toFixed(0)}px to draw in against the ${(riseRoom + gap / 2).toFixed(0)}px the rise's own change reserves`);
    // The scale is the largest that holds both readings: the highest level across the span, and every fall with its change
    // before its tip and the rise's room after the zero line.
    const unit = Math.min(
      span / Math.max(...drawnRows.map((r) => Math.max(r.from, r.to))),
      ...drawnRows.filter((r) => r.change < 0).map((r) => (span - riseRoom - gap / 2 - changes[indexOf(r)].width * (1 + DRAWN_WIDER)) / -r.change),
    );
    if (!(unit > 0))
      throw new Error(`the scale comes out at ${unit.toFixed(2)}px a tonne: ${span.toFixed(0)}px of drawing cannot hold a ${Math.max(...drawnRows.map((r) => changes[indexOf(r)].width)).toFixed(0)}px change and the rise's ${riseRoom.toFixed(0)}px`);
    drawnRows.forEach((r, i) => {
      if (r.change > 0) return;
      const c = columns[Math.floor(i / perColumn)];
      if (!(c.zero + r.change * unit - gap / 2 - changes[indexOf(r)].width * (1 + DRAWN_WIDER) >= c.start)) throw new Error(`${r.name}'s change does not hold before its bar`);
    });
    // The camera's zoom: a round number that takes the rise to its share of the half-column.
    const zoomBy = Math.round((RISE_AT_ZOOM * (span / 2)) / (rise.change * unit) / 50) * 50;
    if (!(rise.change * unit * zoomBy + gap / 2 + riseText.width * (1 + DRAWN_WIDER) < span / 2)) throw new Error(`at ×${zoomBy} the rise and its change run out of the ${span.toFixed(0)}px column`);
    const barH = pitch * BAR;
    const rows = drawnRows.map((r, i) => {
      const column = Math.floor(i / perColumn);
      const slot = i - column * perColumn;
      const c = columns[column];
      const mid = top + slot * pitch + pitch / 2;
      const name = names[indexOf(r)];
      return {
        key: r.key,
        from: r.from,
        to: r.to,
        change: r.change,
        column,
        y: mid - barH / 2,
        box: { x: c.x0 - gap / 2, y: mid - barH / 2 - gap / 2, w: colW + gap, h: barH + gap },
        name: { ...name, x: c.x0 + nameRoom - name.width * (1 + DRAWN_WIDER), y: mid + shift },
        value: { ...changes[indexOf(r)], y: mid + shift },
      };
    });
    return { drawnRows, perColumn, pitch, columns, unit, zoomBy, barH, rows, top };
  };
  let layout = null;
  const rungs = new Map();
  for (let drawn = subject.rows.length; drawn >= ROW_FLOOR && !layout; drawn -= 1) {
    const drawnRows = drawnRowsOf(drawn);
    const rowTop = drawn === subject.rows.length ? topWhole : topReduced;
    rungs.set(drawn, []);
    for (const n of COLUMN_LADDER) {
      try {
        layout = layoutIn(drawnRows, n, rowTop);
        break;
      } catch (error) {
        rungs.get(drawn).push(`${n} column${n > 1 ? "s" : ""} — ${error.message}`);
      }
    }
  }
  if (!layout) {
    // The two ends of the row ladder bracket the arithmetic; the counts between them fail the same way, one pixel at a time.
    const say = (d) => `${d} row${d > 1 ? "s" : ""}: ${rungs.get(d).join("; ")}`;
    throw new Error(`no count of rows and columns draws the ${subject.rows.length} named rows in ${stage.width}x${stage.height}, stepping down to the ${ROW_FLOOR} a third of the union would be — ${say(subject.rows.length)} · ${say(ROW_FLOOR)}`);
  }
  const { drawnRows, perColumn, pitch, columns, unit, zoomBy, barH, rows, top } = layout;
  const reduced = drawnRows.length < subject.rows.length;
  const drawnFalls = drawnRows.filter((r) => r.change < 0).length;
  // THE TWO SENTENCES R8 OWES THE READER, measured against the room the band's own shape left them.
  const counts = Object.fromEntries(Array.from({ length: drawnFalls + 1 }, (_, i) => [String(i), measure(reduced ? copy.count(i, subject.falls) : copy.count(i), value)]));
  const countWidest = Math.max(...Object.values(counts).map((c) => c.width)) * (1 + DRAWN_WIDER);
  const countLine = (bandStacked ? stage.width - inset : unitBeside) - inset - 2 * gap;
  if (!(countWidest <= countLine)) throw new Error(`« ${counts[String(drawnFalls)].text} » is ${countWidest.toFixed(0)}px and the band leaves the count ${countLine.toFixed(0)}px`);
  const scopeForms = reduced ? copy.scope(drawnRows.length, subject.rows.length).map((t) => measure(t, axis)) : [];
  const scopeRoom = stage.width - 2 * inset;
  const scopeAt = scopeForms.findIndex((m) => m.width * (1 + DRAWN_WIDER) <= scopeRoom);
  if (reduced && scopeAt === -1)
    throw new Error(`no form of R8's sentence fits the ${scopeRoom.toFixed(0)}px line: ${scopeForms.map((m) => `« ${m.text} » at ${(m.width * (1 + DRAWN_WIDER)).toFixed(0)}px`).join("; ")}`);
  const scopeLine = reduced ? { ...scopeForms[scopeAt], x: inset, y: bandBottom + scopeAscent } : null;
  const zoomWord = measure(copy.zoom(zoomBy), value);
  const rowsIn = (c) => Math.min(perColumn, drawnRows.length - c * perColumn);

  const { ground, accent } = direction;
  const { ink, muted } = deriveFurniture(ground);
  const walked = (c, floor, what) => {
    const w = adjustToContrast(c, ground, floor);
    if (!w) throw new Error(`${what} has no variant that reads at ${floor}:1 on ${ground}`);
    return w;
  };
  const colours = {
    ground,
    grid: mix(ground, ink, 0.6),
    level: walked(mix(ink, ground, 0.55), NON_TEXT_CONTRAST_MIN, "a level"),
    lost: mix(accent, ground, 0.6),
    fall: walked(mix(accent, ground, 0.35), NON_TEXT_CONTRAST_MIN, "a fall"),
    rise: walked(accent, NON_TEXT_CONTRAST_MIN, "the rise"),
    faded: mix(ground, ink, 0.14),
    ring: walked(accent, NON_TEXT_CONTRAST_MIN, "the rise's ring"),
    text: {
      eyebrow: walked(registers.eyebrow.fill ?? accent, TEXT_CONTRAST_MIN, "the eyebrow"),
      title: walked(registers.display.fill ?? ink, TEXT_CONTRAST_MIN, "the title"),
      name: walked(ink, TEXT_CONTRAST_MIN, "a name"),
      axis: walked(muted, TEXT_CONTRAST_MIN, "a muted word"),
      value: walked(muted, TEXT_CONTRAST_MIN, "a change"),
      rise: walked(accent, TEXT_CONTRAST_MIN, "the rise's change"),
      count: walked(ink, TEXT_CONTRAST_MIN, "the count"),
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
    columns: columns.map((c, i) => ({ ...c, top, bottom: top + rowsIn(i) * pitch })),
    barH,
    unit,
    zoomBy,
    // The zoom's factor stands in the half of the subject's column the camera empties: right of the zero line, halfway down.
    zoomWord: { ...zoomWord, y: top + (rowsIn(Math.floor(drawnRows.findIndex((r) => r.change > 0) / perColumn)) * pitch) / 2 + (valueBand.ascent - valueBand.descent) / 2 },
    counts,
    year: { ...year, x: inset, y: bandBaseline },
    countAt: { x: inset, y: bandBaseline },
    unitLine,
    scopeLine,
    gap,
    strokes: { zero: (direction.stroke?.hairline ?? 0.6) * k * 1.4, ring: (direction.stroke?.rule ?? 1) * k * 1.4, rise: 2 * k },
    halo: { value: haloOf(value, k), axis: haloOf(axis, k) },
    states,
    timing: DIVERGING_BAR_VIDEO_TIMING,
  };
  // R8 IS A DECISION, SO IT IS EMITTED WITH THE RENDER. `REMOVAL_LADDER`'s invariant 1: a rung that fired and was never
  // reported is a decision nobody took. Where the whole union is drawn the fields are the same numbers they always were.
  return { id, direction, props, report: { k, titleForm: titleCard.form, sourceForm: credit.form, pitch: pitch.toFixed(1), unit: unit.toFixed(1), zoomBy, drawn: drawnRows.length, members: subject.rows.length, reduced, scopeForm: scopeAt } };
}
