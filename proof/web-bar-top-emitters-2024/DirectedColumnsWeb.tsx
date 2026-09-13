/**
 * The ten countries that emitted the most CO₂ in 2024, drawn as columns THROUGH the design base and
 * delivered as an interactive page. The `bar and column` beat of this tree's web format.
 *
 * WHAT THE WEB ADDS TO A RANKING, AND WHY IT IS NOT THE PLATE REPEATED. Ten bars is few enough that
 * a static plate can label every one, so "hover to see the value" would be the same numbers a second
 * time — the repetition `web-discipline.md` refuses outright. The reading this page adds is a
 * DERIVED one the plate has no room for: for every country, how many of the countries BELOW it in
 * the same ranking you must add together before they match it. That is the headline's own arithmetic
 * — China against the next five — asked of all ten, and it is computed server-side over the full
 * 215-country ranking, not over the ten drawn.
 *
 * `every-bar-labelled-lets-the-axis-go` — every column prints its own number, so the page carries a
 * zero baseline and a stated unit instead of a value axis. A length encoding still needs its zero
 * and it has one; what it does not need is a ruler nobody reads once every bar is written.
 *
 * `accent-marks-the-thread` — one column is the subject and carries the direction's accent. The
 * other nine are one neutral step off the direction's own ground: they are the comparison, and a
 * ranking where every bar shouts has no subject.
 *
 * THIS TYPE'S TRAP, IN THE FORM IT TAKES HERE. `references/types/bar-and-column.md` names one trap: a
 * value label printed inside or against a coloured bar needs its contrast measured against THAT EXACT
 * FILL, and a naive luminance threshold mis-picks white on a mid-toned hue. Its literal form is absent
 * by construction — every value is printed OUTSIDE its column, on the ground, which is the side-step
 * the static sibling records — so `inkOnFill`, the repertoire's own implementation of the remedy, is
 * not reached for and is not claimed. Its REASON survives, and it was open: three things here are set
 * in the accent as TYPE (the eyebrow, whose register reads its ink from the accent; the subject's value
 * label; the subject's own name on the x-axis), and an accent is chosen to clear the 3:1 mark floor
 * while 11px type is held to 4.5:1. Nothing measured the difference. It is measured below, and
 * ASSERTED rather than adjusted — `adjustToContrast` walks a colour 2 % toward a pole even when it
 * already passes, so adjusting would darken three accents that are correct.
 *
 * THE BRACKET IS HTML, NOT A PATH. Its clearance is a distance a READER sees, and this `<svg>` carries
 * `preserveAspectRatio="none"`, so a constant in `viewBox` units is not a constant in CSS pixels: the
 * 26 units this bracket used to sit above its tallest column are 42 px on a 682 px plot and 8.5 px on
 * the 137 px plot a 320 px window produces. The caption rides on the bracket and the value label it has
 * to clear is a fixed CSS height the direction decides, so the two collided at every width at or below
 * 480 px. Three borders on a positioned `div` in the overlay, at `direction.stroke.rule` width exactly
 * as the path was, anchored by `%` to the tallest spanned column's own top and lifted by that
 * direction's own `leadOf(value)` plus one gap — the same distance at 320 px and at 1600 px.
 */

