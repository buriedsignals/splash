/**
 * Switzerland's annual CO₂ since 1858, drawn as a filled area THROUGH the design base and delivered
 * as an interactive page. The first `area` beat in this tree's WEB format, and the first web beat of
 * any type that a filed direction governs.
 *
 * WHAT THE WEB ADDS TO THIS FORM, AND IT IS NOT DECORATION. An area chart's claim is that the
 * SURFACE is a quantity — the stock a rate accumulates to. A static plate can state that claim and
 * label perhaps six of its 167 readings; it cannot let a reader check the accumulation anywhere else.
 * So the one thing this page adds is exactly the reading the plate had to omit: every year answers
 * with its own annual figure AND with the share of the whole surface that lies to its left. That is
 * detail, not repetition — the static beat prints the total and the midpoint and nothing between.
 *
 * THE FLUID FRAME (`chart-web/references/web-discipline.md`, "Responsive behaviour"). The `<svg>`
 * holds GEOMETRY ONLY — not one `<text>` — and stretches with its container under
 * `preserveAspectRatio="none"`. Every word is HTML positioned by percentage over the same box and
 * sized in fixed CSS pixels that never track the viewBox. Those pixel sizes are not this file's to
 * choose: they are the DIRECTION's own register table, translated by `#shared/design-base/web.mjs`.
 *
 * THE ZERO BASELINE IS CHECKED, NOT COMMENTED. The moment a series is filled, every clipped tonne
 * becomes surface a reader integrates, so this component throws rather than draw one pixel over a
 * non-zero base. The static sibling makes the same refusal for the same reason; a comment does not
 * fail.
 *
 * `two-states-of-one-measure-are-one-hue-at-two-chromas` — the surface is partitioned at the year the
 * cumulative total crosses its own half, and the two halves are ONE hue at two chromas, never two
 * hues. They are two states of one quantity; two hues would make them two categories.
 */

import {
  mix,
  contrast,
  adjustToContrast,
  NON_TEXT_CONTRAST_MIN,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars, noteAnchor } from "#shared/design-base/web.mjs";

/** The canonical geometry the plot's `aspect-ratio` is derived from — proportions only. Never a
 *  rendered pixel cap: the delivered `<svg>` has no width or height of its own. */
export const FRAME = { width: 860, height: 380, xAxisRowPx: 30 };

export type Reading = {
  year: number;
  mt: number;
  /** The same figure written the way the page prints it — the component never formats a number. */
  label: string;
  share: string;
};

const pct = (value: number, extent: number) => (value / extent) * 100;

