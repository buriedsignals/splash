/**
 * Europe's low-carbon electricity share, one equal TILE per country — drawn as a tile cartogram
 * THROUGH the design base and delivered as an interactive page.
 *
 * IT DRAWS THE SAME DATA AS THE CHOROPLETH, AND THE PAIR IS THE ARGUMENT. Weighted by the area each
 * country occupies on a map, Europe reads one way; weighted by COUNTRY, it reads another. Both
 * numbers are true, and a choropleth can only ever show one of them — the one nobody chose, because
 * area is not a decision a mapmaker makes, it is a fact about the earth.
 *
 * A tile cartogram gives every country the same tile, so the second reading becomes visible. It keeps
 * the rough geography, which is what separates it from a pictogram, where the same countries are
 * sorted by value and the map is gone.
 *
 * `a-missing-cell-is-drawn-as-missing` — a tile in the layout with no reading is hollow and dashed,
 * never dropped into the lowest class.
 * `the-key-prints-its-breaks-in-the-data-s-units` — the classes are named in per cent.
 *
 * WHAT THE WEB ADDS. A tile says which CLASS a country is in and nothing else — that is the price of
 * making every country equally visible. Every tile answers with the exact share, the class bounds,
 * the low-carbon TWh and the country's rank.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars, inkOnFill } from "#shared/design-base/web.mjs";

export type Tile = {
  code: string;
  name: string;
  x: number;
  y: number;
  klass: number | null;
  label: string;
  value: string;
  detail: string;
};

export function DirectedCartogramWeb({
  tiles,
  classes,
  missingLabel,
  cell,
  gap,
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
  tiles: Tile[];
  classes: { label: string }[];
  missingLabel: string;
  cell: number;
  gap: number;
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
  const edge = mix(ground, ink, 0.32);

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
          <span style={{ width: 14, height: 14, background: "transparent", display: "inline-block", border: `1px dashed ${edge}` }} />
          {missingLabel}
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
          // A tile cartogram's whole promise is that every tile is the SAME tile. Stretching the box
          // makes them all the same rectangle, which is a different promise.
          preserveAspectRatio="xMidYMid meet"
        >
          <desc>{alt}</desc>
          <rect x={0} y={0} width={width} height={height} fill={ground} />

          {tiles.map((t) => (
            <rect
              key={t.code}
              x={t.x}
              y={t.y}
              width={cell - gap}
              height={cell - gap}
              rx={3}
              fill={t.klass === null ? "none" : ramp[t.klass]}
              stroke={edge}
              strokeWidth={t.klass === null ? 1 : 0.6}
              strokeDasharray={t.klass === null ? "3 3" : undefined}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {tiles.map((t) => (
            <circle
              key={`hit-${t.code}`}
              className="pt"
              cx={t.x + (cell - gap) / 2}
              cy={t.y + (cell - gap) / 2}
              r={(cell - gap) / 2}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              aria-label={t.detail}
              data-detail={t.detail}
            />
          ))}
          <rect className="hit-area" x={0} y={0} width={width} height={height} fill="transparent" pointerEvents="all" />

          {tiles.map((t) => {
            const fill = t.klass === null ? ground : ramp[t.klass];
            const on = inkOnFill(fill, { ink, ground }, contrast, adjustToContrast, TEXT_CONTRAST_MIN);
            return (
              <g key={`t-${t.code}`}>
                <text pointerEvents="none"
                  x={t.x + (cell - gap) / 2}
                  y={t.y + (cell - gap) * 0.38}
                  fill={on}
                  fontFamily={String(regs.axis.fontFamily)}
                  fontSize={12}
                  fontWeight={600}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {t.label}
                </text>
                <text pointerEvents="none"
                  x={t.x + (cell - gap) / 2}
                  y={t.y + (cell - gap) * 0.68}
                  fill={on}
                  fontFamily={String(regs.value.fontFamily)}
                  fontSize={13}
                  fontWeight={700}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {t.value}
                </text>
              </g>
            );
          })}
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
