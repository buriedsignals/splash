/**
 * World population, 1800–2023, drawn THROUGH the design base as an area chart and CHOREOGRAPHED by the scroll. The
 * `area` type in the scrolly format: the subject of `static-world-population` — the world passed 8 billion in 2022 —
 * told with the gestures a scroll can make (`scrolly/references/directed-type-choreography.md`): a playhead filling the
 * area billion by billion, each crossing marked, the years between crossings laid out as bars, then the area turned into
 * the annual growth rate that has been falling since 1964.
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: a stock is a fill, so the value axis starts at zero; one series, one accent;
 * every crossing year read off the frozen series, never typed.
 *
 * `population-drive.mjs` lays out every mark in the reader's pixels on each paint. What is rendered here is the last
 * card's picture, for a reader without a script.
 */

import type { CSSProperties } from "react";
import {
  adjustToContrast,
  mix,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";

export type Crossing = {
  billion: number;
  year: number;
  gap: number | null;
  label: string;
  gapText: string;
  gapName: string;
};
type Style = Record<string, string | number>;

export const NOTES = [
  "firstNote",
  "secondNote",
  "allNote",
  "gapNote",
  "rateNote",
  "readNote",
] as const;

export function DirectedPopulationScrolly({
  years,
  population,
  rate,
  crossings,
  peak,
  xTicks,
  words,
  alt,
  regs,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  years: number[];
  /** billions */
  population: number[];
  /** % a year, null for the first year */
  rate: (number | null)[];
  crossings: Crossing[];
  peak: { year: number; text: string };
  xTicks: number[];
  words: Record<
    | (typeof NOTES)[number]
    | "unit"
    | "rateUnit"
    | "gapUnit"
    | "lastLabel"
    | "rateLast",
    string
  >;
  alt: string;
  regs: Record<
    "display" | "eyebrow" | "body" | "axis" | "annot" | "value",
    Style
  >;
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
  const fill = mix(accent, ground, 0.35);
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

  // THE LAST CARD'S PICTURE WITHOUT A SCRIPT (kit addition). The drive lays out every mark in the
  // reader's pixels, so with no script the area has no geometry and every tick sits at the stage's
  // top-left corner. A <noscript> stylesheet hides the drive's layer and shows the same picture in
  // percentages of the plot, on the drive's own 0–9 scale: the whole area, every whole unit crossed
  // (its level, its dot, its name) and the last year's value at the edge.
  const firstYear = years[0];
  const lastYear = years[years.length - 1];
  const sx = (y: number) => ((y - firstYear) / (lastYear - firstYear)) * 100;
  const sy = (v: number) => (1 - v / 9) * 100;
  const stillEdge = population.map((v, i) => `${i ? "L" : "M"}${(sx(years[i]) * 10).toFixed(1)} ${(sy(v) * 10).toFixed(1)}`).join("");
  const stillArea = `${stillEdge}L1000 1000L0 1000Z`;
  const noScript =
    `[data-population] [data-part="stage"] > :not([data-part="still"]) { display: none !important; }` +
    `[data-population] [data-part="still"] { display: block !important; }` +
    `[data-population] [data-note="readNote"] { opacity: 1 !important; }`;

  return (
    <div
      role="img"
      aria-label={alt}
      data-population={JSON.stringify({
        years,
        population: population.map((v) => Math.round(v * 1e4) / 1e4),
        rate: rate.map((v) => (v === null ? null : Math.round(v * 1e3) / 1e3)),
        crossings: crossings.map(({ billion, year, gap }) => ({
          billion,
          year,
          gap,
        })),
        peak: peak.year,
        xTicks,
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
        <span style={{ display: "grid" }}>
          <span
            data-part="unit"
            style={{
              ...regs.axis,
              ...slot,
              justifySelf: "start",
              textAlign: "left",
              color: mutedInk,
              fontWeight: 700,
            }}
          >
            {words.unit}
          </span>
          <span
            data-part="gap-unit"
            style={{
              ...regs.axis,
              ...slot,
              justifySelf: "start",
              textAlign: "left",
              color: mutedInk,
              fontWeight: 700,
              opacity: 0,
            }}
          >
            {words.gapUnit}
          </span>
          <span
            data-part="rate-unit"
            style={{
              ...regs.axis,
              ...slot,
              justifySelf: "start",
              textAlign: "left",
              color: mutedInk,
              fontWeight: 700,
              opacity: 0,
            }}
          >
            {words.rateUnit}
          </span>
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

      <noscript
        style={{ display: "none" }}
        dangerouslySetInnerHTML={{ __html: `<style>${noScript}</style>` }}
      />
      <div data-part="stage" style={{ position: "relative", minHeight: 0 }}>
        <div data-part="still" style={{ display: "none", position: "absolute", inset: 0 }}>
          <div style={{ position: "absolute", left: "28px", right: "84px", top: "28px", bottom: "24px" }}>
            <svg
              viewBox="0 0 1000 1000"
              preserveAspectRatio="none"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}
            >
              {Array.from({ length: 9 }, (_, b) => (
                <line key={b} x1={0} x2={1000} y1={sy(b) * 10} y2={sy(b) * 10} stroke={grid} strokeWidth={1} vectorEffect="non-scaling-stroke" />
              ))}
              <path d={stillArea} fill={fill} />
              <path d={stillEdge} fill="none" stroke={accent} strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              {crossings.map((c) => (
                <line
                  key={c.billion}
                  x1={0}
                  x2={sx(c.year) * 10}
                  y1={sy(c.billion) * 10}
                  y2={sy(c.billion) * 10}
                  stroke={inkOnGround}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
            {Array.from({ length: 9 }, (_, b) => (
              <span key={`st${b}`} style={abs({ ...regs.axis, color: mutedInk, left: "-8px", top: `${sy(b)}%`, transform: "translate(-100%, -50%)" })}>
                {b}
              </span>
            ))}
            {xTicks.map((y) => (
              <span key={`sx${y}`} style={abs({ ...regs.axis, color: mutedInk, left: `${sx(y)}%`, top: "calc(100% + 5px)", transform: "translateX(-50%)" })}>
                {y}
              </span>
            ))}
            {crossings.map((c) => (
              <div key={`sc${c.billion}`}>
                <span
                  style={{
                    position: "absolute",
                    left: `${sx(c.year)}%`,
                    top: `${sy(c.billion)}%`,
                    width: "8px",
                    height: "8px",
                    boxSizing: "content-box",
                    borderRadius: "50%",
                    background: accent,
                    border: `1.5px solid ${ground}`,
                    transform: "translate(-50%, -50%)",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    left: "4px",
                    width: `max(0px, calc(${sx(c.year)}% - 12px))`,
                    top: `${sy(c.billion)}%`,
                    display: "flex",
                    justifyContent: "safe flex-end",
                    transform: "translateY(calc(-100% - 3px))",
                  }}
                >
                  <span style={{ ...regs.annot, color: inkOnGround, fontWeight: 700, textShadow: halo, whiteSpace: "nowrap" }}>{c.label}</span>
                </span>
              </div>
            ))}
            <span
              style={abs({
                ...regs.value,
                color: accentInk,
                fontWeight: 700,
                textShadow: halo,
                left: "calc(100% + 8px)",
                top: `${sy(population[population.length - 1])}%`,
                transform: "translateY(-50%)",
              })}
            >
              {words.lastLabel}
            </span>
          </div>
        </div>
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
          {Array.from({ length: 9 }, (_, b) => (
            <line key={b} data-billion-grid={b} stroke={grid} strokeWidth={1} />
          ))}
          {[0, 1, 2].map((r) => (
            <line
              key={`r${r}`}
              data-rate-grid={r}
              stroke={grid}
              strokeWidth={1}
              opacity={0}
            />
          ))}
          <path data-part="area" fill={fill} />
          <path
            data-part="edge"
            fill="none"
            stroke={accent}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          {crossings.map((c) => (
            <g key={c.billion} data-crossing={c.billion} opacity={0}>
              <line
                data-part="level"
                stroke={inkOnGround}
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <circle
                data-part="dot"
                r={4}
                fill={accent}
                stroke={ground}
                strokeWidth={1.5}
              />
            </g>
          ))}
          {crossings
            .filter((c) => c.gap !== null)
            .map((c) => (
              <rect
                key={`g${c.billion}`}
                data-gap-bar={c.billion}
                fill={c.billion === 2 ? mutedInk : accent}
                opacity={0}
              />
            ))}
          <circle
            data-part="peak"
            r={4.5}
            fill={accent}
            stroke={ground}
            strokeWidth={1.5}
            opacity={0}
          />
        </svg>

        {Array.from({ length: 9 }, (_, b) => (
          <span
            key={b}
            data-billion-tick={b}
            style={abs({ ...regs.axis, color: mutedInk })}
          >
            {b}
          </span>
        ))}
        {[0, 1, 2].map((r) => (
          <span
            key={`rt${r}`}
            data-rate-tick={r}
            style={abs({ ...regs.axis, color: mutedInk, opacity: 0 })}
          >
            {`${r}\u00A0%`}
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
        {crossings.map((c) => (
          <span
            key={c.billion}
            data-crossing-label={c.billion}
            style={abs({
              ...regs.annot,
              color: inkOnGround,
              fontWeight: 700,
              textShadow: halo,
              opacity: 0,
            })}
          >
            {c.label}
          </span>
        ))}
        {crossings
          .filter((c) => c.gap !== null)
          .map((c) => (
            <div key={`gl${c.billion}`}>
              <span
                data-gap-name={c.billion}
                style={abs({ ...regs.annot, color: inkOnGround, opacity: 0 })}
              >
                {c.gapName}
              </span>
              <span
                data-gap-value={c.billion}
                style={abs({
                  ...regs.value,
                  color: c.billion === 2 ? mutedInk : accentInk,
                  fontWeight: 700,
                  opacity: 0,
                })}
              >
                {c.gapText}
              </span>
            </div>
          ))}
        <span
          data-part="last"
          style={abs({
            ...regs.value,
            color: accentInk,
            fontWeight: 700,
            textShadow: halo,
            opacity: 0,
          })}
        >
          {words.lastLabel}
        </span>
        <span
          data-part="peak-label"
          style={abs({
            ...regs.value,
            color: accentInk,
            fontWeight: 700,
            textShadow: halo,
            opacity: 0,
          })}
        >
          {peak.text}
        </span>
        <span
          data-part="rate-last"
          style={abs({
            ...regs.value,
            color: accentInk,
            fontWeight: 700,
            textShadow: halo,
            opacity: 0,
          })}
        >
          {words.rateLast}
        </span>
      </div>
    </div>
  );
}
