/**
 * Solar's share of electricity in the EU's six most populous countries, 2010–2024, drawn THROUGH the design base as
 * small multiples of lines and CHOREOGRAPHED by the scroll. The `small multiples` type in the scrolly format: the
 * subject of `static-small-multiples-solar-eu-six` — under 3 % everywhere in 2010, over a tenth in four of the six by
 * 2024 — told with the gestures a scroll can make (`scrolly/references/directed-type-choreography.md`): the lines drawn
 * year by year, a floor laid across every panel, the six lines laid on one chart, then the trap the type exists to
 * refuse — every panel on its own scale — shown and taken back.
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: one shared scale on every panel, the y axis from zero; what is shared (the
 * unit, the ticks) stated once, what varies (the name, the end value) in the panel; panels ordered by their 2024 share;
 * the line in the accent, every number in ink.
 *
 * `solar-drive.mjs` lays out every panel in the reader's pixels on each paint. What is rendered here is the last card's
 * picture, for a reader without a script.
 */

import type { CSSProperties } from "react";
import {
  adjustToContrast,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";

export type Panel = {
  key: string;
  label: string;
  values: number[];
  ownMax: number;
};
type Style = Record<string, string | number>;

export const NOTES = [
  "startNote",
  "yearNote",
  "floorNote",
  "mergeNote",
  "ownNote",
  "sharedNote",
] as const;

export function DirectedSolarScrolly({
  panels,
  years,
  sharedMax,
  ticks,
  floor,
  xTicks,
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
  panels: Panel[];
  years: number[];
  sharedMax: number;
  ticks: number[];
  floor: number;
  xTicks: number[];
  words: Record<(typeof NOTES)[number] | "unit" | "floorLabel", string>;
  alt: string;
  regs: Record<
    "display" | "eyebrow" | "body" | "axis" | "annot" | "value",
    Style
  >;
  stroke: { rule?: number; series?: number };
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
  const halo = `0 0 2px ${ground}, 0 0 3px ${ground}`;
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
  const series = stroke.series ?? 2.5;

  return (
    <div
      role="img"
      aria-label={alt}
      data-solar={JSON.stringify({
        panels: panels.map(({ key, values, ownMax }) => ({
          key,
          values,
          ownMax,
        })),
        years,
        sharedMax,
        ticks,
        floor,
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
        <span style={{ ...regs.axis, color: mutedInk, fontWeight: 700 }}>
          {words.unit}
        </span>
        <span style={{ display: "grid", marginLeft: "auto" }}>
          {NOTES.map((k) => (
            <span
              key={k}
              data-note={k}
              data-template={k === "yearNote" ? words[k] : undefined}
              style={{
                ...regs.value,
                ...slot,
                color: k === "ownNote" ? inkOnGround : accentInk,
                opacity: 0,
              }}
            >
              {words[k].replace("{year}", String(years[years.length - 1]))}
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
          {panels.map((p) => (
            <g key={p.key} data-panel={p.key}>
              {ticks.map((t) => (
                <line
                  key={t}
                  data-grid={t}
                  stroke={grid}
                  strokeWidth={stroke.rule ?? 1}
                />
              ))}
              <line
                data-part="floor"
                stroke={accentInk}
                strokeWidth={1.2}
                strokeDasharray="4 3"
                opacity={0}
              />
              <path
                data-part="line"
                fill="none"
                stroke={accent}
                strokeWidth={series}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <circle data-part="dot" r={series * 1.6} fill={accent} />
            </g>
          ))}
        </svg>

        {panels.map((p) => (
          <div key={p.key}>
            <span
              data-name={p.key}
              style={abs({
                ...regs.annot,
                color: inkOnGround,
                fontWeight: 700,
              })}
            >
              {p.label}
            </span>
            <span data-end={p.key} style={abs({ textShadow: halo })}>
              <span
                data-part="end-name"
                style={{
                  ...regs.annot,
                  color: inkOnGround,
                  fontWeight: 700,
                  marginRight: "0.4em",
                }}
              >
                {p.label}
              </span>
              <span
                data-part="end-value"
                style={{ ...regs.value, color: inkOnGround, fontWeight: 700 }}
              >
                {`${p.values[p.values.length - 1].toFixed(1).replace(".", ",")}\u00A0%`}
              </span>
            </span>
            {ticks.map((t) => (
              <span
                key={t}
                data-tick={`${p.key}:${t}`}
                style={abs({ ...regs.axis, color: mutedInk, opacity: 0 })}
              >
                {t}
              </span>
            ))}
            <span
              data-own-top={p.key}
              style={abs({
                ...regs.axis,
                color: inkOnGround,
                fontWeight: 700,
                opacity: 0,
              })}
            >
              {`${p.ownMax}\u00A0%`}
            </span>
            {xTicks.map((y) => (
              <span
                key={y}
                data-x-tick={`${p.key}:${y}`}
                style={abs({ ...regs.axis, color: mutedInk, opacity: 0 })}
              >
                {y}
              </span>
            ))}
            <span
              data-floor-label={p.key}
              style={abs({
                ...regs.axis,
                color: accentInk,
                fontWeight: 700,
                textShadow: halo,
                opacity: 0,
              })}
            >
              {words.floorLabel}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
