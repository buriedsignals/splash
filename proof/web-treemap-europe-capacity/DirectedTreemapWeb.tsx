/**
 * Europe's low-carbon generating capacity, one cell per country, sized by megawatts — drawn as a
 * squarified treemap THROUGH the design base and delivered as an interactive page.
 *
 * `the-set-a-claim-adds-up-is-drawn-as-a-set` — the cells are the whole: every country with
 * low-carbon capacity in the frozen file is drawn, and the ones too small to hold a name are still
 * drawn and still counted. A treemap that quietly drops its tail is a pie chart with better manners.
 *
 * `a-narrow-cell-degrades-its-label-rather-than-dropping-it` — a cell wide enough for a name and a
 * number gets both; one that fits only a name gets the name; one that fits neither is named by the
 * pointer. Degrading, never dropping.
 *
 * `accent-marks-the-thread` — the accent marks the countries the headline is about, not the largest
 * cell. A treemap's largest cell already shouts by being large; spending the accent on it says
 * nothing twice.
 *
 * WHAT THE WEB ADDS. A treemap's cells are AREAS, and an area is the encoding a reader can rank and
 * cannot measure — worse here, because two cells of the same area can have completely different
 * mixes. Every cell answers with the country, its megawatts, its share of the continent, its station
 * count, and the split between water-and-atom and wind-and-sun that the tipping claim rests on.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars, inkOnFill } from "#shared/design-base/web.mjs";

export const FRAME = { width: 980, height: 480 };

export type Cell = {
  key: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  tipped: boolean;
  label: "full" | "name" | "none";
  value: string;
  detail: string;
};

const pct = (value: number, extent: number) => (value / extent) * 100;

export function DirectedTreemapWeb({
  cells,
  tippedNote,
  title,
  eyebrow,
  caveat,
  source,
  alt,
  reading,
  direction,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  cells: Cell[];
  tippedNote: string;
  title: string;
  eyebrow: string;
  caveat: string;
  source: string;
  alt: string;
  reading: string;
  direction: any;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
}) {
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });

  let neutral = mix(ground, ink, 0.3);
  if (contrast(neutral, ground) < NON_TEXT_CONTRAST_MIN)
    neutral = adjustToContrast(neutral, ground, NON_TEXT_CONTRAST_MIN) ?? neutral;
  const lit = adjustToContrast(accent, ground, NON_TEXT_CONTRAST_MIN) ?? accent;
  const fillOf = (c: Cell) => (c.tipped ? lit : neutral);

  return (
    <figure
      className="chart-figure"
      style={{
        ["--ground" as string]: ground,
        ["--accent" as string]: accent,
        ["--ink" as string]: ink,
        ["--muted" as string]: muted,
        ...figureVars(regs),
      }}
    >
      <div className="chart-header">
        <p className="chart-eyebrow" style={{ ...regs.eyebrow, margin: "0 0 6px" }}>{eyebrow}</p>
        <h2 className="chart-title" style={{ ...regs.display, margin: "0 0 6px" }}>{title}</h2>
        <p className="chart-caveat" style={{ ...regs.body, margin: 0 }}>{caveat}</p>
      </div>

      <p className="chart-caveat" style={{ ...regs.annot, margin: "8px 0 4px", flex: "0 0 auto" }}>{tippedNote}</p>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: "0px",
          ["--x-axis-h" as string]: "0px",
          aspectRatio: `${FRAME.width} / ${FRAME.height}`,
        }}
      >
        <div className="y-axis" />
        <svg
          role="group"
          aria-label={title}
          xmlns="http://www.w3.org/2000/svg"
          className="chart"
          data-hit="cell"
          viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
          preserveAspectRatio="none"
        >
          <desc>{alt}</desc>
          <rect x={0} y={0} width={FRAME.width} height={FRAME.height} fill={ground} />

          {cells.map((c) => (
            <rect
              key={c.key}
              x={c.x}
              y={c.y}
              width={c.w}
              height={c.h}
              fill={fillOf(c)}
              stroke={ground}
              strokeWidth={1.4}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {cells.map((c) => (
            <circle
              key={`hit-${c.key}`}
              className="pt"
              cx={c.x + c.w / 2}
              cy={c.y + c.h / 2}
              r={Math.max(3, Math.min(c.w, c.h) / 2)}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              aria-label={c.detail}
              data-detail={c.detail}
            />
          ))}
          <rect className="hit-area" x={0} y={0} width={FRAME.width} height={FRAME.height} fill="transparent" pointerEvents="all" />
        </svg>

        <div className="overlay" aria-hidden="true">
          {cells.filter((c) => c.label !== "none").map((c) => (
            <span
              key={`l-${c.key}`}
              className="end-label"
              style={{
                ...regs.value,
                fontSize: `${Math.max(10, Number.parseFloat(regs.value.fontSize as string) - 3)}px`,
                color: inkOnFill(fillOf(c), { ink, ground }, contrast, adjustToContrast, TEXT_CONTRAST_MIN),
                left: `${pct(c.x + 6, FRAME.width)}%`,
                top: `${pct(c.y + 6, FRAME.height)}%`,
                // `transform: none` is LOAD-BEARING. The shared stylesheet gives `.end-label` a
                // `translate(-100%, -50%)` — right for a label that hangs off the end of a line,
                // fatal for one seated in the top-left corner of its own cell: it pulls the label
                // clean out of the frame, and the format's overlay probe lands on nothing.
                transform: "none",
                background: "transparent",
                padding: 0,
                whiteSpace: "normal",
                lineHeight: 1.1,
                maxWidth: `${pct(c.w - 10, FRAME.width)}%`,
                overflowWrap: "anywhere",
              }}
            >
              {c.label === "full" ? (
                <>
                  {c.name}
                  <br />
                  <span style={{ fontWeight: 400 }}>{c.value}</span>
                </>
              ) : (
                c.name
              )}
            </span>
          ))}
        </div>
        <div className="x-axis" />
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "10px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
