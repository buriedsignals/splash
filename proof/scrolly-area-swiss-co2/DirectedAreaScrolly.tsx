/**
 * Switzerland's annual CO₂ since 1858, drawn as a filled area THROUGH the design base and CHOREOGRAPHED
 * by the scroll. The `area` type in the scrolly format: the subject of `static-area-swiss-co2`, from its
 * data, claim and colour rules, told with the gestures a scroll can make
 * (`scrolly/references/directed-type-choreography.md`):
 *
 *   trace    — the curve draws itself year by year: the height is a rate;
 *   name     — the 1973 peak and the last reading named on the curve;
 *   fill     — the surface fills left to right while the stock counts up to its total;
 *   split    — the rule at the midpoint year, the earlier half turning to its tint;
 *   rescale  — the x axis closes in on the recent half, 38 years filling the frame 129 years took;
 *   pull back — the whole series again, both halves named.
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: the base is zero or the component throws; one hue at two
 * chromas for the two halves; the accent spent on the surface; the midpoint year on its rule; the last
 * reading in the surface's colour beside the end of the curve.
 *
 * THE FLUID FRAME. The `<svg>` holds geometry only and stretches with the box; the rescale is its
 * viewBox travelling, so the geometry is never rebuilt and a stroke never thickens. Every word is HTML
 * positioned in percentages by `area-drive.mjs`, which maps a year through the SAME travelling window.
 * What is rendered here is the last card's picture, which is what a reader without a script gets.
 */

