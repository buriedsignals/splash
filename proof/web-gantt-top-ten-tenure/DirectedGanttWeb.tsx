/**
 * Who held a place in the world's ten largest CO₂ emitters, and for how long, 1990–2024 — drawn as a
 * gantt THROUGH the design base and delivered as an interactive page WHOSE ORIGIN IS THE THING THE
 * READER OPERATES.
 *
 * THE GESTURE, AND WHY IT IS THIS TYPE'S AND NO OTHER'S.
 *
 * A gantt is the only type in this catalogue whose mark is an INTERVAL. A bar has a length; a dot
 * has a position; an interval has both, and they are readings of two different quantities — where it
 * sits says WHEN, how long it runs says HOW LONG. One horizontal axis has to carry them at the same
 * time, and it can only do that by spending its ORIGIN: the zero is 1990 for all sixteen rows, so a
 * bar's left edge is a date and its length is a duration measured from that date.
 *
 * That spend is what makes this type's own three questions mutually exclusive on one plate. *Who was
 * there at the same time* needs a shared CALENDAR and gets one. *Who was there in a given year* is
 * the same picture read vertically and costs nothing. *Who lasted longest* needs a shared STOPWATCH
 * — sixteen lengths from one common edge — and a calendar cannot give it, because the lengths begin
 * in sixteen different places.
 *
 * This file's own data makes that failure concrete, and it is the finding the page exists for:
 *
 *   CANADA AND SOUTH KOREA HELD THE PLACE FOR EXACTLY THE SAME NUMBER OF YEARS — 27. Canada from
 *   1990 to 2016, in one block. Korea from 1996 to 2024, in two, with two years missing in the
 *   middle. On the calendar those two bars never touch: five rows and six years apart, one ending
 *   where the other has barely begun. No reader can see that they are equal.
 *
 * So the reader chooses WHERE EACH BAR'S OWN ZERO IS PUT — `../../skills/chart-web/assets/align.ts`,
 * written for this beat. Three origins, and ONE SCALE: 22,286 geometry units per year in every one
 * of the three states, never recomputed, so the seven graduations sit at the same seven pixels
 * throughout and only their WORDS change. That is the whole difference between an alignment and a
 * rescale, and it is what makes the three states comparable to each other rather than three charts
 * that happen to share a frame.
 *
 *   le calendrier (default)      x = 0 is 1990 for all sixteen   who overlapped whom; the handovers
 *   leur propre entrée           x = 0 is each row's first year  the lengths, all from one edge
 *   les seules années tenues     the same, interruptions closed  every bar is now exactly its figure
 *
 * Under the third, Korea's 29 years of presence-window become the 27 it actually held, Italy's 16
 * become 15 — and Korea's bar and Canada's bar are THE SAME BAR. Two rows out of sixteen move there
 * and that is not thin: they are the only two rows that were ever interrupted.
 *
 * WHAT DOES NOT MOVE, AND EACH ONE IS A DECISION RATHER THAN A DEFAULT.
 *
 * THE ROWS. Sorted by entry year, earliest first, then by tenure — `types/gantt.md`'s own rule, and
 * a property of the DATA rather than of the chosen origin, so it is true in all three states.
 * Re-sorting them into a length ladder under the second option was the obvious move and is refused
 * three times over: `interaction.mjs` resolves a pointer off `cx`/`cy` read ONCE at init, so a
 * re-sorted row would answer for the country whose slot it landed in; sixteen names re-sorting is
 * the owner's first ruling at sixteen times the scale; and a ladder would have been arguable, which
 * is exactly what the ruling says does not buy the movement. What it costs is stated in `BRIEF.md`:
 * the alignment makes the lengths comparable, it does not sort them.
 *
 * THE GRADUATIONS. Seven positions, fixed, with two sets of words stacked at each one and crossfaded
 * — a number that CHANGES in place reads as a relabelling, a number that SLIDES reads as a bug.
 *
 * THE READINGS. Sixteen points, every one at the SAME x at its own row's height. `assertAlignRest`
 * refuses this beat if they ever drift apart, because with every `cx` equal `nearestCell` reduces to
 * "which row", which is the one coordinate no option here moves — and which is how a reader means a
 * gantt anyway, since a row owns its whole horizontal band. Each point names its own row with
 * `data-mark-ref`, so what answers a pointer is the interval itself, lifted off its own fill.
 *
 * TREATMENTS.
 *
 * `an-open-span-says-it-is-open` — spent, and it had to change shape to survive the gesture. The
 * static sibling notates an open span two ways at once and one of them is "flush at the axis's
 * present edge". That answer does not survive here: under the second and third origins a row still
 * in post ends wherever its duration puts it, nowhere near the edge. So the notation is the taper
 * alone, drawn INSIDE the span's own length, and it is now the only thing that says "this one has
 * not finished" once the calendar is gone.
 *
 * `both-dates-in-the-row-label` — refused and replaced. Sixteen rows with both dates spelled out is
 * sixteen strings true under one origin and meaningless under the other two. What every row prints
 * instead is the one figure true in ALL THREE states — the years it held — and the dates go to the
 * pointer, which can afford them.
 *
 * `the-subject-is-ringed-not-recoloured` — refused by a ruling: a ring plaqued over a mark is
 * refused three times in this tree. What answers a pointer is the interval, darkened off its own
 * fill by a sought dose, never a fixed one.
 */

