/**
 * Six European countries' solar generation, one panel each, 2010 to 2024 — drawn as small multiples
 * THROUGH the design base and delivered as an interactive page.
 *
 * `panels-share-one-scale-or-they-are-not-multiples` — every panel runs 0 to the SAME ceiling on the
 * same years. The moment one panel is fitted to its own data the grid stops being a comparison and
 * becomes six unrelated charts sharing a caption. The component throws rather than draw a panel on a
 * scale of its own, and the cost is stated: on a shared scale the smallest country's curve is nearly
 * flat, and that flatness is the true reading, not a defect.
 *
 * `what-is-shared-is-stated-once-and-what-varies-is-repeated` — the scale, the span and the unit are
 * said ONCE above the grid; the country's name and its last value are repeated in every panel.
 *
 * WHAT THE WEB ADDS. A grid is read as a set of SHAPES — its whole advantage and its whole cost:
 * nothing in a 210-pixel panel can carry fifteen years of numbers. Every panel answers with its
 * country, both ends, the multiple it grew by, its rank, and the year it passed one terawatt-hour.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars } from "#shared/design-base/web.mjs";

const PANEL = { w: 240, h: 130 };
const GAP = { x: 18, y: 34 };

export type Panel = {
  code: string;
  name: string;
  series: { year: number; value: number }[];
  endLabel: string;
  detail: string;
  highlight: boolean;
};

export function DirectedSmallMultiplesWeb({
  panels,
  columns,
  years,
  ceiling,
  sharedNote,
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
  panels: Panel[];
  columns: number;
  years: number[];
  ceiling: number;
  sharedNote: string;
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

  let thread = mix(ground, ink, 0.42);
  if (contrast(thread, ground) < NON_TEXT_CONTRAST_MIN)
    thread = adjustToContrast(thread, ground, NON_TEXT_CONTRAST_MIN) ?? thread;
  const lit = adjustToContrast(accent, ground, NON_TEXT_CONTRAST_MIN) ?? accent;
  const label = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const panelGround = mix(ground, ink, 0.05);

  const rows = Math.ceil(panels.length / columns);
  const width = columns * PANEL.w + (columns - 1) * GAP.x;
  const height = rows * PANEL.h + (rows - 1) * GAP.y + 20;

  const first = years[0];
  const last = years[years.length - 1];
  for (const p of panels)
    for (const s of p.series)
      if (s.value < 0 || s.value > ceiling)
        throw new Error(`${p.name} draws ${s.value} in ${s.year}, outside the shared scale 0–${ceiling}`);

  const originOf = (i: number) => ({
    x: (i % columns) * (PANEL.w + GAP.x),
    y: 20 + Math.floor(i / columns) * (PANEL.h + GAP.y),
  });
  const px = (year: number) => ((year - first) / (last - first)) * PANEL.w;
  const py = (v: number) => PANEL.h - (v / ceiling) * PANEL.h;

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

      <p className="chart-caveat" style={{ ...regs.annot, margin: "6px 0 2px", flex: "0 0 auto" }}>{sharedNote}</p>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: "0px",
          ["--x-axis-h" as string]: "0px",
          aspectRatio: `${width} / ${height}`,
        }}
      >
        <div className="y-axis" />
        <svg
          role="group"
          aria-label={title}
          xmlns="http://www.w3.org/2000/svg"
          className="chart"
          data-hit="cell"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <desc>{alt}</desc>
          <rect x={0} y={0} width={width} height={height} fill={ground} />

          {panels.map((p, i) => {
            const o = originOf(i);
            const line = p.series.map((s, k) => `${k === 0 ? "M" : "L"} ${o.x + px(s.year)} ${o.y + py(s.value)}`).join(" ");
            const area =
              `M ${o.x} ${o.y + PANEL.h} ` +
              p.series.map((s) => `L ${o.x + px(s.year)} ${o.y + py(s.value)}`).join(" ") +
              ` L ${o.x + PANEL.w} ${o.y + PANEL.h} Z`;
            return (
              <g key={p.code}>
                <rect x={o.x} y={o.y} width={PANEL.w} height={PANEL.h} fill={panelGround} />
                <path d={area} fill={p.highlight ? lit : thread} fillOpacity={0.18} />
                <path d={line} fill="none" stroke={p.highlight ? lit : thread} strokeWidth={p.highlight ? 2.2 : 1.6} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                <line x1={o.x} x2={o.x + PANEL.w} y1={o.y + PANEL.h} y2={o.y + PANEL.h} stroke={mix(ground, ink, 0.4)} strokeWidth={1} vectorEffect="non-scaling-stroke" />
              </g>
            );
          })}

          {panels.map((p, i) => {
            const o = originOf(i);
            return (
              <circle
                key={`hit-${p.code}`}
                className="pt"
                cx={o.x + PANEL.w / 2}
                cy={o.y + PANEL.h / 2}
                r={Math.min(PANEL.w, PANEL.h) / 2}
                fill="transparent"
                stroke="none"
                tabIndex={0}
                role="img"
                aria-label={p.detail}
                data-detail={p.detail}
              />
            );
          })}
          <rect className="hit-area" x={0} y={0} width={width} height={height} fill="transparent" pointerEvents="all" />

          {panels.map((p, i) => {
            const o = originOf(i);
            return (
              <g key={`t-${p.code}`}>
                <text pointerEvents="none" x={o.x} y={o.y - 7} fill={p.highlight ? lit : label} fontFamily={String(regs.axis.fontFamily)} fontSize={14} fontWeight={p.highlight ? 700 : (regs.axis.fontWeight as number)}>
                  {p.name}
                </text>
                <text pointerEvents="none" x={o.x + PANEL.w} y={o.y - 7} fill={p.highlight ? lit : label} fontFamily={String(regs.value.fontFamily)} fontSize={14} fontWeight={700} textAnchor="end">
                  {p.endLabel}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="overlay" aria-hidden="true" />
        <div className="x-axis" />
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "6px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "4px 0 0" }}>{source}</p>
    </figure>
  );
}
