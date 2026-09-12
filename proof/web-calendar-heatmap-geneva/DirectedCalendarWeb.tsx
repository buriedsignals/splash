/**
 * Geneva's daily mean temperature through 2024, drawn as a calendar heatmap THROUGH the design base
 * and delivered as an interactive page.
 *
 * WHAT THE WEB ADDS, AND IT IS THE COST THIS FORM PAYS ON PAPER. A calendar grid shows a STREAK —
 * 31 adjacent cells read as a shape rather than a plateau measured against an axis — and it pays for
 * that by making no single cell's value readable. The static plate answers with a binned key and
 * stops there. Here every one of the 366 days answers with its own date, its own mean, its own
 * maximum and the bin it fell in. The shape stays the argument; the number is no longer lost.
 *
 * THE POINTER RESOLVES BY CELL, NOT BY COLUMN. Twelve months share every x on this grid, so the
 * shared script's default — nearest by x — would answer confidently and wrongly. The `<svg>` carries
 * `data-hit="cell"`, which is the opt-in added to `chart-web/assets/interaction.mjs` for exactly this
 * shape of beat.
 *
 * `a-sequential-grid-is-one-hue-cluster` — every filled cell is one hue, the direction's own accent,
 * at increasing strength against the direction's ground. No second hue anywhere.
 * `the-key-prints-its-breaks-in-the-data-s-units` — the key names its bins in °C, because a binned
 * cell cannot be read exactly and a reader is owed the width of the bin instead.
 * `a-missing-cell-is-drawn-as-missing` — 31 February and its four siblings are impossible, not
 * absent: they keep the grid rectangular, drawn hollow with the same stroke as every other cell.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars, noteAnchor } from "#shared/design-base/web.mjs";

const CELL = 27;
const GAP = 2.4;
export const FRAME = { width: 31 * CELL, height: 12 * CELL, xAxisRowPx: 26 };

export type Day = {
  month: number;
  day: number;
  bin: number;
  detail: string;
};

export type Bin = { from: number | null; to: number | null; label: string };

const pct = (value: number, extent: number) => (value / extent) * 100;

export function DirectedCalendarWeb({
  days,
  bins,
  monthLabels,
  dayTicks,
  streak,
  streakNote,
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
  days: Day[];
  bins: Bin[];
  monthLabels: string[];
  dayTicks: number[];
  streak: { month: number; day: number }[];
  streakNote: string;
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

  /** ONE HUE CLUSTER. Every step is the direction's own accent against the direction's own ground,
   *  and the lightest step is lifted until it clears the non-text floor — a bin nobody can see is
   *  not a bin, it is the ground. */
  const ramp = bins.map((_, i) => {
    const t = 0.22 + (i / (bins.length - 1)) * 0.78;
    const c = mix(ground, accent, t);
    return contrast(c, ground) < NON_TEXT_CONTRAST_MIN
      ? (adjustToContrast(c, ground, NON_TEXT_CONTRAST_MIN) ?? c)
      : c;
  });
  const cellEdge = mix(ground, ink, 0.18);
  const outline = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;

  const x = (day: number) => (day - 1) * CELL;
  const y = (month: number) => (month - 1) * CELL;
  const key = new Set(days.map((d) => `${d.month}-${d.day}`));
  const inStreak = new Set(streak.map((s) => `${s.month}-${s.day}`));

  // The streak's own outline is drawn as one path per RUN OF CONSECUTIVE DAYS INSIDE A MONTH, so a
  // run that spans a month boundary reads as two blocks on two rows — which is what it is.
  const runs: { month: number; from: number; to: number }[] = [];
  for (const s of [...streak].sort((a, b) => a.month - b.month || a.day - b.day)) {
    const open = runs[runs.length - 1];
    if (open && open.month === s.month && open.to === s.day - 1) open.to = s.day;
    else runs.push({ month: s.month, from: s.day, to: s.day });
  }

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

      {/* THE KEY, and it names its own breaks. Plain HTML above the grid, at a fixed size: it is
          furniture and must not stretch with the geometry. */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "0 14px",
          margin: "12px 0 8px",
          flex: "0 0 auto",
        }}
      >
        {bins.map((b, i) => (
          <span key={b.label} style={{ ...regs.axis, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 14, height: 14, background: ramp[i], display: "inline-block", borderRadius: 2 }} />
            {b.label}
          </span>
        ))}
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: "40px",
          ["--x-axis-h" as string]: `${FRAME.xAxisRowPx}px`,
          aspectRatio: `${FRAME.width + 40} / ${FRAME.height + FRAME.xAxisRowPx}`,
        }}
      >
        <div className="y-axis">
          {monthLabels.map((label, i) => (
            <span
              key={label}
              className="axis-label y"
              style={{ ...regs.axis, top: `${pct(y(i + 1) + CELL / 2, FRAME.height)}%` }}
            >
              {label}
            </span>
          ))}
        </div>

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

          {/* The impossible cells first: 31 February and its four siblings keep the grid
              rectangular rather than leaving a hole the reader has to interpret. */}
          {Array.from({ length: 12 }, (_, m) => m + 1).flatMap((month) =>
            Array.from({ length: 31 }, (_, d) => d + 1)
              .filter((day) => !key.has(`${month}-${day}`))
              .map((day) => (
                <rect
                  key={`gap-${month}-${day}`}
                  x={x(day) + GAP / 2}
                  y={y(month) + GAP / 2}
                  width={CELL - GAP}
                  height={CELL - GAP}
                  fill="none"
                  stroke={cellEdge}
                  strokeWidth={0.8}
                  strokeDasharray="2 2"
                  vectorEffect="non-scaling-stroke"
                />
              )),
          )}

          {days.map((d) => (
            <rect
              key={`${d.month}-${d.day}`}
              x={x(d.day) + GAP / 2}
              y={y(d.month) + GAP / 2}
              width={CELL - GAP}
              height={CELL - GAP}
              fill={ramp[d.bin]}
              stroke={cellEdge}
              strokeWidth={0.5}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* The streak, outlined where it happens. */}
          {runs.map((r) => (
            <rect
              key={`run-${r.month}-${r.from}`}
              x={x(r.from) + GAP / 2 - 1}
              y={y(r.month) + GAP / 2 - 1}
              width={(r.to - r.from + 1) * CELL - GAP + 2}
              height={CELL - GAP + 2}
              fill="none"
              stroke={outline}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {days.map((d) => (
            <circle
              key={`hit-${d.month}-${d.day}`}
              className="pt"
              cx={x(d.day) + CELL / 2}
              cy={y(d.month) + CELL / 2}
              r={CELL / 2 - GAP}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              aria-label={d.detail}
              data-detail={d.detail}
              data-streak={inStreak.has(`${d.month}-${d.day}`) ? "yes" : undefined}
            />
          ))}
          <rect className="hit-area" x={0} y={0} width={FRAME.width} height={FRAME.height} fill="transparent" pointerEvents="all" />
        </svg>

        <div className="overlay" aria-hidden="true">
          <span
            className="note"
            style={{
              ...regs.annot,
              ...noteAnchor(pct(x(runs[0].from) + CELL / 2, FRAME.width)),
              top: `${pct(y(runs[0].month) - 2, FRAME.height)}%`,
              transform: `${noteAnchor(pct(x(runs[0].from) + CELL / 2, FRAME.width)).transform} translateY(-100%)`,
            }}
          >
            {streakNote}
          </span>
        </div>

        <div className="x-axis">
          {dayTicks.map((d) => (
            <span key={d} className="axis-label x" style={{ ...regs.axis, left: `${pct(x(d) + CELL / 2, FRAME.width)}%` }}>
              {d}
            </span>
          ))}
        </div>
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "10px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
