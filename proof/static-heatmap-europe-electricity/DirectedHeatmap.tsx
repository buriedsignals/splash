/**
 * Europe's 2024 electricity mix — 18 countries × 9 sources — drawn THROUGH the design base. The
 * first `heatmap` component in this tree; the family's eleven references had no directed beat, and
 * it was the largest uncovered family left in the harvest.
 *
 * `the-ramp-is-monotone-in-lightness` (IiB pin-codes, ProPublica; counter-example Ferdio viz49) —
 * the ramp steps between two poles built from the direction's own colours, so lightness falls the
 * whole way and ranking cells by darkness ranks them right. Ferdio's runs white → blue → NAVY →
 * red, and its navy `10` reads heavier than its red `15`.
 *
 * `a-sequential-grid-is-one-hue-cluster` (Observable's negative, four disciplined records) — one
 * hue, by construction rather than by test.
 *
 * `the-scale-is-stepped-not-continuous` (ProPublica's seventeen fills, IiB's visible swatch edges) —
 * six classes with edges, because a reader can name a class and nobody can name a point on a
 * gradient.
 *
 * `the-key-prints-its-breaks-in-the-data-s-units` (ONS, ABC) and
 * `the-key-names-its-classes-in-their-own-colours` (ProPublica, IiB tooth-law) — every break printed
 * in %, and each break set in the fill of the class it opens, walked to the text floor. The caption
 * IS the swatch.
 *
 * `the-cell-value-is-printed-or-the-region-is-named` (Ferdio viz49, IiB pin-codes) — TWO answers,
 * and the cell count picks one. Ferdio prints six numbers because six fit. This grid has 162 cells
 * and the value register does not fit the row the layout gives, so the plate names its REGION
 * instead — and says on the plate that it did, because a reader cannot tell a grid that chose not to
 * print from one that forgot.
 *
 * `the-group-boundary-is-drawn` — the three families are carried by the column ORDER and a drawn
 * boundary, never by a second hue: on a heatmap the hue is the scale.
 */