export function DirectedAreaWeb({
  readings,
  midYear,
  totalMt,
  shareAfter,
  yTicks,
  xTicks,
  title,
  eyebrow,
  caveat,
  source,
  alt,
  unit,
  midNote,
  reading,
  direction,
  treatments,
  ground,
  accent,
  ink,
  muted,
  grid,
  measure,
}: {
  readings: Reading[];
  midYear: number;
  totalMt: number;
  shareAfter: number;
  yTicks: number[];
  xTicks: number[];
  title: string;
  eyebrow: string;
  caveat: string;
  source: string;
  alt: string;
  unit: string;
  midNote: string;
  reading: string;
  direction: any;
  treatments: string[];
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
  measure: (text: string, style: Record<string, unknown>) => number;
}) {
  const on = (id: string) => treatments.includes(id);
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });

  // ── the colour rule, and it is the direction's own accent or nothing ──────────────────────────
  let tint = mix(accent, ground, 0.62);
  if (contrast(tint, ground) < NON_TEXT_CONTRAST_MIN) {
    const lifted = adjustToContrast(tint, ground, NON_TEXT_CONTRAST_MIN);
    if (!lifted)
      throw new Error(
        `the tinted half of the surface cannot be told from the ground: nothing between ` +
          `${accent} and the direction's poles clears ${NON_TEXT_CONTRAST_MIN}:1 against ${ground}`,
      );
    tint = lifted;
  }
  const baseline = mix(ground, ink, 0.75);
  const rule = mix(ground, ink, 0.5);

  // ── scales ────────────────────────────────────────────────────────────────────────────────────
  const firstYear = readings[0].year;
  const lastYear = readings[readings.length - 1].year;
  // HEADROOM, and it is not taste. The top tick's own label is positioned at its own height and
  // centred on it, so a scale whose maximum IS the top tick puts half that label above the plot's
  // own cell — measured on the first render of this beat, where `50` sat on top of the caveat line.
  // 6 % of the frame is enough to seat it and small enough that the surface still fills the box.
  const HEADROOM = 1.06;
  const top = yTicks[yTicks.length - 1] * HEADROOM;
  if (yTicks[0] !== 0)
    throw new Error(
      `an area is a QUANTITY: its value axis starts at zero or the surface lies. The ticks handed ` +
        `in start at ${yTicks[0]}`,
    );
  const x = (year: number) =>
    ((year - firstYear) / (lastYear - firstYear)) * FRAME.width;
  const y = (mt: number) => FRAME.height - (mt / top) * FRAME.height;

  const points = readings.map((r) => ({ ...r, cx: x(r.year), cy: y(r.mt) }));
  const surface = (slice: typeof points) =>
    slice.length < 2
      ? ""
      : `M ${slice[0].cx} ${FRAME.height} ` +
        slice.map((p) => `L ${p.cx} ${p.cy}`).join(" ") +
        ` L ${slice[slice.length - 1].cx} ${FRAME.height} Z`;

  const splitAt = points.findIndex((p) => p.year === midYear);
  if (splitAt < 1)
    throw new Error(`the midpoint year ${midYear} is not a reading this series carries`);
  const earlier = points.slice(0, splitAt + 1);
  const later = points.slice(splitAt);

  // The ONE measurement this format still makes in node: how wide the y-label column must be. A
  // gutter guessed at one direction's axis size clips at another's.
  const yGutterPx =
    Math.ceil(
      Math.max(
        ...yTicks.map((t) =>
          measure(`${t}`, {
            fontSize: Number.parseFloat(regs.axis.fontSize as string),
            fontWeight: regs.axis.fontWeight,
            fontFamily: String(regs.axis.fontFamily).split(",")[0].replace(/"/g, ""),
          }),
        ),
      ),
    ) + 16;

  const last = points[points.length - 1];
  const midPoint = points[splitAt];
  const noteInk = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;

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
        <p className="chart-eyebrow" style={{ ...regs.eyebrow, margin: "0 0 6px" }}>
          {eyebrow}
        </p>
        <h2 className="chart-title" style={{ ...regs.display, margin: "0 0 6px" }}>
          {title}
        </h2>
        <p className="chart-caveat" style={{ ...regs.body, margin: 0 }}>
          {caveat}
        </p>
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: `${yGutterPx}px`,
          ["--x-axis-h" as string]: `${FRAME.xAxisRowPx}px`,
          aspectRatio: `${FRAME.width + yGutterPx} / ${FRAME.height + FRAME.xAxisRowPx}`,
        }}
      >
        <div className="y-axis">
          {yTicks.map((t) => (
            <span
              key={t}
              className="axis-label y"
              style={{ ...regs.axis, top: `${pct(y(t), FRAME.height)}%` }}
            >
              {t}
            </span>
          ))}
        </div>

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

          {yTicks.slice(1).map((t) => (
            <line
              key={t}
              x1={0}
              x2={FRAME.width}
              y1={y(t)}
              y2={y(t)}
              stroke={grid}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* THE SURFACE, in two chromas of one hue. The earlier half first, so the later half's
              own edge is the one that reads against it. */}
          <path d={surface(earlier)} fill={tint} />
          <path d={surface(later)} fill={accent} />
          <path
            d={`M ${points.map((p) => `${p.cx} ${p.cy}`).join(" L ")}`}
            fill="none"
            stroke={adjustToContrast(accent, ground, NON_TEXT_CONTRAST_MIN) ?? accent}
            strokeWidth={direction.stroke?.series ?? 1.8}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          {/* The partition itself, drawn where the cumulative total crosses its own half. It is a
              LEVEL on the x axis, not a reading, so it is furniture and never filtered. */}
          <line
            x1={midPoint.cx}
            x2={midPoint.cx}
            y1={0}
            y2={FRAME.height}
            stroke={rule}
            strokeWidth={direction.stroke?.rule ?? 0.8}
            strokeDasharray="5 4"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={0}
            x2={FRAME.width}
            y1={FRAME.height}
            y2={FRAME.height}
            stroke={baseline}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />

          {/* Every reading, reachable by pointer, tap and keyboard, each carrying the detail the
              static plate had no room to print. Invisible at rest — the stylesheet paints them on
              hover and on focus. */}
          {points.map((p) => (
            <circle
              key={p.year}
              className="pt"
              cx={p.cx}
              cy={p.cy}
              r={4}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              aria-label={`${p.year} : ${p.label} ${unit}, ${p.share} % du total cumulé`}
              data-detail={`${p.year} · ${p.label} ${unit} · ${p.share} % du total émis à cette date`}
            />
          ))}
          <rect
            className="hit-area"
            x={0}
            y={0}
            width={FRAME.width}
            height={FRAME.height}
            fill="transparent"
            pointerEvents="all"
          />
        </svg>

        <div className="overlay" aria-hidden="true">
          <span
            className="note"
            style={{
              ...regs.annot,
              color: noteInk,
              ...noteAnchor(pct(midPoint.cx, FRAME.width)),
              top: "6%",
            }}
          >
            {midNote}
          </span>
          <span
            className="end-label"
            style={{
              ...regs.value,
              left: `${pct(last.cx, FRAME.width)}%`,
              top: `${pct(last.cy, FRAME.height)}%`,
            }}
          >
            {`${last.year} · ${last.label}`}
          </span>
        </div>

        <div className="x-axis">
          {xTicks.map((year) => (
            <span
              key={year}
              className="axis-label x"
              style={{ ...regs.axis, left: `${pct(x(year), FRAME.width)}%` }}
            >
              {year}
            </span>
          ))}
        </div>
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "10px 0 0" }}>
        {reading}
      </p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>
        {source}
      </p>
      <p className="chart-total" style={{ ...regs.body, margin: "4px 0 0" }}>
        {`Total ${firstYear}–${lastYear} : ${totalMt} Mt. ${shareAfter} % de ce total a été émis à partir de ${midYear}.`}
      </p>
    </figure>
  );
}
