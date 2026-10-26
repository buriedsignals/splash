/**
 * THE GESTURE KIT'S PLATE. The per-type kit's columns (`static/bar-and-column/DirectedColumns.tsx`),
 * with its hard-wired staging — the subject's accent, the rule at the subject's level, the bracket over
 * the comparison set — replaced by drawing driven by the beat's composed gestures
 * (`_shared/gesture-static.mjs`): the accent, rings and stepped-back rows, the brackets, the copies a
 * compare lays, the reference rules and every gesture's note, on the Length adapter's geometry
 * (`_shared/gesture-length.mjs`). The rest of the per-type component — registers, the twin form, R8,
 * the arbiter — is kept as it was. The file is named Directed*.tsx because that is how the shared size
 * gate (`assertBeatMayEnter`) recognises a component that knows its row form. Its own history follows.
 *
 * The ten largest CO2 emitters of 2024, as columns, drawn THROUGH the design base.
 *
 * The ninth component in this tree to do that, and the first RANKING of plain bars — which turned
 * out to be where two filed treatments were quietly wrong.
 *
 * WHAT THE HARVEST GAVE THIS FAMILY.
 *
 * `every-bar-labelled-lets-the-axis-go` (Ferdio, Pew) — the rule this plate was already following
 * without being able to claim it: ten columns, ten printed values, no axis, no gridline. Its
 * predicate asked for two or more GROUPS, because it was filed from the grouped-bar harvest; the
 * Ferdio plate under it is six bars and no groups. It counts bars now.
 *
 * `order-is-chosen-from-the-answer` (ONS, Datawrapper, with `100.datavizproject.com`'s viz47 as the
 * negative case — three columns in alphabetical order, and the record says it "reads flatter for
 * it") — same group-shaped predicate, same repair. This plate orders by value, which is the answer.
 *
 * `value-on-the-mark` and `context-in-neutral-at-the-subject-scale` — every value printed outside
 * its own column in page ink, and the nine columns that are not the subject drawn in the
 * furniture's own muted step rather than in a second hue.
 *
 * AND WHAT THE PLATE ITSELF ASKED FOR, filed as `the-set-a-claim-adds-up-is-drawn-as-a-set`. The
 * headline is an arithmetic claim about a SUBSET — "more than the next five put together" — and
 * `render.mjs` computes that subset by search. The undirected plate drew a rule at China's level
 * across all ten columns and named the five countries in a caption; nothing said WHICH five columns
 * they were, and the rule crossed four columns that are in no sum the headline makes. Here the set
 * is bracketed, its sum is printed on the bracket, and the rule stops where the set stops.
 */

import { scaleLinear, scaleBand } from "d3-scale";
import { createLength } from "./gesture-length.mjs";
import { formForSize } from "#shared/chart-beat/type-at-size.mjs";