import type { CSSProperties } from "react";
import {
  mix,
  contrast,
  adjustToContrast,
  NON_TEXT_CONTRAST_MIN,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";

export const VIEWBOX = { width: 1000, height: 500 } as const;

export type Reading = { year: number; mt: number };
export type Half = { from: number; to: number; share: string };
type Style = Record<string, string | number>;

export function DirectedAreaScrolly({
  readings,
  halves,
  midpoint,
  peak,
  yTicks,
  xTicks,
  zoomTicks,
  zoomFrom,
  unit,
  endLabel,
  peakLabel,
  stockTotal,
  stockSuffix,
  alt,
  regs,
  gutterPx,
  endGutterPx,
  pad,
  stroke,
  ground,
  accent,
  ink,
  muted,
}: {
  readings: Reading[];
  halves: [Half, Half];
  midpoint: number;
  peak: Reading;
  yTicks: number[];
  xTicks: number[];
  zoomTicks: number[];
  zoomFrom: number;
  unit: string;
  endLabel: string;
  peakLabel: string;
  stockTotal: string;
  stockSuffix: string;
  alt: string;
  regs: Record<
    "display" | "eyebrow" | "body" | "axis" | "annot" | "value",
    Style
  >;
  gutterPx: number;
  endGutterPx: number;
  pad: number;
  stroke: { series?: number; rule?: number; hairline?: number };
  ground: string;
  accent: string;
  ink: string;
  muted: string;
}) {
  if (yTicks[0] !== 0)
    throw new Error(
      `a filled area drawn over a baseline of ${yTicks[0]} claims a surface the data does not have. ` +
        `Either the base is zero or the fill measures nothing.`,
    );
  const first = readings[0].year;
  const last = readings[readings.length - 1];
  const top = Math.max(...readings.map((r) => r.mt)) * 1.08;
  const X = (year: number) =>
    ((year - first) / (last.year - first)) * VIEWBOX.width;
  const Y = (mt: number) => VIEWBOX.height - (mt / top) * VIEWBOX.height;
  const xPct = (year: number) =>
    `${((year - first) / (last.year - first)) * 100}%`;
  const yPct = (mt: number) => `${(1 - mt / top) * 100}%`;

  let tint = mix(accent, ground, 0.62);
  if (contrast(tint, ground) < NON_TEXT_CONTRAST_MIN) {
    const lifted = adjustToContrast(tint, ground, NON_TEXT_CONTRAST_MIN);
    if (!lifted)
      throw new Error(
        `the tinted half of the surface cannot be told from the ground: nothing between ${accent} and ` +
          `the direction's poles clears ${NON_TEXT_CONTRAST_MIN}:1 against ${ground}`,
      );
    tint = lifted;
  }
  const rule = mix(ground, ink, 0.55);
  const baseline = mix(ground, ink, 0.75);
  const hairline = mix(ground, ink, 0.12);
  const accentInk =
    adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const inkOnGround = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const lineInk =
    adjustToContrast(accent, ground, NON_TEXT_CONTRAST_MIN) ?? accent;
  const onTint = adjustToContrast(ink, tint, TEXT_CONTRAST_MIN) ?? ink;
  const onFull = adjustToContrast(ground, accent, TEXT_CONTRAST_MIN) ?? ground;

  const surface = (span: Reading[]) =>
    `M ${X(span[0].year)} ${VIEWBOX.height} ` +
    span.map((r) => `L ${X(r.year)} ${Y(r.mt)}`).join(" ") +
    ` L ${X(span[span.length - 1].year)} ${VIEWBOX.height} Z`;
  const earlier = readings.filter((r) => r.year <= midpoint);
  const later = readings.filter((r) => r.year >= midpoint);
  const midMt = readings.find((r) => r.year === midpoint)?.mt;
  if (midMt === undefined)
    throw new Error(
      `the midpoint year ${midpoint} is not a reading this series carries`,
    );

  const label = (extra: CSSProperties): CSSProperties => ({
    position: "absolute",
    whiteSpace: "nowrap",
    ...extra,
  });
  const chip: CSSProperties = { background: ground, padding: "1px 4px" };

  return (
    <div
      role="img"
      aria-label={alt}
      data-series={JSON.stringify({
        first,
        last: last.year,
        top,
        midpoint,
        zoomFrom,
        peak,
        readings,
      })}
      style={{
        position: "absolute",
        inset: 0,
        background: ground,
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr) auto",
        padding: `12px var(--prose-gutter, clamp(16px, 6vw, 56px))`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          // Wraps: on a phone the unit takes its own line rather than five words stacked beside the counter.
          flexWrap: "wrap",
          gap: "4px 12px",
          margin: "0 0 10px",
        }}
      >
        <span style={{ ...regs.annot, color: mutedInk, flex: "1 1 16em" }}>{unit}</span>
        <span
          data-part="stock"
          data-suffix={stockSuffix}
          style={{
            ...regs.value,
            color: accentInk,
            whiteSpace: "nowrap",
            marginRight: `${endGutterPx}px`,
          }}
        >
          {`${stockTotal} ${stockSuffix}`}
        </span>
      </div>

      <div style={{ position: "relative", minHeight: 0 }}>
        {yTicks.map((t) => (
          <span
            key={`y${t}`}
            style={label({
              ...regs.axis,
              color: mutedInk,
              left: 0,
              width: `${gutterPx - 8}px`,
              textAlign: "right",
              top: yPct(t),
              transform: "translateY(-50%)",
            })}
          >
            {t}
          </span>
        ))}

        <div
          data-part="plot"
          style={{
            position: "absolute",
            left: `${gutterPx}px`,
            right: `${endGutterPx}px`,
            top: 0,
            bottom: 0,
            overflow: "visible",
          }}
        >
          {/* The geometry is clipped to the plot so the rescale's travelling window never paints into
              the gutters; the words beside it sit outside the clip. */}
          <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
            <svg
              data-part="field"
              xmlns="http://www.w3.org/2000/svg"
              viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
              preserveAspectRatio="none"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
              }}
            >
              <defs>
                <clipPath id="area-fill-clip">
                  <rect
                    data-part="fill-clip"
                    x={0}
                    y={-10}
                    width={VIEWBOX.width}
                    height={VIEWBOX.height + 20}
                  />
                </clipPath>
                <clipPath id="area-line-clip">
                  <rect
                    data-part="line-clip"
                    x={0}
                    y={-10}
                    width={VIEWBOX.width}
                    height={VIEWBOX.height + 20}
                  />
                </clipPath>
              </defs>
              {yTicks.map((t) => (
                <line
                  key={`g${t}`}
                  x1={-VIEWBOX.width}
                  x2={VIEWBOX.width * 2}
                  y1={Y(t)}
                  y2={Y(t)}
                  stroke={t === 0 ? baseline : hairline}
                  strokeWidth={
                    t === 0 ? (stroke.rule ?? 1) : (stroke.hairline ?? 0.6)
                  }
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              <g clipPath="url(#area-fill-clip)">
                <path d={surface(earlier)} fill={accent} />
                <path
                  data-part="earlier-tint"
                  d={surface(earlier)}
                  fill={tint}
                />
                <path d={surface(later)} fill={accent} />
              </g>
              <path
                data-part="line"
                clipPath="url(#area-line-clip)"
                d={`M ${readings.map((r) => `${X(r.year)} ${Y(r.mt)}`).join(" L ")}`}
                fill="none"
                stroke={lineInk}
                strokeWidth={stroke.series ?? 2}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                style={{ opacity: 0 }}
              />
              <line
                data-part="rule"
                x1={X(midpoint)}
                x2={X(midpoint)}
                y1={VIEWBOX.height}
                y2={Y(midMt)}
                stroke={rule}
                strokeWidth={stroke.rule ?? 1}
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>

          <span
            data-part="rule-label"
            data-year={midpoint}
            data-mt={midMt}
            style={label({
              ...regs.value,
              color: inkOnGround,
              left: xPct(midpoint),
              top: yPct(midMt),
              transform: "translate(-50%, calc(-100% - 6px))",
            })}
          >
            {midpoint}
          </span>
          <span
            data-part="peak"
            data-year={peak.year}
            data-mt={peak.mt}
            style={label({
              ...regs.value,
              ...chip,
              color: inkOnGround,
              left: xPct(peak.year),
              top: yPct(peak.mt),
              transform: "translate(-50%, calc(-100% - 8px))",
              opacity: 0,
            })}
          >
            {peakLabel}
          </span>
          {halves.map((h, i) => (
            <span
              key={`h${i}`}
              data-part={i === 0 ? "half-a" : "half-b"}
              data-seated="1"
              style={label({
                ...regs.annot,
                color: i === 0 ? onTint : onFull,
                left: xPct((h.from + h.to) / 2),
                top: "80%",
                transform: "translate(-50%, -50%)",
              })}
            >
              {`${h.from}–${h.to} · ${h.share} %`}
            </span>
          ))}
          <span
            data-part="end-dot"
            style={{
              position: "absolute",
              left: "100%",
              top: yPct(last.mt),
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              background: accentInk,
              transform: "translate(-50%, -50%)",
            }}
          />
          <span
            data-part="end"
            style={label({
              ...regs.value,
              color: accentInk,
              left: "calc(100% + 6px)",
              top: yPct(last.mt),
              transform: "translateY(-50%)",
            })}
          >
            {endLabel}
          </span>
        </div>
      </div>

      <div
        data-part="axis"
        style={{
          position: "relative",
          margin: `8px ${endGutterPx}px 0 ${gutterPx}px`,
          height: "1.6em",
          ...regs.axis,
        }}
      >
        {xTicks.map((year) => (
          <span
            key={`x${year}`}
            data-xtick={year}
            data-set="full"
            style={label({
              ...regs.axis,
              color: mutedInk,
              left: xPct(year),
              top: 0,
              transform: "translateX(-50%)",
            })}
          >
            {year}
          </span>
        ))}
        {zoomTicks.map((year) => (
          <span
            key={`z${year}`}
            data-xtick={year}
            data-set="zoom"
            style={label({
              ...regs.axis,
              color: mutedInk,
              left: xPct(year),
              top: 0,
              transform: "translateX(-50%)",
              opacity: 0,
            })}
          >
            {year}
          </span>
        ))}
      </div>
    </div>
  );
}
