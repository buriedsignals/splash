/**
 * Life expectancy at birth in Switzerland, 1950–2023, drawn as a LINE **through the design base** and
 * delivered as an interactive page. The web sibling of `proof/more-line-swiss-life-expectancy`, on the
 * same frozen file and the same asserted claim.
 *
 * WHAT DIRECTING IT CHANGED, AND WHY IT IS NOT A RESTYLE. The undirected build of this beat set its own
 * type scale in a `FRAME` constant (24/14/13/12/…) and its own colours through props, and it made no call
 * to `webRegister` at all. So the three filed directions could not reach it: a page composed that way is
 * one page, and the arbiter, the six registers, the measured contrast floors and the adaptive leading all
 * stopped at its door. Every size, weight, family, tracking, case and line on this page now resolves from
 * the direction (`webRegisters`), and every colour from that direction's own ground, ink and accent
 * through `deriveFurniture` / `mix` / `adjustToContrast`. Not one of them is typed here.
 *
 * The FLUID FRAME is kept exactly as the second build left it, because it is what makes a directed size
 * safe: the `<svg>` draws GEOMETRY ONLY — not one `<text>` element — and every word is HTML positioned by
 * `%` over the same grid cell at a fixed CSS pixel size the register decides. Geometry stretches with the
 * container; type never does.
 *
 * `direct-end-label-in-the-series-colour` — one series, named where it ends, in the line's own colour,
 * instead of a legend the reader has to look away to (`references/types/line.md`).
 *
 * The 1950 level the whole claim is measured from is a dashed rule across the frame with its name ON that
 * rule, not a number in a sentence. Taken from this type's own sheet, NOT from the arbiter: the treatment
 * that says it (`the-target-is-named-on-the-line-that-draws-it`) is predicated on `markerCount`, which
 * counts a per-row target of the bullet's kind and is zero here, so it is not offered and is not claimed.
 *
 * THE ZERO THIS TYPE REFUSES. The readings run 68.9–84.0 and the scale is fitted to their own extent
 * (`chartGeometry`, `scaleLinear().domain(extent).nice()`), which is the rule the sheet spends its longest
 * paragraph on: a line encodes change by SLOPE, and a forced zero would leave the whole 15-year climb
 * inside the top fifth of the plot.
 *
 * THE TRAP THIS TYPE NAMES, in the form it actually takes here. The sheet's trap is two series' end-labels
 * colliding. This beat draws one series — and it still carries two DIRECT LABELS stacked in the same band:
 * the crossing note at 80.3 and the end label at 84.0, a constant 22.4 % of the plot's height apart while
 * both labels are a FIXED pixel height THE DIRECTION DECIDES, so the gap closes as the plot shrinks — and it
 * closes at a different size in each direction. The sheet's remedy is what transfers: nudge them apart UP
 * AND DOWN, never sideways off the point. Below the plot height computed from this direction's own leading
 * (`flipBelowPx`), the crossing note hangs under its own point instead of above it — the empty half of that
 * neighbourhood, since the stroke reaches 80 only at the crossing.
 *
 * WHAT THE WEB ADDS. A still of this claim prints three of its 74 numbers and draws the distance between
 * every other year and the 1950 rule as pixels a reader has to eyeball. Every one of the 74 readings here
 * answers with that distance as a number and with the SHARE of the whole 15.0-year climb banked by that
 * year — the headline's own arithmetic asked of all 74. Each answer is computed in the runner from the
 * frozen file and asserted there; nothing about a reading is derived in this component.
 */

