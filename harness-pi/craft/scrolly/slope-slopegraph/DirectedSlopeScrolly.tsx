/**
 * Sixteen European countries' low-carbon electricity, 2000 and 2024, drawn THROUGH the design base as a slope chart
 * and CHOREOGRAPHED by the scroll. The `slope` type in the scrolly format: the subject of `static-slope-europe-lowcarbon`
 * — all sixteen rose, and one country overtook France — told with the gestures a scroll can make
 * (`scrolly/references/directed-type-choreography.md`): the first rail alone, the slopes growing to the second, every
 * crossing marked, the one pair isolated, the largest gains, then the static plate's six lines.
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: no value axis, so every end value drawn is written; each rail headed by its
 * year; the change a third fact at a third weight; one colour end to end, the accent on the pair that crosses.
 *
 * `slope-drive.mjs` lays out every line and label in the reader's pixels on each paint. What is rendered here is the
 * last card's picture, for a reader without a script.
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
  deltaText: string;
  thread: boolean;
  gain: boolean;
  drawn: boolean;
};
type Style = Record<string, string | number>;

export const NOTES = [
  "railNote",
  "riseNote",
  "crossNote",
  "pairNote",
  "gainNote",
  "sixNote",
] as const;

export function DirectedSlopeScrolly({
  lines,
  crossings,
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
  /** [index a, index b, t along the slope, value at the crossing] */
  crossings: [number, number, number, number][];
  years: string[];
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
  const rest = mix(muted, ground, 0.25);
  const series = stroke.series ?? 2;
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
  const inkOf = (l: Line) =>
    l.thread ? accentInk : l.gain ? inkOnGround : mutedInk;

  // THE LAST CARD'S PICTURE WITHOUT A SCRIPT (kit addition). The drive lays out every line and label
  // in the reader's pixels, so with no script the SVG's lines have no geometry and every label sat
  // at the stage's top-left corner, overprinted. A <noscript> stylesheet hides the drive's layer and
  // shows the last card's picture: the lines the static plate keeps, on the same 0–100 scale for
  // both rails, every end value and change written, the pair in the accent. Labels are relaxed on
  // each rail in percent of the plot's height, as the drive relaxes them in pixels.
  const still = lines.filter((l) => l.drawn);
  const PITCH = 4.2;
  const seatsOf = (key: "from" | "to") => {
    const seats = still
      .map((l) => ({ key: l.key, y: (1 - l[key] / 100) * 100 }))
      .sort((a, b) => a.y - b.y);
    for (let i = 0; i < seats.length; i++)
      seats[i].y = Math.max(seats[i].y, i ? seats[i - 1].y + PITCH : 0);
    for (let i = seats.length - 1; i >= 0; i--)
      seats[i].y = Math.min(
        seats[i].y,
        i < seats.length - 1 ? seats[i + 1].y - PITCH : 100,
      );
    return Object.fromEntries(seats.map((s) => [s.key, s.y]));
  };
  const leftSeat = seatsOf("from");
  const rightSeat = seatsOf("to");
  const stillCell = (column: number): CSSProperties => ({
    position: "relative",
    gridRow: 2,
    gridColumn: column,
    margin: "14px 0",
  });
  const seated = (y: number, extra: CSSProperties = {}): CSSProperties => ({
    position: "absolute",
    top: `${y.toFixed(3)}%`,
    transform: "translateY(-50%)",
    whiteSpace: "nowrap",
    ...extra,
  });
  const sizer: CSSProperties = {
    height: 0,
    overflow: "hidden",
    visibility: "hidden",
    whiteSpace: "nowrap",
  };
  const noScript =
    `[data-slope] [data-part="stage"] > :not([data-part="still"]) { display: none !important; }` +
    `[data-slope] [data-part="still"] { display: grid !important; }` +
    `[data-slope] [data-note="sixNote"] { opacity: 1 !important; }`;

  return (
    <div
      role="img"
      aria-label={alt}
      data-slope={JSON.stringify({
        lines: lines.map(({ key, from, to, thread, gain, drawn }) => ({
          key,
          from,
          to,
          thread,
          gain,
          drawn,
        })),
        crossings,
        colours: { rest, thread: accent, gain: inkOnGround },
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

      <noscript
        style={{ display: "none" }}
        dangerouslySetInnerHTML={{ __html: `<style>${noScript}</style>` }}
      />
      <div data-part="stage" style={{ position: "relative", minHeight: 0 }}>
        <div
          data-part="still"
          style={{
            display: "none",
            position: "absolute",
            inset: 0,
            gridTemplateColumns:
              "max-content minmax(0, 1fr) max-content max-content",
            gridTemplateRows: "auto minmax(0, 1fr)",
            columnGap: "10px",
          }}
        >
          <div
            style={{
              gridRow: 1,
              gridColumn: 2,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            {years.map((y, i) => (
              <span
                key={y}
                style={{
                  ...regs.axis,
                  color: mutedInk,
                  fontWeight: 700,
                  transform: `translateX(${i ? 50 : -50}%)`,
                }}
              >
                {y}
              </span>
            ))}
          </div>
          <div style={stillCell(1)}>
            <div style={sizer}>
              {still.map((l) => (
                <div key={l.key}>
                  <span style={{ ...regs.annot, fontWeight: 700 }}>{l.label}</span>
                  <span style={{ ...regs.value, fontWeight: 700, marginLeft: "0.4em" }}>
                    {l.fromText}
                  </span>
                </div>
              ))}
            </div>
            {still.map((l) => (
              <span key={l.key} style={seated(leftSeat[l.key], { right: 0 })}>
                <span
                  style={{
                    ...regs.annot,
                    color: inkOf(l),
                    fontWeight: l.thread ? 700 : regs.annot.fontWeight,
                  }}
                >
                  {l.label}
                </span>
                <span
                  style={{
                    ...regs.value,
                    color: inkOf(l),
                    fontWeight: 700,
                    marginLeft: "0.4em",
                  }}
                >
                  {l.fromText}
                </span>
              </span>
            ))}
          </div>
          <div style={stillCell(2)}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 1000 1000"
              preserveAspectRatio="none"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                overflow: "visible",
              }}
            >
              {[0, 1000].map((x) => (
                <line
                  key={x}
                  x1={x}
                  x2={x}
                  y1={0}
                  y2={1000}
                  stroke={grid}
                  strokeWidth={stroke.rule ?? 1}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {still.map((l) => (
                <line
                  key={l.key}
                  x1={0}
                  y1={(1 - l.from / 100) * 1000}
                  x2={1000}
                  y2={(1 - l.to / 100) * 1000}
                  stroke={l.thread ? accent : rest}
                  strokeWidth={series * (l.thread ? 1 : 0.55)}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
          </div>
          <div style={stillCell(3)}>
            <div style={sizer}>
              {still.map((l) => (
                <div key={l.key} style={{ ...regs.value, fontWeight: 700 }}>
                  {l.toText}
                </div>
              ))}
            </div>
            {still.map((l) => (
              <span
                key={l.key}
                style={seated(rightSeat[l.key], {
                  left: 0,
                  ...regs.value,
                  color: inkOf(l),
                  fontWeight: 700,
                })}
              >
                {l.toText}
              </span>
            ))}
          </div>
          <div style={stillCell(4)}>
            <div style={sizer}>
              {still.map((l) => (
                <div key={l.key} style={{ ...regs.annot }}>
                  {l.deltaText}
                </div>
              ))}
            </div>
            {still.map((l) => (
              <span
                key={l.key}
                style={seated(rightSeat[l.key], {
                  left: 0,
                  ...regs.annot,
                  color: inkOf(l),
                })}
              >
                {l.deltaText}
              </span>
            ))}
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
          {years.map((y) => (
            <line
              key={y}
              data-rail={y}
              stroke={grid}
              strokeWidth={stroke.rule ?? 1}
            />
          ))}
          {lines.map((l) => (
            <g key={l.key} data-line={l.key}>
              <line
                data-part="slope"
                stroke={rest}
                strokeWidth={series * 0.55}
                strokeLinecap="round"
              />
              <circle data-part="from" r={3} fill={rest} />
              <circle data-part="to" r={3} fill={rest} />
            </g>
          ))}
          {crossings.map((_, i) => (
            <circle
              key={i}
              data-crossing={i}
              r={4}
              fill="none"
              stroke={inkOnGround}
              strokeWidth={1.4}
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
            <span data-left={l.key} style={abs({ textAlign: "right" })}>
              <span
                style={{
                  ...regs.annot,
                  color: inkOf(l),
                  fontWeight: l.thread ? 700 : regs.annot.fontWeight,
                }}
              >
                {l.label}
              </span>
              <span
                style={{
                  ...regs.value,
                  color: inkOf(l),
                  fontWeight: 700,
                  marginLeft: "0.4em",
                }}
              >
                {l.fromText}
              </span>
            </span>
            <span
              data-right={l.key}
              style={abs({
                ...regs.value,
                color: inkOf(l),
                fontWeight: 700,
                opacity: 0,
              })}
            >
              {l.toText}
            </span>
            <span
              data-delta={l.key}
              style={abs({ ...regs.annot, color: inkOf(l), opacity: 0 })}
            >
              {l.deltaText}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
