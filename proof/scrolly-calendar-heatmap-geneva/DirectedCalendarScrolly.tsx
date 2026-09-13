/**
 * Geneva's 2024, one cell per day, drawn THROUGH the design base and revealed by the scroll. The
 * `calendar heatmap` type in the scrolly format: the plate of `static-calendar-heatmap-geneva`, its
 * words and its rules, read one element at a time.
 *
 * THE STATIC PLATE'S RULES, KEPT:
 *   - `a-sequential-grid-is-one-hue-cluster` — six bins stepping one hue between a pale step off the
 *     ground and the accent deepened toward the ink;
 *   - `a-missing-cell-is-drawn-as-missing` — the five impossible dates in a neutral outside the ramp,
 *     separated from its low end by lightness as well as hue;
 *   - `the-key-prints-its-breaks-in-the-data-s-units` — every bin prints its own break in °C;
 *   - the streak is outlined in the INK, in the gutter around the block, over a halo of the ground, so
 *     it holds over a dark cell and a pale one alike and is never read as a value.
 *
 * THE FLUID FRAME. The calendar is a CSS grid — month names, then 31 columns that share whatever width
 * is left — so a cell is as wide as the frame allows and never stretched text. The streak's outline is
 * one box per month it crosses, placed on the same grid lines as the cells it surrounds, and it draws
 * itself in the order of the days as the reader scrolls.
 */

import type { CSSProperties } from "react";
import {
  adjustToContrast,
  mix,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";

export type Day = { month: number; day: number; value: number };
export type Run = { month: number; from: number; to: number };
type Style = Record<string, string | number>;

export function DirectedCalendarScrolly({
  days,
  months,
  breaks,
  runs,
  keyLabel,
  missingLabel,
  format,
  alt,
  regs,
  pad,
  stroke,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  days: Day[];
  months: string[];
  breaks: number[];
  runs: Run[];
  keyLabel: string;
  missingLabel: string;
  format: (v: number) => string;
  alt: string;
  regs: Record<
    "display" | "eyebrow" | "body" | "axis" | "annot" | "value",
    Style
  >;
  pad: number;
  stroke: { rule?: number; hairline?: number };
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
}) {
  const cold = mix(accent, ground, 0.88);
  const warm = mix(accent, ink, 0.25);
  const bins = breaks.length + 1;
  const bin = (value: number) => breaks.filter((b) => value >= b).length;
  const rampFill = (index: number) =>
    mix(cold, warm, bins > 1 ? index / (bins - 1) : 0.5);
  const missingFill = mix(ground, ink, 0.06);
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const byDate = new Map(days.map((d) => [`${d.month}-${d.day}`, d]));
  const daysInMonth = (month: number) => new Date(2024, month + 1, 0).getDate();
  const hairline = stroke.hairline ?? 0.6;
  const rule = stroke.rule ?? 1;
  const gap = "clamp(1px, 0.25vw, 3px)";
  const cellStyle = (fill: string): CSSProperties => ({
    background: fill,
    boxShadow: `inset 0 0 0 ${hairline}px ${grid}`,
  });
  const axisStyle: CSSProperties = {
    ...regs.axis,
    color: mutedInk,
    whiteSpace: "nowrap",
  };

  return (
    <div
      role="img"
      aria-label={alt}
      style={{
        position: "absolute",
        inset: 0,
        background: ground,
        padding: `clamp(12px, 3vh, ${pad * 0.6}px) clamp(16px, 5vw, ${pad}px)`,
        display: "grid",
        gridTemplateRows: "minmax(0, 1fr) auto",
        rowGap: "12px",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `max-content repeat(31, minmax(0, 1fr))`,
          gridTemplateRows: `auto repeat(12, minmax(0, 40px))`,
          gap,
          alignContent: "center",
          minHeight: 0,
        }}
      >
        {[1, 5, 10, 15, 20, 25, 31].map((day) => (
          <span
            key={`d${day}`}
            style={{
              ...axisStyle,
              gridColumn: day + 1,
              gridRow: 1,
              justifySelf: "center",
              paddingBottom: "4px",
            }}
          >
            {day}
          </span>
        ))}
        {months.map((name, month) => (
          <span
            key={name}
            style={{
              ...axisStyle,
              gridColumn: 1,
              gridRow: month + 2,
              alignSelf: "center",
              justifySelf: "end",
              paddingRight: "6px",
            }}
          >
            {name}
          </span>
        ))}
        {months.flatMap((_, month) =>
          Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
            const reading = byDate.get(`${month}-${day}`);
            if (!reading && day <= daysInMonth(month))
              throw new Error(`no reading for ${month + 1}/${day}`);
            return (
              <div
                key={`${month}-${day}`}
                style={{
                  ...cellStyle(
                    reading ? rampFill(bin(reading.value)) : missingFill,
                  ),
                  gridColumn: day + 1,
                  gridRow: month + 2,
                }}
              />
            );
          }),
        )}
        {runs.map((run) => (
          <div
            key={`run${run.month}`}
            data-part="run"
            data-days={run.to - run.from + 1}
            style={{
              gridColumn: `${run.from + 1} / ${run.to + 2}`,
              gridRow: run.month + 2,
              margin: `calc(-1 * ${gap})`,
              border: `${rule * 2}px solid ${ink}`,
              boxShadow: `0 0 0 ${rule * 1.5}px ${ground}, inset 0 0 0 ${rule * 1.5}px ${ground}`,
              pointerEvents: "none",
              zIndex: 1,
            }}
          />
        ))}
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          gap: "6px 16px",
          paddingLeft: "2px",
        }}
      >
        <div
          style={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: `repeat(${bins}, 28px)`,
            gap: "2px",
            paddingBottom: "1.5em",
          }}
        >
          {Array.from({ length: bins }, (_, i) => (
            <div
              key={`k${i}`}
              style={{
                position: "relative",
                height: "12px",
                ...cellStyle(rampFill(i)),
              }}
            >
              {i < breaks.length && (
                <span
                  style={{
                    ...axisStyle,
                    position: "absolute",
                    left: "100%",
                    top: "14px",
                    transform: "translateX(-50%)",
                  }}
                >
                  {format(breaks[i])}
                </span>
              )}
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gap: "4px" }}>
          <span style={axisStyle}>{keyLabel}</span>
          <span
            style={{
              ...axisStyle,
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: "28px",
                height: "12px",
                ...cellStyle(missingFill),
              }}
            />
            {missingLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
