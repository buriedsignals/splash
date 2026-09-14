/**
 * The renewable share of six European countries' electricity, 2015 and 2024, drawn THROUGH the design base as a slope
 * chart and CHOREOGRAPHED by the scroll. The `slope` type in the scrolly format: the subject of `static-renewables-shift`
 * — Germany's renewable share nearly doubled in nine years, the steepest climb of the six — told with the gestures a
 * scroll can make (`scrolly/references/directed-type-choreography.md`): the first rail, the slopes, Germany alone, its
 * gain taken apart source by source, then the room each country had left to climb.
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: exactly two moments; Germany in the accent, the others neutral; every end
 * value written beside its dot; labels pushed apart rather than dropped.
 *
 * `shift-drive.mjs` lays out every line, bar and label in the reader's pixels on each paint. What is rendered here is
 * the last card's picture, for a reader without a script.
 */

import type { CSSProperties } from "react";
import {
  adjustToContrast,
  mix,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";

export type Line = {
  key: string;
  label: string;
  from: number;
  to: number;
  fromText: string;
  toText: string;
  subject: boolean;
  roomText: string;
};
export type Part = { key: string; label: string; value: number; text: string };
type Style = Record<string, string | number>;

export const NOTES = [
  "railNote",
  "riseNote",
  "subjectNote",
  "partsNote",
  "roomNote",
  "readNote",
] as const;

export function DirectedShiftScrolly({
  lines,
  parts,
  years,
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
  lines: Line[];
  parts: Part[];
  years: string[];
  words: Record<(typeof NOTES)[number] | "unit" | "gained" | "gave", string>;
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
  const rest = mix(muted, ground, 0.2);
  const series = stroke.series ?? 2.5;
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
      data-shift={JSON.stringify({
        lines: lines.map(({ key, from, to, subject }) => ({
          key,
          from,
          to,
          subject,
        })),
        parts: parts.map(({ key, value }) => ({ key, value })),
        colours: {
          accent,
          rest,
        },
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
          {years.map((y) => (
            <line
              key={y}
              data-rail={y}
              stroke={grid}
              strokeWidth={stroke.rule ?? 1}
            />
          ))}
          {lines.map((l) => (
            <g key={`r${l.key}`} opacity={0} data-room-row={l.key}>
              <rect data-held={l.key} fill={l.subject ? accent : muted} />
              <rect data-room={l.key} fill="none" stroke={l.subject ? accentInk : mutedInk} strokeWidth={1.2} strokeDasharray="4 3" />
            </g>
          ))}
          {lines.map((l) => (
            <g key={l.key} data-line={l.key}>
              <line data-part="slope" strokeLinecap="round" />
              <circle data-part="from" r={3.5} />
              <circle data-part="to" r={3.5} />
            </g>
          ))}
          <line
            data-part="zero"
            stroke={inkOnGround}
            strokeWidth={1}
            opacity={0}
          />
          {parts.map((p) => (
            <rect
              key={p.key}
              data-bar={p.key}
              fill={p.value >= 0 ? accent : muted}
              opacity={0}
            />
          ))}
        </svg>

        {years.map((y) => (
          <span
            key={y}
            data-year={y}
            style={abs({ ...regs.axis, color: mutedInk, fontWeight: 700 })}
          >
            {y}
          </span>
        ))}
        {lines.map((l) => (
          <div key={l.key}>
            <span data-left={l.key} style={abs({})}>
              <span
                style={{
                  ...regs.annot,
                  color: l.subject ? accentInk : mutedInk,
                  fontWeight: l.subject ? 700 : regs.annot.fontWeight,
                }}
              >
                {l.label}
              </span>
              <span
                style={{
                  ...regs.value,
                  color: l.subject ? accentInk : inkOnGround,
                  fontWeight: 700,
                  marginLeft: "0.4em",
                }}
              >
                {l.fromText}
              </span>
            </span>
            <span data-right={l.key} style={abs({})}>
              <span
                style={{
                  ...regs.value,
                  color: l.subject ? accentInk : inkOnGround,
                  fontWeight: 700,
                  marginRight: "0.4em",
                }}
              >
                {l.toText}
              </span>
              <span
                style={{
                  ...regs.annot,
                  color: l.subject ? accentInk : mutedInk,
                  fontWeight: l.subject ? 700 : regs.annot.fontWeight,
                }}
              >
                {l.label}
              </span>
            </span>
            <span
              data-room-name={l.key}
              style={abs({ ...regs.annot, color: l.subject ? accentInk : inkOnGround, fontWeight: l.subject ? 700 : regs.annot.fontWeight, opacity: 0 })}
            >
              {l.label}
            </span>
            <span
              data-room-label={l.key}
              style={abs({
                ...regs.axis,
                color: l.subject ? accentInk : inkOnGround,
                fontWeight: 700,
                opacity: 0,
              })}
            >
              {l.roomText}
            </span>
          </div>
        ))}
        <span
          data-part="gained"
          style={abs({
            ...regs.axis,
            color: accentInk,
            fontWeight: 700,
            opacity: 0,
          })}
        >
          {words.gained}
        </span>
        <span
          data-part="gave"
          style={abs({
            ...regs.axis,
            color: mutedInk,
            fontWeight: 700,
            opacity: 0,
          })}
        >
          {words.gave}
        </span>
        {parts.map((p) => (
          <div key={p.key}>
            <span
              data-part-name={p.key}
              style={abs({ ...regs.annot, color: inkOnGround, opacity: 0 })}
            >
              {p.label}
            </span>
            <span
              data-part-value={p.key}
              style={abs({
                ...regs.value,
                color: p.value >= 0 ? accentInk : mutedInk,
                fontWeight: 700,
                opacity: 0,
              })}
            >
              {p.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