import {
  mix,
  adjustToContrast,
  assertLegible,
  TEXT_CONTRAST_MIN,
  NON_TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import { registerOf, leadOf } from "#shared/design-base/register.mjs";
import { webRegisters, figureVars, measurable, noteAnchor } from "#shared/design-base/web.mjs";

export const FRAME = { width: 900, height: 420, xAxisRowPx: 34 };

/** The vertical padding the format's shared stylesheet gives `.note` and `.end-label`
 *  (`padding: 1px 4px`), top and bottom. Part of every label's real box height, so part of any
 *  arithmetic that decides whether two of them clear each other. */
const LABEL_PADDING_Y_PX = 1;

/** One gap, in CSS pixels, stated once and used for both clearances the bracket needs: above the
 *  value label it has to clear, and between the bracket's own rule and its caption. */
const GAP_PX = 8;

/** How far the bracket's two end ticks hang below its rule, in CSS pixels. */
const TICK_PX = 8;

/** How far each value label stands off the top of its own column, in CSS pixels. Stated once here
 *  because the bracket's lift is measured from the TOP of that label, not from the bar. */
const LABEL_OFFSET_PX = 4;

/** The horizontal padding the format's shared stylesheet gives `.note` (`padding: 1px 4px`), both
 *  sides — part of the caption's real width, so part of the refusal below. */
const LABEL_PADDING_X_PX = 4;

/** The narrowest plot this format is verified at, in CSS pixels. Measured, not chosen: at a 320 px
 *  viewport the figure's own fixed 24 px inset each side leaves 272 px, and this beat's y-gutter is
 *  zero (it draws no value axis). It is the width the caption's ONE-LINE guard is held against,
 *  because a caption that fits every wider frame and runs off the narrowest one is a defect nobody
 *  sees on a laptop. */
const NARROWEST_PLOT_PX = 272;

export type Column = {
  code: string;
  name: string;
  gt: number;
  label: string;
  /** The detail this page exists to add — already a sentence, formatted in the runner. */
  detail: string;
};

const pct = (value: number, extent: number) => (value / extent) * 100;

export function DirectedColumnsWeb({
  columns,
  subject,
  measure,
  bracket,
  top,
  title,
  eyebrow,
  caveat,
  source,
  alt,
  unit,
  reading,
  bracketNote,
  direction,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  columns: Column[];
  subject: string;
  /** `measureText`, handed in by `renderWeb` — one implementation of the text-measurement rule per
   *  render, never a copy per beat. */
  measure: (
    text: string,
    font: { fontSize: number; fontWeight?: number; fontFamily?: string },
  ) => number;
  bracket: { from: number; to: number; label: string };
  top: number;
  title: string;
  eyebrow: string;
  caveat: string;
  source: string;
  alt: string;
  unit: string;
  reading: string;
  bracketNote: string;
  direction: any;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
}) {
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });
  if (!columns.some((c) => c.code === subject))
    throw new Error(`the subject ${subject} is not among the columns drawn`);

  // THE TRAP'S REASON, CLOSED BY MEASUREMENT — see the header. The accent is not only a fill here: it
  // sets the eyebrow, the subject's value and the subject's name on the axis. Type is held to 4.5:1,
  // a mark to 3:1, and a direction that clears the second does not automatically clear the first.
  assertLegible(accent, ground, {
    role: "text",
    where: `${direction.id ?? "this direction"}'s accent, which this beat sets type in`,
  });

  // The nine that are not the subject. One neutral, taken to the non-text floor against the ground
  // so a column is never a shape the reader has to guess at.
  let neutral = mix(ground, ink, 0.42);
  neutral = adjustToContrast(neutral, ground, NON_TEXT_CONTRAST_MIN) ?? neutral;
  const baseline = mix(ground, ink, 0.75);

  const band = FRAME.width / columns.length;
  const barW = band * 0.62;
  // HEADROOM for the printed value that sits on top of each column, and for the bracket above the
  // second group. Measured, not chosen: the value register's own size plus the bracket's two rows.
  const scaleTop = top * 1.22;
  const y = (gt: number) => FRAME.height - (gt / scaleTop) * FRAME.height;
  const cx = (i: number) => band * i + band / 2;

  // The bracket hangs off the TALLEST column it spans — the only one of the five whose own value label
  // it could ever collide with — and its lift is that label's real box plus one gap, in CSS pixels.
  const spanned = columns.slice(bracket.from, bracket.to + 1);
  const bracketAnchorY = Math.min(...spanned.map((c) => y(c.gt)));
  const valueBoxPx =
    leadOf(registerOf(direction, "value", { family: "chart" })) + LABEL_PADDING_Y_PX * 2;
  const bracketLiftPx = valueBoxPx + LABEL_OFFSET_PX + GAP_PX;
  const bracketLeft = cx(bracket.from) - barW / 2;
  const bracketRight = cx(bracket.to) + barW / 2;
  const rule = mix(ground, ink, 0.55);
  const ruleWidth = direction.stroke?.rule ?? 0.8;
  // THE CAPTION IS ANCHORED TO THE BRACKET'S OWN LEFT EDGE AND HELD TO ONE LINE. Centred over the
  // bracket's middle, it wrapped: `noteAnchor` caps a label at `min(46%, 24em)` so it cannot run off
  // the frame, which is right for a long note and wrong for this one. At 320 px the two-line box was
  // taller than the room between the bracket and the top of the plot, so it climbed OUT of the plot
  // and landed on the subject's own value label — measured at 4.2 x 20.0 px of overlap on crème, and
  // on all three directions. A four-word caption broken across two lines is also worse composition
  // than the same caption on one.
  //
  // The horizontal safety `noteAnchor`'s cap was providing is RE-ESTABLISHED as a refusal rather than
  // dropped: the caption starts at the bracket's left end and has to fit, on one line, in what is left
  // of the narrowest plot this format is verified at. Measured across the three filed directions the
  // caption sets 182.5 px (crème, 13 px Merriweather), 144.5 px (nocturne, uppercase and tracked) and
  // 148.9 px (rapport) against 240 px of room — so it fits with margin, and a direction that changed
  // that stops the render instead of shipping a run of type off the frame.
  const noteXPct = pct(bracketLeft, FRAME.width);
  const noteAnchoring = noteAnchor(noteXPct);
  const noteWidthPx = measure(bracketNote, measurable(direction, "annot")) + LABEL_PADDING_X_PX * 2;
  const noteRoomPx = (1 - noteXPct / 100) * NARROWEST_PLOT_PX;
  if (noteWidthPx > noteRoomPx)
    throw new Error(
      `"${bracketNote}" sets ${noteWidthPx.toFixed(0)}px on one line in this direction's annot ` +
        `register, and the bracket it captions starts ${noteXPct.toFixed(1)} % into the plot — so it ` +
        `has ${noteRoomPx.toFixed(0)}px of a ${NARROWEST_PLOT_PX}px plot to sit in and would run off ` +
        "the frame, or wrap and climb out of the plot onto the subject's own value label",
    );

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
      <div className="chart-header">
        <p className="chart-eyebrow" style={{ ...regs.eyebrow, margin: "0 0 6px" }}>{eyebrow}</p>
        <h2 className="chart-title" style={{ ...regs.display, margin: "0 0 6px" }}>{title}</h2>
        <p className="chart-caveat" style={{ ...regs.body, margin: 0 }}>{caveat}</p>
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: "0px",
          ["--x-axis-h" as string]: `${FRAME.xAxisRowPx}px`,
          aspectRatio: `${FRAME.width} / ${FRAME.height + FRAME.xAxisRowPx}`,
        }}
      >
        <div className="y-axis" />
        <svg
          role="group"
          aria-label={title}
          xmlns="http://www.w3.org/2000/svg"
          className="chart"
          viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
          preserveAspectRatio="none"
        >
          <desc>{alt}</desc>
          <rect x={0} y={0} width={FRAME.width} height={FRAME.height} fill={ground} />

          {columns.map((c, i) => (
            <rect
              key={c.code}
              x={cx(i) - barW / 2}
              y={y(c.gt)}
              width={barW}
              height={FRAME.height - y(c.gt)}
              fill={c.code === subject ? accent : neutral}
            />
          ))}

          <line
            x1={0}
            x2={FRAME.width}
            y1={FRAME.height}
            y2={FRAME.height}
            stroke={baseline}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />

          {columns.map((c, i) => (
            <circle
              key={c.code}
              className="pt"
              cx={cx(i)}
              cy={y(c.gt)}
              r={5}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              aria-label={`${c.name} : ${c.label} ${unit}. ${c.detail}`}
              data-detail={`${c.name} · ${c.label} ${unit} · ${c.detail}`}
            />
          ))}
          <rect className="hit-area" x={0} y={0} width={FRAME.width} height={FRAME.height} fill="transparent" pointerEvents="all" />
        </svg>

        <div className="overlay" aria-hidden="true">
          {columns.map((c, i) => (
            <span
              key={c.code}
              className="end-label"
              style={{
                ...regs.value,
                color: c.code === subject ? accent : adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink,
                left: `${pct(cx(i), FRAME.width)}%`,
                top: `${pct(y(c.gt), FRAME.height)}%`,
                transform: `translate(-50%, -100%) translateY(-${LABEL_OFFSET_PX}px)`,
              }}
            >
              {c.label}
            </span>
          ))}
          {/* THE BRACKET — the headline's own comparison, drawn where it is made. It spans the
              columns it adds up and nothing else, so a reader can count the bars under it. Three
              borders rather than four: the bottom edge is open, which is what makes it a bracket
              over the group instead of a box around it. `top` is the tallest spanned column's own
              height as a percentage of the plot, so it follows the geometry; the lift off it is in
              CSS pixels, so it is the same clearance at every width in every direction. */}
          <div
            className="bracket"
            style={{
              position: "absolute",
              left: `${pct(bracketLeft, FRAME.width)}%`,
              width: `${pct(bracketRight - bracketLeft, FRAME.width)}%`,
              top: `${pct(bracketAnchorY, FRAME.height)}%`,
              height: `${TICK_PX}px`,
              transform: `translateY(-${bracketLiftPx}px)`,
              borderTop: `${ruleWidth}px solid ${rule}`,
              borderLeft: `${ruleWidth}px solid ${rule}`,
              borderRight: `${ruleWidth}px solid ${rule}`,
            }}
          />
          <span
            className="note"
            style={{
              ...regs.annot,
              ...noteAnchoring,
              whiteSpace: "nowrap",
              maxWidth: "none",
              top: `${pct(bracketAnchorY, FRAME.height)}%`,
              transform:
                `${noteAnchoring.transform} translateY(-100%) ` +
                `translateY(-${bracketLiftPx + GAP_PX}px)`,
            }}
          >
            {bracketNote}
          </span>
        </div>

        <div className="x-axis">
          {columns.map((c, i) => (
            <span
              key={c.code}
              className="axis-label x"
              style={{
                ...regs.axis,
                left: `${pct(cx(i), FRAME.width)}%`,
                color: c.code === subject ? accent : (regs.axis.color as string),
                fontWeight: c.code === subject ? 700 : regs.axis.fontWeight,
              }}
            >
              {c.name}
            </span>
          ))}
        </div>
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "10px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
