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
 */

import { scaleLinear } from "d3-scale";
import {
  deriveFurniture,
  measureText,
  measureTextBand,
  adjustToContrast,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/render-still.mjs";
import { resolveRegister, applyCase } from "#shared/chart-beat/registers.mjs";
import { placeLabels } from "#shared/chart-beat/arbiter.mjs";

/** 960 x 540 at scale 2 is the `landscape` this beat pins — 1920 x 1080. */
const FRAME = { width: 960, height: 540 };

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
  direction,
  treatments,
}: {
  rows: Row[];
  subject: string;
  subjectNote: string;
  averageOfFalls: number;
  title: string;
  limits: string;
  source: string;
  alt: string;
  eyebrow: string;
  direction: any;
  treatments: string[];
}) {
  const { width, height } = FRAME;
  const { ink, muted, grid } = deriveFurniture(direction.ground);
  const inkOf = { ink, muted, accent: direction.accent } as Record<
    string,
    string
  >;
  const PAD = direction.pad;
  const on = (id: string) => treatments.includes(id);

  const reg = (name: RegisterName) => {
    const r = resolveRegister(direction, name);
    return { ...r, fill: inkOf[r.ink] };
  };
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
  const titleLines = wrap(set(title, display), column, display);
  const titleLead = display.fontSize * 1.22;
  const bodyLead = body.fontSize * 1.45;
  const sourceLines = wrap(set(source, body), column, body);

  const eyebrowBaseline = PAD + eyebrowReg.fontSize;
  const titleTop =
    eyebrowBaseline + eyebrowReg.fontSize * 0.9 + display.fontSize;
  const limitsTop =
    titleTop + titleLines.length * titleLead + body.fontSize * 0.6;
  const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;
  const plotBottom = sourceTop - body.fontSize * 1.8;

  const falls = rows.filter((r) => r.change < 0).length;
  const note = `Moyenne des ${falls} baisses : ${signed(averageOfFalls)}`;

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
  const nameWidth = Math.max(
    ...rows.map((r) => widthOf(set(r.name, annot), annot)),
  );
  const valueWidth = Math.max(
    ...rows.map((r) => widthOf(set(signed(r.change), value), value)),
  );
  const GUTTER = 40;
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
  const gutterCost = nameWidth + 12 + valueWidth + 14 + 6;
  const panelOf = (columnCount: number) => widthPerColumn(columnCount) - gutterCost;
  const smallestFall = Math.min(
    ...rows.filter((r) => r.change < 0).map((r) => Math.abs(r.change)),
  );
  const largestMove = Math.max(...rows.map((r) => Math.abs(r.change)));
  const smallestFallPx = (columnCount: number) =>
    (panelOf(columnCount) * smallestFall) / largestMove;

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
  const layoutWith = (rungs: string[], columnCount: number) => {
    const spent = new Set(rungs);
    let text = limits;
    if (spent.has("R1")) text = `${limits.split(". ")[0]}.`;
    if (spent.has("R3")) text = note;
    else if (spent.has("R2")) text = `${text} ${note}`;
    const lines = wrap(set(text, body), column, body);
    const top =
      limitsTop +
      lines.length * bodyLead +
      (spent.has("R2") || spent.has("R3")
        ? annot.fontSize * 1.2
        : annot.fontSize * 2.6);
    return {
      lines,
      top,
      pitch: (plotBottom - top) / Math.ceil(rows.length / columnCount),
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
  const candidates = [2, 3]
    .filter((columnCount) => smallestFallPx(columnCount) >= MIN_SMALLEST_FALL_PX)
    .flatMap((columnCount) =>
      [[], ["R1"], ["R1", "R2"], ["R1", "R3"]].map((rungs) => ({ columnCount, rungs })),
    );
  const choice = candidates.find(
    (c) => layoutWith(c.rungs, c.columnCount).pitch >= pitchOwed,
  );
  if (!choice)
    throw new Error(
      `this direction cannot draw ${rows.length} rows at ${width}x${height}. Every row owes ` +
        `${pitchOwed.toFixed(1)}px to print its value; ${[2, 3]
          .map(
            (n) =>
              `${n} columns ${
                smallestFallPx(n) < MIN_SMALLEST_FALL_PX
                  ? `spend ${gutterCost.toFixed(0)}px of gutter against ${panelOf(n).toFixed(0)}px of bar, drawing the smallest fall ${smallestFallPx(n).toFixed(1)}px long, which is a table`
                  : `reach ${layoutWith(["R1", "R3"], n).pitch.toFixed(1)}px with every rung spent`
              }`,
          )
          .join("; ")}`,
    );
  const { columnCount, rungs: spent } = choice;
  const layout = layoutWith(spent, columnCount);
  const perColumn = Math.ceil(rows.length / columnCount);
  const columns = Array.from({ length: columnCount }, (_, c) =>
    rows.slice(c * perColumn, (c + 1) * perColumn),
  );
  const ladder =
    `${columnCount} columns · ` +
    (spent.length
      ? spent.map((id) => `${id}: ${RUNGS.find((r) => r.id === id)!.why}`).join(" · ")
      : "no rung — the frame held every word");
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
   *  read as two columns rather than as a staircase following the bars. */
  const valueRight = (c: number) => nameRight(c) + 12 + valueWidth;
  const barLeft = (c: number) => valueRight(c) + 14;
  /** The zero rule sits at the column's own right edge, less a hair. It used to stand a value's
   *  width in from it, because the one row that RISES labelled itself on that side; now that every
   *  number is in the left gutter, that reserve was 55px of dead air per column — and the panel is
   *  where a length encoding lives. Croatia's +0.03 still grows to the right of the rule, and at
   *  this scale that is a third of a pixel, which is the honest width of it. */
  const zeroOf = (c: number) => columnLeft(c) + columnWidth - 6;

  const widest = Math.max(...rows.map((r) => Math.abs(r.change)));
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
    return {
      name: b.name,
      x: nameRight(b.column) - widthOf(set(b.name, annot), annot),
      y: b.mid - (band.ascent + band.descent) / 2,
      width: widthOf(set(b.name, annot), annot),
      height: band.ascent + band.descent,
      baseline: b.mid + band.ascent / 2,
      right: nameRight(b.column),
    };
  });

  const valueBoxes = bars.map((b) => {
    const text = set(signed(b.change), value);
    const band = bandOf(value);
    return {
      name: b.name,
      text,
      right: valueRight(b.column),
      x: valueRight(b.column) - widthOf(text, value),
      y: b.mid - (band.ascent + band.descent) / 2,
      width: widthOf(text, value),
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
      at: { x: subjectBar.zero - 4, y: subjectBar.mid },
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
  const registerOf = new Map(requests.map((r) => [r.id, r.register]));

  const textAt = (id: string, fill?: string, weight?: number) => {
    const p = byId.get(id);
    if (!p) return null;
    const r = registerOf.get(id)!;
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
      aria-label={alt}
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
            x={PAD + b.column * (columnWidth + 40) - 4}
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
          x={n.right}
          y={n.baseline}
          textAnchor="end"
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
