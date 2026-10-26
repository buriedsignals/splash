/**
 * Membership of the world's ten largest CO₂ emitters, 1990–2024, drawn THROUGH the design base as a gantt and
 * CHOREOGRAPHED by the scroll. The `gantt` type in the scrolly format: the subject of `static-gantt-top-ten-tenure`
 * — six countries never left — told with the gestures a scroll can make
 * (`scrolly/references/directed-type-choreography.md`): a playhead sweeping the years with the spans growing behind
 * it, then the six that never left, then the rows with a hole.
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: positioned spans on one date axis; a row's runs drawn as runs, the gap a
 * real gap; the years a row did not hold as a track one step off the ground; the six in the accent; both dates in
 * the row label, an open span with a trailing dash.
 *
 * `gantt-drive.mjs` lays out every row in the reader's pixels on each paint. What is rendered here is the last
 * card's picture in percentages, for a reader without a script.
 */

import type { CSSProperties } from "react";
import {
  adjustToContrast,
  mix,
  NON_TEXT_CONTRAST_MIN,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";

export type Row = {
  key: string;
  label: string;
  dates: string;
  runs: { from: number; to: number; open: boolean }[];
  throughout: boolean;
  gaps: { from: number; to: number }[];
};
type Style = Record<string, string | number>;

export function DirectedGanttScrolly({
  rows,
  first,
  last,
  ticks,
  words,
  alt,
  regs,
  ground,
  accent,
  ink,
  muted,
}: {
  rows: Row[];
  first: number;
  last: number;
  ticks: number[];
  words: { unit: string; yearNote: string; sixNote: string; gapNote: string };
  alt: string;
  regs: Record<
    "display" | "eyebrow" | "body" | "axis" | "annot" | "value",
    Style
  >;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
}) {
  const accentInk =
    adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
  const accentFill =
    adjustToContrast(accent, ground, NON_TEXT_CONTRAST_MIN) ?? accent;
  const mutedFill =
    adjustToContrast(muted, ground, NON_TEXT_CONTRAST_MIN) ?? muted;
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const inkOnGround = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const track = mix(ground, ink, 0.08);
  const span = last + 1 - first;
  const x = (year: number) =>
    `calc(var(--plot-x, 30%) + (100% - var(--plot-x, 30%)) * ${(year - first) / span})`;
  const abs = (extra: CSSProperties): CSSProperties => ({
    position: "absolute",
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
      data-gantt={JSON.stringify({
        rows: rows.map(({ key, runs, throughout, gaps }) => ({
          key,
          runs,
          throughout,
          gaps,
        })),
        first,
        last,
        colours: { accentInk, inkOnGround, mutedInk },
      })}
      style={{
        position: "absolute",
        inset: 0,
        background: ground,
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr) auto",
        gridTemplateColumns: "minmax(0, 1fr)",
        rowGap: "8px",
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
          <span
            data-part="year-note"
            data-template={words.yearNote}
            style={{ ...regs.value, ...slot, color: inkOnGround, opacity: 0 }}
          >
            {words.yearNote.replace("{y}", String(last))}
          </span>
          <span
            data-part="six-note"
            style={{ ...regs.value, ...slot, color: accentInk, opacity: 0 }}
          >
            {words.sixNote}
          </span>
          <span
            data-part="gap-note"
            style={{ ...regs.value, ...slot, color: inkOnGround, opacity: 0 }}
          >
            {words.gapNote}
          </span>
        </span>
      </div>

      <div data-part="stage" style={{ position: "relative", minHeight: 0 }}>
        {rows.map((r, i) => (
          <div
            key={r.key}
            data-row={r.key}
            style={abs({
              left: 0,
              right: 0,
              top: `${(i / rows.length) * 100}%`,
              height: `${100 / rows.length}%`,
            })}
          >
            <span
              data-part="label"
              style={abs({
                ...regs.axis,
                right: "calc(100% - var(--plot-x, 30%) + 10px)",
                top: "50%",
                transform: "translateY(-50%)",
                whiteSpace: "nowrap",
                color: r.throughout ? accentInk : inkOnGround,
              })}
            >
              <span data-part="name">{r.label}</span>
              <span data-part="dates">{` ${r.dates}`}</span>
            </span>
            <div
              data-part="track"
              style={abs({
                left: x(first),
                right: 0,
                top: "20%",
                height: "60%",
                background: track,
              })}
            />
            {r.gaps.map((g, j) => (
              <div
                key={`g${j}`}
                data-gap={j}
                style={abs({
                  left: x(g.from),
                  width: `calc((100% - var(--plot-x, 30%)) * ${(g.to + 1 - g.from) / span})`,
                  top: "8%",
                  height: "84%",
                  boxShadow: `inset 0 0 0 1.5px ${inkOnGround}`,
                  opacity: 0,
                })}
              />
            ))}
            {r.runs.map((run, j) => (
              <div
                key={`r${j}`}
                data-run={j}
                style={abs({
                  left: x(run.from),
                  width: `calc((100% - var(--plot-x, 30%)) * ${(run.to + 1 - run.from) / span})`,
                  top: "20%",
                  height: "60%",
                  background: r.throughout ? accentFill : mutedFill,
                })}
              />
            ))}
          </div>
        ))}
        <div
          data-part="playhead"
          style={abs({
            top: 0,
            bottom: 0,
            width: "2px",
            left: x(last + 1),
            background: inkOnGround,
            opacity: 0,
          })}
        />
      </div>

      <div data-part="ticks" style={{ position: "relative", height: "1.5em" }}>
        {ticks.map((t) => (
          <span
            key={t}
            data-tick={t}
            style={abs({
              ...regs.axis,
              top: 0,
              left: x(t),
              transform: "translateX(-50%)",
              color: mutedInk,
              whiteSpace: "nowrap",
            })}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
