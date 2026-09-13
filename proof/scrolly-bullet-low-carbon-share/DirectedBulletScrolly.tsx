/**
 * Low-carbon share of electricity, 2015 against 2024, drawn THROUGH the design base and revealed by
 * the scroll. The `bullet` type in the scrolly format: the plate of `static-bullet-low-carbon-share`,
 * its words and its rules, read one element at a time.
 *
 * THE STATIC PLATE'S RULES, KEPT:
 *   - `the-track-runs-the-full-scale-so-the-remainder-is-legible` — every row's track runs to 100 %;
 *   - `two-states-of-one-measure-are-one-hue-at-two-chromas` — the thick pale bar is 2015, the thin
 *     saturated one in front of it is 2024, both steps of the direction's own accent;
 *   - `the-target-is-named-on-the-line-that-draws-it` — the two states are named on the first row's
 *     own marks, not in a legend;
 *   - `the-verdict-is-written-as-a-derived-number` — every row prints its own change in points;
 *   - the subject's name and verdict in the accent, bold.
 *
 * THE FLUID FRAME. The rows are a CSS grid — name, track, verdict — so the track takes whatever width
 * is left and every length is a percentage of it. The two state names sit where their marks end;
 * `bullet-drive.mjs` measures them in the reader's own pixels and moves the second to a line of its own
 * when the two would touch, which on a phone they do.
 */

import type { CSSProperties } from "react";
import {
  adjustToContrast,
  mix,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";

export type Row = {
  key: string;
  label: string;
  marker: number;
  measure: number;
  verdict: string;
};
type Style = Record<string, string | number>;

export function DirectedBulletScrolly({
  rows,
  subject,
  ceiling,
  markerLabel,
  measureLabel,
  ticks,
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
  rows: Row[];
  subject: string;
  ceiling: number;
  markerLabel: string;
  measureLabel: string;
  ticks: { value: number; label: string }[];
  alt: string;
  regs: Record<
    "display" | "eyebrow" | "body" | "axis" | "annot" | "value",
    Style
  >;
  pad: number;
  stroke: { hairline?: number };
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
}) {
  if (rows[0].key !== subject)
    throw new Error(
      `the subject ${subject} is not the first row, where its states are named`,
    );
  const accentInk =
    adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const markerFill = mix(accent, ground, 0.62);
  const trackFill = mix(ground, ink, 0.07);
  const pct = (v: number) => `${(v / ceiling) * 100}%`;
  const abs = (extra: CSSProperties): CSSProperties => ({
    position: "absolute",
    ...extra,
  });
  /** The thick bar is at most 26px and at most 56 % of its row; the thin one is 46 % of the thick. */
  const thick = "min(26px, 56%)";

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
        gridTemplateColumns: "max-content minmax(0, 1fr) max-content",
        gridTemplateRows: `auto repeat(${rows.length}, minmax(0, 56px)) auto`,
        alignContent: "center",
        columnGap: "clamp(8px, 1.5vw, 16px)",
      }}
    >
      <div
        data-part="key"
        style={{
          gridColumn: 2,
          gridRow: 1,
          position: "relative",
          height: "1.6em",
          ...regs.annot,
        }}
      >
        <span
          data-part="marker-label"
          style={abs({
            ...regs.annot,
            color: mutedInk,
            right: `calc(100% - ${pct(rows[0].marker)} + 6px)`,
            bottom: 0,
            whiteSpace: "nowrap",
          })}
        >
          {markerLabel}
        </span>
        <span
          data-part="measure-label"
          style={abs({
            ...regs.annot,
            color: accentInk,
            fontWeight: 700,
            left: `calc(${pct(rows[0].measure)} + 6px)`,
            bottom: 0,
            whiteSpace: "nowrap",
          })}
        >
          {measureLabel}
        </span>
      </div>

      {rows.map((row, i) => {
        const isSubject = row.key === subject;
        return [
          <span
            key={`n${row.key}`}
            style={{
              ...regs.annot,
              gridColumn: 1,
              gridRow: i + 2,
              alignSelf: "center",
              textAlign: "right",
              whiteSpace: "nowrap",
              color: isSubject ? accentInk : regs.annot.color,
              fontWeight: isSubject ? 700 : regs.annot.fontWeight,
            }}
          >
            {row.label}
          </span>,
          <div
            key={`t${row.key}`}
            style={{ gridColumn: 2, gridRow: i + 2, position: "relative" }}
          >
            <div
              style={abs({
                left: 0,
                right: 0,
                top: "50%",
                height: thick,
                transform: "translateY(-50%)",
                background: trackFill,
              })}
            />
            <div
              data-part="marker"
              style={abs({
                left: 0,
                width: pct(row.marker),
                top: "50%",
                height: thick,
                transform: "translateY(-50%)",
                background: markerFill,
                transformOrigin: "left",
              })}
            />
            <div
              data-part="measure"
              style={abs({
                left: 0,
                width: pct(row.measure),
                top: "50%",
                height: `calc(${thick} * 0.46)`,
                transform: "translateY(-50%)",
                background: accent,
                transformOrigin: "left",
              })}
            />
          </div>,
          <span
            key={`v${row.key}`}
            data-part="verdict"
            style={{
              ...regs.value,
              gridColumn: 3,
              gridRow: i + 2,
              alignSelf: "center",
              whiteSpace: "nowrap",
              color: isSubject ? accentInk : mutedInk,
              fontWeight: isSubject ? 700 : regs.value.fontWeight,
            }}
          >
            {row.verdict}
          </span>,
        ];
      })}

      <div
        style={{
          gridColumn: 2,
          gridRow: rows.length + 2,
          position: "relative",
          height: "1.8em",
          borderTop: `${stroke.hairline ?? 0.6}px solid ${grid}`,
          marginTop: "4px",
        }}
      >
        {ticks.map((t, i) => (
          <span
            key={`k${t.value}`}
            style={abs({
              ...regs.axis,
              color: mutedInk,
              left: pct(t.value),
              top: "4px",
              whiteSpace: "nowrap",
              transform:
                i === 0
                  ? "none"
                  : i === ticks.length - 1
                    ? "translateX(-100%)"
                    : "translateX(-50%)",
            })}
          >
            {t.label}
          </span>
        ))}
      </div>
    </div>
  );
}