/** This beat's own type, as its BRIEF declares it — what decides whether a tall frame asks for the twin form. */
const TYPE = "column";
import {
  deriveFurniture,
  measureText,
  measureTextBand,
  adjustToContrast,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/render-still.mjs";
import { applyCase } from "#shared/chart-beat/registers.mjs";
import { placeLabels } from "#shared/chart-beat/arbiter.mjs";
import {
  EYEBROW_TO_DISPLAY,
  gapOf,
  leadOf,
  registerOf,
} from "#shared/design-base/register.mjs";

/** 960 x 540 at scale 2 is the `landscape` this beat pins — 1920 x 1080. */
const FRAME = { width: 960, height: 540 };

export type Column = { name: string; value: number };

type StagedNote = { index: number; do: string; anchor: "mark" | "span"; marks: string[]; text: string };
/** Every gesture's state composed on one plate — what `composeStatic` returns. */
export type Staged = {
  order: string[];
  accent: string[];
  rings: string[];
  stepBack: string[];
  notes: StagedNote[];
  brackets: { index: number; span: string[]; whole?: boolean; note?: string }[];
  copies: { index: number; onto: string; value: number }[];
  references: { index: number; value: number; note?: string }[];
  top: number | null;
  keep: string[];
};

type RegisterName = "display" | "eyebrow" | "body" | "axis" | "annot" | "value";

export function GestureColumns({
  rows,
  plate: staged,
  format,
  title,
  limits,
  source,
  alt,
  eyebrow,
  scope,
  direction,
  treatments,
  frame,
}: {
  /** The rows in the plate's order (a `reorder` gesture's end state). */
  rows: Column[];
  plate: Staged;
  format: (v: number) => string;
  /** The headline in FORMS, longest first — spent after the standfirst's own forms and before a
   *  single row is given up. It was ONE string until 2026-09-24, which is a ladder with no rung. */
  title: string | string[];
  /** The standfirst in FORMS, longest first. A form that NAMES a row R8 has dropped is skipped
   *  rather than shortened: the plate would be pointing at a bar that is not there. */
  limits: string | string[];
  source: string;
  /** The plate's own description, and a FUNCTION of the rows R8 left — a sentence written for ten
   *  columns over a plate that drew six would send a screen reader looking for bars nobody drew. */
  alt: string | ((drawn: Column[]) => string);
  eyebrow: string;
  /** R8's own sentence, called with the count the ladder ACTUALLY took — never a typed number.
   *  Absent means this beat has no R8 and the ladder stops at the word rungs. */
  scope?: (drawn: number, all: number) => string;
  direction: any;
  treatments: string[];
  /** The frame this render draws at — `sizeFor(size)` halved, so one component
   *  serves landscape, portrait and square. Absent means the landscape this beat was accepted at. */
  frame?: { width: number; height: number };
}) {
  const { width, height } = frame ?? FRAME;
  const { ink, muted, grid } = deriveFurniture(direction.ground);
  const PAD = direction.pad;
  const on = (id: string) => treatments.includes(id);

  const reg = (name: RegisterName) => registerOf(direction, name);
  const display = reg("display");
  const eyebrowReg = reg("eyebrow");
  const body = reg("body");
  const annot = reg("annot");
  const value = reg("value");

  const set = (text: string, r: { transform: string }) => applyCase(text, r.transform);
  const sizeOf = (r: { fontSize: number; fontWeight: number; fontFamily: string }) => ({
    fontSize: r.fontSize,
    fontWeight: r.fontWeight,
    fontFamily: r.fontFamily,
  });
  /** Tracking is width and `measureText` has nowhere to put it. */
  const widthOf = (text: string, r: any) =>
    measureText(text, sizeOf(r)) + Number(r.letterSpacing ?? 0) * Math.max(0, text.length - 1);

  /** RUNS ON ONE LINE SHARE A BASELINE, NOT AN INK-BOX EDGE — and the difference is visible.
   *
   *  MEASURED on this tree's own delivered SVGs: six country names under six groups came out on six
   *  different baselines, 1.5px apart at 960px, 3px in the delivered file. The cause is that
   *  `measureTextBand` answers per STRING — "Suède" carries an accent, "France" does not — so each
   *  label got a box of its own height, the arbiter aligned the boxes, and the baselines fell where
   *  they fell.
   *
   *  The COLLISION box stays the string's own ink, because inflating it to a common band costs real
   *  labels: doing that dropped this corpus's end-value label in all three directions. What changes
   *  is where the run is DRAWN inside the box the arbiter granted it — against the band of its
   *  REGISTER, measured once on a probe carrying an ascender, a descender and a comma, from
   *  whichever edge the chosen anchor holds fixed. Runs sharing an anchor and a y then share a
   *  baseline, whatever glyphs they happen to carry. */
  const BAND_PROBE = "Hxpg1,";
  const bandOf = (r: any) => measureTextBand(BAND_PROBE, sizeOf(r));
  const baselineOf = (p: any, r: any) => {
    const band = bandOf(r);
    // `above` holds the box's bottom edge, `below` its top, and the side anchors centre it.
    if (p.anchor === "above") return p.box.y + p.box.height - band.descent;
    if (p.anchor === "below") return p.box.y + band.ascent;
    return p.box.y + p.box.height / 2 + (band.ascent - band.descent) / 2;
  };

  function wrap(text: string, maxWidth: number, r: any): string[] {
    const lines: string[] = [];
    let current = "";
    for (const word of text.split(/\s+/)) {
      const trial = current ? `${current} ${word}` : word;
      if (current && widthOf(trial, r) > maxWidth) {
        lines.push(current);
        current = word;
      } else current = trial;
    }
    if (current) lines.push(current);
    return lines;
  }

  // ── header and footer ─────────────────────────────────────────────────────
  const column = width - PAD * 2;
  const titleLead = leadOf(display);
  const bodyLead = leadOf(body);
  const nameLead = leadOf(annot);
  const sourceLines = wrap(set(source, body), column, body);
  const titleChoices = (Array.isArray(title) ? title : [title]).filter(Boolean);
  const limitChoices = (Array.isArray(limits) ? limits : [limits]).filter(Boolean);

  const eyebrowBaseline = PAD + eyebrowReg.fontSize;
  const titleTop =
    eyebrowBaseline + gapOf(eyebrowReg, EYEBROW_TO_DISPLAY) + display.fontSize;
  const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;

  /**
   * THE TWIN FORM. A band scale has one, and at a tall frame it is not a refinement: ten columns in
   * 540px are 38px wide, every name wraps or collides — measured at 1080x1920, this beat printed
   * « ChineÉtats-UnisInde » and cut « Corée du Sud » to « Corée du ». Rows running down the frame,
   * each name horizontal on one line, is the drawing the frame asks for, and `type-at-size.mjs` has
   * been saying so all along; nothing was carrying it out.
   *
   * The size is read off the frame rather than passed in, because the frame is what the component is
   * already given and the three are distinguishable by their own proportions.
   */
  const SIZE = width > height ? "landscape" : width === height ? "square" : "portrait";
  /** THE DATA'S SHAPE DECIDES TOO (gesture kit): a name that will not set in two lines under its
   *  column, a word wider than the column, or a value wider than it — many rows, long names — turns
   *  the plate into rows at any size, rather than truncating a name or dropping a value. */
  const columnsCannotHold = (() => {
    const probe = scaleBand<string>()
      .domain(rows.map((r) => r.name))
      .range([PAD, width - PAD])
      .paddingInner(0.28)
      .paddingOuter(0.06)
      .bandwidth();
    return rows.some(
      (r) =>
        wrap(set(r.name, annot), probe, annot).length > 2 ||
        set(r.name, annot).split(/\s+/).some((w) => widthOf(w, annot) > probe) ||
        widthOf(set(format(r.value), value), value) > probe,
    );
  })();
  const ROWS = formForSize(TYPE, SIZE).verdict === "transpose" || columnsCannotHold;

  // ── the plot ──────────────────────────────────────────────────────────────
  /**
   * WHAT ONE ROW OWES IN THE ROW FORM, and why this plate needed telling.
   *
   * In the column form the names sit under the baseline and the frame's WIDTH decides whether they
   * fit; `wrap` and `deepestName` have answered for that since landscape. In the row form the names
   * sit ON the rows and the frame's HEIGHT decides, and nothing here was asking. Measured
   * 2026-09-24 at 540x540: `nocturne` left the ten rows 3px of pitch each — « Chine » at baseline
   * 388 and « États-Unis » at 391, sharing 71 % of their ink — and the beat only learned about it
   * from the ink guard AFTER the render, as nine collided pairs rather than as an arithmetic. A row
   * carries a name and a number on one line, so it owes the taller of the two bands plus the breath
   * the arbiter itself keeps.
   */
  const ROW_BREATH = 3;
  const nameBand = measureTextBand("Hxpg1,", sizeOf(annot));
  const numberBand = measureTextBand("Hxpg1,", sizeOf(value));
  const rowsOwe =
    Math.max(nameBand.ascent + nameBand.descent, numberBand.ascent + numberBand.descent) +
    ROW_BREATH;

  /**
   * THE GESTURES' WORDS, MEASURED BEFORE THE LADDER. In columns every bracket and note stacks above
   * the rows it is written on, so the plot keeps headroom for the tallest stack there can be: every
   * item over the tallest bar. In rows a note on one row sits beside it, and a bracket's note, a
   * reference's note or a note over several rows is written under the plot, in the names' gutter.
   */
  const NOTE_GAP = gapOf(annot, 0.35);
  const BRACKET_RISE = 6;
  const noteWidth = Math.min(column, Math.max(column * 0.45, 160));
  const stackItems = [
    ...staged.notes.map((note) => ({ index: note.index, kind: "note" as const, text: note.text, note })),
    ...staged.brackets.map((bracket) => ({ index: bracket.index, kind: "bracket" as const, text: bracket.note, bracket })),
    ...staged.references.map((reference) => ({ index: reference.index, kind: "reference" as const, text: reference.note, reference })),
  ].sort((a, b) => a.index - b.index);
  const linesOf = (text: string, maxWidth: number) => wrap(set(text, annot), maxWidth, annot);
  const headroom = ROWS
    ? 0
    : stackItems.reduce(
        (h, item) =>
          h +
          (item.kind === "bracket" ? BRACKET_RISE + NOTE_GAP : 0) +
          (item.text ? linesOf(item.text, noteWidth).length * nameLead + NOTE_GAP : 0),
        0,
      );
  /** A note longer than a third of the plate goes under it rather than squeezing the bars; there it
   *  names its row unless its own words already do. */
  const besideRow = (note: StagedNote) =>
    note.anchor === "mark" && note.marks.length === 1 && widthOf(set(note.text, annot), annot) <= column * 0.35;
  const underLines = ROWS
    ? stackItems
        .filter((item) => item.text && !(item.kind === "note" && besideRow(item.note)))
        .flatMap((item) =>
          linesOf(
            item.kind === "note" && item.note.marks.length === 1 && !item.text.includes(item.note.marks[0])
              ? `${item.note.marks[0]}: ${item.text}`
              : item.text!,
            column,
          ),
        )
    : [];

  /**
   * R8 — DRAW FEWER ROWS AND SAY SO ON THE PLATE. The last rung, under every word rung, and the
   * one the square refusal stopped short of.
   *
   * WHAT IS KEPT IS THE CLAIM ITSELF: the subject, and every country the headline adds up against
   * it. Those are the top of a ranking and they are contiguous, so what R8 removes is the TAIL —
   * the ranks the sentence above the plate never mentions. A reader told « les 6 premiers des 10 »
   * is reading a ranking, not a sample.
   */
  const mustKeep = new Set(staged.keep);
  const ROW_FLOOR = Math.min(rows.length, Math.max(mustKeep.size, 3));
  /** The rows R8 draws at a given count: the claim's own rows, then down the ranking. */
  const rowsAt = (n: number) => {
    if (n >= rows.length) return rows;
    const kept = new Set(rows.filter((r) => mustKeep.has(r.name)));
    for (const r of [...rows].sort((a, b) => b.value - a.value)) {
      if (kept.size >= n) break;
      kept.add(r);
    }
    return rows.filter((r) => kept.has(r));
  };

  const layout = (() => {
    let last = null;
    // The row count is the OUTER loop, so every word rung is spent at the full ranking before one
    // rank is given up, and the words come back longest-first once one has been.
    for (let drawn = rows.length; drawn >= ROW_FLOOR; drawn -= 1) {
      const plate = rowsAt(drawn);
      const gone = rows.filter((r) => !plate.includes(r)).map((r) => r.name);
      const scopeLine =
        plate.length < rows.length && scope ? scope(plate.length, rows.length) : "";
      const band = scaleBand<string>()
        .domain(plate.map((r) => r.name))
        .range([PAD, width - PAD])
        .paddingInner(0.28)
        .paddingOuter(0.06);
      /** Category names sit under the baseline, wrapped on MEASURED width to at most two lines —
       *  never rotated, and never wider than the column they name. */
      const nameLines = new Map(
        plate.map((r) => [r.name, wrap(set(r.name, annot), band.bandwidth(), annot).slice(0, 2)]),
      );
      const deepestName = Math.max(...[...nameLines.values()].map((l) => l.length));
      const baseline =
        sourceTop -
        gapOf(body, 1.1034) -
        (ROWS ? Math.max(deepestName, underLines.length) : deepestName) * nameLead -
        gapOf(annot, 0.4286);
      /** The value labels stand ABOVE their columns, so the tallest column needs a line of
       *  clearance under the standfirst, and the bracket needs a line under the rule. Both are
       *  measured. */
      const valueBand = measureTextBand(format(plate[0].value), sizeOf(value));
      for (const [titleForm, titleText] of titleChoices.entries())
        for (const limitText of limitChoices) {
          // A standfirst that names a rank R8 has removed would point at a bar that is not drawn.
          if (gone.some((name) => limitText.includes(name))) continue;
          const titleLines = wrap(set(titleText, display), column, display);
          const limitsTop = titleTop + titleLines.length * titleLead + gapOf(body, 0.4138);
          const limitLines = wrap(
            set(scopeLine ? `${scopeLine} ${limitText}` : limitText, body),
            column,
            body,
          );
          const plotTop =
            limitsTop +
            limitLines.length * bodyLead +
            (valueBand.ascent + valueBand.descent) * 1.9 +
            headroom;
          /** In the COLUMN form the height of a row is not a thing, so the gate is vacuous and the
           *  first candidate — the whole ranking, the longest headline, the longest standfirst — is
           *  the one drawn. Landscape is untouched by this ladder, to the byte. */
          const pitch = ROWS ? (baseline - plotTop) / plate.length : Number.POSITIVE_INFINITY;
          const candidate = {
            plate,
            scopeLine,
            titleForm,
            titleLines,
            limitsTop,
            limitLines,
            band,
            nameLines,
            deepestName,
            baseline,
            valueBand,
            plotTop,
            pitch,
          };
          last = candidate;
          if (pitch >= rowsOwe) return candidate;
        }
    }
    return last!;
  })();
  const plate = layout.plate;
  const {
    titleLines,
    limitsTop,
    limitLines,
    band,
    nameLines,
    deepestName,
    baseline,
    valueBand,
    plotTop,
  } = layout;
  console.log(
    `  ladder: headline form ${layout.titleForm + 1}, standfirst ${limitLines.length} line(s)` +
      `${plate.length < rows.length ? `, R8: ${plate.length} of ${rows.length} rows drawn` : ""}` +
      `${ROWS ? ` · pitch ${layout.pitch.toFixed(1)}px, owed ${rowsOwe.toFixed(1)}px` : ""}`,
  );
  // The per-type kit refused here. The gesture kit draws the floor anyway — every row a gesture
  // writes on — at the pitch the frame gives: the data's shape never refuses the plate.
  if (ROWS && layout.pitch < rowsOwe)
    console.log(
      `  tight: ${plate.length} rows at ${layout.pitch.toFixed(1)}px of pitch (owed ${rowsOwe.toFixed(1)}px) — every gesture's rows kept`,
    );

  /** One top for everything the plate draws on the value scale: the bars, every copy a compare lays,
   *  every reference rule, and a rescale's end state. Every length runs from zero, and a negative value
   *  runs from zero the other way: the zero rule rises (or moves right) to leave it room. */
  const extent = [
    ...plate.map((r) => r.value),
    ...staged.copies.map((c) => c.value),
    ...staged.references.map((r) => r.value),
    staged.top ?? 0,
    0,
  ];
  const lo = Math.min(...extent);
  const top = Math.max(...extent) > lo ? Math.max(...extent) : lo + 1;

  const valueGutter = ROWS
    ? Math.max(...plate.map((r) => widthOf(set(format(r.value), value), value))) + gapOf(value, 0.6)
    : 0;
  const nameGutter = ROWS
    ? Math.max(...plate.map((r) => widthOf(set(r.name, annot), annot))) + gapOf(annot, 0.5)
    : 0;
  /** In rows each bracket takes a lane of its own at the right, or it is drawn through the numbers. */
  const laneWidth = gapOf(annot, 1.4);
  const bracketLane = ROWS ? laneWidth * staged.brackets.length : 0;
  const plotLeft = ROWS ? PAD + nameGutter + (lo < 0 ? valueGutter : 0) : PAD;
  const plotRight = width - PAD - bracketLane;

  /** IN ROWS a note on one row is written beside it, after its value, and the value scale gives up the
   *  room the most demanding such row needs — measured, so a long note shortens the bars rather than
   *  running off the frame. Two notes on one row share its line. */
  const besideText = new Map<string, { text: string; index: number }>();
  if (ROWS)
    for (const note of staged.notes.filter(besideRow)) {
      const held = besideText.get(note.marks[0]);
      besideText.set(note.marks[0], { text: held ? `${held.text} · ${note.text}` : note.text, index: held?.index ?? note.index });
    }
  const valueOf = (name: string) => plate.find((r) => r.name === name)?.value ?? 0;
  /** How far a row's ink reaches along the value scale: its bar, or a copy laid in its band. */
  const reach = (name: string) =>
    [valueOf(name), ...staged.copies.filter((c) => c.onto === name).map((c) => c.value)].reduce((a, b) =>
      Math.abs(b) > Math.abs(a) ? b : a,
    );
  const valueRoom = (name: string) =>
    widthOf(set(format(valueOf(name)), value), value) + gapOf(value, 0.6) + gapOf(annot, 0.5);
  const besideLimits = [...besideText]
    .filter(([name]) => plate.some((r) => r.name === name) && Math.max(reach(name), 0) > lo)
    .map(([name, note]) => ({
      note,
      span:
        ((plotRight - plotLeft - valueRoom(name) - widthOf(set(note.text, annot), annot)) * (top - lo)) /
        (Math.max(reach(name), 0) - lo),
    }));
  const plotSpan = ROWS
    ? Math.max(40, Math.min(plotRight - valueGutter - plotLeft, ...besideLimits.map((b) => b.span)))
    : width - PAD * 2;

  /** The Length adapter's geometry: one frame, one domain from zero, the plate's own order. */
  /** Below a negative column its value needs a line of room above the names. */
  const underZero = !ROWS && lo < 0 ? (valueBand.ascent + valueBand.descent) * 2.2 : 0;
  const plotFrame = { x: plotLeft, y: plotTop, width: plotSpan, height: baseline - plotTop - underZero };
  const length = createLength({ rows: plate, frame: plotFrame, orientation: ROWS ? "rows" : "columns" });
  const state = length.with(length.rest(), { order: plate.map((r) => r.name), domain: [lo, top] });
  const columns = plate.map((r) => {
    const box = length.rect(r.name, state);
    return { ...r, x: box.x, y: box.y, w: box.width, h: box.height, isSubject: staged.accent.includes(r.name) };
  });
  const columnOf = (name: string) => columns.find((c) => c.name === name);
  /** Distance from the plot's value origin edge to value v, in px, on the plate's one scale. */
  const along = (v: number) => ((v - lo) / (top - lo)) * (ROWS ? plotFrame.width : plotFrame.height);
  const xOf = (v: number) => plotFrame.x + along(v);
  const yOf = (v: number) => plotFrame.y + plotFrame.height - along(v);
  /** A compare's copy of the compared length, laid in the subject's band beside it from the baseline
   *  (the adapter's `copyOnto`): Porto's length standing inside Lisboa's column. */
  const copies = staged.copies.flatMap((copy) => {
    const t = columnOf(copy.onto);
    if (!t) return [];
    return [
      ROWS
        ? { ...copy, x: Math.min(xOf(0), xOf(copy.value)), y: t.y + t.h / 2, w: Math.max(Math.abs(xOf(copy.value) - xOf(0)), 1), h: t.h / 2 }
        : { ...copy, x: t.x + t.w / 2, y: Math.min(yOf(0), yOf(copy.value)), w: t.w / 2, h: Math.max(Math.abs(yOf(copy.value) - yOf(0)), 1) },
    ];
  });
  const labelled = on("value-on-the-mark") || on("every-bar-labelled-lets-the-axis-go");

  // ── the labels that compete for space, arbitrated ─────────────────────────
  const requests = [
    ...(labelled
      ? columns.map((c) => ({
          id: `value-${c.name}`,
          treatment: "value-on-the-mark",
          text: set(format(c.value), value),
          // A value belongs at its own mark's tip and nowhere else: `below` (or, in rows, `left`)
          // would put it inside the fill, which is this type's named accessibility trap.
          // At the end of the row's ink: a copy laid longer than its own bar carries the value past it.
          at: ROWS
            ? { x: xOf(reach(c.name)), y: c.y + c.h / 2 }
            : { x: c.x + c.w / 2, y: yOf(reach(c.name)) },
          anchors: ROWS ? [reach(c.name) < 0 ? "left" : "right"] : [reach(c.name) < 0 ? "below" : "above"],
          priority: c.isSubject ? 9 : 6,
          register: value,
        }))
      : []),
  ];

  const marks = [...columns, ...copies].map((c) => ({ x: c.x, y: c.y, width: c.w, height: Math.max(c.h, 1) }));

  const { placed, dropped } = placeLabels(
    requests.map(({ id, treatment, text, at, anchors, priority }) => ({
      id,
      treatment,
      text,
      at,
      anchors,
      priority,
    })),
    {
      frame: ROWS
        ? { left: PAD + nameGutter, top: plotTop, right: plotRight, bottom: baseline }
        : {
            left: PAD,
            top: plotTop - value.fontSize * 1.6,
            right: width - PAD,
            bottom: baseline,
          },
      measure: (text: string) => {
        const request = requests.find((r) => r.text === text)!;
        const b = measureTextBand(text, sizeOf(request.register));
        return {
          width: widthOf(text, request.register),
          height: b.ascent + b.descent,
        };
      },
      avoid: marks,
    },
  );
  if (dropped.length)
    console.log(`  arbiter dropped ${dropped.length}: ${dropped.map((d) => d.id).join(", ")}`);
  const byId = new Map(placed.map((p) => [p.id, p]));
  const registerById = new Map(requests.map((r) => [r.id, r.register]));

  const textAt = (id: string, fill?: string, weight?: number) => {
    const p = byId.get(id);
    if (!p) return null;
    const r = registerById.get(id)!;
    return (
      <text
        key={id}
        x={p.box.x}
        y={baselineOf(p, r)}
        fill={fill ?? r.fill}
        fontFamily={r.fontFamily}
        fontSize={r.fontSize}
        fontWeight={weight ?? r.fontWeight}
        fontStyle={r.fontStyle}
        letterSpacing={r.letterSpacing}
      >
        {p.text}
      </text>
    );
  };

  const line = (r: any) => ({
    fontFamily: r.fontFamily,
    fontSize: r.fontSize,
    fontWeight: r.fontWeight,
    fontStyle: r.fontStyle,
    letterSpacing: r.letterSpacing,
    fill: r.fill,
  });
  const accentInk = adjustToContrast(direction.accent, direction.ground, TEXT_CONTRAST_MIN);
  const mutedInk = adjustToContrast(muted, direction.ground, TEXT_CONTRAST_MIN);

  /**
   * THE GESTURES' WORDS, PLACED. In columns, in story order, each bracket and note stands on the
   * highest thing already drawn under it — a bar, a copy, a value, an earlier bracket or note — so
   * nothing is drawn through anything, and a note that would rise into the standfirst refuses the
   * render naming its gesture. In rows, a note on one row sits beside its value; brackets run down
   * their lanes and their words go under the plot.
   */
  const annotBand = bandOf(annot);
  const noteHeight = (lines: number) => (lines - 1) * nameLead + annotBand.ascent + annotBand.descent;
  const obstacles = [
    ...[...columns, ...copies].map((c) => ({ x0: c.x, x1: c.x + c.w, top: c.y })),
    ...placed.map((p: any) => ({ x0: p.box.x, x1: p.box.x + p.box.width, top: p.box.y })),
  ];
  const floorOver = (x0: number, x1: number) =>
    Math.min(baseline, ...obstacles.filter((o) => o.x1 > x0 && o.x0 < x1).map((o) => o.top));
  const spanOf = (names: string[]) => {
    const cs = names.map(columnOf).filter((c) => c !== undefined);
    return [Math.min(...cs.map((c) => c.x)), Math.max(...cs.map((c) => c.x + c.w))];
  };
  const ceiling =
    limitsTop + (limitLines.length - 1) * bodyLead + bandOf(body).descent + NOTE_GAP;
  const drawnNotes: { key: string; x: number; y: number; lines: string[]; anchor: "middle" | "start" }[] = [];
  const drawnBrackets: { index: number; d: string }[] = [];
  const drawnRules: { index: number; x1: number; x2: number; y1: number; y2: number }[] = [];
  const placeNote = (index: number, text: string, x0: number, x1: number, floorAt = baseline) => {
    const lines = linesOf(text, Math.max(x1 - x0, noteWidth));
    const w = Math.max(...lines.map((l) => widthOf(l, annot)));
    const cx = Math.min(Math.max((x0 + x1) / 2, PAD + w / 2), width - PAD - w / 2);
    const y = Math.min(floorAt, floorOver(cx - w / 2, cx + w / 2)) - NOTE_GAP - noteHeight(lines.length);
    // The headroom above is reserved for the tallest stack there can be, so this is a warning, not a refusal.
    if (y < ceiling) console.log(`  tight: gestures[${index}].note rises ${Math.round(ceiling - y)}px into the standfirst's margin`);
    obstacles.push({ x0: cx - w / 2, x1: cx + w / 2, top: y });
    drawnNotes.push({ key: `note-${index}`, x: cx, y, lines, anchor: "middle" });
  };
  if (!ROWS)
    for (const item of stackItems) {
      if (item.kind === "bracket") {
        const [x0, x1] = spanOf(item.bracket.whole ? plate.map((r) => r.name) : item.bracket.span);
        const y = floorOver(x0, x1) - NOTE_GAP - BRACKET_RISE;
        drawnBrackets.push({
          index: item.index,
          d: `M${x0} ${y + BRACKET_RISE} L${x0} ${y} L${x1} ${y} L${x1} ${y + BRACKET_RISE}`,
        });
        obstacles.push({ x0, x1, top: y - 1 });
        if (item.text) placeNote(item.index, item.text, x0, x1);
      } else if (item.kind === "reference") {
        const y = yOf(item.reference.value);
        drawnRules.push({ index: item.index, x1: PAD, x2: width - PAD, y1: y, y2: y });
        // Its words at the rule's right end, standing on the rule.
        if (item.text) placeNote(item.index, item.text, width - PAD - 1, width - PAD, y);
      } else {
        const [x0, x1] = spanOf(item.note.marks);
        placeNote(item.index, item.note.text, x0, x1);
      }
    }
  else {
    for (const [name, note] of besideText) {
      const c = columnOf(name);
      if (!c) continue;
      drawnNotes.push({
        key: `beside-${name}`,
        x: reach(name) >= 0 ? xOf(reach(name)) + valueRoom(name) : xOf(0) + gapOf(annot, 0.5),
        y: c.y + c.h / 2 - (annotBand.ascent + annotBand.descent) / 2,
        lines: [set(note.text, annot)],
        anchor: "start",
      });
    }
    staged.brackets.forEach((b, k) => {
      const cs = (b.whole ? plate.map((r) => r.name) : b.span).map(columnOf).filter((c) => c !== undefined);
      const y0 = Math.min(...cs.map((c) => c.y));
      const y1 = Math.max(...cs.map((c) => c.y + c.h));
      const x = plotRight + laneWidth * (k + 0.6);
      drawnBrackets.push({ index: b.index, d: `M${x - 5} ${y0} L${x} ${y0} L${x} ${y1} L${x - 5} ${y1}` });
    });
    for (const r of staged.references) {
      const x = xOf(r.value);
      drawnRules.push({ index: r.index, x1: x, x2: x, y1: plotTop, y2: baseline });
    }
    underLines.forEach((l, i) =>
      drawnNotes.push({
        key: `under-${i}`,
        x: PAD,
        y: baseline + annot.fontSize * 1.5 + i * nameLead - annotBand.ascent,
        lines: [l],
        anchor: "start",
      }),
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={typeof alt === "function" ? alt(plate) : alt}
    >
      <rect x={0} y={0} width={width} height={height} fill={direction.ground} />

      <text x={PAD} y={eyebrowBaseline} {...line(eyebrowReg)}>
        {set(eyebrow, eyebrowReg)}
      </text>
      {titleLines.map((l, i) => (
        <text key={l + i} x={PAD} y={titleTop + i * titleLead} {...line(display)}>
          {l}
        </text>
      ))}
      {limitLines.map((l, i) => (
        <text key={l + i} x={PAD} y={limitsTop + i * bodyLead} {...line(body)}>
          {l}
        </text>
      ))}
      {sourceLines.map((l, i) => (
        <text key={l + i} x={PAD} y={sourceTop + i * bodyLead} {...line(body)}>
          {l}
        </text>
      ))}

      {columns.map((c) => (
        <rect
          key={c.name}
          x={c.x}
          y={c.y}
          width={c.w}
          height={Math.max(c.h, 1)}
          fill={c.isSubject ? direction.accent : muted}
          fillOpacity={staged.stepBack.includes(c.name) ? 0.35 : 1}
        />
      ))}
      {/* compare: the copy of the compared length, in the neutral of the rows it copies, edged in the
          ground so it reads against an accent bar as well as beside one. */}
      {copies.map((c) => (
        <rect
          key={`copy-${c.index}`}
          x={c.x}
          y={c.y}
          width={c.w}
          height={c.h}
          fill={muted}
          stroke={direction.ground}
          strokeWidth={1}
        />
      ))}
      {/* name: a ring around the row it names. */}
      {staged.rings.map((name) => {
        const c = columnOf(name);
        return c ? (
          <rect
            key={`ring-${name}`}
            x={c.x - 3}
            y={c.y - 3}
            width={c.w + 6}
            height={Math.max(c.h, 1) + 6}
            fill="none"
            stroke={ink}
            strokeWidth={direction.stroke.rule}
          />
        ) : null;
      })}

      {/* The zero baseline: the floor the lengths are measured from, and the only rule this plate
          draws — every column carries its own number, so an axis would be the same decoding done
          twice. */}
      {ROWS ? (
        <line
          x1={xOf(0)}
          x2={xOf(0)}
          y1={plotTop}
          y2={baseline}
          stroke={ink}
          strokeWidth={direction.stroke.rule}
        />
      ) : (
        <line
          x1={PAD}
          x2={width - PAD}
          y1={yOf(0)}
          y2={yOf(0)}
          stroke={ink}
          strokeWidth={direction.stroke.rule}
        />
      )}

      {/* reference: a rule at its stated level, painted over the bars. */}
      {drawnRules.map((r) => (
        <line
          key={`rule-${r.index}`}
          x1={r.x1}
          x2={r.x2}
          y1={r.y1}
          y2={r.y2}
          stroke={direction.accent}
          strokeWidth={direction.stroke.rule}
          strokeDasharray="6 5"
        />
      ))}
      {/* bracket: a rule over the run of rows with a tick at each end, so the set is a SET on the plate. */}
      {drawnBrackets.map((b) => (
        <path
          key={`bracket-${b.index}`}
          d={b.d}
          fill="none"
          stroke={direction.accent}
          strokeWidth={direction.stroke.rule}
        />
      ))}

      {columns.map((c) =>
        textAt(`value-${c.name}`, c.isSubject ? accentInk : mutedInk, c.isSubject ? 700 : undefined),
      )}
      {drawnNotes.flatMap((n) =>
        n.lines.map((l, i) => (
          <text
            key={`${n.key}-${i}`}
            x={n.x}
            y={n.y + annotBand.ascent + i * nameLead}
            textAnchor={n.anchor}
            {...line(annot)}
            fill={accentInk}
          >
            {l}
          </text>
        )),
      )}

      {/* Category names under the baseline, in their own band. Furniture in a reserved gutter: the
          arbiter's four anchors would place a name wherever there was room, and a name that is not
          under its column names the wrong country. */}
      {ROWS
        ? columns.map((c) => (
            <text
              key={c.name}
              x={PAD + nameGutter - gapOf(annot, 0.5)}
              y={c.y + c.h / 2 + annot.fontSize * 0.34}
              textAnchor="end"
              {...line(annot)}
              fill={c.isSubject ? ink : annot.fill}
              fontWeight={c.isSubject ? 700 : annot.fontWeight}
            >
              {c.name}
            </text>
          ))
        : columns.map((c) =>
            nameLines.get(c.name)!.map((l, i) => (
              <text
                key={`${c.name}-${i}`}
                x={c.x + c.w / 2}
                y={baseline + annot.fontSize * 1.5 + i * nameLead}
                textAnchor="middle"
                {...line(annot)}
                fill={c.isSubject ? ink : annot.fill}
                fontWeight={c.isSubject ? 700 : annot.fontWeight}
              >
                {l}
              </text>
            )),
          )}

    </svg>
  );
}
