/**
 * Switzerland's annual CO₂ since 1858, drawn as a filled area THROUGH the design base and revealed by
 * the scroll. The `area` type in the scrolly format: the same plate as `static-area-swiss-co2`, the
 * same words, the same colour rules — read one element at a time.
 *
 * WHAT THE SCROLL ADDS, AND IT IS ORDER, NOT CONTENT. The static plate states four things at once:
 * the height is a rate, the surface is a stock, the stock splits at 1986, and the two halves are the
 * same size. A reader of the plate has to find that order for themselves. Here each card names one of
 * them and the picture shows exactly that much: the curve alone, the surface filling under it, the
 * earlier half turning to its tint with the rule and its name, the later half named. Nothing on this
 * frame is absent from the static plate.
 *
 * THE FLUID FRAME. The `<svg>` holds geometry only and stretches with the box under
 * `preserveAspectRatio="none"`; every word is HTML positioned by percentage and sized in the
 * direction's own registers (`#shared/design-base/web.mjs`). The frame fills the whole graphic, from a
 * phone to a wide desktop, so the labels that are seated against the surface are re-seated in the
 * reader's own pixels by `area-drive.mjs`. What is rendered here is the complete plate — the last
 * state — which is what a reader without a script gets.
 *
 * THE RULES THE STATIC PLATE TAKES, KEPT: the base is zero or the component throws; one hue at two
 * chromas for the two halves (`two-states-of-one-measure-are-one-hue-at-two-chromas`); the accent is
 * spent on the surface and the rule, axis and baseline are neutrals; the midpoint year is written on
 * its rule, which stops at the data's own extent; the last reading is written at the end of the curve
 * in the surface's colour.
 */

import type { CSSProperties } from "react";
import {
  mix,
  contrast,
  adjustToContrast,
  NON_TEXT_CONTRAST_MIN,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";

/** The geometry-only viewBox the plot stretches across. Proportions only; never a pixel size. */
export const VIEWBOX = { width: 1000, height: 500 } as const;

export type Reading = { year: number; mt: number };
export type Half = { from: number; to: number; share: string };
type Style = Record<string, string | number>;

export function DirectedAreaScrolly({
  readings,
  halves,
  midpoint,
  yTicks,
  xTicks,
  unit,
  endLabel,
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
  grid,
}: {
  readings: Reading[];
  halves: [Half, Half];
  midpoint: number;
  yTicks: number[];
  xTicks: number[];
  unit: string;
  endLabel: string;
  alt: string;
  regs: Record<
    "display" | "eyebrow" | "body" | "axis" | "annot" | "value",
    Style
  >;
  gutterPx: number;
  /** The measured width of the last reading's label, which sits to the right of the curve's end. */
  endGutterPx: number;
  pad: number;
  stroke: { series?: number; rule?: number; hairline?: number };
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
}) {
  if (yTicks[0] !== 0)
    throw new Error(
      `a filled area drawn over a baseline of ${yTicks[0]} claims a surface the data does not have. ` +
        `Either the base is zero or the fill measures nothing.`,
    );
  const first = readings[0].year;
  const last = readings[readings.length - 1];
  const peakMt = Math.max(...readings.map((r) => r.mt));
  const top = peakMt * 1.08;
  const X = (year: number) =>
    ((year - first) / (last.year - first)) * VIEWBOX.width;
  const Y = (mt: number) => VIEWBOX.height - (mt / top) * VIEWBOX.height;
  const xPct = (year: number) =>
    `${((year - first) / (last.year - first)) * 100}%`;
  const yPct = (mt: number) => `${(1 - mt / top) * 100}%`;

  // ── colour, the static plate's rules ─────────────────────────────────────────────────────────
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
  const clipId = "area-fill-clip";

  return (
    <div
      role="img"
      aria-label={alt}
      data-series={JSON.stringify({
        first,
        last: last.year,
        top,
        midpoint,
        readings,
      })}
      style={{
        position: "absolute",
        inset: 0,
        background: ground,
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr) auto",
        padding: `clamp(12px, 3vh, ${pad * 0.6}px) clamp(16px, 5vw, ${pad}px)`,
      }}
    >
      <div style={{ ...regs.annot, color: mutedInk, margin: "0 0 10px" }}>
        {unit}
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
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
            preserveAspectRatio="none"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              overflow: "visible",
            }}
          >
            <defs>
              <clipPath id={clipId}>
                <rect
                  data-part="clip"
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
                x1={0}
                x2={VIEWBOX.width}
                y1={Y(t)}
                y2={Y(t)}
                stroke={t === 0 ? baseline : hairline}
                strokeWidth={
                  t === 0 ? (stroke.rule ?? 1) : (stroke.hairline ?? 0.6)
                }
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <g clipPath={`url(#${clipId})`}>
              <path d={surface(earlier)} fill={accent} />
              <path data-part="earlier-tint" d={surface(earlier)} fill={tint} />
              <path d={surface(later)} fill={accent} />
            </g>
            <path
              data-part="line"
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

          <span
            data-part="rule-label"
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
          {halves.map((h, i) => (
            <span
              key={`h${i}`}
              data-part={i === 0 ? "half-a" : "half-b"}
              data-seated="1"
              style={label({
                ...regs.annot,
                color: i === 0 ? onTint : onFull,
                left: xPct(i === 0 ? (h.from + h.to) / 2 : (h.from + h.to) / 2),
                top: "80%",
                transform: "translate(-50%, -50%)",
              })}
            >
              {`${h.from}–${h.to} · ${h.share} %`}
            </span>
          ))}
          {/* THE LAST READING, BESIDE THE END OF THE CURVE, IN THE SURFACE'S OWN COLOUR. The static plate
              seats it above the crest under its own width; on a frame as narrow as a phone that crest
              is the 1990s peak and the number floated a decade away from its point. A measured gutter
              to the right of the plot keeps it level with the reading it names, at every width and in
              every state. */}
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
        style={{
          position: "relative",
          margin: `8px ${endGutterPx}px 0 ${gutterPx}px`,
          height: "1.6em",
          ...regs.axis,
        }}
      >
        {xTicks.map((year, i) => (
          <span
            key={`x${year}`}
            data-xtick={year}
            style={label({
              ...regs.axis,
              color: mutedInk,
              left: xPct(year),
              top: 0,
              transform:
                i === 0
                  ? "none"
                  : i === xTicks.length - 1
                    ? "translateX(-100%)"
                    : "translateX(-50%)",
            })}
          >
            {year}
          </span>
        ))}
      </div>
    </div>
  );
}
