/**
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

type RegisterName = "display" | "eyebrow" | "body" | "axis" | "annot" | "value";

export function DirectedColumns({
  rows,
  subject,
  comparison,
  comparisonSum,
  comparisonNote,
  format,
  title,
  limits,
  source,
  alt,
  eyebrow,
  scope,
  keep,
  direction,
  treatments,
  frame,
}: {
  rows: Column[];
  subject: string;
  comparison: string[];
  comparisonSum: number;
  comparisonNote: string;
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
  /** The rows R8 may not drop, by name: the subject and every member of the set the headline adds
   *  up. Dropping one of those would leave the plate summing bars a reader cannot see. */
  keep?: string[];
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
  const ROWS = formForSize(TYPE, SIZE).verdict === "transpose";

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
   * R8 — DRAW FEWER ROWS AND SAY SO ON THE PLATE. The last rung, under every word rung, and the
   * one the square refusal stopped short of.
   *
   * WHAT IS KEPT IS THE CLAIM ITSELF: the subject, and every country the headline adds up against
   * it. Those are the top of a ranking and they are contiguous, so what R8 removes is the TAIL —
   * the ranks the sentence above the plate never mentions. A reader told « les 6 premiers des 10 »
   * is reading a ranking, not a sample.
   */
  const mustKeep = new Set(keep ?? []);
  const ROW_FLOOR = Math.max(mustKeep.size, 3);
  /** The rows R8 draws at a given count: the claim's own rows, then down the ranking. */
  const rowsAt = (n: number) => {
    if (n >= rows.length) return rows;
    const kept = new Set(rows.filter((r) => mustKeep.has(r.name)));
    for (const r of rows) {
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
        sourceTop - gapOf(body, 1.1034) - deepestName * nameLead - gapOf(annot, 0.4286);
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
            limitsTop + limitLines.length * bodyLead + (valueBand.ascent + valueBand.descent) * 1.9;
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
  if (ROWS && layout.pitch < rowsOwe)
    throw new Error(
      `${plate.length} rows want ${rowsOwe.toFixed(1)}px of pitch to print a name and a number on ` +
        `one line and this frame gives ${layout.pitch.toFixed(1)}px with every rung spent, down to ` +
        `R8's floor of ${ROW_FLOOR} of ${rows.length} rows — the ${ROW_FLOOR} rows the headline ` +
        `itself adds up`,
    );

  const magnitude = scaleLinear()
    .domain([0, Math.max(...plate.map((r) => r.value))])
    // Zero is the floor, non-negotiable for a length encoding.
    .range([baseline, plotTop]);

  /** IN ROWS the same two scales swap axes: the band runs DOWN the plot and the magnitude runs
   *  across it from a left rule. Every mark, every value and every name is derived from these two,
   *  so there is one geometry with two readings rather than two geometries. */
  const valueGutter = ROWS
    ? Math.max(...plate.map((r) => widthOf(set(format(r.value), value), value))) + gapOf(value, 0.6)
    : 0;
  const nameGutter = ROWS
    ? Math.max(...plate.map((r) => widthOf(set(r.name, annot), annot))) + gapOf(annot, 0.5)
    : 0;
  const rowBand = ROWS
    ? scaleBand<string>()
        .domain(plate.map((r) => r.name))
        .range([plotTop, baseline])
        .paddingInner(0.3)
        .paddingOuter(0.06)
    : null;
  /** In rows the set bracket needs a lane of its own to the right of the numbers, or it is drawn
   *  through them. The lane comes out of the magnitude scale, so the bars stop short of it. */
  const rowsBracketed =
    ROWS &&
    on("the-set-a-claim-adds-up-is-drawn-as-a-set") &&
    plate.filter((r) => comparison.includes(r.name)).length >= 2;
  const bracketLane = rowsBracketed ? gapOf(annot, 1.4) : 0;
  const rowValue = ROWS
    ? scaleLinear()
        .domain([0, Math.max(...plate.map((r) => r.value))])
        .range([PAD + nameGutter, width - PAD - valueGutter - bracketLane])
    : null;
  const columns = plate.map((r) =>
    ROWS
      ? {
          ...r,
          x: PAD + nameGutter,
          w: Math.max(rowValue!(r.value) - (PAD + nameGutter), 1),
          y: rowBand!(r.name)!,
          h: rowBand!.bandwidth(),
          isSubject: r.name === subject,
          inComparison: comparison.includes(r.name),
        }
      : {
          ...r,
          x: band(r.name)!,
          w: band.bandwidth(),
          y: magnitude(r.value),
          h: baseline - magnitude(r.value),
          isSubject: r.name === subject,
          inComparison: comparison.includes(r.name),
        },
  );

  const subjectColumn = columns.find((c) => c.isSubject)!;
  const setColumns = columns.filter((c) => c.inComparison);
  const bracketed = on("the-set-a-claim-adds-up-is-drawn-as-a-set") && setColumns.length >= 2;
  const labelled = on("value-on-the-mark") || on("every-bar-labelled-lets-the-axis-go");

  /** The rule runs from the subject's own column to the END OF THE SET, and no further. Drawn to
   *  the frame edge it crosses four columns that are in no sum the headline makes, and a rule over
   *  a column says the column is being compared. */
  const ruleY = magnitude(subjectColumn.value);
  /** It LEAVES the subject's column rather than lying along its top. Drawn from `subjectColumn.x`
   *  the accent rule spent its first 13% inside the accent-filled column it levels from, measuring
   *  1.00:1 against it — an annotation invisible over precisely the mark it is drawn for, in all
   *  three directions, because the fault is the geometry and not the palette. The rule still starts
   *  at the subject and ends where the set ends; it just starts at the column's edge. */
  const ruleFrom = subjectColumn.x + subjectColumn.w;
  const ruleTo = bracketed
    ? Math.max(...setColumns.map((c) => c.x + c.w))
    : width - PAD;

  const bracketY = ruleY + (valueBand.ascent + valueBand.descent) * 1.1;
  const bracketFrom = setColumns.length ? Math.min(...setColumns.map((c) => c.x)) : 0;
  const bracketTo = setColumns.length ? Math.max(...setColumns.map((c) => c.x + c.w)) : 0;

  /** The rows reading of the same three annotations: the level the subject reaches is a vertical
   *  line at its own bar end, and the set is bracketed down the lane reserved at the right. */
  const ruleX = subjectColumn.x + subjectColumn.w;
  const ruleFromY = subjectColumn.y + subjectColumn.h;
  const ruleToY = bracketed ? Math.max(...setColumns.map((c) => c.y + c.h)) : baseline;
  const bracketX = width - PAD - bracketLane * 0.4;
  const bracketFromY = setColumns.length ? Math.min(...setColumns.map((c) => c.y)) : 0;
  const bracketToY = setColumns.length ? Math.max(...setColumns.map((c) => c.y + c.h)) : 0;
  /** In rows the note takes the gutter the names have vacated, under the plot and above the source. */
  const noteLines =
    ROWS && bracketed
      ? wrap(set(comparisonNote, annot), width - PAD * 2, annot).slice(0, deepestName)
      : [];

  // ── the labels that compete for space, arbitrated ─────────────────────────
  const requests = [
    ...(labelled
      ? columns.map((c) => ({
          id: `value-${c.name}`,
          treatment: "value-on-the-mark",
          text: set(format(c.value), value),
          // A value belongs at its own mark's tip and nowhere else: `below` (or, in rows, `left`)
          // would put it inside the fill, which is this type's named accessibility trap.
          at: ROWS
            ? { x: c.x + c.w, y: c.y + c.h / 2 }
            : { x: c.x + c.w / 2, y: c.y },
          anchors: ROWS ? ["right"] : ["above"],
          priority: c.isSubject ? 9 : 6,
          register: value,
        }))
      : []),
    ...(bracketed && !ROWS
      ? [
          {
            id: "comparison-note",
            treatment: "the-set-a-claim-adds-up-is-drawn-as-a-set",
            text: set(comparisonNote, annot),
            at: { x: (bracketFrom + bracketTo) / 2, y: bracketY },
            anchors: ["below"],
            priority: 10,
            register: annot,
          },
        ]
      : []),
  ];

  const marks = columns.map((c) => ({ x: c.x, y: c.y, width: c.w, height: Math.max(c.h, 1) }));

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
        ? { left: PAD + nameGutter, top: plotTop, right: width - PAD, bottom: baseline }
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
        />
      ))}

      {/* The zero baseline: the floor the lengths are measured from, and the only rule this plate
          draws — every column carries its own number, so an axis would be the same decoding done
          twice. */}
      {ROWS ? (
        <line
          x1={PAD + nameGutter}
          x2={PAD + nameGutter}
          y1={plotTop}
          y2={baseline}
          stroke={ink}
          strokeWidth={direction.stroke.rule}
        />
      ) : (
        <line
          x1={PAD}
          x2={width - PAD}
          y1={baseline}
          y2={baseline}
          stroke={ink}
          strokeWidth={direction.stroke.rule}
        />
      )}

      {bracketed && ROWS && (
        <>
          <line
            x1={ruleX}
            x2={ruleX}
            y1={ruleFromY}
            y2={ruleToY}
            stroke={direction.accent}
            strokeWidth={direction.stroke.rule}
            strokeDasharray="6 5"
          />
          <path
            d={`M${bracketX - 5} ${bracketFromY} L${bracketX} ${bracketFromY} L${bracketX} ${bracketToY} L${bracketX - 5} ${bracketToY}`}
            fill="none"
            stroke={direction.accent}
            strokeWidth={direction.stroke.rule}
          />
        </>
      )}

      {bracketed && !ROWS && (
        <>
          <line
            x1={ruleFrom}
            x2={ruleTo}
            y1={ruleY}
            y2={ruleY}
            stroke={direction.accent}
            strokeWidth={direction.stroke.rule}
            strokeDasharray="6 5"
          />
          {/* The bracket: a rule under the set with a tick down at each end, so the five columns
              the headline adds together are a SET on the plate and not only in a caption. */}
          <path
            d={`M${bracketFrom} ${bracketY - 5} L${bracketFrom} ${bracketY} L${bracketTo} ${bracketY} L${bracketTo} ${bracketY - 5}`}
            fill="none"
            stroke={direction.accent}
            strokeWidth={direction.stroke.rule}
          />
        </>
      )}

      {columns.map((c) =>
        textAt(`value-${c.name}`, c.isSubject ? accentInk : mutedInk, c.isSubject ? 700 : undefined),
      )}
      {textAt("comparison-note", accentInk)}

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

      {noteLines.map((l, i) => (
        <text
          key={`note-${i}`}
          x={PAD}
          y={baseline + annot.fontSize * 1.5 + i * nameLead}
          {...line(annot)}
          fill={accentInk}
        >
          {l}
        </text>
      ))}
    </svg>
  );
}