import {
  deriveFurniture,
  measureText,
  measureTextBand,
  adjustToContrast,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/render-still.mjs";
import { mix } from "#shared/chart-beat/colour.mjs";
import { applyCase } from "#shared/chart-beat/registers.mjs";
import {
  EYEBROW_TO_DISPLAY,
  gapOf,
  leadOf,
  registerOf,
} from "#shared/design-base/register.mjs";

/** 960 x 540 at scale 2 is the `landscape` this beat pins — 1920 x 1080. */
const FRAME = { width: 960, height: 540 };

type RegisterName = "display" | "eyebrow" | "body" | "axis" | "annot" | "value";

export type Source = { key: string; label: string; short?: string; family: string };
export type Row = {
  key: string;
  label: string;
  lowCarbon: number;
  shares: number[];
};
export type Region = { from: number; to: number; label: string };

export function DirectedHeatmap({
  rows,
  sources,
  families,
  breaks,
  region,
  shareHead,
  unit,
  title,
  limits,
  reading,
  source,
  alt,
  eyebrow,
  format,
  direction,
  treatments,
  onLadder,
  frame,
}: {
  rows: Row[];
  sources: Source[];
  families: Array<{ name: string; short?: string; from: number; to: number }>;
  breaks: number[];
  region: Region;
  shareHead: string;
  unit: string;
  title: string[];
  limits: string[];
  reading: string[];
  source: string;
  alt: string;
  eyebrow: string;
  format: (v: number) => string;
  direction: any;
  treatments: string[];
  onLadder?: (note: string) => void;
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
  const BAND_PROBE = "Hxpg1,";
  const bandOf = (r: any) => measureTextBand(BAND_PROBE, sizeOf(r));

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

  const axisBand = bandOf(axis);
  const annotBand = bandOf(annot);
  const valueBand = bandOf(value);

  // ── the ramp ──────────────────────────────────────────────────────────────
  /** ONE HUE, SIX CLASSES, LIGHTNESS FALLING THE WHOLE WAY. The poles are the direction's own: a
   *  pale step off the ground at the empty end, the accent deepened toward the ink at the full end.
   *  Built between two poles of one palette, a ramp cannot turn back on itself — which is the
   *  failure `the-ramp-is-monotone-in-lightness` exists for, and the one Ferdio's viz49 commits. */
  const low = mix(direction.accent, direction.ground, 0.9);
  const high = mix(direction.accent, ink, 0.3);
  const classCount = breaks.length + 1;
  const classOf = (share: number) => breaks.filter((b) => share >= b).length;
  const classFill = (index: number) =>
    mix(low, high, classCount > 1 ? index / (classCount - 1) : 0.5);

  // ── the column that carries the header and the footer ─────────────────────
  const column = width - PAD * 2;
  const titleLead = leadOf(display);
  const bodyLead = leadOf(body);
  const annotLead = leadOf(annot);

  // ── the grid's own columns, measured before the ladder ────────────────────
  //
  // None of these depends on the vertical layout, and the ladder depends on THEM: whether a column
  // head has to stagger onto a second line is a width question, and the answer changes how much
  // vertical room the heads need. Measuring width first means the stagger row is reserved only when
  // some head actually needs it.
  const nameRoom = Math.max(...rows.map((r) => widthOf(set(r.label, axis), axis))) + 10;
  /** THE COLUMN THE ROW ORDER IS BY NEEDS A NAME. Without one a reader sees `100,0 %` beside
   *  Iceland and cannot tell what it is a hundred per cent OF — and the ladder had already spent the
   *  reading line, which is where that sentence would otherwise live. The head is measured into the
   *  column's own width, so naming it can never push it off the plate. */
  const shareRoom =
    Math.max(
      ...rows.map((r) => widthOf(set(format(r.lowCarbon), value), value)),
      widthOf(set(shareHead, axis), axis),
    ) + 12;
  /** THE FRAME IS NARROWER THAN THE ONE THIS PLATE WAS TUNED AT. Everything below that reads this
   *  leaves landscape exactly as it was accepted; 960px is the width every number here was measured
   *  against. */
  const NARROW = width < FRAME.width;

  /** THE SHORT FORM OF A NAME, SPENT ONLY WHERE THE PLATE IS NARROW. The copy writes both; the
   *  renderer picks, and never invents one by cutting a string. */
  const shortly = <T extends { label?: string; name?: string; short?: string }>(
    x: T,
  ) => (NARROW && x.short ? x.short : ((x.label ?? x.name) as string));

  /** THE BRACKET'S COLUMN IS CAPPED WHERE THE PLATE IS NARROW, because the label WRAPS inside it and
   *  the bracket is seven rows tall. Reserving the label's full one-line width spent 110px of a
   *  540px plate on a caption that then used four lines of a column it never needed — measured at
   *  1080x1080, it left the nine sources 23px of cell each, where « Hydraulique » is 55px, and the
   *  column heads printed through each other. The floor is the widest WORD, so capping it can never
   *  clip one. */
  const regionFull = widthOf(set(region.label, annot), annot);
  const regionWord = Math.max(
    ...region.label.split(/\s+/).map((w) => widthOf(set(w, annot), annot)),
  );
  const regionRoom = on("the-cell-value-is-printed-or-the-region-is-named")
    ? NARROW
      ? 8
      : regionFull + 22
    : 0;
  /** WHERE THE BRACKET'S LABEL GOES WHEN IT HAS NO COLUMN. Under the grid, on its own line, in the
   *  accent it already brackets with — 117px of a 540px plate is a quarter of the width, and the
   *  same sentence costs one line of height instead. */
  const regionUnderGrid = regionRoom > 0 && NARROW;

  const gridLeft = PAD + nameRoom;
  const gridRight = width - PAD - shareRoom - regionRoom;
  const cellW = (gridRight - gridLeft) / sources.length;

  /** COLUMN HEADS STAGGER, THEY NEVER ROTATE OR DROP — Reuters' rule, filed as
   *  `a-narrow-cell-degrades-its-label-rather-than-dropping-it`. A head wider than its column drops
   *  to a second line rather than turning ninety degrees.
   *
   *  AND ONE EXTRA LINE IS NOT A LADDER. At 960px every wide head moved to the same second line and
   *  that was enough, because two columns of width was more than any name needed. At 540px it is
   *  not: measured at 1080x1080 and 1080x1920, all five renewable heads went to line two and printed
   *  straight through each other — « Hydraulique » and « Éolien » shared 100% of the smaller run.
   *  So where the plate is narrow the stagger is a DEPTH: heads step round `1, 2, … d, 1, 2, …`, so
   *  two heads on one line are `d` columns apart, and `d` is the smallest depth at which every such
   *  pair measures clear. Landscape keeps the rule it was accepted under, untouched. */
  const headWidthOf = (i: number) => widthOf(set(shortly(sources[i]), axis), axis);
  const clearsAtDepth = (d: number) =>
    sources.every(
      (_, i) =>
        i + d >= sources.length ||
        (headWidthOf(i) + headWidthOf(i + d)) / 2 + 4 <= d * cellW,
    );
  const HEAD_DEPTH_MAX = 3;
  let headDepth = 1;
  while (headDepth < HEAD_DEPTH_MAX && !clearsAtDepth(headDepth)) headDepth++;
  const headRow = (i: number) =>
    NARROW ? i % headDepth : headWidthOf(i) > cellW - 2 ? 1 : 0;
  const headRows = NARROW
    ? headDepth
    : sources.some((_, i) => headWidthOf(i) > cellW - 2)
      ? 2
      : 1;

  /** THE ROW PITCH IS A MEASURED FLOOR, NOT A HOPE. Eighteen rows each carry a name in the axis
   *  register, and a name is only a name if it does not sit on its neighbour. The ladder spends the
   *  short standfirst and reading forms the beat supplies, in order, until the pitch the layout
   *  actually gives clears the band the axis register owes — and refuses loudly if nothing does,
   *  because a heatmap whose rows cannot be named is not a heatmap. */
  const rowsOwe = axisBand.ascent + axisBand.descent + 2.5;
  /** THE ROOM ABOVE THE GRID, DERIVED FROM THE OFFSETS THE MARKS ARE ACTUALLY DRAWN AT — not
   *  guessed at and then hoped to be enough. The first version reserved one head row and then drew
   *  a second one 11px higher, straight through the family rule: `Hydraulique` and `Bioénergie` sat
   *  on top of `renouvelables`. Every number below is used twice, once here and once at the mark. */
  const HEAD_DROP = 4;
  const HEAD_STEP = axisBand.ascent + 2;
  const headTopmost = HEAD_DROP + (headRows - 1) * HEAD_STEP + axisBand.ascent;
  const familyRuleUp = headTopmost + 5;
  const familyBaselineUp = familyRuleUp + 4;
  const columnHeadRoom = familyBaselineUp + annotBand.ascent + 4;
  /** THE KEY TAKES THE WHOLE COLUMN WHERE THE PLATE IS NARROW, AND THE UNIT TAKES ITS OWN LINE.
   *  At 960px the six swatches sat under the grid with « part de la production du pays » beside
   *  them. At 540px the grid is 252px wide, so a swatch is 42px and « 10,0 % » is 35px centred on
   *  each edge: measured at 1080x1080 the break labels printed « 2,0 %5,0 %10,0 % » through each
   *  other and the unit ran to the frame edge. Given the full column the swatches are 71px, which
   *  is wider than any break label, and the unit drops below them. */
  const keyFullWidth = NARROW;
  const axisLead = leadOf(axis);
  const keyRoom =
    axisBand.ascent * 2 +
    axisBand.descent +
    14 +
    (keyFullWidth ? axisLead : 0) +
    (regionUnderGrid ? annotLead : 0);

  /** THE CREDIT IS A PARAGRAPH, NOT A LINE — and at 960px wide nothing ever noticed. Measured at
   *  1080x1920 and 1080x1080: « Source : Ember, Energy Institute – Statistical Review of World
   *  Energy (2025), via Our World in Data » is 587px of ink laid at x=PAD into a 540px plate, so it
   *  ran 93px off the right edge in all three directions and `assertTextWithinFrame` refused every
   *  one of them. It wraps into the same column as the standfirst, and its baselines are stepped UP
   *  from the foot so the last line still sits on PAD — which is why landscape, where it is one
   *  line, is untouched. */
  const sourceLines = wrap(set(source, body), column, body);

  const layoutFor = (titleIndex: number, limitIndex: number, readingIndex: number) => {
    const titleLines = wrap(set(title[titleIndex], display), column, display);
    const limitLines =
      limitIndex < 0 ? [] : wrap(set(limits[limitIndex], body), column, body);
    const readingLines =
      readingIndex < 0
        ? []
        : wrap(set(reading[readingIndex], annot), column, annot);
    const eyebrowBaseline = PAD + eyebrowReg.fontSize;
    const titleTop =
      eyebrowBaseline + gapOf(eyebrowReg, EYEBROW_TO_DISPLAY) + display.fontSize;
    const limitsTop =
      titleTop + titleLines.length * titleLead + gapOf(body, 0.4828);
    const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;
    const readingTop = readingLines.length
      ? sourceTop - bodyLead - readingLines.length * annotLead
      : sourceTop - bodyLead * 0.4;
    const top =
      (limitLines.length
        ? limitsTop + limitLines.length * bodyLead
        : titleTop + titleLines.length * titleLead) + columnHeadRoom;
    const bottom = readingTop - gapOf(annot, 0.8571) - keyRoom;
    return {
      titleLines,
      limitLines,
      readingLines,
      eyebrowBaseline,
      titleTop,
      limitsTop,
      sourceTop,
      readingTop,
      top,
      bottom,
      pitch: (bottom - top) / rows.length,
    };
  };

  /** THE LADDER SPENDS THE HEADLINE TOO, AND IT SPENDS IT LAST. The rung order is the order a desk
   *  would cut in: the reading line first, then the standfirst, and only when neither is left does
   *  the headline take its short form. `nocturne` sets the display register in Futura at 32px and
   *  its headline runs to three lines — on a 540px plate those three lines are four rows of the
   *  grid. A short headline is a form a desk writes; what would be a defect is a headline that
   *  silently overflows, or twelve rows quietly becoming nine. */
  const rungs: Array<{ title: number; limit: number; reading: number }> = [];
  for (let t = 0; t < title.length; t++)
    for (let l = 0; l < limits.length; l++) {
      for (let r = 0; r < reading.length; r++) rungs.push({ title: t, limit: l, reading: r });
      rungs.push({ title: t, limit: l, reading: -1 });
    }
  /** AND THE LAST RUNG DROPS THE STANDFIRST ALTOGETHER — the ladder's R7, which this component had
   *  no rung for. Measured at 1080x1080: with every other rung spent, the best pitch `creme` could
   *  reach was 12.3px against the 13.0px its axis register owes, and `nocturne` reached 9.0px
   *  against 11.5px. Four lines of standfirst on a 540px plate ARE four rows of the grid. It is
   *  spent after every headline form because it is the only line that says what the numbers are;
   *  what it costs is stated on the ladder note, so nobody has to guess that it went. */
  for (let t = 0; t < title.length; t++) rungs.push({ title: t, limit: -1, reading: -1 });

  const chosen = rungs.map((rung) => ({
    rung,
    layout: layoutFor(rung.title, rung.limit, rung.reading),
  }));
  /** AND ON A TALL PLATE, CLEARING THE FLOOR IS NOT THE SAME AS BEING A CHART. The ladder stops at
   *  the first rung that fits, which is right on a 960px plate and wrong on a 1080x1920 one:
   *  measured there, rung 1 cleared the 11.5px floor at 13.5px and the grid came out a 121px band
   *  across the middle of a 960px frame, with eight lines of headline above it and a six-line
   *  reading note below. Nothing was clipped and nothing collided — the plate simply was not a
   *  heatmap any more.
   *
   *  So where the plate is narrow the grid is OWED a third of the frame, which is the share
   *  `proof/static-choropleth-europe-lowcarbon` gives its map at the same size and for the same
   *  reason. The ladder keeps its order: it takes the first rung that pays both the floor and the
   *  third, and only if no rung can pay the third does it take the rung that leaves the grid the
   *  most — which is what a 540px square, where a third is out of reach, gets. */
  const gridOwed = NARROW ? height / 3 : 0;
  const clears = chosen.filter(({ layout }) => layout.pitch >= rowsOwe);
  const fits =
    clears.find(({ layout }) => layout.pitch * rows.length >= gridOwed) ??
    (NARROW
      ? clears.reduce(
          (a, b) => (b.layout.pitch > (a?.layout.pitch ?? -1) ? b : a),
          undefined as (typeof clears)[number] | undefined,
        )
      : clears[0]);
  if (!fits) {
    const best = chosen.reduce((a, b) =>
      b.layout.pitch > a.layout.pitch ? b : a,
    );
    throw new Error(
      `${rows.length} rows do not fit this direction: the widest rung reaches a pitch of ` +
        `${best.layout.pitch.toFixed(1)}px and the axis register owes ${rowsOwe.toFixed(1)}px. ` +
        `Draw fewer countries, or file a direction whose axis register is smaller.`,
    );
  }
  const layout = fits.layout;
  onLadder?.(
    `ladder: headline ${fits.rung.title + 1}, standfirst ` +
      (fits.rung.limit < 0 ? "dropped" : `${fits.rung.limit + 1}`) +
      `, reading ` +
      (fits.rung.reading < 0 ? "dropped" : `form ${fits.rung.reading + 1}`) +
      ` · pitch ${layout.pitch.toFixed(1)}px, owed ${rowsOwe.toFixed(1)}px`,
  );

  const cellH = layout.pitch;
  const gap = Math.max(Math.min(cellW, cellH) * 0.07, 0.6);
  const xOf = (i: number) => gridLeft + i * cellW;
  const yOf = (i: number) => layout.top + i * cellH;

  /** THE FORK, DECIDED BY MEASUREMENT. Ferdio prints a number in each of six cells because six fit.
   *  Here the value register's own band is measured against the cell the layout gives: if it fits,
   *  every cell prints; if it does not, the plate names its region and SAYS SO. What is not
   *  admissible is a grid that does neither. */
  const printsValues =
    valueBand.ascent + valueBand.descent <= cellH - gap &&
    Math.max(
      ...rows.flatMap((r) => r.shares.map((s) => widthOf(format(s), value))),
    ) <=
      cellW - gap;
  const namesRegion =
    on("the-cell-value-is-printed-or-the-region-is-named") && !printsValues;
  onLadder?.(
    `cells: ${rows.length * sources.length} · value band ${(valueBand.ascent + valueBand.descent).toFixed(1)}px ` +
      `against a ${cellH.toFixed(1)}px row -> ${printsValues ? "printed in every cell" : "region named instead"}`,
  );

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

      <text x={PAD} y={layout.eyebrowBaseline} {...line(eyebrowReg)}>
        {set(eyebrow, eyebrowReg)}
      </text>
      {layout.titleLines.map((l, i) => (
        <text
          key={l + i}
          x={PAD}
          y={layout.titleTop + i * titleLead}
          {...line(display)}
        >
          {l}
        </text>
      ))}
      {layout.limitLines.map((l, i) => (
        <text
          key={l + i}
          x={PAD}
          y={layout.limitsTop + i * bodyLead}
          {...line(body)}
        >
          {l}
        </text>
      ))}
      {layout.readingLines.map((l, i) => (
        <text
          key={`r${i}`}
          x={PAD}
          y={layout.readingTop + i * annotLead}
          {...line(annot)}
          fill={mutedInk}
        >
          {l}
        </text>
      ))}
      {sourceLines.map((l, i) => (
        <text
          key={`s${i}`}
          x={PAD}
          y={layout.sourceTop + i * bodyLead}
          {...line(body)}
        >
          {l}
        </text>
      ))}

      {/* THE FAMILY BOUNDARY, DRAWN — never a second hue. On a heatmap the hue is the scale, so a
          column group is carried by its position and by a rule above it. */}
      {families.map((f) => {
        const left = xOf(f.from);
        const right = xOf(f.to + 1) - gap;
        return (
          <g key={f.name}>
            <line
              x1={left}
              x2={right}
              y1={layout.top - familyRuleUp}
              y2={layout.top - familyRuleUp}
              stroke={mutedInk}
              strokeWidth={direction.stroke.rule}
            />
            <text
              x={(left + right) / 2}
              y={layout.top - familyBaselineUp}
              textAnchor="middle"
              {...line(annot)}
              fill={mutedInk}
            >
              {set(shortly(f), annot)}
            </text>
          </g>
        );
      })}

      {/* THE SHARE COLUMN'S OWN HEAD JOINS THE STAGGER. Measured at 1080x1080: with the source
          heads stepping round two lines, « Pétrole » landed on the bottom line and « bas-carbone »
          starts 8px past the grid's right edge on that same line — the two ran together. It takes
          the line the LAST source head is not on, so the two can never share one. Landscape keeps
          the single line it was accepted with. */}
      <text
        x={gridRight + 8}
        y={
          layout.top -
          HEAD_DROP -
          (NARROW
            ? ((headRow(sources.length - 1) + 1) % headRows) * HEAD_STEP
            : 0)
        }
        {...line(axis)}
        fill={mutedInk}
      >
        {set(shareHead, axis)}
      </text>

      {sources.map((s, i) => (
        <text
          key={s.key}
          x={xOf(i) + (cellW - gap) / 2}
          y={layout.top - HEAD_DROP - headRow(i) * HEAD_STEP}
          textAnchor="middle"
          {...line(axis)}
          fill={mutedInk}
        >
          {set(shortly(s), axis)}
        </text>
      ))}

      {rows.map((row, r) => (
        <g key={row.key}>
          <text
            x={gridLeft - 6}
            y={yOf(r) + cellH / 2 + (axisBand.ascent - axisBand.descent) / 2}
            textAnchor="end"
            {...line(axis)}
            fill={mutedInk}
          >
            {set(row.label, axis)}
          </text>
          {row.shares.map((share, c) => (
            <rect
              key={`${row.key}-${sources[c].key}`}
              x={xOf(c)}
              y={yOf(r)}
              width={cellW - gap}
              height={cellH - gap}
              fill={classFill(classOf(share))}
              stroke={grid}
              strokeWidth={direction.stroke.hairline}
            />
          ))}
          {printsValues &&
            row.shares.map((share, c) => (
              <text
                key={`v-${row.key}-${sources[c].key}`}
                x={xOf(c) + (cellW - gap) / 2}
                y={
                  yOf(r) +
                  cellH / 2 +
                  (valueBand.ascent - valueBand.descent) / 2
                }
                textAnchor="middle"
                {...line(value)}
                fill={adjustToContrast(
                  ink,
                  classFill(classOf(share)),
                  TEXT_CONTRAST_MIN,
                )}
              >
                {format(share)}
              </text>
            ))}
          {/* THE NUMBER THE ROW ORDER IS BY, WRITTEN. An order is a claim, and a reader who cannot
              see the quantity the rows are sorted on cannot check it. */}
          <text
            x={gridRight + 8}
            y={yOf(r) + cellH / 2 + (valueBand.ascent - valueBand.descent) / 2}
            {...line(value)}
            fill={r >= region.from && r <= region.to ? accentInk : mutedInk}
            fontWeight={
              r >= region.from && r <= region.to ? 700 : value.fontWeight
            }
          >
            {set(format(row.lowCarbon), value)}
          </text>
        </g>
      ))}

      {/* THE REGION, NAMED — the pin-code poster's answer for a grid too dense to print. The finding
          in a heatmap is a SHAPE, and a callout on one cell cannot say it. The bracket is drawn in
          the ink, outside the ramp entirely, so it can never be read as a value. */}
      {namesRegion && regionUnderGrid && (
        <text
          x={gridLeft}
          y={layout.bottom + 6 + annotBand.ascent}
          {...line(annot)}
          fill={accentInk}
        >
          {set(region.label, annot)}
        </text>
      )}
      {namesRegion &&
        (() => {
          const top = yOf(region.from) - gap;
          const bottom = yOf(region.to + 1) - gap;
          const x = gridRight + shareRoom;
          return (
            <g>
              <path
                d={`M ${x - 5} ${top} L ${x} ${top} L ${x} ${bottom} L ${x - 5} ${bottom}`}
                fill="none"
                stroke={accentInk}
                strokeWidth={direction.stroke.rule}
              />
              {(regionUnderGrid
                ? []
                : wrap(set(region.label, annot), regionRoom - 12, annot)
              ).map(
                (l, i, all) => (
                  <text
                    key={`region-${i}`}
                    x={x + 6}
                    y={
                      (top + bottom) / 2 -
                      ((all.length - 1) * annotLead) / 2 +
                      i * annotLead +
                      (annotBand.ascent - annotBand.descent) / 2
                    }
                    {...line(annot)}
                    fill={accentInk}
                  >
                    {l}
                  </text>
                ),
              )}
            </g>
          );
        })()}

      {/* THE KEY: six classes with edges, each break printed in the data's unit, and each break set
          in the fill of the class it opens — walked to the text floor so a pale class stays legible
          without becoming a different colour. The caption IS the swatch. */}
      {on("the-scale-is-stepped-not-continuous") &&
        (() => {
          const left = keyFullWidth ? PAD : gridLeft;
          const swatchW = keyFullWidth
            ? (width - PAD * 2) / classCount
            : Math.max(cellW * 0.8, 30);
          const top =
            layout.bottom + 10 + (regionUnderGrid ? annotLead : 0);
          return (
            <g>
              {Array.from({ length: classCount }, (_, i) => (
                <g key={`key-${i}`}>
                  <rect
                    x={left + i * swatchW}
                    y={top}
                    width={swatchW - gap}
                    height={axisBand.ascent}
                    fill={classFill(i)}
                    stroke={grid}
                    strokeWidth={direction.stroke.hairline}
                  />
                  {i > 0 && (
                    <text
                      x={left + i * swatchW}
                      y={top + axisBand.ascent * 2 + 2}
                      textAnchor="middle"
                      {...line(axis)}
                      fill={adjustToContrast(
                        classFill(i),
                        direction.ground,
                        TEXT_CONTRAST_MIN,
                      )}
                    >
                      {set(format(breaks[i - 1]), axis)}
                    </text>
                  )}
                </g>
              ))}
              <text
                x={keyFullWidth ? left : left + classCount * swatchW + 8}
                y={
                  keyFullWidth
                    ? top + axisBand.ascent * 2 + 2 + axisLead
                    : top + axisBand.ascent
                }
                {...line(axis)}
                fill={mutedInk}
              >
                {set(unit, axis)}
              </text>
            </g>
          );
        })()}
    </svg>
  );
}
