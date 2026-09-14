/**
 * The world's ten largest CO₂ emitters, ranked every year from 1990 to 2024, drawn THROUGH the design base as a bump
 * chart and CHOREOGRAPHED by the scroll. The `bump` type in the scrolly format: the subject of `static-bump-emitter-rank`
 * — India rose from eighth to third, passing five countries — told with the gestures a scroll can make
 * (`scrolly/references/directed-type-choreography.md`): the 1990 ranking alone, a playhead advancing the years, every
 * crossing that carries the argument ringed as the playhead reaches it, the countries that left the top ten named.
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: a line's height is its rank, not its value, rank 1 at the top; a line that
 * leaves the top ten stops where it left; only the subject's crossings are ringed — China passing the United States is
 * visible and not marked, because a second marked crossing reads as a second subject.
 *
 * `bump-drive.mjs` lays out every line and label in the reader's pixels on each paint. What is rendered here is the last
 * card's picture, for a reader without a script.
 */

import type { CSSProperties } from "react";
import {
  adjustToContrast,
  mix,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";

export type Track = {
  key: string;
  label: string;
  points: [number, number][];
  subject: boolean;
  left: boolean;
  exitText: string;
};
export type Crossing = { year: number; from: number; to: number; text: string };
type Style = Record<string, string | number>;

export const NOTES = [
  "startNote",
  "firstNote",
  "secondNote",
  "holdNote",
  "exitNote",
  "readNote",
] as const;

export function DirectedBumpScrolly({
  tracks,
  crossings,
  years,
  slots,
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
  tracks: Track[];
  crossings: Crossing[];
  years: number[];
  slots: number;
  xTicks: number[];
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
  const field = mix(muted, ground, 0.35);
  const series = stroke.series ?? 2.5;
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

  return (
    <div
      role="img"
      aria-label={alt}
      data-bump={JSON.stringify({
        tracks: tracks.map(({ key, points, subject, left }) => ({
          key,
          points,
          subject,
          left,
        })),
        crossings: crossings.map(({ year, from, to }) => ({ year, from, to })),
        years,
        slots,
        xTicks,
        colours: { field, left: inkOnGround, subject: accent },
        series,
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
              data-template={k === "holdNote" ? words[k] : undefined}
              style={{ ...regs.value, ...slot, color: accentInk, opacity: 0 }}
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
          <defs>
            <clipPath id="bump-playhead">
              <rect
                data-part="clip"
                x={-10000}
                y={-10000}
                width={0}
                height={20000}
              />
            </clipPath>
          </defs>
          {Array.from({ length: slots }, (_, i) => (
            <line
              key={i}
              data-row={i + 1}
              stroke={grid}
              strokeWidth={stroke.rule ?? 1}
              opacity={0.6}
            />
          ))}
          <line
            data-part="head"
            stroke={inkOnGround}
            strokeWidth={1}
            strokeDasharray="2 3"
          />
          <g clipPath="url(#bump-playhead)">
            {tracks
              .filter((t) => !t.subject)
              .concat(tracks.filter((t) => t.subject))
              .map((t) => (
                <path
                  key={t.key}
                  data-track={t.key}
                  fill="none"
                  stroke={t.subject ? accent : field}
                  strokeWidth={t.subject ? series * 1.6 : series * 0.8}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ))}
          </g>
          {tracks.map((t) => (
            <circle
              key={`e${t.key}`}
              data-end={t.key}
              r={t.subject ? 5 : 3}
              fill={t.subject ? accent : field}
            />
          ))}
          {crossings.map((c, i) => (
            <circle
              key={i}
              data-crossing={i}
              r={9}
              fill="none"
              stroke={accentInk}
              strokeWidth={1.6}
              opacity={0}
            />
          ))}
        </svg>

        {Array.from({ length: slots }, (_, i) => (
          <span
            key={i}
            data-rank={i + 1}
            style={abs({ ...regs.axis, color: mutedInk })}
          >
            {i + 1}
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
        {tracks.map((t) => (
          <span
            key={`l${t.key}`}
            data-label={t.key}
            style={abs({
              ...regs.annot,
              color: t.subject ? accentInk : inkOnGround,
              fontWeight: t.subject ? 700 : regs.annot.fontWeight,
              textShadow: halo,
            })}
          >
            {t.label}
          </span>
        ))}
        {tracks
          .filter((t) => t.left)
          .map((t) => (
            <span
              key={`x${t.key}`}
              data-exit={t.key}
              style={abs({
                ...regs.axis,
                color: inkOnGround,
                fontWeight: 700,
                textShadow: halo,
                opacity: 0,
              })}
            >
              {t.exitText}
            </span>
          ))}
        {crossings.map((c, i) => (
          <span
            key={i}
            data-crossing-label={i}
            style={abs({
              ...regs.axis,
              color: accentInk,
              fontWeight: 700,
              textShadow: halo,
              opacity: 0,
            })}
          >
            {c.text}
          </span>
        ))}
      </div>
    </div>
  );
}
