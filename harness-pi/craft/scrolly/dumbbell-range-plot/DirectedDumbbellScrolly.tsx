/**
 * Life expectancy in ten countries, 2000 to 2023, drawn THROUGH the design base as a dumbbell and CHOREOGRAPHED by the
 * scroll. The `dumbbell` type in the scrolly format: the subject of `more-dumbbell-life-expectancy-gains` — every one of
 * the ten gained, Poland most, the United States least — told with the gestures a scroll can make
 * (`scrolly/references/directed-type-choreography.md`): the 2000 dots, each country's later dot travelling year by year
 * to 2019, back in 2021, on to 2023, then the rows sorted by what they gained.
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: one shared value scale, fitted and not anchored at zero (a position encoding);
 * the gap written; rows sorted by gap once the gap is the subject; values set beside their dots, never inside a fill.
 *
 * `dumbbell-drive.mjs` lays out every row in the reader's pixels on each paint. What is rendered here is the last card's
 * picture, for a reader without a script.
 */

import type { CSSProperties } from "react";
import {
  adjustToContrast,
  contrast,
  mix,
  NON_TEXT_CONTRAST_MIN,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";

export type Row = {
  key: string;
  label: string;
  series: number[];
  gainText: string;
  lossText: string;
  marked: boolean;
  /** the row the sort card reads, the rest stepping back */
  focus: boolean;
};
type Style = Record<string, string | number>;

export const NOTES = [
  "startNote",
  "riseNote",
  "dipNote",
  "gainNote",
  "sortNote",
  "readNote",
] as const;

export function DirectedDumbbellScrolly({
  rows,
  years,
  orders,
  domain,
  ticks,
  dipFrom,
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
  rows: Row[];
  years: number[];
  /** row indices in slot order: by first-year value, by gain */
  orders: number[][];
  domain: [number, number];
  ticks: number[];
  dipFrom: number;
  words: Record<
    (typeof NOTES)[number] | "unit" | "yearTemplate" | "yearFirst",
    string
  >;
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
  let early = mix(accent, ground, 0.55);
  if (contrast(early, ground) < NON_TEXT_CONTRAST_MIN)
    early =
      adjustToContrast(early, ground, NON_TEXT_CONTRAST_MIN) ??
      mix(accent, ground, 0.35);
  const bar = mix(ground, ink, 0.25);
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
  const one = (v: number) =>
    (Math.round(v * 10) / 10).toFixed(1).replace(".", ",");

  // THE LAST CARD'S PICTURE WITHOUT A SCRIPT (kit addition). The drive lays out every row in the reader's
  // pixels, so with no script the SVG's marks have no geometry and every name and value sits at the
  // stage's top-left corner, overprinted. A <noscript> stylesheet hides the drive's layer and shows a
  // static grid of the last card's rows — sorted by gain, on the same fitted scale, every value and gain
  // written, the two marked rows' names in the accent.
  const stillRows = orders[orders.length - 1].map((i) => rows[i]);
  const at = (v: number) => `${((v - domain[0]) / (domain[1] - domain[0])) * 100}%`;
  const noScript =
    `[data-dumbbell] [data-part="stage"] > :not([data-part="still"]) { display: none !important; }` +
    `[data-dumbbell] [data-part="still"] { display: grid !important; }` +
    `[data-dumbbell] [data-note="readNote"] { opacity: 1 !important; }`;

  return (
    <div
      role="img"
      aria-label={alt}
      data-dumbbell={JSON.stringify({
        rows: rows.map((r) => ({
          key: r.key,
          series: r.series.map((v) => Math.round(v * 10000) / 10000),
          marked: r.marked,
          focus: r.focus,
        })),
        years,
        orders,
        domain,
        ticks,
        dipFrom,
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
          <span
            data-part="year"
            data-template={words.yearTemplate}
            data-first={words.yearFirst}
            style={{
              ...regs.value,
              color: accentInk,
              fontWeight: 700,
              marginLeft: "0.8em",
              whiteSpace: "nowrap",
            }}
          >
            {words.yearTemplate.replace(
              "{year}",
              String(years[years.length - 1]),
            )}
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
        <div
          data-part="still"
          style={{
            display: "none",
            position: "absolute",
            inset: 0,
            gridTemplateColumns: "max-content minmax(0, 1fr) max-content",
            gridTemplateRows: `repeat(${stillRows.length}, minmax(0, 1fr)) auto`,
            alignItems: "center",
            columnGap: "18px",
          }}
        >
          {stillRows.map((r) => {
            const first = r.series[0];
            const last = r.series[r.series.length - 1];
            const up = last >= first;
            return (
              <div key={r.key} style={{ display: "contents" }}>
                <span style={{ ...regs.annot, gridColumn: 1, whiteSpace: "nowrap", color: r.marked ? accentInk : inkOnGround, fontWeight: r.marked ? 700 : regs.annot.fontWeight }}>
                  {r.label}
                </span>
                <div style={{ gridColumn: 2, position: "relative", height: "100%" }}>
                  {ticks.map((t) => (
                    <span key={t} style={{ position: "absolute", top: 0, bottom: 0, left: at(t), width: `${rule}px`, background: grid }} />
                  ))}
                  <span style={{ position: "absolute", top: "50%", height: `${rule * 3}px`, transform: "translateY(-50%)", left: at(Math.min(first, last)), width: `${(Math.abs(last - first) / (domain[1] - domain[0])) * 100}%`, background: bar, borderRadius: "2px" }} />
                  <span style={{ position: "absolute", top: "50%", left: at(first), width: "11px", height: "11px", borderRadius: "50%", transform: "translate(-50%, -50%)", background: early }} />
                  <span style={{ position: "absolute", top: "50%", left: at(last), width: "11px", height: "11px", borderRadius: "50%", transform: "translate(-50%, -50%)", background: accent }} />
                  <span style={{ ...regs.axis, position: "absolute", top: "50%", whiteSpace: "nowrap", color: mutedInk, textShadow: halo, ...(up ? { right: `calc(100% - ${at(first)} + 10px)` } : { left: `calc(${at(first)} + 10px)` }), transform: "translateY(-50%)" }}>
                    {one(first)}
                  </span>
                  <span style={{ ...regs.value, position: "absolute", top: "50%", whiteSpace: "nowrap", color: accentInk, fontWeight: 700, textShadow: halo, ...(up ? { left: `calc(${at(last)} + 10px)` } : { right: `calc(100% - ${at(last)} + 10px)` }), transform: "translateY(-50%)" }}>
                    {one(last)}
                  </span>
                </div>
                <span style={{ ...regs.value, gridColumn: 3, whiteSpace: "nowrap", textAlign: "right", color: inkOnGround, fontWeight: 700 }}>
                  {r.gainText}
                </span>
              </div>
            );
          })}
          <div style={{ gridColumn: 2, position: "relative", height: "1.6em" }}>
            {ticks.map((t) => (
              <span key={t} style={{ ...regs.axis, position: "absolute", top: "4px", left: at(t), transform: "translateX(-50%)", color: mutedInk, whiteSpace: "nowrap" }}>
                {t}
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
          {ticks.map((t) => (
            <line key={t} data-grid={t} stroke={grid} strokeWidth={rule} />
          ))}
          {rows.map((r) => (
            <g key={r.key} data-row={r.key}>
              <line
                data-part="bar"
                stroke={bar}
                strokeWidth={rule * 3}
                strokeLinecap="round"
              />
              <circle
                data-part="ghost"
                r={5}
                fill="none"
                stroke={inkOnGround}
                strokeWidth={1.2}
                strokeDasharray="2 2"
                opacity={0}
              />
              <circle data-part="from" r={5.5} fill={early} />
              <circle data-part="head" r={5.5} fill={accent} />
            </g>
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
        {rows.map((r) => (
          <div key={r.key}>
            <span
              data-name={r.key}
              style={abs({
                ...regs.annot,
                color: r.marked ? accentInk : inkOnGround,
                fontWeight: r.marked ? 700 : regs.annot.fontWeight,
              })}
            >
              {r.label}
            </span>
            <span
              data-from-value={r.key}
              style={abs({ ...regs.axis, color: mutedInk, textShadow: halo })}
            >
              {one(r.series[0])}
            </span>
            <span
              data-head-value={r.key}
              style={abs({
                ...regs.value,
                color: accentInk,
                fontWeight: 700,
                textShadow: halo,
              })}
            >
              {one(r.series[r.series.length - 1])}
            </span>
            <span
              data-gain={r.key}
              style={abs({
                ...regs.value,
                color: inkOnGround,
                fontWeight: 700,
                opacity: 0,
              })}
            >
              {r.gainText}
            </span>
            <span
              data-loss={r.key}
              style={abs({
                ...regs.value,
                color: inkOnGround,
                fontWeight: 700,
                textShadow: halo,
                opacity: 0,
              })}
            >
              {r.lossText}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