import {
  adjustToContrast,
  assertLegible,
  contrast,
  mix,
  NON_TEXT_CONTRAST_MIN,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import { figureVars, webRegisters } from "#shared/design-base/web.mjs";
import {
  alignChromeCss,
  alignStates,
  alignCss,
  alignNotesForMarkup,
  alignOptionsForMarkup,
  alignTicksForMarkup,
  assertAlignDeclaration,
  assertAlignRest,
  assertAlignStylesheet,
  type AlignDeclaration,
} from "../../skills/chart-web/assets/align.ts";

/** The scope every generated rule is written inside, and the prefix every radio id carries. */
const SCOPE = ".chart-figure";
const ALIGN_ID_PREFIX = "chart-align-";

const ROW = 26;
export const FRAME = { width: 780, height: 0, xAxisRowPx: 26 };

/** The gutter the sixteen country names are set in, in CSS pixels. Not a fraction: the names are
 *  type at a FIXED CSS size (the fluid frame's own rule — geometry stretches, type does not), so the
 *  room they need is a number of pixels and not a share of the width.
 *
 *  MEASURED, AND IT IS THE LEVER THE FIRST PASS REACHED PAST. That pass cured an overflow with
 *  `white-space: normal` plus `line-height: 1.05` on the label itself — a vertical-rhythm tool aimed
 *  at a horizontal-overflow problem, and one that beat the leading the axis register emits (this
 *  beat is on `KNOWN-STATE.md`'s list of ten). Driven in a real browser, the widest of the sixteen
 *  is "Arabie saoudite" at 88 px on `creme` and `rapport` and 96 px on `nocturne`, whose axis
 *  register is the largest of the three. 116 px leaves it the shared `.axis-label.y` right offset of
 *  10 px and 10 px of slack, every name on one line, and the register owns its own leading again. */
const GUTTER_PX = 116;

/** How long the taper on an open span is, in geometry units. A NOTATION, not a duration — see the
 *  report's note on the systemic stretch defect. */
const OPEN_TAPER_UNITS = 7;

/** How far a tenure figure sits outside its row's right-hand tip, in CSS pixels. */
const LABEL_OFFSET_PX = 6;

/** The horizontal padding the format's own `.end-label` chip adds, both sides — `padding: 1px 4px`
 *  in `render-web.mjs`'s shared sheet. Counted into the room a figure needs, because a chip that
 *  overruns the frame overruns it by its padding too. */
const CHIP_PAD_PX = 8;

/** How long an interval takes to reach its new origin, and how long the axis takes to change its
 *  words. Honoured only under `prefers-reduced-motion: no-preference` — `align.ts` puts the whole
 *  transition inside the query rather than overriding it back, so under `reduce` there is no
 *  transition to resolve at all. */
const MOVE_MS = 560;
const FADE_MS = 240;

/** How far an interval is lifted toward the ink when a reader points at it, and how different that
 *  has to make it. Both are `proof/web-bar-top-emitters-2024`'s numbers, which were searched against
 *  the three filed directions rather than chosen: the weakest measured step there is nocturne's
 *  accent at 1,143:1, and the floor sits just under it, so a direction leaving less headroom than
 *  nocturne refuses here rather than shipping a hover nobody can see. A FIXED dose was refused at
 *  1,104:1 on nocturne elsewhere; this pair is the reason that cannot happen silently. */
const MARK_ACTIVE_STEP = 0.3;
const MARK_ACTIVE_MIN_STEP = 1.12;

export type Span = { key: string; from: number; to: number; open: boolean };
export type Row = {
  code: string;
  name: string;
  spans: Span[];
  /** Years actually held — the one figure true under every origin, which is why it is what the plate
   *  prints and why it does not change when the control does. */
  years: number;
  tenureLabel: string;
  /** The answer this page adds, already a sentence, formatted in the runner and TRUE IN EVERY STATE:
   *  the exact periods, the years of absence, the best rank reached and how long after the record
   *  opened the row arrives — which is the very quantity the second origin subtracts. */
  detail: string;
  whole: boolean;
};

const pct = (value: number, extent: number) => (value / extent) * 100;

export function DirectedGanttWeb({
  rows,
  align,
  unitsPerCssPx,
  measure,
  kuwaitNote,
  title,
  eyebrow,
  caveat,
  source,
  alt,
  reading,
  wholeNote,
  direction,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  rows: Row[];
  align: AlignDeclaration;
  unitsPerCssPx: number;
  measure: (text: string, options: { fontSize: number; fontWeight?: number | string; fontFamily?: string }) => number;
  kuwaitNote: string;
  title: string;
  eyebrow: string;
  caveat: string;
  source: string;
  alt: string;
  reading: string;
  wholeNote: string;
  direction: any;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
}) {
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });
  const height = rows.length * ROW;
  const perUnit = FRAME.width / align.extent;

  // THE TWO FILLS. The six that never left take the accent; the ten that came and went take one
  // neutral tint of the direction's own ink, lifted to the non-text floor against the ground that
  // direction really paints. Colour says here what length and words already say, which is the point:
  // a reader who separates neither hue still reads the plate correctly, because the six are also the
  // six full-width bars and they are named in the note under the plot.
  let partial = mix(ground, ink, 0.42);
  if (contrast(partial, ground) < NON_TEXT_CONTRAST_MIN)
    partial = adjustToContrast(partial, ground, NON_TEXT_CONTRAST_MIN) ?? partial;
  assertLegible(accent, ground, { role: "mark", where: `${direction.id ?? "this direction"}'s unbroken tenures` });

  // WHAT AN INTERVAL TAKES UNDER THE READER'S POINTER, off ITS OWN fill and never a ring or a dot on
  // top of it. Asserted in both directions: a step that does not clear the mark floor against the
  // ground is a hover that hides the bar, and a step a reader cannot see is no answer at all.
  const activeOf = (fill: string, what: string) => {
    const lifted = mix(fill, ink, MARK_ACTIVE_STEP);
    assertLegible(lifted, ground, {
      role: "mark",
      where: `${direction.id ?? "this direction"}'s ${what} under the pointer`,
    });
    const step = contrast(lifted, fill);
    if (step < MARK_ACTIVE_MIN_STEP)
      throw new Error(
        `${direction.id ?? "this direction"}'s ${what} steps only ${step.toFixed(3)}:1 when a reader ` +
          `points at it (${fill} → ${lifted}), under the ${MARK_ACTIVE_MIN_STEP}:1 this beat holds — ` +
          "the interval would answer a pointer with a change nobody can see",
      );
    return lifted;
  };
  const wholeActive = activeOf(accent, "unbroken tenures");
  const partialActive = activeOf(partial, "interrupted tenures");

  // AND THE POINTER MUST NOT SPEAK LOUDER THAN THE CLAIM. This page spends colour on exactly one
  // thing — which countries never left — so a pointer that repainted a bar by MORE than the distance
  // between the two groups would be spending more colour on a transient state than on the beat's own
  // argument, and a reader running the mouse down sixteen rows would watch the plate's one editorial
  // distinction become the least loud thing on it.
  //
  // THIS GUARD WAS DECLINED ON PURPOSE AND THEN PUT BACK BY A MEASUREMENT. The first pass argued
  // that the diverging bar's version of it does not transfer, because there colour carries a SIGN
  // and here it carries a group that length and the gutter name already say. That argument still
  // holds for the reader; what it does not cover is the author. Mutating the dose from 0,3 to 0,6
  // rendered GREEN in all three directions — the floors below are minima and nothing capped them —
  // and at 0,6 the neutral's own pointer step measures 3,649:1 on creme against the 2,191:1 that
  // separates the two fills. A dose nobody can put a ceiling on is a dose that will drift.
  const groupsApart = contrast(accent, partial);
  const loudestPointer = Math.max(contrast(wholeActive, accent), contrast(partialActive, partial));
  if (groupsApart <= loudestPointer)
    throw new Error(
      `${direction.id ?? "this direction"} separates its two groups by ${groupsApart.toFixed(3)}:1 and ` +
        `repaints an interval by ${loudestPointer.toFixed(3)}:1 when a reader points at it — the ` +
        "pointer would speak louder than the one distinction this page spends colour on",
    );

  // THE FIGURES ARE INK, ALL SIXTEEN, INCLUDING THE SIX THE ACCENT MARKS. `types/gantt.md`'s
  // accessibility note says this type usually escapes the label-in-mark-colour trap because its
  // label sits in the gutter — "but if a value or duration label is ever added inside the bar
  // itself, the same real-contrast-against-the-actual-fill discipline applies". This beat adds one,
  // and it turns INWARD onto the bar where there is no room outside, so the discipline applies. It
  // is not solved with a second ink: `.end-label` already ships a ground chip (`background:
  // var(--ground)`, the format's own sheet) and this beat does not take it away — one pair to
  // measure, ink against ground, and it is this one.
  const labelInk = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  if (contrast(labelInk, ground) < TEXT_CONTRAST_MIN)
    throw new Error(
      `${direction.id ?? "this direction"}'s tenure figures measure ${contrast(labelInk, ground).toFixed(2)}:1 ` +
        "against their own chip — a figure drawn inside an interval is read off the chip and nothing else",
    );

  const barH = ROW * 0.52;
  const valueSize = Number.parseFloat(regs.value.fontSize as string);

  // Refused before anything is drawn, against what this component is actually handed.
  assertAlignDeclaration(align, { width: FRAME.width, unitsPerCssPx });

  const options = alignOptionsForMarkup(align, ALIGN_ID_PREFIX);
  const notes = alignNotesForMarkup(align);
  const ticks = alignTicksForMarkup(align);

  // The readings, all at one x. `assertAlignRest` is what makes that a promise rather than an
  // intention — see its own comment for the hole it closes.
  const readings = rows.map((row, i) => ({
    code: row.code,
    detail: row.detail,
    cx: FRAME.width / 2,
    cy: ROW * i + ROW / 2,
  }));
  assertAlignRest(readings.map((r) => r.cx), { where: "this beat's sixteen readings" });

  const figureRoom = new Map(
    rows.map((row) => [
      row.code,
      (measure(row.tenureLabel, {
        fontSize: valueSize,
        fontWeight: regs.value.fontWeight as number,
        fontFamily: String(regs.value.fontFamily).split(",")[0].replace(/"/g, ""),
      }) +
        CHIP_PAD_PX +
        LABEL_OFFSET_PX) *
        unitsPerCssPx,
    ]),
  );
  const wholeOf = new Map(rows.map((row) => [row.code, row.whole]));

  // WHERE THE ONE ANNOTATION ON THE PLATE MAY STAND, DERIVED RATHER THAN TYPED. It sits on the
  // single-year row, and it may not collide with that row's own bar or with that row's own figure
  // IN ANY STATE — so its anchor is the furthest right that row ever reaches, over all three
  // origins, plus the room its figure takes at the narrowest verified width. Typed as a percentage
  // it was 8 %, and under the calendar origin the figure landed on it.
  const NOTE_ROW = "KWT";
  const lengthOf = new Map(align.bars.map((b) => [b.key, b.length]));
  const rowOfBar = new Map(align.bars.map((b) => [b.key, b.row]));
  const noteClear = Math.max(
    ...alignStates(align).map((state) =>
      Math.max(
        ...state.places
          .filter((p) => rowOfBar.get(p.key) === NOTE_ROW)
          .map((p) => (p.at + lengthOf.get(p.key)) * perUnit),
      ),
    ),
  ) + (figureRoom.get(NOTE_ROW) ?? 0) + LABEL_OFFSET_PX * unitsPerCssPx;

  const alignSheet = alignCss(align, {
    scope: SCOPE,
    idPrefix: ALIGN_ID_PREFIX,
    width: FRAME.width,
    labelOffsetPx: LABEL_OFFSET_PX,
    // A figure that turns inward must not cover the taper that says the row is still running — the
    // six longest rows on this plate are all open AND all end at the frame's own edge, so they are
    // exactly the rows whose figure has nowhere to go but onto the bar.
    tipInsetUnitsOf: (row) =>
      rows.find((r) => r.code === row)?.spans.slice(-1)[0].open ? OPEN_TAPER_UNITS : 0,
    labelUnitsOf: (row) => figureRoom.get(row) ?? 0,
    moveMs: MOVE_MS,
    fadeMs: FADE_MS,
    paint: (row) =>
      wholeOf.get(row)
        ? { bar: accent, active: wholeActive }
        : { bar: partial, active: partialActive },
  });
  const css = [
    `${SCOPE} .chart-plot { --y-gutter: ${GUTTER_PX}px; }`,
    alignChromeCss({ scope: SCOPE }),
    alignSheet,
    // THE POINTED-AT INTERVAL, RAISED ABOVE THE PAINT. `align.ts` writes `--bar`/`--mark-active` at
    // (0,2,0) and never writes `fill` inside an option's `:has()` scope, which weighs (1,3,0); this
    // one rule, at (0,3,0), is what beats the blanket that paints from `--bar`. The format's own
    // `.mark-active { fill: … }` at (0,1,0) would have lost to it, which is the silent-specificity
    // defect this tree has already paid for once. `fill` is inherited by the rect and the taper,
    // which carry none of their own, so one property lights a whole interval.
    `${SCOPE} [data-align-bar].mark-active { fill: var(--mark-active); }`,
    // THE ANSWER IS SIX READINGS LONG AND THE FORMAT'S BOX IS 220 px WIDE. `interaction.mjs` puts
    // the box ABOVE the pointer, so a long answer about a row near the top rises over this beat's
    // own pills and hides the control the reader just operated. Bare `#tooltip`, because the element
    // is the page's and not this figure's: same specificity as the format's own rule, and this sheet
    // is emitted after it.
    `#tooltip { max-width: 340px; }`,
  ].join("\n\n");

  // THE VOCABULARY CHECKS ITS OWN RULES REACHED THE PAGE — AND IT CHECKS THE SHEET THE PAGE CARRIES,
  // NOT THE STRING THE VOCABULARY RETURNED. Every interval on this plate is drawn at x=0 and placed
  // ONLY by a generated `translateX`, so a stylesheet that went missing ships sixteen rows stacked
  // flush on the left margin with nothing else looking wrong; `aim.ts` shipped exactly that page and
  // every guard stayed silent. MEASURED HERE, by mutation: with this call handed `alignSheet` it did
  // NOT catch the sheet being dropped from the array below, because the string it was reading was
  // still perfectly well formed. It is handed `css` — the text that actually reaches the `<style>`.
  assertAlignStylesheet(css, align, { scope: SCOPE, idPrefix: ALIGN_ID_PREFIX });

  return (
    <figure
      className="chart-figure"
      style={{
        ["--ground" as string]: ground,
        ["--accent" as string]: accent,
        ["--ink" as string]: ink,
        ["--muted" as string]: muted,
        ["--grid" as string]: grid,
        ...figureVars(regs),
      }}
    >
      {/* This beat's own stylesheet, carried inside the figure it styles. The format's shared
          `buildCss` emits the chrome for a FILTER, which this beat does not declare and must not —
          nothing leaves this picture, and a gantt that hid a row would be a tenure table with a hole
          in it. An alignment is its own mechanism and pays its own way. */}
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="chart-header">
        <p className="chart-eyebrow" style={{ ...regs.eyebrow, margin: "0 0 6px" }}>{eyebrow}</p>
        <h2 className="chart-title" style={{ ...regs.display, margin: "0 0 6px" }}>{title}</h2>
        <p className="chart-caveat" style={{ ...regs.body, margin: 0 }}>{caveat}</p>
      </div>

      {/* THE CONTROL. Native radios in a real `<fieldset>` with a `<legend>`: a radio group to the
          keyboard and to a screen reader before this page's stylesheet does anything to it, and
          `aria-label` carries the reading a reader who is not looking at the picture would otherwise
          only get from it. Each accessible name CONTAINS its visible one — `assertAlignDeclaration`
          refuses the declaration otherwise, because a name that does not is the WCAG 2.5.3 failure. */}
      <fieldset className="chart-align">
        <legend>{align.label}</legend>
        <div className="options">
          {options.map((option) => (
            <label key={option.id}>
              <input
                id={option.id}
                type="radio"
                name="chart-align"
                value={option.slug}
                aria-label={option.announce}
                defaultChecked={option.isNone}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* WHAT A LENGTH MEANS UNDER THE CHOSEN ORIGIN. Its row is reserved whether or not an option is
          chosen, so choosing one never moves the plot underneath it. Unlike four sibling vocabularies
          the DEFAULT gets one too, and this type may not do without it: `types/gantt.md` calls the
          caption saying a length here is a DURATION and not a magnitude "load-bearing for correct
          reading", and under the second and third origins this plate LOOKS like a plain bar chart —
          which is the exact misreading that sheet warns about. */}
      <div className="align-notes" role="status">
        {notes.map((note) => (
          <p data-align-note={note.slug} key={note.slug}>{note.text}</p>
        ))}
      </div>

      <div
        className="chart-plot"
        style={{
          ["--x-axis-h" as string]: `${FRAME.xAxisRowPx}px`,
          aspectRatio: `${FRAME.width + GUTTER_PX} / ${height + FRAME.xAxisRowPx}`,
        }}
      >
        {/* The sixteen names, at the sixteen row centres, in every state of the page. No
            `line-height` and no `white-space` are written here: the shared `.axis-label` keeps them
            on one line and the register owns its own leading. The gutter is the right lever and it
            is `GUTTER_PX` above. */}
        <div className="y-axis">
          {rows.map((r, i) => (
            <span
              key={r.code}
              className="axis-label y"
              style={{
                ...regs.axis,
                color: r.whole ? accent : (regs.axis.color as string),
                fontWeight: r.whole ? 700 : regs.axis.fontWeight,
                top: `${pct(ROW * i + ROW / 2, height)}%`,
              }}
            >
              {r.name}
            </span>
          ))}
        </div>

        <svg
          role="group"
          aria-label={title}
          xmlns="http://www.w3.org/2000/svg"
          className="chart"
          data-hit="cell"
          viewBox={`0 0 ${FRAME.width} ${height}`}
          preserveAspectRatio="none"
        >
          <desc>{alt}</desc>
          <rect x={0} y={0} width={FRAME.width} height={height} fill={ground} />

          {/* The graduations. Their positions are `align.tickAt` and no option touches them — only
              the words underneath change. */}
          {align.tickAt.map((t) => (
            <line
              key={t}
              x1={t * perUnit}
              x2={t * perUnit}
              y1={0}
              y2={height}
              stroke={grid}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* ONE GROUP PER INTERVAL, DRAWN AT x=0 AND PLACED BY THE STYLESHEET. The geometry here is
              the interval's own LENGTH and nothing else; where it sits is the reader's to choose, and
              it travels on a `transform` that interpolates rather than on a `display` that cannot.
              No `fill` on the children: the group carries it from `--bar`, they inherit it, and one
              `.mark-active` on the group therefore lights the whole interval at once — including the
              taper, which is the part a reader is most likely to be aiming at. */}
          {rows.map((r, i) =>
            r.spans.map((s) => {
              const len = (s.to + 1 - s.from) * perUnit;
              const top = ROW * i + ROW / 2 - barH / 2;
              const body = s.open ? Math.max(1, len - OPEN_TAPER_UNITS) : len;
              return (
                <g key={s.key} data-align-bar={s.key} data-mark={r.code}>
                  <rect x={0} y={top} width={body} height={barH} />
                  {/* AN OPEN SPAN SAYS IT IS OPEN. Drawn INSIDE the interval's own length rather than
                      hung off its end: the static sibling could notate "still running" by ending
                      flush at the axis's present edge, and this page cannot, because under two of its
                      three origins the present edge is nowhere near the end of the bar. */}
                  {s.open ? (
                    <path d={`M ${body} ${top} L ${len} ${top + barH / 2} L ${body} ${top + barH} Z`} />
                  ) : null}
                </g>
              );
            }),
          )}

          {/* THE READINGS, ALL AT ONE x. Identical by construction, so the pointer resolves by row —
              the one coordinate this control cannot move, and the way a reader means a gantt anyway.
              The point itself never shows: `data-mark-ref` names the row that answers for it and the
              format keeps such a point transparent. */}
          {readings.map((r) => (
            <circle
              key={r.code}
              className="pt"
              cx={r.cx}
              cy={r.cy}
              r={6}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              data-mark-ref={r.code}
              aria-label={r.detail}
              data-detail={r.detail}
            />
          ))}
          <rect className="hit-area" x={0} y={0} width={FRAME.width} height={height} fill="transparent" pointerEvents="all" />
        </svg>

        {/* THE TENURE FIGURES, IN A LAYER OF THEIR OWN. Not `.overlay`: `verify-web.mjs` requires
            every word in that layer to be drawn in the DEFAULT view, and these travel under the
            control. Each one is welded to its own row's right-hand tip — the ONE movement of text
            this page allows itself, and the one the type sheet asks for by name. The TEXT never
            changes: the years a row held is the single figure true under all three origins, and the
            third origin is the one that finally makes the bar as long as the figure says. */}
        <div className="align-values" aria-hidden="true">
          {rows.map((r, i) => (
            <span
              key={r.code}
              className="end-label"
              data-align-value={r.code}
              style={{
                ...regs.value,
                color: labelInk,
                // THE ONE COORDINATE WRITTEN INLINE, AND IT IS INLINE ON PURPOSE. An inline style
                // beats every generated rule, which is exactly the property wanted here: `left` is
                // the option's to move and `top` is nobody's.
                top: `${pct(ROW * i + ROW / 2, height)}%`,
              }}
            >
              {r.tenureLabel}
            </span>
          ))}
        </div>

        <div className="overlay" aria-hidden="true">
          {/* THE ONE ANNOTATION ON THE PLATE, AND IT IS TRUE IN EVERY STATE. A single-year tenure is
              22 geometry units of a 780-unit frame — the hardest thing on this plate to see, and the
              thing a reader is least likely to believe. It sits on Kuwait's own row, which is the one
              strip of this frame no origin ever draws into past its first year: the row's longest
              excursion, in any state, is 2 years. */}
          <span
            className="note"
            style={{
              ...regs.annot,
              left: `${pct(noteClear, FRAME.width)}%`,
              top: `${pct(ROW * rows.findIndex((r) => r.code === NOTE_ROW) + ROW / 2, height)}%`,
              transform: "translateY(-50%)",
            }}
          >
            {kuwaitNote}
          </span>
        </div>

        {/* THE AXIS'S WORDS, ONE SET PER STATE, STACKED AT THE SAME SEVEN PLACES. Separate absolutely
            positioned spans rather than siblings inside one: a `visibility: hidden` inline child
            still takes its width, which would push the visible word off its own graduation. Stacked
            and crossfaded, the graduation does not move and only its meaning does. */}
        <div className="x-axis">
          {ticks.map((tick) =>
            tick.words.map((word) => (
              <span
                key={`${tick.at}-${word.slug}`}
                className="axis-label x"
                data-align-tick={word.slug}
                style={{ ...regs.axis, left: `${pct(tick.at * perUnit, FRAME.width)}%` }}
              >
                {word.text}
              </span>
            )),
          )}
        </div>
      </div>

      {/* The note that names the accented group sits UNDER the plot, not in it: every row at the top
          of this frame is a full-width bar in every state, so an overlay note there lands on one
          whatever its anchor. */}
      <p className="chart-reading" style={{ ...regs.annot, margin: "10px 0 0" }}>{wholeNote}</p>
      <p className="chart-reading" style={{ ...regs.body, margin: "4px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
