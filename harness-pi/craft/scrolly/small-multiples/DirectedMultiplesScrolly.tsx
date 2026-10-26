/**
 * Sixteen European countries' low-carbon electricity, 2000 and 2024, drawn THROUGH the design base as small multiples
 * and CHOREOGRAPHED by the scroll. The `small multiples` type in the scrolly format: the subject of
 * `static-small-multiples-lowcarbon` — all sixteen rose, and the lowest starters rose fastest — told with the gestures
 * a scroll can make (`scrolly/references/directed-type-choreography.md`): the panels filling, re-ordered by where they
 * started, condensed into one scatter of start against gain, then re-ordered by gain.
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: one scale, 0 to 100 %, for every panel; no rules between panels, the gap is
 * the boundary; what is shared (the two dates, the ceiling) stated once, what varies (the name, the change) drawn in
 * the panel; the two extremes in the accent.
 *
 * `multiples-drive.mjs` lays out every panel in the reader's pixels on each paint. What is rendered here is the last
 * card's picture, for a reader without a script.
 */

import type { CSSProperties } from "react";
import {
  adjustToContrast,
  mix,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";

export type Panel = {
  key: string;
  label: string;
  from: number;
  to: number;
  delta: number;
  deltaText: string;
  thread: boolean;
};
type Style = Record<string, string | number>;

export const NOTES = [
  "startNote",
  "riseNote",
  "orderNote",
  "corrNote",
  "endsNote",
  "scaleNote",
] as const;

export function DirectedMultiplesScrolly({
  panels,
  orders,
  fit,
  years,
  axes,
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
  /** each ordering as the panel indices in slot order: alphabetical, by 2000 level, by gain */
  orders: number[][];
  /** the least-squares line of gain on the 2000 level: [slope, intercept] */
  fit: [number, number];
  years: string[];
  axes: {
    xName: string;
    yName: string;
    xTicks: number[];
    yTicks: number[];
    yMax: number;
  };
  words: Record<(typeof NOTES)[number], string>;
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
  const fromFill = mix(accent, ground, 0.62);
  const toFill = accent;
  const accentInk =
    adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
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
  // THE LAST CARD'S PICTURE WITHOUT A SCRIPT (kit addition). The drive lays out every panel in the
  // reader's pixels, so with no script the SVG's bars have no geometry and every name and change sat
  // at the stage's top-left corner, overprinted. A <noscript> stylesheet hides the drive's layer and
  // shows the last card's picture: the panels in the order of their gain, six a row, the two bars of
  // each on the one 0–100 scale, every change written, the two extremes in the accent.
  const lastOrder = orders[orders.length - 1].map((i) => panels[i]);
  const stillCols = 6;
  const noScript =
    `[data-multiples] [data-part="stage"] > :not([data-part="still"]) { display: none !important; }` +
    `[data-multiples] [data-part="still"] { display: grid !important; }` +
    `[data-multiples] [data-note="scaleNote"] { opacity: 1 !important; }`;
  const swatch = (fill: string): CSSProperties => ({
    display: "inline-block",
    width: "10px",
    height: "10px",
    background: fill,
    marginRight: "5px",
    verticalAlign: "middle",
  });

  return (
    <div
      role="img"
      aria-label={alt}
      data-multiples={JSON.stringify({
        panels: panels.map(({ key, from, to, thread }) => ({
          key,
          from,
          to,
          thread,
        })),
        orders,
        fit,
        axes: { xTicks: axes.xTicks, yTicks: axes.yTicks, yMax: axes.yMax },
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
        <span style={{ ...regs.annot, color: mutedInk }}>
          <span style={swatch(fromFill)} />
          {years[0]}
          <span style={{ ...swatch(toFill), marginLeft: "14px" }} />
          <span style={{ color: accentInk }}>{years[1]}</span>
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
            gridTemplateColumns: `repeat(${stillCols}, minmax(0, 1fr))`,
            gridAutoRows: "minmax(0, 1fr)",
            rowGap: "26px",
          }}
        >
          {lastOrder.map((p) => (
            <div
              key={p.key}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                minHeight: 0,
                gap: "6px",
              }}
            >
              <span
                style={{
                  ...regs.annot,
                  whiteSpace: "nowrap",
                  color: p.thread ? accentInk : mutedInk,
                  fontWeight: p.thread ? 700 : regs.annot.fontWeight,
                }}
              >
                {p.label}
              </span>
              <span
                style={{
                  flex: "1 1 0",
                  minHeight: "12px",
                  display: "flex",
                  alignItems: "flex-end",
                  gap: "18px",
                  borderBottom: `${stroke.rule ?? 1}px solid ${grid}`,
                  padding: "0 4px",
                }}
              >
                <span
                  style={{
                    display: "block",
                    width: "36px",
                    height: `${p.from}%`,
                    background: fromFill,
                  }}
                />
                <span
                  style={{
                    display: "block",
                    width: "36px",
                    height: `${p.to}%`,
                    background: toFill,
                  }}
                />
              </span>
              <span
                style={{
                  ...regs.value,
                  color: p.thread ? accentInk : mutedInk,
                  fontWeight: 700,
                }}
              >
                {p.deltaText}
              </span>
            </div>
          ))}
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
          <g data-part="scatter-axes" opacity={0}>
            <line
              data-part="x-axis"
              stroke={grid}
              strokeWidth={stroke.rule ?? 1}
            />
            <line
              data-part="y-axis"
              stroke={grid}
              strokeWidth={stroke.rule ?? 1}
            />
            <line
              data-part="fit"
              stroke={accentInk}
              strokeWidth={1.5}
              strokeDasharray="5 4"
            />
          </g>
          {panels.map((p) => (
            <g key={p.key} data-panel={p.key}>
              <line
                data-part="base"
                stroke={grid}
                strokeWidth={stroke.rule ?? 1}
              />
              <rect data-part="from" fill={fromFill} />
              <rect data-part="to" fill={toFill} />
              <circle
                data-part="dot"
                r={4.5}
                fill={p.thread ? accent : mix(accent, ground, 0.35)}
                opacity={0}
              />
            </g>
          ))}
        </svg>

        {panels.map((p) => (
          <div key={p.key}>
            <span
              data-name={p.key}
              style={abs({
                ...regs.annot,
                color: p.thread ? accentInk : mutedInk,
                fontWeight: p.thread ? 700 : regs.annot.fontWeight,
              })}
            >
              {p.label}
            </span>
            <span
              data-delta={p.key}
              style={abs({
                ...regs.value,
                color: p.thread ? accentInk : mutedInk,
                fontWeight: 700,
                opacity: 0,
              })}
            >
              {p.deltaText}
            </span>
          </div>
        ))}
        {axes.xTicks.map((t) => (
          <span
            key={`x${t}`}
            data-x-tick={t}
            style={abs({ ...regs.axis, color: mutedInk, opacity: 0 })}
          >
            {t}
          </span>
        ))}
        {axes.yTicks.map((t) => (
          <span
            key={`y${t}`}
            data-y-tick={t}
            style={abs({ ...regs.axis, color: mutedInk, opacity: 0 })}
          >
            {t}
          </span>
        ))}
        <span
          data-part="x-name"
          style={abs({
            ...regs.axis,
            color: mutedInk,
            fontWeight: 700,
            opacity: 0,
          })}
        >
          {axes.xName}
        </span>
        <span
          data-part="y-name"
          style={abs({
            ...regs.axis,
            color: mutedInk,
            fontWeight: 700,
            opacity: 0,
          })}
        >
          {axes.yName}
        </span>
      </div>
    </div>
  );
}