import {
  mix,
  adjustToContrast,
  TEXT_CONTRAST_MIN,
  NON_TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import { registerOf, leadOf } from "#shared/design-base/register.mjs";
import {
  webRegisters,
  figureVars,
  measurable,
  noteAnchor,
} from "#shared/design-base/web.mjs";
import { chartGeometry, xTickValues, formatNumber, type Reading } from "./life-geometry";

type Measure = (
  text: string,
  font: { fontSize: number; fontWeight?: number; fontFamily?: string },
) => number;

export type DirectedFrame = {
  /** The plot rectangle's own canonical proportions, in SVG user units — NOT a rendered pixel size and
   *  NOT a cap. The `<svg>` is stretched (`preserveAspectRatio="none"`) to fill whatever box
   *  `.chart-plot`'s grid gives it; this pair only fixes the shape that box grows and shrinks along. */
  width: number;
  height: number;
  /** Fixed CSS pixel row below the plot for the x-axis year labels — a grid track, not part of the
   *  `viewBox`, so its type never scales with it. */
  xAxisRowPx: number;
  yTickHint: number;
  xTickHint: number;
  /** A regular gridline whose own label would sit closer than this FRACTION of the plot's height to the
   *  reference rule's label is dropped. A fraction, not a canonical-unit constant, because the plot's
   *  rendered height changes continuously with its width. Measured: at 375 px the plot is 171 px tall and
   *  a 12 px label occupies ~14 px of it, so two labels need at least 8.8 % of the height between them or
   *  they collide — which they did, "68.9" printed straight through "70". */
  minGridlineGapFraction: number;
};

/** This beat's own frame. Squarer than the format's own 820x380 on purpose: the plot's height follows its
 *  width through `aspect-ratio`, so a flatter canonical box buys a taller chart at 1600 px and a strip at
 *  375 px. Measured at 375 px — a 293 px-wide plot — this ratio draws 165 px of plot where the format's
 *  own would draw 133 px. No type scale lives here any more: every size on this page is the direction's. */
export const FRAME: DirectedFrame = {
  width: 760,
  height: 400,
  xAxisRowPx: 26,
  yTickHint: 5,
  xTickHint: 6,
  minGridlineGapFraction: 0.09,
};

/** Enough canonical units to clear the largest circle this frame draws (`.pt`'s r=5) so the first and last
 *  readings' own marks are never half-clipped against the `viewBox` edge — an SVG clips to its `viewBox`,
 *  and at any container width that clip is invisible to a unit test and obvious only in a screenshot. */
const POINT_INSET = 6;

/** How far the crossing note stands off its own point, in CSS pixels — and, because a label should keep the
 *  same breathing room from the label above it as it keeps from the mark below it, also the clearance the
 *  flip below is computed to leave. One number, stated once, used for both. */
const NOTE_LIFT_PX = 8;

/** The vertical padding the format's shared stylesheet gives `.note` and `.end-label` (`padding: 1px 4px`),
 *  top and bottom. It is part of each label's real box height, so it is part of the arithmetic that decides
 *  whether two of them fit. */
const LABEL_PADDING_Y_PX = 1;

/** The narrowest plot this format is verified at, in CSS pixels — measured, not chosen: at a 320 px
 *  viewport the figure's own fixed 24 px inset leaves 272 px, and the plot's y-gutter is taken out of that
 *  again. It is the width the crossing note's ONE-LINE guard below is held against, because a note that
 *  fits every wider frame and runs off the narrowest one is a defect nobody sees on a laptop. */
const NARROWEST_PLOT_PX = 272;

const pct = (value: number, extent: number) =>
  extent === 0 ? 0 : Math.round((value / extent) * 1000) / 10;

export function DirectedLifeExpectancyWeb({
  data,
  title,
  eyebrow,
  caveat,
  reading,
  source,
  alt,
  subject,
  referenceYear,
  referenceNote,
  crossingYear,
  crossingNote,
  unit,
  direction,
  ground,
  accent,
  ink,
  muted,
  grid,
  measure,
  frame,
}: {
  /** Every reading, each carrying THE ANSWER IT GIVES — built in the runner from the frozen file
   *  (`readingsWithDetail`), asserted there, and only read back here. Nothing about a reading is derived
   *  in this component: the browser never formats a number and neither does the drawing layer, so there is
   *  one implementation of "what does 1985 say" for the page and the brief to agree on
   *  (`chart-web/references/directed-interaction.md`, rule 4). */
  data: (Reading & { detail: string })[];
  title: string;
  eyebrow: string;
  caveat: string;
  reading: string;
  source: string;
  alt: string;
  subject: string;
  /** The level the reference rule holds the reader's eye against — this beat's claim is measured from
   *  1950, so the reference is 1950, not a generic "first reading" default. */
  referenceYear: number;
  referenceNote: string;
  /** The year life expectancy first reached 80, found by the runner from the data, never hand-typed. */
  crossingYear: number;
  crossingNote: string;
  unit: string;
  direction: any;
  ground: string;
  accent: string;
  /** Derived from `ground` by `deriveFurniture` in the node runner that calls this component. Never
   *  derived in here, so there is one implementation of the colour rule per render. */
  ink: string;
  muted: string;
  grid: string;
  measure: Measure;
  frame: DirectedFrame;
}) {
  if (data.length < 2)
    throw new Error(`a line beat needs at least two readings, got ${data.length}`);

  // THE THREE COLOURS THIS PAGE DRAWS WITH, all resolved from the direction's own pair. The stroke is the
  // accent taken to the non-text floor against this direction's ground — an accent a reader cannot see is
  // the argument gone; the rule and the crossing dot are steps between ground and ink; the labels' own ink
  // is taken to the text floor because they are text.
  const stroke = adjustToContrast(accent, ground, NON_TEXT_CONTRAST_MIN) ?? accent;
  const rule = mix(ground, ink, 0.5);
  const label = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;

  // ONE ACCENT ON THE PAGE, NOT TWO A STEP APART. The registers are handed the FLOOR-ADJUSTED accent, not
  // the direction's raw one: the eyebrow's ink role is `accent`, so a page that gave the registers the raw
  // value and the marks the adjusted one shipped `#1757B6` on the eyebrow beside `#1755b2` on the line —
  // measured on this beat's first directed render, in all three directions. Two values for one decision.
  // The adjusted one is the safe one to unify on: it is the only one held to a floor, and it clears the
  // TEXT floor as well in all three directions (6.85, 10.93 and 7.31 : 1), so nothing is lost by using it
  // for the words too.
  const regs = webRegisters(direction, { ink: { ink, muted, accent: stroke } });

  const last = data[data.length - 1];
  const endLabel = `${subject} ${formatNumber(last.value)} (${last.year})`;
  const detailByYear = new Map(data.map((d) => [d.year, d.detail]));

  const referenceReading = data.find((d) => d.year === referenceYear);
  if (!referenceReading) throw new Error(`referenceYear ${referenceYear} is not in the data`);
  const referenceValue = referenceReading.value;

  const geometry = chartGeometry(data, {
    width: frame.width,
    height: frame.height,
    padding: { top: POINT_INSET, right: POINT_INSET, bottom: POINT_INSET, left: POINT_INSET },
  });
  const { points, path, y } = geometry;

  // The reference's own y is known before the tick set is finalised — the only way to drop a regular
  // gridline that would otherwise sit a few pixels from the dashed reference rule and read as noise.
  const referenceY = y(referenceValue);
  const minGridlineGap = frame.height * frame.minGridlineGapFraction;
  const regularTicks = y
    .ticks(frame.yTickHint)
    .filter((v: number) => Math.abs(y(v) - referenceY) >= minGridlineGap);
  const tickValues = [...regularTicks, referenceValue].sort((a, b) => a - b);
  const topValue = Math.max(...tickValues);
  // Round ticks (from d3's own `.ticks()`) print as whole numbers; the reference tick is the raw 1950
  // reading itself (68.9133…), rounded to one decimal the same way every other printed value in this beat
  // is — an unrounded float here was a real defect caught by driving the rendered file.
  const tickLabels = tickValues.map((v) => {
    const text = Number.isInteger(v) ? `${v}` : formatNumber(v);
    return v === topValue ? `${text} ${unit}` : text;
  });

  // The ONE measurement left in this component: the y-axis label column is a real CSS grid track, sized to
  // the widest label that will actually sit in it — at the AXIS REGISTER's own resolved size and face, not
  // at a number typed here. `measurable`, not `regs.axis`, because `measureText` wants numbers.
  const axisFont = measurable(direction, "axis");
  const yGutterPx = 10 + Math.max(...tickLabels.map((l) => measure(l, axisFont)));

  const crossingPoint = points.find((p) => p.year === crossingYear);
  // The horizontal half of the crossing note's placement. Its VERTICAL half is the media query's below,
  // so the transform is lifted out of the inline style here and composed into both rules there.
  const { transform: crossingTransform, ...crossingAnchor } = noteAnchor(
    crossingPoint ? pct(crossingPoint.x, frame.width) : 50,
  );
  const end = points[points.length - 1];
  const xTicks = xTickValues(data.map((d) => d.year), frame.xTickHint);

  // ── THE TRAP THIS TYPE NAMES, MEASURED IN THIS DIRECTION'S OWN TYPE ────────────────────────────────
  // The crossing note and the end label are the two direct labels this single series still has, and they
  // are stacked in the same band. The distance between their two points is a FRACTION of the plot's height
  // — constant at every width, read off this beat's own geometry below and never typed — while both labels
  // are a FIXED pixel height the DIRECTION decides. So the gap closes as the plot shrinks, and it closes at
  // a different size in each direction: the same page that cleared by 11 px under one set of registers
  // overlapped by 2.4 px under another, which is what a hand-typed breakpoint could never have known.
  //
  // What has to fit inside that band, from the crossing point upward: the note's own lift off its point,
  // the note's whole box, half the end label's box (the end label is centred on its point), and one more
  // lift of clearance between the two. Below that the note flips UNDER its own point — the empty half of
  // that neighbourhood, since the stroke reaches the crossing level only at the crossing itself. Both
  // placements stay ON the point; neither is a slide sideways off the mark it annotates, which is the
  // sheet's own remedy for this trap.
  //
  // AND IT IS ASKED OF THE PLOT, NOT OF THE WINDOW. A `@container` query on the overlay measures the box
  // the two labels actually live in. A viewport media query cannot: the format clamps the whole figure to
  // the window's height, so in a short window the plot shrinks while the viewport stays wide, and a
  // width-based breakpoint never fires at the size where the labels collide.
  const bandFraction = (crossingPoint ? crossingPoint.y - end.y : 0) / frame.height;
  const boxOf = (name: string) =>
    leadOf(registerOf(direction, name, { family: "chart" })) + LABEL_PADDING_Y_PX * 2;

  // THE NOTE IS HELD TO ONE LINE, AND THAT IS WHY THE ARITHMETIC ABOVE IS TRUE. `noteAnchor` lets a label
  // wrap rather than run off the frame, which is right for a long note and wrong for this one: under
  // `nocturne` the annot register is UPPERCASE with 1.8 px of tracking, the note laid itself out in two
  // lines, and a box twice as tall as the one this arithmetic assumed overlapped the end label by 2.4 px at
  // 479 and 480 — measured on the delivered file. A four-word note broken across two lines is also worse
  // composition than the same note on one. So it is `nowrap`, and the horizontal safety `noteAnchor` was
  // protecting is RE-ESTABLISHED here as a refusal rather than dropped: the note is centred on its own
  // point, so half of it hangs into whichever side is shorter, and that half has to fit the narrowest plot
  // this format is verified at. Measured across the three filed directions, the widest this note renders is
  // 116 px (nocturne, uppercase and tracked) against 82 px of space each side at 320 px — so it fits with
  // room, and a direction that changed that stops the render instead of shipping a run of type off the
  // frame.
  const noteHalfWidthPx = measure(crossingNote, measurable(direction, "annot")) / 2;
  const crossingFraction = crossingPoint ? crossingPoint.x / frame.width : 0.5;
  const shorterSide = Math.min(crossingFraction, 1 - crossingFraction) * NARROWEST_PLOT_PX;
  if (noteHalfWidthPx > shorterSide)
    throw new Error(
      `"${crossingNote}" renders ${(noteHalfWidthPx * 2).toFixed(0)}px wide in this direction's annot ` +
        `register, so half of it (${noteHalfWidthPx.toFixed(0)}px) does not fit the ` +
        `${shorterSide.toFixed(0)}px it has beside its own point on a ${NARROWEST_PLOT_PX}px plot — it ` +
        `would run off the frame, or wrap and collide with the end label`,
    );
  const flipBelowPx =
    bandFraction > 0
      ? Math.ceil(
          (NOTE_LIFT_PX + boxOf("annot") + boxOf("value") / 2 + NOTE_LIFT_PX) / bandFraction,
        )
      : 0;

  return (
    <figure
      className="chart-figure"
      style={{
        ["--ground" as string]: ground,
        ["--accent" as string]: accent,
        ["--ink" as string]: ink,
        ["--muted" as string]: muted,
        ...figureVars(regs),
      }}
    >
      {/* THE ONE PLACEMENT THIS COMPONENT CANNOT DECIDE AT BUILD TIME, handed to the one layer that can. A
          build-time nudge cannot fix the crossing note / end label collision: the component knows the
          canonical box and never the rendered height, so any px it chose would be right at one size. The
          container query knows, and the size it is asked at is computed above from THIS direction's own
          leading rather than typed. `crossingTransform` is carried into BOTH rules so the horizontal
          anchoring survives the vertical flip — a transform string that dropped it would take the
          anchoring with it, and browsers drop a transform whole when one of its functions is invalid. */}
      <style
        dangerouslySetInnerHTML={{
          __html:
            `.chart-plot .overlay{container-type:size;container-name:plot}` +
            `.crossing-note{transform:${crossingTransform} translateY(-100%) translateY(-${NOTE_LIFT_PX}px)}` +
            `@container plot (max-height:${flipBelowPx}px){` +
            `.crossing-note{transform:${crossingTransform} translateY(${NOTE_LIFT_PX}px)}}`,
        }}
      />

      <div className="chart-header">
        <p className="chart-eyebrow" style={{ ...regs.eyebrow, margin: "0 0 6px" }}>{eyebrow}</p>
        <h2 className="chart-title" style={{ ...regs.display, margin: "0 0 6px" }}>{title}</h2>
        <p className="chart-caveat" style={{ ...regs.body, margin: 0 }}>{caveat}</p>
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: `${yGutterPx}px`,
          ["--x-axis-h" as string]: `${frame.xAxisRowPx}px`,
          aspectRatio: `${yGutterPx + frame.width} / ${frame.height + frame.xAxisRowPx}`,
        }}
      >
        <div className="y-axis" style={{ pointerEvents: "none" }}>
          {tickValues.map((value, i) => (
            <span
              key={value}
              className="axis-label y"
              style={{ ...regs.axis, top: `${pct(y(value), frame.height)}%` }}
            >
              {tickLabels[i]}
            </span>
          ))}
        </div>

        {/* GEOMETRY ONLY below — no `<text>` at all. `preserveAspectRatio="none"` lets this stretch to
            exactly whatever box the grid gives it at any container width. */}
        <svg
          // Named `group`, not `img`: the root used to come back from Chrome's AX tree as `SvgRoot` with
          // `name: ""`, and `group` names it without raising the ARIA children-presentational question.
          role="group"
          aria-label={title}
          xmlns="http://www.w3.org/2000/svg"
          className="chart"
          viewBox={`0 0 ${frame.width} ${frame.height}`}
          preserveAspectRatio="none"
        >
          <desc>{alt}</desc>
          <rect x={0} y={0} width={frame.width} height={frame.height} fill={ground} />

          {tickValues.map((value) =>
            // The reference's own row gets no regular gridline — the dashed rule below already marks that
            // height.
            value === referenceValue ? null : (
              <line
                key={value}
                x1={0}
                x2={frame.width}
                y1={y(value)}
                y2={y(value)}
                stroke={grid}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ),
          )}

          {/* THE LEVEL THE CLAIM IS MEASURED FROM, drawn across the whole frame so the climb is read
              against something the reader can see rather than against a number in the title. */}
          <line
            x1={0}
            x2={frame.width}
            y1={referenceY}
            y2={referenceY}
            stroke={rule}
            strokeWidth={direction.stroke?.rule ?? 1}
            strokeDasharray="5 4"
            vectorEffect="non-scaling-stroke"
          />

          <path
            d={path}
            fill="none"
            stroke={stroke}
            strokeWidth={direction.stroke?.series ?? 2}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />

          {crossingPoint && <circle cx={crossingPoint.x} cy={crossingPoint.y} r={3.5} fill={rule} />}
          <circle cx={end.x} cy={end.y} r={4} fill={stroke} />

          {/* Interaction layer: every one of the readings is `tabIndex={0}` with its own
              `aria-label`/`data-detail` baked in at build time — reachable with the script absent
              entirely. `assets/interaction.mjs` wires hover/tap/keyboard via nearest-x resolution over the
              shared `.hit-area`. */}
          {points.map((p) => {
            // Looked up BY YEAR, never by index. The geometry is built from the same array in the same
            // order, so an index would work today and go on working silently the day something filters or
            // sorts one of the two — which is how a chart ends up confidently answering with the wrong
            // year's reading.
            const detail = detailByYear.get(p.year);
            if (detail === undefined) throw new Error(`no answer was built for ${p.year}`);
            return (
              <circle
                key={p.year}
                className="pt"
                cx={p.x}
                cy={p.y}
                r={5}
                fill="transparent"
                stroke="none"
                tabIndex={0}
                role="img"
                // The same reading a pointer gets, spoken. A keyboard reader who never sees the tooltip is
                // not given the thinner half of the answer.
                aria-label={detail.replace(/ · /g, ", ")}
                data-year={p.year}
                data-detail={detail}
              />
            );
          })}
          <rect
            className="hit-area"
            x={0}
            y={0}
            width={frame.width}
            height={frame.height}
            fill="transparent"
            pointerEvents="all"
          />
        </svg>

        {/* HTML overlay — the same grid cell as the `<svg>`, so a `%` position lands on the exact point it
            annotates at any width. Never toggled by the script: the reference rule's label, the crossing
            marker's label and the subject's end label are the argument, already stated. */}
        <div className="overlay" aria-hidden="true">
          {/* Anchored at the RIGHT end of the dashed rule, not the left: 1950 IS this series' first
              reading, so the curve starts exactly at the reference height at the plot's left edge, and a
              label there collided with both the curve's own start and the y-axis tick label beneath it.
              The curve is well clear of the reference line by the right edge, for every year in this
              series. */}
          <span
            className="note"
            style={{
              ...regs.annot,
              color: label,
              ...noteAnchor(100),
              top: `${pct(referenceY, frame.height)}%`,
              transform: "translateX(0) translateY(-100%) translateY(-4px)",
              textAlign: "right",
            }}
          >
            {referenceNote}
          </span>
          {crossingPoint && (
            <span
              className="note crossing-note"
              style={{
                ...regs.annot,
                color: label,
                ...crossingAnchor,
                top: `${pct(crossingPoint.y, frame.height)}%`,
                // See `noteHalfWidthPx` above: one line, and refused at build time if it cannot be.
                whiteSpace: "nowrap",
                maxWidth: "none",
              }}
            >
              {crossingNote}
            </span>
          )}
          <span
            className="end-label"
            style={{
              ...regs.value,
              color: stroke,
              left: `${pct(end.x, frame.width)}%`,
              top: `${pct(end.y, frame.height)}%`,
              transform: "translate(-100%, -50%) translateX(-10px)",
            }}
          >
            {endLabel}
          </span>
        </div>

        <div className="x-axis">
          {xTicks.map((year) => {
            const p = points.find((pt) => pt.year === year);
            if (!p) return null;
            return (
              <span
                key={year}
                className="axis-label x"
                style={{ ...regs.axis, left: `${pct(p.x, frame.width)}%` }}
              >
                {year}
              </span>
            );
          })}
        </div>
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "10px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
