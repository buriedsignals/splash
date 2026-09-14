/**
 * Switzerland's territorial CO₂ emissions, 1950 to 2024, drawn THROUGH the design base as a line and CHOREOGRAPHED by
 * the scroll. The `line` type in the scrolly format: the subject of `co2-suisse` — in 2024 the curve is back under its
 * 1967 level — told with the gestures a scroll can make (`scrolly/references/directed-type-choreography.md`): the line
 * drawn year by year against the 1967 rule, the plateau read as a band, the fall crossing the rule, then a close-up on
 * the last ten years.
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: the slope carries the value, so the wide view reads from zero and the close-up
 * says its own scale; the 2024 point is the subject, the peak stays furniture; direct labels, no legend.
 *
 * `line-drive.mjs` lays out every mark in the reader's pixels on each paint. What is rendered here is the last card's
 * picture, for a reader without a script.
 */

import type { CSSProperties } from "react";
import {
  adjustToContrast,
  mix,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";

type Style = Record<string, string | number>;
export type Label = { year: number; value: number; text: string };

export const NOTES = [
  "startNote",
  "peakNote",
  "plateauNote",
  "crossNote",
  "zoomNote",
  "readNote",
] as const;

export function DirectedLineScrolly({
  points,
  reference,
  peak,
  runnerUp,
  plateau,
  cross,
  end,
  zoomYears,
  domains,
  ticks,
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
  points: [number, number][];
  reference: Label;
  peak: Label;
  runnerUp: Label;
  plateau: { from: number; to: number; lo: number; hi: number; text: string };
  cross: Label;
  end: Label;
  zoomYears: Label[];
  domains: Record<
    "wide" | "zoom",
    { x: [number, number]; y: [number, number] }
  >;
  ticks: Record<"wide" | "zoom", { x: number[]; y: number[] }>;
  words: Record<(typeof NOTES)[number] | "unit", string>;
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
  const band = mix(accent, ground, 0.86);
  const halo = `0 0 2px ${ground}, 0 0 3px ${ground}, 0 0 4px ${ground}`;
  const abs = (extra: CSSProperties): CSSProperties => ({
    position: "absolute",
    left: 0,
    top: 0,
    whiteSpace: "nowrap",
    textShadow: halo,
    ...extra,
  });
  const slot: CSSProperties = {
    gridArea: "1 / 1",
    justifySelf: "end",
    textAlign: "right",
  };
  const rule = stroke.rule ?? 1;
  const line = Math.max(2, stroke.series ?? 2.5);

  return (
    <div
      role="img"
      aria-label={alt}
      data-line={JSON.stringify({
        points: points.map(([y, v]) => [y, Math.round(v * 1000) / 1000]),
        reference: reference.value,
        referenceYear: reference.year,
        peak: [peak.year, peak.value],
        runnerUp: [runnerUp.year, runnerUp.value],
        plateau: [plateau.from, plateau.to, plateau.lo, plateau.hi],
        cross: [cross.year, cross.value],
        zoomYears: zoomYears.map((z) => z.year),
        domains,
        ticks,
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
          <defs>
            <clipPath id="line-plot">
              <rect data-part="clip" />
            </clipPath>
          </defs>
          {(["wide", "zoom"] as const).flatMap((set) =>
            ticks[set].y.map((t) => (
              <line
                key={`${set}-${t}`}
                data-grid-y={`${set}:${t}`}
                stroke={grid}
                strokeWidth={rule}
              />
            )),
          )}
          <g clipPath="url(#line-plot)">
            <rect data-part="band" fill={band} />
            <line
              data-part="reference"
              stroke={inkOnGround}
              strokeWidth={rule * 1.2}
              strokeDasharray="5 4"
            />
            <path
              data-part="line"
              fill="none"
              stroke={accent}
              strokeWidth={line}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {zoomYears.map((z) => (
              <circle key={z.year} data-zoom-dot={z.year} r={4} fill={accent} />
            ))}
            <circle
              data-part="peak"
              r={4.5}
              fill={ground}
              stroke={inkOnGround}
              strokeWidth={1.5}
            />
            <circle
              data-part="runner-up"
              r={4.5}
              fill={ground}
              stroke={inkOnGround}
              strokeWidth={1.5}
            />
            <circle
              data-part="cross"
              r={9}
              fill="none"
              stroke={accent}
              strokeWidth={1.5}
            />
            <circle data-part="head" r={5.5} fill={accent} />
          </g>
        </svg>

        {(["wide", "zoom"] as const).flatMap((set) => [
          ...ticks[set].y.map((t) => (
            <span
              key={`y-${set}-${t}`}
              data-tick-y={`${set}:${t}`}
              style={abs({ ...regs.axis, color: mutedInk, textShadow: "none" })}
            >
              {t}
            </span>
          )),
          ...ticks[set].x.map((t) => (
            <span
              key={`x-${set}-${t}`}
              data-tick-x={`${set}:${t}`}
              style={abs({ ...regs.axis, color: mutedInk, textShadow: "none" })}
            >
              {t}
            </span>
          )),
        ])}
        <span
          data-part="reference-label"
          style={abs({ ...regs.annot, color: inkOnGround, fontWeight: 700 })}
        >
          {reference.text}
        </span>
        <span
          data-part="band-label"
          style={abs({ ...regs.annot, color: inkOnGround })}
        >
          {plateau.text}
        </span>
        <span
          data-part="peak-label"
          style={abs({ ...regs.annot, color: inkOnGround })}
        >
          {peak.text}
        </span>
        <span
          data-part="runner-up-label"
          style={abs({ ...regs.annot, color: inkOnGround })}
        >
          {runnerUp.text}
        </span>
        <span
          data-part="cross-label"
          style={abs({ ...regs.value, color: accentInk, fontWeight: 700 })}
        >
          {cross.text}
        </span>
        <span
          data-part="end-label"
          style={abs({ ...regs.value, color: accentInk, fontWeight: 700 })}
        >
          {end.text}
        </span>
        {zoomYears.map((z) => (
          <span
            key={z.year}
            data-zoom-value={z.year}
            style={abs({ ...regs.value, color: accentInk, fontWeight: 700 })}
          >
            {z.text}
          </span>
        ))}
      </div>
    </div>
  );
}
