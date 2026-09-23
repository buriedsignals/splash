/**
 * Change in CO2 emissions per person since 1990, 27 EU countries, drawn THROUGH the design base.
 *
 * The eighth component in this tree to do that, and the one where the harvest changed the least.
 * `DivergingBarChange.tsx` was already doing what its family's references do — the zero rule over
 * the bars, the value beyond the tip in ink, one hue per sign on a plate too long to hold in one
 * look. What it was NOT doing is asking a direction for its typography, and that is the whole of
 * what this file changes.
 *
 * That is worth saying plainly rather than dressing up. Seven families have gone through the base
 * and two of them — this and the scatter's palette — produced no new lever at all. A corpus that
 * changed every plate it touched would be a corpus with no floor.
 *
 * WHAT THE HARVEST FILED, ALL OF IT ALREADY TRUE HERE.
 *
 * `zero-rule-painted-over-the-bars` (three publications) — Datawrapper a dark hairline over its row
 * tracks and its bars, Statista a dark rule the height of each panel, Our World in Data a pale
 * hairline and nothing else at all. In all three it is on top: a bar's fill never covers the line it
 * grew from.
 *
 * `value-beyond-the-growing-tip-in-ink` (two publications) — and OWID's detail worth copying, the
 * category name immediately in front of the value, so the whole phrase travels outward with a
 * negative bar and stays by the zero line with a positive one. One phrase, both directions, no
 * second rule for negatives.
 *
 * `sign-is-direction-and-hue-only-doubles-it` (four publications, two answers) — twenty-seven rows
 * cannot be held in one look, so the second hue is bought. And the newsroom carries ONE accent, so
 * the falls take the furniture's muted: that is the one-hue branch two of the four publications
 * took, not a compromise.
 *
 * AND THEN THE FRAME STOPPED BEING ONE FRAME. `type-at-size.mjs` calls a diverging bar a band-scale
 * type, so at portrait and at square its verdict is `transpose` — and `directed-size.mjs` refuses
 * any beat whose own component never asks. This one now asks, and the answer changes the PACKING
 * rather than the axes: the family was already drawn in rows, so what a tall frame buys is one
 * column instead of two or three, and with it the room to put every number back on its own growing
 * tip and every name against the zero rule. The landscape drawing is untouched, to the byte.
 */

