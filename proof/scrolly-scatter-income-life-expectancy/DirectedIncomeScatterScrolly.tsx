/**
 * Income against life expectancy in 165 countries, 2021, drawn THROUGH the design base as a scatter and CHOREOGRAPHED
 * by the scroll. The `scatter` type in the scrolly format: the subject of `static-income-life-expectancy` — beyond
 * $30,000 a person, life expectancy sits in a band three times narrower — told with the gestures a scroll can make
 * (`scrolly/references/directed-type-choreography.md`): the income axis switched from linear to logarithmic under the
 * reader's eyes, the break drawn, the spread measured on each side.
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: every point in the muted neutral, half transparent — the argument is the
 * cloud's shape, not a country; the accent spent only on the claim (the break and its bands); the axis names with
 * their qualifier; the break declared by the beat, the spread derived from the data.
 *
 * `income-scatter-drive.mjs` places every mark in the reader's pixels on each paint. What is rendered here is the last
 * card's picture, for a reader without a script.
 */

import type { CSSProperties } from "react";
import {
  adjustToContrast,
  mix,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";

export type Point = { code: string; x: number; y: number };
type Style = Record<string, string | number>;

export function DirectedIncomeScatterScrolly({
  points,
  breakAt,
  spread,
  extremes,
  linearTicks,
  logTicks,
  yTicks,
  words,
  alt,
  regs,
  stroke,
  ground,
  accent,
  ink,
  muted,
}: {
  points: Point[];
  breakAt: number;
  spread: {
    below: { lo: number; hi: number };
    above: { lo: number; hi: number };
  };
  extremes: { code: string; label: string; side: "below" | "above" }[];
  linearTicks: { value: number; label: string }[];
  logTicks: { value: number; label: string }[];
  yTicks: number[];
  words: {
    xName: string;
    yName: string;
    belowClaim: string;
    aboveClaim: string;
    logNote: string;
    breakNote: string;
    belowNote: string;
    aboveNote: string;
  };
  alt: string;
  regs: Record<
    "display" | "eyebrow" | "body" | "axis" | "annot" | "value",
    Style
  >;
  stroke: { rule?: number; hairline?: number; series?: number };
  ground: string;
  accent: string;
  ink: string;
  muted: string;
}) {
  const claimInk =
    adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const inkOnGround = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const grid = mix(ground, ink, 0.12);
  const band = mix(ground, accent, 0.12);
  const abs = (extra: CSSProperties): CSSProperties => ({
    position: "absolute",
    left: 0,
    top: 0,
    ...extra,
  });
  const slot: CSSProperties = {
    gridArea: "1 / 1",
    justifySelf: "end",
    textAlign: "right",
  };
  const xMin = Math.min(...points.map((p) => p.x));
  const xMax = Math.max(...points.map((p) => p.x));
  const lx = (v: number) =>
    (Math.log(v) - Math.log(xMin * 0.9)) /
    (Math.log(xMax * 1.1) - Math.log(xMin * 0.9));
  const ly = (v: number) =>
    1 - (v - yTicks[0]) / (yTicks[yTicks.length - 1] - yTicks[0]);

  return (
    <div
      role="img"
      aria-label={alt}
      data-income={JSON.stringify({
        points,
        breakAt,
        spread,
        extremes: extremes.map(({ code, side }) => ({ code, side })),
        yTicks,
        colours: { muted, claimInk },
      })}
      style={{
        position: "absolute",
        inset: 0,
        background: ground,
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr)",
        gridTemplateColumns: "minmax(0, 1fr)",
        rowGap: "8px",
        padding: `12px var(--prose-gutter, clamp(16px, 6vw, 56px))`,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: "4px 16px",
        }}
      >
        <span style={{ ...regs.axis, color: mutedInk, fontWeight: 700 }}>
          {words.yName}
        </span>
        <span style={{ display: "grid", marginLeft: "auto" }}>
          {(["logNote", "breakNote", "belowNote", "aboveNote"] as const).map(
            (k) => (
              <span
                key={k}
                data-note={k}
                style={{ ...regs.value, ...slot, color: claimInk, opacity: 0 }}
              >
                {words[k]}
              </span>
            ),
          )}
        </span>
      </div>

      <div data-part="stage" style={{ position: "relative", minHeight: 0 }}>
        <svg
          data-part="field"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1000 600"
          preserveAspectRatio="none"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            overflow: "visible",
          }}
        >
          {yTicks.map((t) => (
            <line
              key={t}
              data-grid={t}
              x1={0}
              x2={1000}
              y1={ly(t) * 600}
              y2={ly(t) * 600}
              stroke={grid}
              strokeWidth={stroke.hairline ?? 0.8}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <rect data-band="below" fill={band} opacity={0} />
          <rect
            data-band="above"
            x={lx(breakAt) * 1000}
            y={ly(spread.above.hi) * 600}
            width={(1 - lx(breakAt)) * 1000}
            height={(ly(spread.above.lo) - ly(spread.above.hi)) * 600}
            fill={band}
          />
          <line
            data-part="break"
            x1={lx(breakAt) * 1000}
            x2={lx(breakAt) * 1000}
            y1={0}
            y2={600}
            stroke={claimInk}
            strokeWidth={stroke.series ?? 2}
            vectorEffect="non-scaling-stroke"
          />
          {points.map((p) => (
            <circle
              key={p.code}
              data-point={p.code}
              cx={lx(p.x) * 1000}
              cy={ly(p.y) * 600}
              r={4}
              fill={muted}
              fillOpacity={0.55}
            />
          ))}
          {extremes.map((e) => (
            <circle
              key={`r${e.code}`}
              data-ring={e.code}
              r={7}
              fill="none"
              stroke={claimInk}
              strokeWidth={1.5}
              opacity={0}
            />
          ))}
        </svg>
        {yTicks.map((t) => (
          <span
            key={t}
            data-ytick={t}
            style={abs({
              ...regs.axis,
              top: `${ly(t) * 100}%`,
              transform: "translateY(-50%)",
              color: mutedInk,
            })}
          >
            {t}
          </span>
        ))}
        {linearTicks.map((t) => (
          <span
            key={`l${t.value}`}
            data-xtick={t.value}
            data-scale="linear"
            style={abs({
              ...regs.axis,
              whiteSpace: "nowrap",
              transform: "translateX(-50%)",
              color: mutedInk,
              opacity: 0,
            })}
          >
            {t.label}
          </span>
        ))}
        {logTicks.map((t) => (
          <span
            key={`g${t.value}`}
            data-xtick={t.value}
            data-scale="log"
            style={abs({
              ...regs.axis,
              whiteSpace: "nowrap",
              transform: "translateX(-50%)",
              top: "100%",
              left: `${lx(t.value) * 100}%`,
              color: mutedInk,
            })}
          >
            {t.label}
          </span>
        ))}
        <span
          data-part="x-name"
          style={abs({
            ...regs.axis,
            whiteSpace: "nowrap",
            color: mutedInk,
            fontWeight: 700,
          })}
        >
          <span
            data-scale-name="linear"
            style={{ display: "none" }}
          >{`${words.xName} (échelle linéaire)`}</span>
          <span data-scale-name="log">{`${words.xName} (échelle logarithmique)`}</span>
        </span>
        <span
          data-claim="below"
          style={abs({ ...regs.annot, whiteSpace: "nowrap", color: claimInk })}
        >
          {words.belowClaim}
        </span>
        <span
          data-claim="above"
          style={abs({ ...regs.annot, whiteSpace: "nowrap", color: claimInk })}
        >
          {words.aboveClaim}
        </span>
        {extremes.map((e) => (
          <span
            key={e.code}
            data-extreme={e.code}
            style={abs({
              ...regs.axis,
              whiteSpace: "nowrap",
              color: inkOnGround,
              opacity: 0,
            })}
          >
            {e.label}
          </span>
        ))}
      </div>
    </div>
  );
}
