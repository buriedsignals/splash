/**
 * Ukrainians under temporary protection per 1 000 inhabitants, one hexagon per host country — drawn
 * as a hex cartogram THROUGH the design base and delivered as an interactive page.
 *
 * ONE UNIT, ONE CELL, ALL CELLS EQUAL. The map gives up area and buys what a choropleth of the same
 * data cannot give: every country equally visible. On a subject whose units are countries rather
 * than land, that is the honest trade, and the caveat states both halves of it.
 *
 * WHAT THE HEXAGON BUYS OVER THE SQUARE: six neighbours, every one of them edge-sharing. A square
 * grid touches diagonally, so a reader has to decide whether corner contact counts as adjacency; a
 * hexagon has no corners to argue about. That is why the odd rows are offset by half a cell.
 *
 * `the-key-prints-its-breaks-in-the-data-s-units` — the key names its classes in people per 1 000.
 * `a-sequential-grid-is-one-hue-cluster` — one hue, monotone in lightness.
 *
 * WHAT THE WEB ADDS. A hex cartogram throws away geography's own information — size, shape,
 * adjacency beyond the designed layout — to make every unit visible. Every cell here answers with
 * the country, the count, the population it is divided by, the rate, and its rank in BOTH rankings:
 * the one this map draws and the one the flow map next door draws.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars, inkOnFill } from "#shared/design-base/web.mjs";

export type Cell = {
  code: string;
  name: string;
  cx: number;
  cy: number;
  klass: number | null;
  label: string;
  value: string;
  detail: string;
};

export function DirectedHexGridWeb({
  cells,
  classes,
  originLabel,
  radius,
  width,
  height,
  title,
  eyebrow,
  caveat,
  source,
  alt,
  reading,
  claimNote,
  direction,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  cells: Cell[];
  classes: { label: string }[];
  originLabel: string;
  radius: number;
  width: number;
  height: number;
  title: string;
  eyebrow: string;
  caveat: string;
  source: string;
  alt: string;
  reading: string;
  claimNote: string;
  direction: any;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
}) {
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });

  const ramp = classes.map((_, i) => mix(ground, accent, 0.14 + (i / (classes.length - 1)) * 0.86));
  const originFill = mix(ground, ink, 0.16);
  const edge = mix(ground, ink, 0.3);

  const hex = (cx: number, cy: number) =>
    Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 180) * (60 * i - 30);
      return `${(cx + radius * Math.cos(a)).toFixed(1)} ${(cy + radius * Math.sin(a)).toFixed(1)}`;
    }).join(" ");

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

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0 10px", margin: "6px 0 2px", flex: "0 0 auto" }}>
        {classes.map((k, i) => (
          <span key={k.label} style={{ ...regs.axis, display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 14, height: 14, background: ramp[i], display: "inline-block", border: `1px solid ${edge}` }} />
            {k.label}
          </span>
        ))}
        <span style={{ ...regs.axis, display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 14, height: 14, background: originFill, display: "inline-block", border: `1px solid ${edge}` }} />
          {originLabel}
        </span>
      </div>

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
          // A hexagon stretched is not a hexagon, and six equal edges are the whole point.
          preserveAspectRatio="xMidYMid meet"
        >
          <desc>{alt}</desc>
          <rect x={0} y={0} width={width} height={height} fill={ground} />

          {cells.map((c) => (
            <polygon
              key={c.code}
              points={hex(c.cx, c.cy)}
              fill={c.klass === null ? originFill : ramp[c.klass]}
              stroke={ground}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {cells.map((c) => (
            <circle
              key={`hit-${c.code}`}
              className="pt"
              cx={c.cx}
              cy={c.cy}
              r={radius * 0.9}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              aria-label={c.detail}
              data-detail={c.detail}
            />
          ))}
          <rect className="hit-area" x={0} y={0} width={width} height={height} fill="transparent" pointerEvents="all" />

          {cells.map((c) => (
            <g key={`t-${c.code}`}>
              <text
              pointerEvents="none"
                x={c.cx}
                y={c.cy - radius * 0.16}
                fill={inkOnFill(c.klass === null ? originFill : ramp[c.klass], { ink, ground }, contrast, adjustToContrast, TEXT_CONTRAST_MIN)}
                fontFamily={String(regs.axis.fontFamily)}
                fontSize={13}
                fontWeight={600}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {c.label}
              </text>
              <text
              pointerEvents="none"
                x={c.cx}
                y={c.cy + radius * 0.34}
                fill={inkOnFill(c.klass === null ? originFill : ramp[c.klass], { ink, ground }, contrast, adjustToContrast, TEXT_CONTRAST_MIN)}
                fontFamily={String(regs.value.fontFamily)}
                fontSize={14}
                fontWeight={700}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {c.value}
              </text>
            </g>
          ))}
        </svg>
        <div className="overlay" aria-hidden="true" />
        <div className="x-axis" />
      </div>

      <p className="chart-reading" style={{ ...regs.annot, margin: "6px 0 0" }}>{claimNote}</p>
      <p className="chart-reading" style={{ ...regs.body, margin: "6px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "4px 0 0" }}>{source}</p>
    </figure>
  );
}