import { scaleLinear } from "d3-scale";
import { formForSize } from "#shared/chart-beat/type-at-size.mjs";
import {
  deriveFurniture,
  measureText,
  measureTextBand,
  adjustToContrast,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/render-still.mjs";
import { applyCase } from "#shared/chart-beat/registers.mjs";
import {
  EYEBROW_TO_DISPLAY,
  gapOf,
  leadOf,
  registerOf,
} from "#shared/design-base/register.mjs";
import { placeLabels } from "#shared/chart-beat/arbiter.mjs";

/** 960 x 540 at scale 2 is the `landscape` this beat pins — 1920 x 1080. */
const FRAME = { width: 960, height: 540 };

/** This beat's own type, as its BRIEF declares it — what decides whether a tall frame asks for the
 *  twin form. `type-at-size.mjs` answers `transpose` for it at portrait AND at square. */
const TYPE = "diverging-bar";

export type Row = { name: string; change: number };

type RegisterName = "display" | "eyebrow" | "body" | "axis" | "annot" | "value";

const signed = (v: number) =>
  `${v > 0 ? "+" : "−"}${Math.abs(v).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function DirectedDivergingBar({
  rows,
  subject,
  subjectNote,
  averageOfFalls,
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
  rows: Row[];
  subject: string;
  subjectNote: string;
  averageOfFalls: number;
  /** The headline in FORMS, longest first. It was one string, and that was the whole defect at a
   *  square frame: the standfirst had three rungs and the headline had none, so 1080x1080 wrapped
   *  the full sentence to three lines in creme and FIVE in nocturne — 110px and 195px of a 540px
   *  frame — and the twenty-seven rows were handed what was left. Landscape and portrait take the
   *  first form and have never needed another. */
  title: string[];
  limits: string;
  source: string;
  /** The plate's own description, and a FUNCTION of the rows R8 left — a sentence written for
   *  twenty-seven bars over a plate that drew thirteen would send a screen reader looking for
   *  fourteen marks nobody drew. */
  alt: string | ((drawn: Row[]) => string);
  eyebrow: string;
  /** R8's OWN SENTENCE, called with the count the ladder ACTUALLY took — never a typed number. It
   *  heads the standfirst, so it survives every rung that shortens what follows it. */
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
  const axis = reg("axis");
  const annot = reg("annot");
  const value = reg("value");

  const set = (text: string, r: { transform: string }) =>
    applyCase(text, r.transform);
  const sizeOf = (r: {
    fontSize: number;
    fontWeight: number;
    fontFamily: string;
  }) => ({
    fontSize: r.fontSize,
    fontWeight: r.fontWeight,
    fontFamily: r.fontFamily,
  });
  const widthOf = (text: string, r: any) =>
    measureText(text, sizeOf(r)) +
    Number(r.letterSpacing ?? 0) * Math.max(0, text.length - 1);

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

  // ── header, and the ladder that pays for the rows ─────────────────────────
  const column = width - PAD * 2;
  const titleLead = leadOf(display);
  const bodyLead = leadOf(body);
  const sourceLines = wrap(set(source, body), column, body);

  const eyebrowBaseline = PAD + eyebrowReg.fontSize;
  const titleTop =
    eyebrowBaseline + gapOf(eyebrowReg, EYEBROW_TO_DISPLAY) + display.fontSize;
  /** The headline's own block, per form — measured inside the ladder now, because how many lines it
   *  wraps to is the single largest thing the rows are competing with at a narrow frame. */
  const headerFor = (t: number) => {
    const lines = wrap(set(title[t], display), column, display);
    return {
      titleLines: lines,
      limitsTop: titleTop + lines.length * titleLead + gapOf(body, 0.4138),
    };
  };
  const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;
  const plotBottom = sourceTop - gapOf(body, 1.2414);

  const falls = rows.filter((r) => r.change < 0).length;
  const note = `Moyenne des ${falls} baisses : ${signed(averageOfFalls)}`;

  /**
   * THE TWIN FORM, and for this family it is a smaller move than for a column chart — because a
   * diverging bar was ALREADY drawn in rows. Its band runs down the plot and its magnitude runs
   * across it at every size; there is no axis to swap. What a tall frame changes is the PACKING.
   *
   * Twenty-seven rows in 540px of landscape height buy a 16px pitch only by splitting into two or
   * three side-by-side columns, and each column pays a name gutter, a value gutter and a zero rule
   * before one pixel of bar is drawn. A 540 x 960 frame has the height to spend instead: one column,
   * 27 rows down the page, every name horizontal on one line and the bar panel three times wider
   * than any landscape column could give it. That is the twin form here — the packing collapsing to
   * a single stack — and it is what `formForSize` is asked for rather than inferred from the ratio.
   *
   * The size is read off the frame rather than passed in, because the frame is what the component is
   * already given and the three are distinguishable by their own proportions.
   */
  const SIZE = width > height ? "landscape" : width === height ? "square" : "portrait";
  const ROWS = formForSize(TYPE, SIZE).verdict === "transpose";

  /** THE PITCH A ROW ACTUALLY NEEDS, measured rather than assumed, and it took TWO readings to get
   *  right — both of them read off the arbiter's own drop report rather than reasoned about.
   *
   *  The first reading said a value has to clear its NEIGHBOURS' BARS: the box is centred on its
   *  row, the arbiter treats every bar as a mark, and a label yields to data. That gives
   *  `(band / 2 + breath) / (1 - barShare / 2)`. It was satisfied, and 14 of 27 values still
   *  dropped in two directions.
   *
   *  The second reading is the binding one and it is simpler: THE VALUES STACK. Rows are sorted by
   *  size, so two adjacent rows have bars of nearly the same length and their labels sit at nearly
   *  the same x — the vertical gap between two label boxes is the whole of what separates them,
   *  and the arbiter needs it to exceed its own `BREATH`. That is `band + breath` per row, and on
   *  this plate it is the larger of the two by 3px.
   *
   *  Below the pitch owed the drawing does not lose polish, it loses numbers. */
  /** EVERY WIDTH ON THIS PLATE IS A PROPERTY OF THE ROWS THAT ARE DRAWN, not of the file — which
   *  only started mattering when R8 arrived below and the two stopped being the same set. The name
   *  lane is the widest name DRAWN, the value lane the widest number DRAWN, and the scale's own
   *  floor is the smallest fall DRAWN, which is the one R8 moves the most: taking the falls from
   *  the largest down leaves a set whose smallest member is far bigger than Cyprus's −0,52. */
  const measureRows = (drawn: Row[]) => {
    const nameWidth = Math.max(...drawn.map((r) => widthOf(set(r.name, annot), annot)));
    const valueWidth = Math.max(
      ...drawn.map((r) => widthOf(set(signed(r.change), value), value)),
    );
    const gutterCost = ROWS
      ? valueWidth + 14 + nameWidth + 10
      : nameWidth + 12 + valueWidth + 14 + 6;
    const panelOf = (columnCount: number) => widthPerColumn(columnCount) - gutterCost;
    const smallestFall = Math.min(
      ...drawn.filter((r) => r.change < 0).map((r) => Math.abs(r.change)),
    );
    const largestMove = Math.max(...drawn.map((r) => Math.abs(r.change)));
    const smallestFallPx = (columnCount: number) =>
      (panelOf(columnCount) * smallestFall) / largestMove;
    return { nameWidth, valueWidth, gutterCost, panelOf, smallestFallPx };
  };
  /** The alley between two packed columns. 40px is what landscape was tuned at; a 540-wide frame
   *  cannot afford it, and the alley is the cheapest width on the plate to buy back — it separates
   *  two columns that a zero rule and a name gutter already separate. */
  const GUTTER = ROWS ? 24 : 40;
  const widthPerColumn = (columnCount: number) =>
    (width - PAD * 2 - GUTTER * (columnCount - 1)) / columnCount;
  /** WHAT A COLUMN COSTS BEFORE ONE PIXEL OF BAR IS DRAWN: a name gutter, the value gutter the
   *  falls label into, and on the far side of the zero rule the width one rise and its value need.
   *  Every column pays it, so each column added takes its cost out of the bars.
   *
   *  WHEN THAT MAKES THE PACKING A TABLE, measured on the data rather than on a taste. The BRIEF
   *  refuses a third column as "a table with a decorative complication" and quotes a panel against
   *  a gutter to say so — but those pixels were counted at a type size this direction does not set,
   *  so the sentence is kept and the arithmetic is redone against what a reader loses: THE SMALLEST
   *  FALL MUST STILL BE A LENGTH. Cyprus's −0.52 t next to Luxembourg's −20.48 t is 1 part in 39;
   *  a panel that draws it thinner than 2px has stopped encoding length and is printing ticks.
   *
   *  Croatia is exempt and stays exempt: its +0.03 is 1.3px BY THE DATA, the BRIEF refuses to pad
   *  it, and its row carries the wash, the bold name and the note instead. */
  const MIN_SMALLEST_FALL_PX = 2;
  /** WHAT A COLUMN COSTS IN THE ROW FORM, and the two lanes have swapped sides.
   *
   *  Landscape stacks name and value in one left gutter and runs the bars beyond them. At 540px of
   *  panel that leaves each row with half a plate of dead air between its number and the mark the
   *  number is for — measured on this beat's first portrait render, Cyprus's −0,52 sat 480 delivered
   *  pixels from the 12px bar it labels, which is a table printed beside a chart.
   *
   *  So the row form takes the branch the header already quotes from Our World in Data and which the
   *  landscape packing could not afford: the NUMBER rides its own growing tip, the NAME sits against
   *  the zero rule, and the bar itself spans the distance between them. Nothing has to be tracked
   *  across empty ground, because a row has no empty ground left on it.
   *
   *  The name goes on the far side of the rule FROM ITS OWN BAR, which is the same sentence read in
   *  both directions: the twenty-six falls grow left and are named on the right, and Croatia — the
   *  one rise, and the subject — grows right and is named on the left. Its value still rides its own
   *  tip, so the phrase travels outward with a fall and stays by the zero line with a rise. */
  /** The lanes and the scale floor, per drawn set — see `measureRows` above. */

  const BAR_SHARE = 0.5;
  const BREATH = 3;
  const valueBand = measureTextBand(set(signed(-20.48), value), sizeOf(value));
  const band = valueBand.ascent + valueBand.descent;
  const pitchOwed = Math.max(
    band + BREATH,
    (band / 2 + BREATH) / (1 - BAR_SHARE / 2),
  );

  /** The rungs, in the order they are spent, each one paying for pitch with words. The header is
   *  where the height is, and the standfirst is the part of it a reader can lose the most of.
   *  Speculative and kept only if it was needed — the same shape as `type-at-size.mjs`'s ladder
   *  and as this beat's own packing ladder in `DivergingBarChange.tsx`. */
  const RUNGS = [
    { id: "R1", why: "the standfirst keeps its first sentence" },
    { id: "R2", why: "the average of the falls joins the standfirst instead of standing over the plot" },
    { id: "R3", why: "the standfirst goes, and the average of the falls stands in its place" },
  ];
  /** R0 IS THE HEADLINE'S OWN FORM, and it is spent LAST rather than first — a reader loses a
   *  sentence of standfirst more cheaply than the line that states the claim, which is why the
   *  shorter headlines sit outside the standfirst rungs in the enumeration below and not inside
   *  them. It is named here because a rung that fires has to be reportable. */
  const layoutWith = (
    rungs: string[],
    columnCount: number,
    t: number,
    drawn: Row[],
    scopeLine: string,
  ) => {
    const spent = new Set(rungs);
    let text = limits;
    if (spent.has("R1")) text = `${limits.split(". ")[0]}.`;
    if (spent.has("R3")) text = note;
    else if (spent.has("R2")) text = `${text} ${note}`;
    // R8's sentence HEADS the standfirst rather than joining the ladder, because it is the rung's
    // own condition and not a word the plate may give back: a reduced drawing whose plate never
    // said it was reduced is the defect R8 exists to avoid.
    if (scopeLine) text = `${scopeLine} ${text}`;
    const lines = wrap(set(text, body), column, body);
    const { titleLines, limitsTop } = headerFor(t);
    const top =
      limitsTop +
      lines.length * bodyLead +
      gapOf(annot, spent.has("R2") || spent.has("R3") ? 0.8571 : 1.8571);
    return {
      titleLines,
      limitsTop,
      lines,
      top,
      pitch: (plotBottom - top) / Math.ceil(drawn.length / columnCount),
      standing: !spent.has("R2") && !spent.has("R3"),
    };
  };

  /** THE PACKING IS THE LAST RUNG, not the first choice. Twenty-seven rows at a readable size do
   *  not fit one column, and a column costs a name gutter and two value gutters before one pixel
   *  of bar is drawn — so the fewest columns anything reaches is what gets drawn, exactly as this
   *  beat's own `DivergingBarChange.tsx` decided it. What is new here is that the type size is no
   *  longer the beat's to pick: a direction sets it. `nocturne` sets the largest display and the
   *  largest padding of the three, and pays for them with a third column; `creme` and `rapport` do
   *  not need one. The packing is a consequence of the direction, and it is reported, not hidden. */
  /** THE SHORTER HEADLINES ARE NOT OFFERED AT LANDSCAPE, and that is a decision rather than an
   *  oversight. 1920x1080 was drawn, opened and accepted with the headline whole; offering form 2
   *  there is not neutral — `nocturne` takes it and drops from three columns to two, which is a
   *  DIFFERENT accepted picture and not this ladder's to change. A rung exists to save a frame that
   *  cannot hold the words, and landscape holds them. */
  const titleForms = SIZE === "landscape" ? title.slice(0, 1) : title;

  /**
   * R8 — DRAW FEWER ROWS AND SAY SO ON THE PLATE. The rung under every other rung, and the one the
   * 2026-09-23 square refusal stopped one short of.
   *
   * That refusal was right about its arithmetic and wrong about where it ended. With the shortest
   * headline, the standfirst gone and the average of the falls standing in its place, ONE column of
   * twenty-seven rows reaches 7.8px of pitch in `creme`, 8.8px in `rapport` and 6.1px in `nocturne`
   * against the 15.8 / 15.4 / 15.1px a row owes to print its own number — half — and two columns
   * fail on a WIDTH no word buys back. Both readings still hold. What the refusal then concluded —
   * « R9: this beat does not ship square » — treated the twenty-seven as untouchable, and
   * `REMOVAL_LADDER`'s last rung says they are not: a plate may draw fewer, provided it SAYS so, in
   * its own words, with the number taken from what the ladder took.
   *
   * WHAT IS KEPT, AND WHY IT IS STILL THIS BEAT'S CLAIM. The rise is always drawn, because it IS
   * the subject and the headline names it; the falls are taken FROM THE LARGEST DOWN, because the
   * claim is about the spread — one country up, everyone else down — and the largest fall is the
   * far end of it. A ranking read from its far end is still a ranking, and the scale it sets is the
   * real one. What is given up is the middle of the field, and the counter that names the whole —
   * « Moyenne des 26 baisses » — keeps saying how big that whole is.
   *
   * AND R8 PAYS FOR ITS OWN SENTENCE BEFORE IT COUNTS ITS ROWS: the scope line heads the standfirst
   * inside `layoutWith`, so every reduced candidate is measured with the line already on the plate.
   * A ladder that added the sentence after choosing a count would choose a count that no longer
   * fits — the twin video build measured exactly that trap at 1080x1080 on 2026-09-24.
   *
   * THE FLOOR IS A THIRD OF THE UNION. Below nine of twenty-seven the plate stops being a picture
   * of the EU and becomes a sample of it, which is not the sentence `BRIEF.md` makes, and it
   * refuses there rather than ship it.
   */
  const rise = rows.find((r) => r.change > 0)!;
  const ROW_FLOOR = Math.ceil(rows.length / 3);
  /** The rows R8 draws at a given count: the rise, then the largest falls, left in the beat's own
   *  order so the plate still reads top to bottom as the ranking it is. */
  const rowsAt = (n: number) => {
    if (n >= rows.length) return rows;
    const kept = new Set([
      rise,
      ...rows
        .filter((r) => r.change < 0)
        .sort((a, b) => a.change - b.change)
        .slice(0, n - 1),
    ]);
    return rows.filter((r) => kept.has(r));
  };

  /** Each row count's own refusals, kept rather than thrown, so a plate that cannot be drawn says
   *  what it tried at both ends of the ladder instead of naming one number. */
  const rungsAt = new Map<number, string[]>();
  let choice = null as null | {
    columnCount: number;
    rungs: string[];
    title: number;
    plate: Row[];
    scopeLine: string;
  };
  // The row count is the OUTER loop: every column count and every word rung is spent at the full
  // union before one member is given up, and once one has been the words come back longest-first.
  for (let drawn = rows.length; drawn >= ROW_FLOOR && !choice; drawn -= 1) {
    const plate = rowsAt(drawn);
    const scopeLine = plate.length < rows.length && scope ? scope(plate.length, rows.length) : "";
    const m = measureRows(plate);
    const why: string[] = [];
    for (const columnCount of ROWS ? [1, 2] : [2, 3]) {
      /** TWO WIDTH GUARDS, AND R8 IS THE REASON THE SECOND ONE HAD TO BE WRITTEN DOWN.
       *
       *  The first is the one this file already argued: the smallest fall drawn has to be a LENGTH
       *  and not a tick. It was sufficient while every row was drawn, because Cyprus's −0,52
       *  against Luxembourg's −20,48 is 1 part in 39 and no narrow panel survives it. R8 removes
       *  Cyprus — the falls are taken from the largest down — so the ratio collapses and the test
       *  stops biting: measured 2026-09-24 at 540x540, dropping ONE row let two columns of 56px
       *  through at 2.7px, and the plate came back as twenty-six bars in two lanes that were 63 %
       *  gutter. That is the « table with a decorative complication » this beat's own sibling
       *  refuses by name (`DivergingBarChange.tsx`, `g.panelWidth < columnGap`), and the rule was
       *  simply never carried over here.
       *
       *  So the second guard is that one, stated in this file's own terms: a column has to be
       *  wider than what it costs before a bar starts. It is what makes R8 buy the right thing —
       *  ONE wide column of fewer rows rather than two narrow columns of nearly all of them.
       *
       *  IT IS NOT APPLIED AT LANDSCAPE, and that is the same decision `titleForms` makes two
       *  lines above rather than a loophole. 1920x1080 was drawn, opened and ACCEPTED with
       *  `nocturne` in three columns; measured 2026-09-24, this guard rejects that third column
       *  and takes `nocturne` to two columns of 24 rows — a different accepted picture, produced
       *  by a rule written for a frame that refuses. A rung exists to save a frame that cannot
       *  hold its rows; landscape holds them. */
      if (m.smallestFallPx(columnCount) < MIN_SMALLEST_FALL_PX) {
        why.push(
          `${columnCount} column${columnCount > 1 ? "s" : ""} spend ${m.gutterCost.toFixed(0)}px of gutter against ` +
            `${m.panelOf(columnCount).toFixed(0)}px of bar, drawing the smallest fall ` +
            `${m.smallestFallPx(columnCount).toFixed(1)}px long, which is a table — and that is a WIDTH, ` +
            `which no rung on the copy ladder buys`,
        );
        continue;
      }
      if (SIZE !== "landscape" && !(m.panelOf(columnCount) > m.gutterCost)) {
        why.push(
          `${columnCount} column${columnCount > 1 ? "s" : ""} leave ${m.panelOf(columnCount).toFixed(0)}px of bar in a ` +
            `column that costs ${m.gutterCost.toFixed(0)}px of gutter before one pixel is drawn — a column that is ` +
            `mostly gutter is a table with a decorative complication`,
        );
        continue;
      }
      for (let t = 0; t < titleForms.length && !choice; t += 1)
        for (const rungs of [[], ["R1"], ["R1", "R2"], ["R1", "R3"]]) {
          if (layoutWith(rungs, columnCount, t, plate, scopeLine).pitch >= pitchOwed) {
            choice = { columnCount, rungs, title: t, plate, scopeLine };
            break;
          }
        }
      if (choice) break;
      why.push(
        `${columnCount} column${columnCount > 1 ? "s" : ""} reach ` +
          `${layoutWith(["R1", "R3"], columnCount, titleForms.length - 1, plate, scopeLine).pitch.toFixed(1)}px ` +
          `with every rung spent, down to the shortest headline`,
      );
    }
    rungsAt.set(drawn, why);
  }
  if (!choice) {
    // The two ends of the row ladder bracket the arithmetic; the counts between them fail the same
    // way, one pixel at a time.
    const say = (d: number) => `${d} row${d > 1 ? "s" : ""}: ${rungsAt.get(d)!.join("; ")}`;
    throw new Error(
      `this direction cannot draw the ${rows.length} rows at ${width}x${height}, stepping down to ` +
        `the ${ROW_FLOOR} a third of the union would be. Every row owes ${pitchOwed.toFixed(1)}px to ` +
        `print its value — ${say(rows.length)} · ${say(ROW_FLOOR)}`,
    );
  }
  const { columnCount, rungs: spent, title: titleForm, plate, scopeLine } = choice;
  const { nameWidth, valueWidth } = measureRows(plate);
  const layout = layoutWith(spent, columnCount, titleForm, plate, scopeLine);
  const { titleLines, limitsTop } = layout;
  const perColumn = Math.ceil(plate.length / columnCount);
  const columns = Array.from({ length: columnCount }, (_, c) =>
    plate.slice(c * perColumn, (c + 1) * perColumn),
  );
  const ladder =
    `${columnCount} columns · headline ${titleForm + 1} · ` +
    (spent.length
      ? spent.map((id) => `${id}: ${RUNGS.find((r) => r.id === id)!.why}`).join(" · ")
      : "no rung — the frame held every word") +
    (plate.length < rows.length ? ` · R8: ${plate.length} of ${rows.length} rows drawn` : "");
  console.log(`  ladder ${ladder} · pitch ${layout.pitch.toFixed(1)}px, owed ${pitchOwed.toFixed(1)}px`);

  const limitLines = layout.lines;
  const plotTop = layout.top;
  const rowHeight = layout.pitch;
  const barHeight = Math.max(rowHeight * BAR_SHARE, 4);

  const columnWidth = widthPerColumn(columnCount);
  const columnLeft = (c: number) => PAD + c * (columnWidth + GUTTER);
  /** THE NAME GUTTER SITS OUTSIDE THE VALUE GUTTER, which is this beat's own recorded fix: its
   *  video sibling shipped "Luxembo—20.48" by reserving one gutter for two things. Left to right a
   *  column is name, value, bar, zero, and then the width one rise and its value need on the far
   *  side. Every column carries the same widths, so pixels per tonne is identical in both and any
   *  two bars stay comparable — the invariant the packing may not cost. */
  const nameRight = (c: number) => columnLeft(c) + nameWidth;
  /** 12px of air on each side of the value gutter. At 2px the widest bar's label touched the name
   *  it belongs to and read as `Luxembourg−20,48` — this beat's video sibling shipped exactly that
   *  and the BRIEF records it; the arbiter's own breath is 2px, so it let it pass. */
  /** The value gutter's right edge — every number in a column ends here, so the two text gutters
   *  read as two columns rather than as a staircase following the bars. LANDSCAPE ONLY: the row form
   *  puts the number on the tip, where the staircase is the bar shape and not a misalignment. */
  const valueRight = (c: number) => nameRight(c) + 12 + valueWidth;
  /** In rows the value lane is the FIRST thing in the column, because the longest bar's tip lands at
   *  `barLeft` and its number grows outward from there. The lane is exactly one value wide, so no
   *  number can leave the frame and the panel keeps everything else. */
  const barLeft = (c: number) =>
    ROWS ? columnLeft(c) + valueWidth + 14 : valueRight(c) + 14;
  /** IN LANDSCAPE the zero rule sits at the column's own right edge, less a hair. It used to stand a
   *  value's width in from it, because the one row that RISES labelled itself on that side; now that
   *  every number is in the left gutter, that reserve was 55px of dead air per column — and the
   *  panel is where a length encoding lives. Croatia's +0.03 still grows to the right of the rule,
   *  and at this scale that is a third of a pixel, which is the honest width of it.
   *
   *  IN ROWS the rule stands one name gutter in from that edge, because that is where the names went
   *  — and a name lane is not dead air, it is the thing the rule is being read against. */
  const zeroOf = (c: number) =>
    ROWS
      ? columnLeft(c) + columnWidth - nameWidth - 10
      : columnLeft(c) + columnWidth - 6;

  const widest = Math.max(...plate.map((r) => Math.abs(r.change)));
  const magnitude = scaleLinear()
    .domain([0, widest])
    .range([0, zeroOf(0) - barLeft(0)]);

  const bars = columns.flatMap((col, c) =>
    col.map((r, i) => {
      const zero = zeroOf(c);
      const w = magnitude(Math.abs(r.change));
      const rises = r.change > 0;
      return {
        ...r,
        column: c,
        y: plotTop + i * rowHeight + (rowHeight - barHeight) / 2,
        h: barHeight,
        x: rises ? zero : zero - w,
        w,
        zero,
        rises,
        mid: plotTop + i * rowHeight + rowHeight / 2,
        fill: rises ? direction.accent : muted,
      };
    }),
  );

  const labelled = on("value-beyond-the-growing-tip-in-ink");
  const ruled = on("zero-rule-painted-over-the-bars");

  // ── the two text gutters, and what is left for the arbiter ────────────────
  /** NAMES AND VALUES ARE FURNITURE IN RESERVED GUTTERS, NOT ARBITRATED LABELS — and this is a
   *  correction, made by looking at the render rather than at the code.
   *
   *  The values were placed by the arbiter at each bar's own tip, which is what
   *  `value-beyond-the-growing-tip-in-ink` describes and what its two publications do. Their plates
   *  hold four to sixteen rows in ONE column. This one holds twenty-seven, sorted by size and split
   *  in two, so every tip sits a little further left than the one above it and the numbers come out
   *  as a staircase: twenty-seven right edges, no two of them aligned. Nothing overlapped and
   *  nothing was dropped — it was simply not aligned, which no collision guard can see.
   *
   *  So the value takes the gutter this layout already reserved for it, right-aligned like the name
   *  beside it: two clean columns of text, the bar panel beyond them, the zero rule at its end. The
   *  treatment's substance is kept — every value is outside its mark, in page ink, never in the
   *  fill, which is this family's named contrast failure — and the departure is recorded in
   *  `docs/design-base/treatments/value-beyond-the-growing-tip-in-ink.md` as what it is: a limit
   *  found at a row count the evidence under the rule never reached.
   *
   *  The gutters stay out of the arbiter for the same reason the names always were: its four
   *  anchors would place a run ABOVE its row wherever there was room, and above a row is the row
   *  above it. Both sets of boxes are handed to it as marks, so the one label that IS arbitrated —
   *  the subject's note — can never land on either. */
  const nameBoxes = bars.map((b) => {
    // The REGISTER's band, not this string's: "Ireland" and "Estonia" sit on one row of the plate
    // and have to sit on one baseline, whatever ascenders they happen to carry.
    const band = bandOf(annot);
    const w = widthOf(set(b.name, annot), annot);
    /** In rows the name is set 10px clear of the zero rule on the side its own bar did NOT grow to:
     *  the twenty-six falls are named down the right of the rule, the one rise down its left. Each
     *  side is flush against the rule, so a name is always read from the mark it belongs to. */
    const right = ROWS
      ? b.rises
        ? zeroOf(b.column) - 10
        : zeroOf(b.column) + 10 + w
      : nameRight(b.column);
    /** A RUN ALIGNS ON THE EDGE IT IS ANCHORED BY, and `widthOf` is an estimate. End-anchoring the
     *  falls' names put « Netherlands » and « Luxembourg » two or three pixels right of the other
     *  twenty-four, because their measured width is a hair short of the drawn one and the error
     *  lands wherever the anchor does not. They share a LEFT edge on this plate, so they are drawn
     *  from it. */
    const anchor = ROWS && !b.rises ? "start" : "end";
    return {
      name: b.name,
      x: right - w,
      y: b.mid - (band.ascent + band.descent) / 2,
      width: w,
      height: band.ascent + band.descent,
      baseline: b.mid + band.ascent / 2,
      right,
      anchor,
      anchorX: anchor === "start" ? right - w : right,
    };
  });

  /** IN ROWS THE NUMBER RIDES ITS OWN TIP, which is the treatment's own name — and the objection
   *  recorded just above does not hold at this frame, measured on both renders rather than argued.
   *
   *  The gutter was bought because twenty-seven tips SPLIT ACROSS TWO OR THREE COLUMNS come out as
   *  twenty-seven unaligned right edges — a staircase with no shape, because each column restarts
   *  it. In ONE column the same twenty-seven tips are one monotonic run, sorted, and the staircase
   *  IS the bar shape read twice. Drawn in the gutter instead, at 540px of panel, Cyprus's −0,52
   *  sat 480 delivered pixels from the 12px bar it labels: a table beside a chart rather than a
   *  chart. The lane the gutter reserved is kept — the longest bar's tip is at `barLeft`, so its
   *  number has exactly the lane's width to grow into and no number can leave the frame. */
  const valueBoxes = bars.map((b) => {
    const text = set(signed(b.change), value);
    const band = bandOf(value);
    const w = widthOf(text, value);
    // 10px of air between the tip and the number, on whichever side the bar grew.
    const right = ROWS ? (b.rises ? b.x + b.w + 10 + w : b.x - 10) : valueRight(b.column);
    return {
      name: b.name,
      text,
      right,
      x: right - w,
      y: b.mid - (band.ascent + band.descent) / 2,
      width: w,
      height: band.ascent + band.descent,
      baseline: b.mid + band.ascent / 2,
      rises: b.rises,
    };
  });

  const subjectBar = bars.find((b) => b.name === subject)!;
  const requests = [
    // THE SUBJECT'S NOTE GOES THROUGH THE ARBITER TOO, and for the same reason the values do: it is
    // an annotation competing for the plot's own space. Drawn directly it read `LA SEULE HAUSSE
    // DEPUIS 1990` straight through `CROATIA` in the one direction that sets a tracked, uppercased
    // annot register. Here it takes the empty span its own row leaves left of the zero rule, and
    // where that span is too narrow it is dropped and reported — the row still carries the wash,
    // the bold name and the accent value.
    {
      id: "subject-note",
      treatment: "accent-marks-the-thread",
      text: set(subjectNote, annot),
      // In rows the subject's own NAME took the span just left of the rule, so the note starts from
      // the far edge of that name instead — otherwise every anchor collides with it and the one
      // annotation on the plate is dropped in all three directions.
      at: {
        x: ROWS
          ? nameBoxes.find((n) => n.name === subject)!.x - 6
          : subjectBar.zero - 4,
        y: subjectBar.mid,
      },
      anchors: ["left"],
      priority: 10,
      register: annot,
    },
  ];

  const marks = [
    ...bars.map((b) => ({
      x: b.x,
      y: b.y,
      width: Math.max(b.w, 1),
      height: b.h,
    })),
    ...nameBoxes.map(({ x, y, width, height }) => ({ x, y, width, height })),
    ...valueBoxes.map(({ x, y, width, height }) => ({ x, y, width, height })),
  ];

  const { placed, dropped } = placeLabels(
    requests.map(({ id, treatment, text, at, priority, anchors }) => ({
      id,
      treatment,
      text,
      at,
      priority,
      anchors,
    })),
    {
      frame: {
        left: PAD,
        top: plotTop - annot.fontSize,
        right: width - PAD,
        bottom: plotBottom,
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
    console.log(
      `  arbiter dropped ${dropped.length}: ` +
        dropped.map((d) => `${d.id} [${d.why.slice(0, 40)}]`).join(", "),
    );
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
  const accentInk = adjustToContrast(
    direction.accent,
    direction.ground,
    TEXT_CONTRAST_MIN,
  );
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
        <text
          key={l + i}
          x={PAD}
          y={titleTop + i * titleLead}
          {...line(display)}
        >
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

      {/* Only while the ladder leaves it standing: R2 and R3 move it into the standfirst, and a
          line printed in both places is the ladder saying one thing and the drawing another. */}
      {layout.standing && (
        <text
          x={PAD}
          y={plotTop - annot.fontSize * 1.4}
          {...line(annot)}
          fill={mutedInk}
        >
          {set(note, annot)}
        </text>
      )}

      {/* The subject's own row, washed so the one rise on the plate is found before it is read. */}
      {bars
        .filter((b) => b.name === subject)
        .map((b) => (
          <rect
            key="wash"
            x={PAD + b.column * (columnWidth + GUTTER) - 4}
            y={b.y - (rowHeight - barHeight) / 2}
            width={columnWidth + 8}
            height={rowHeight}
            fill={direction.accent}
            fillOpacity={0.08}
          />
        ))}

      {bars.map((b) => (
        <rect
          key={b.name}
          x={b.x}
          y={b.y}
          width={Math.max(b.w, 1)}
          height={b.h}
          fill={b.fill}
        />
      ))}

      {/* The zero rule, painted AFTER the bars: a fill never covers the line it grew from. */}
      {ruled &&
        columns.map((_, c) => (
          <line
            key={c}
            x1={zeroOf(c)}
            x2={zeroOf(c)}
            y1={plotTop}
            y2={plotBottom}
            stroke={ink}
            strokeWidth={direction.stroke.rule}
          />
        ))}

      {labelled &&
        valueBoxes.map((v) => (
          <text
            key={`value-${v.name}`}
            x={v.right}
            y={v.baseline}
            textAnchor="end"
            {...line(value)}
            fill={v.name === subject ? accentInk : mutedInk}
            fontWeight={v.name === subject ? 700 : value.fontWeight}
          >
            {v.text}
          </text>
        ))}
      {nameBoxes.map((n) => (
        <text
          key={n.name}
          x={n.anchorX}
          y={n.baseline}
          textAnchor={n.anchor}
          {...line(annot)}
          fill={n.name === subject ? ink : annot.fill}
          fontWeight={n.name === subject ? 700 : annot.fontWeight}
        >
          {set(n.name, annot)}
        </text>
      ))}

      {/* The subject's note, set beside its own row rather than in the header — placed by the
          arbiter, so it yields to the name it would otherwise cross. */}
      {textAt("subject-note", accentInk)}
    </svg>
  );
}
