/**
 * ChartFrame — a fitted (never cropped) column chart of yearly museum visits. Geometry stretches
 * across a `preserveAspectRatio="none"` SVG; every word is HTML at a fixed pixel size — the same
 * separation `chart-web`'s genre already keeps, carried into this vehicle per
 * `scrolly-discipline.md`, "scenery cropped, evidence fitted."
 *
 * One component, five states: `revealedCount` (1-4) controls how many of the four COMPLETE years
 * are painted at full opacity — the axis and the y-scale never move, so a step never re-scales the
 * picture underneath the reader. `showPartialNote` controls whether the fifth category slot — kept
 * empty on every step, never a fifth bar — carries the 2026 disclosure. See BRIEF.md, "The decision
 * about the last step."
 */
import type { CSSProperties } from "react";
import type { MuseumFacts } from "./museum-data.ts";

export const CHART_LAYOUT = {
  plot: { left: 0.13, right: 0.97, top: 0.14, bottom: 0.86 },
  viewBox: { width: 1000, height: 500 },
} as const;

export function ChartFrame({
  facts,
  ground,
  ink,
  muted,
  grid,
  accent,
  revealedCount,
  showPartialNote,
}: {
  facts: MuseumFacts;
  ground: string;
  ink: string;
  muted: string;
  grid: string;
  accent: string;
  revealedCount: number;
  showPartialNote: boolean;
}) {
  const { plot, viewBox } = CHART_LAYOUT;
  const pct = (v: number) => `${(v * 100).toFixed(2)}%`;

  // Five category slots, always: the four complete years plus one EMPTY slot for the partial
  // reading. The slot exists on every step (so the axis never shifts when the note arrives at the
  // last one) but never carries a bar.
  const categories = [
    ...facts.complete.map((r) => String(r.period)),
    facts.partial.period,
  ];
  const n = categories.length;
  const bandWidth = viewBox.width / n;
  const barWidth = bandWidth * 0.56;

  const step = 50000;
  const yTicks = Array.from(
    { length: facts.yMax / step + 1 },
    (_, i) => i * step,
  );
  const y = (v: number) => viewBox.height - (v / facts.yMax) * viewBox.height;
  const barX = (i: number) => i * bandWidth + (bandWidth - barWidth) / 2;

  const LEFT = `max(70px, ${pct(plot.left)})`;
  const RIGHT = pct(plot.right);
  const atFrac = (f: number) =>
    `calc(${LEFT} + ${f.toFixed(5)} * (${RIGHT} - ${LEFT}))`;
  const bandCentreFrac = (i: number) =>
    (i * bandWidth + bandWidth / 2) / viewBox.width;

  const label = (style: CSSProperties, text: string, key: string) => (
    <div
      key={key}
      style={{
        position: "absolute",
        fontFamily: "Helvetica, Arial, sans-serif",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {text}
    </div>
  );

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: ground,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: LEFT,
          top: pct(plot.top),
          width: `calc(${RIGHT} - ${LEFT})`,
          height: pct(plot.bottom - plot.top),
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
          preserveAspectRatio="none"
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            overflow: "visible",
          }}
        >
          {yTicks.map((t) => (
            <line
              key={t}
              x1={0}
              x2={viewBox.width}
              y1={y(t)}
              y2={y(t)}
              stroke={t === 0 ? ink : grid}
              strokeWidth={t === 0 ? 2 : 1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {facts.complete.map((r, i) => (
            <rect
              key={r.period}
              x={barX(i)}
              y={y(r.visits)}
              width={barWidth}
              height={viewBox.height - y(r.visits)}
              fill={accent}
              opacity={i < revealedCount ? 1 : 0}
            />
          ))}
        </svg>
      </div>

      {/* Y-axis tick labels — HTML, fixed size, in the left gutter, outside the card's own
          middle stripe at every width by construction (`CHART_LAYOUT.plot.left` = 0.13). */}
      {yTicks.map((t) =>
        label(
          {
            left: 0,
            top: `calc(${pct(plot.top)} + ${((y(t) / viewBox.height) * (plot.bottom - plot.top) * 100).toFixed(2)}% - 7px)`,
            width: LEFT,
            textAlign: "right",
            paddingRight: 10,
            fontSize: 14,
            color: muted,
          },
          t === yTicks[yTicks.length - 1]
            ? `${(t / 1000).toFixed(0)}k visits`
            : `${(t / 1000).toFixed(0)}k`,
          `yt${t}`,
        ),
      )}

      {/* X-axis category labels — one per slot, always drawn (so the axis never shifts), but a
          not-yet-revealed year's label fades in with its bar. The fifth slot's label is the
          partial period's own name, always shown — the reader can see from step one that a fifth,
          different-shaped column is coming. */}
      {categories.map((label_, i) =>
        label(
          {
            left: atFrac(bandCentreFrac(i)),
            top: `calc(${pct(plot.bottom)} + 10px)`,
            transform: "translateX(-50%)",
            fontSize: 14,
            fontWeight: i === n - 1 ? 700 : 400,
            color: muted,
            opacity: i < revealedCount || i === n - 1 ? 1 : 0,
          },
          label_,
          `xt${i}`,
        ),
      )}

      {/* The value printed above each revealed bar — direct annotation, no legend. */}
      {facts.complete.map((r, i) =>
        i < revealedCount
          ? label(
              {
                left: atFrac(bandCentreFrac(i)),
                top: `calc(${pct(plot.top)} + ${((y(r.visits) / viewBox.height) * (plot.bottom - plot.top) * 100).toFixed(2)}% - 24px)`,
                transform: "translateX(-50%)",
                fontSize: 15,
                fontWeight: 600,
                color: accent,
              },
              r.visits.toLocaleString("en-US"),
              `val${i}`,
            )
          : null,
      )}

      {/* THE PARTIAL YEAR'S NOTE — no bar, ever, in this slot. Appears only on the step that
          discloses it. Positioned in the fifth slot's own column, low in the plot (near the
          baseline, where a short bar would sit) so it reads as belonging to that slot without
          being drawn as one. */}
      {showPartialNote && (
        <div
          style={{
            position: "absolute",
            left: atFrac(bandCentreFrac(n - 1)),
            top: `calc(${pct(plot.top)} + ${(0.52 * (plot.bottom - plot.top) * 100).toFixed(2)}%)`,
            transform: "translateX(-50%)",
            width: 190,
            textAlign: "center",
            fontSize: 14,
            lineHeight: 1.35,
            color: muted,
            fontFamily: "Helvetica, Arial, sans-serif",
          }}
        >
          {facts.partial.visits.toLocaleString("en-US")} visits
          <br />
          (Jan–Mar only —
          <br />
          not a full year,
          <br />
          not plotted)
        </div>
      )}
    </div>
  );
}
