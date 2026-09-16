/**
 * France's per-capita CO₂ emissions, 1950–2024, drawn THROUGH the design base as a box plot by decade and CHOREOGRAPHED
 * by the scroll. The `box plot` type in the scrolly format: the subject of `more-boxplot-france-co2-decades` — the
 * median peaked in the 1970s and has fallen every decade since — told with the gestures a scroll can make
 * (`scrolly/references/directed-type-choreography.md`): every year a point in time, the points gathered by decade, each
 * column closed into its box, the medians joined, the spread read.
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: the whisker rule (1.5 × IQR) stated on the plate; a position encoding, so the
 * value axis is fitted, not anchored at zero; one hue for every box; the partial last decade said to be partial; an
 * outlier drawn as a point and named.
 *
 * `boxplot-drive.mjs` lays out every mark in the reader's pixels on each paint. What is rendered here is the last card's
 * picture, for a reader without a script.
 */

import type { CSSProperties } from "react";
import {
  adjustToContrast,
  mix,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";

export type Box = {
  label: string;
  decade: number;
  n: number;
  q1: number;
  median: number;
  q3: number;
  lo: number;
  hi: number;
  medianText: string;
  nText: string;
  spreadText: string;
  focus: boolean;
};
export type Point = {
  year: number;
  value: number;
  decade: number;
  outlier: boolean;
};
type Style = Record<string, string | number>;

export const NOTES = [
  "yearsNote",
  "decadesNote",
  "boxNote",
  "medianNote",
  "spreadNote",
  "ruleNote",
] as const;

export function DirectedBoxplotScrolly({
  boxes,
  points,
  domain,
  ticks,
  xTicks,
  peakYear,
  outlierText,
  words,
  alt,
  regs,
  stroke,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  boxes: Box[];
  points: Point[];
  domain: [number, number];
  ticks: number[];
  xTicks: number[];
  peakYear: { year: number; text: string };
  outlierText: string;
  words: Record<(typeof NOTES)[number] | "unit" | "rule", string>;
  alt: string;
  regs: Record<
    "display" | "eyebrow" | "body" | "axis" | "annot" | "value",
    Style
  >;
  stroke: { rule?: number };
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
}) {
  const accentInk =
    adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const inkOnGround = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const boxFill = mix(accent, ground, 0.72);
  const halo = `0 0 2px ${ground}, 0 0 3px ${ground}, 0 0 4px ${ground}`;
  const abs = (extra: CSSProperties): CSSProperties => ({
    position: "absolute",
    left: 0,
    top: 0,
    whiteSpace: "nowrap",
    ...extra,
  });
  const slot: CSSProperties = {
    gridArea: "1 / 1",
    justifySelf: "end",
    textAlign: "right",
  };
  const rule = stroke.rule ?? 1;

  return (
    <div
      role="img"
      aria-label={alt}
      data-boxplot={JSON.stringify({
        boxes: boxes.map(({ decade, n, q1, median, q3, lo, hi, focus }) => ({
          decade,
          n,
          q1,
          median,
          q3,
          lo,
          hi,
          focus,
        })),
        points: points.map((p) => [
          p.year,
          Math.round(p.value * 1000) / 1000,
          p.decade,
          p.outlier ? 1 : 0,
        ]),
        domain,
        ticks,
        xTicks,
        peakYear: peakYear.year,
        notes: NOTES,
      })}
      style={{
        position: "absolute",
        inset: 0,
        background: ground,
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr)",
        gridTemplateColumns: "minmax(0, 1fr)",
        rowGap: "10px",
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
          {words.unit}
        </span>
        <span style={{ display: "grid", marginLeft: "auto" }}>
          {NOTES.map((k) => (
            <span
              key={k}
              data-note={k}
              style={{ ...regs.value, ...slot, color: accentInk, opacity: 0 }}
            >
              {words[k]}
            </span>
          ))}
        </span>
      </div>

      <div data-part="stage" style={{ position: "relative", minHeight: 0 }}>
        <svg
          data-part="field"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            overflow: "visible",
          }}
        >
          {ticks.map((t) => (
            <line key={t} data-grid={t} stroke={grid} strokeWidth={rule} />
          ))}
          {boxes.map((b) => (
            <g key={b.decade} data-box={b.decade} opacity={0}>
              <line
                data-part="whisker"
                stroke={inkOnGround}
                strokeWidth={rule}
              />
              <line
                data-part="cap-lo"
                stroke={inkOnGround}
                strokeWidth={rule}
              />
              <line
                data-part="cap-hi"
                stroke={inkOnGround}
                strokeWidth={rule}
              />
              <rect
                data-part="iqr"
                fill={boxFill}
                stroke={accent}
                strokeWidth={rule * 1.2}
              />
              <line
                data-part="median"
                stroke={inkOnGround}
                strokeWidth={rule * 2.2}
              />
            </g>
          ))}
          <path
            data-part="median-line"
            fill="none"
            stroke={accentInk}
            strokeWidth={rule * 1.6}
            strokeDasharray="5 4"
            opacity={0}
          />
          {points.map((p) => (
            <circle key={p.year} data-point={p.year} r={3} fill={accent} />
          ))}
        </svg>

        {ticks.map((t) => (
          <span
            key={t}
            data-tick={t}
            style={abs({ ...regs.axis, color: mutedInk })}
          >
            {t}
          </span>
        ))}
        {xTicks.map((y) => (
          <span
            key={y}
            data-x-tick={y}
            style={abs({ ...regs.axis, color: mutedInk })}
          >
            {y}
          </span>
        ))}
        {boxes.map((b) => (
          <div key={b.decade}>
            <span
              data-decade={b.decade}
              style={abs({
                ...regs.annot,
                color: inkOnGround,
                opacity: 0,
                textAlign: "center",
              })}
            >
              {b.label}
            </span>
            <span
              data-n={b.decade}
              style={abs({ ...regs.axis, color: mutedInk, opacity: 0 })}
            >
              {b.nText}
            </span>
            <span
              data-median-label={b.decade}
              style={abs({
                ...regs.value,
                color: accentInk,
                fontWeight: 700,
                textShadow: halo,
                opacity: 0,
              })}
            >
              {b.medianText}
            </span>
            <span
              data-spread={b.decade}
              style={abs({
                ...regs.axis,
                color: inkOnGround,
                fontWeight: 700,
                textShadow: halo,
                opacity: 0,
              })}
            >
              {b.spreadText}
            </span>
          </div>
        ))}
        <span
          data-part="peak"
          style={abs({
            ...regs.value,
            color: accentInk,
            fontWeight: 700,
            textShadow: halo,
            opacity: 0,
          })}
        >
          {peakYear.text}
        </span>
        <span
          data-part="outlier"
          style={abs({
            ...regs.axis,
            color: inkOnGround,
            fontWeight: 700,
            textShadow: halo,
            opacity: 0,
          })}
        >
          {outlierText}
        </span>
        <span
          data-part="rule"
          style={abs({ ...regs.axis, color: mutedInk, opacity: 0 })}
        >
          {words.rule}
        </span>
      </div>
    </div>
  );
}
