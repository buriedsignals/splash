/**
 * Ukrainians under temporary protection in Europe, one band per destination — drawn as an
 * origin-destination fan THROUGH the design base and delivered as an interactive page.
 *
 * MINARD, REVERSED. The reference is Minard's 1862 plate: many origins, one destination, band width
 * in tonnes. This is the same form with the arrow turned round — one origin, many destinations — and
 * its four rules kept:
 *
 *   **Width is the quantity.** Nothing else on the page encodes it.
 *   **The width scale is drawn in the key, in the data's own units** — a band width nobody can
 *   convert is a ribbon.
 *   **The route is schematic and the basemap is furniture.** The reading line says the band is not
 *   an itinerary, because a curve on a map reads as one.
 *   **A band too thin to see is not drawn, it is counted** — into a stated remainder, never as a
 *   hairline that reads as zero.
 *
 * WHAT THE WEB ADDS. A fan of thirty bands leaves room for perhaps four labels, and a band's width is
 * a quantity nobody can measure. Every band answers with its destination, the count, its share of the
 * total, its rank — and the RATE per 1 000 inhabitants, which is the reading that inverts the whole
 * ranking and the reason the hex cartogram next door exists.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars } from "#shared/design-base/web.mjs";

export type Band = { code: string; name: string; path: string; label: string | null; lx: number; ly: number; detail: string };

export function DirectedFlowMapWeb({
  plate,
  bands,
  land,
  originPoint,
  originLabel,
  keyWidths,
  remainder,
  aspect,
  size,
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
  bands: Band[];
  land: string;
  originPoint: [number, number];
  originLabel: string;
  keyWidths: { w: number; label: string }[];
  remainder: string | null;
  /** The baked MapTiler basemap for THIS direction, already a data URI. */
  plate: string;
  aspect: number;
  size: number;
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
  const width = aspect >= 1 ? size : size * aspect;
  const height = aspect >= 1 ? size / aspect : size;

  const landFill = mix(ground, ink, 0.07);
  const landEdge = mix(ground, ink, 0.18);
  const water = mix(ground, ink, 0.02);
  const ribbon = adjustToContrast(accent, ground, NON_TEXT_CONTRAST_MIN) ?? accent;
  const label = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;

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

      {/* THE WIDTH SCALE, IN THE DATA'S OWN UNITS. */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0 12px", margin: "4px 0 2px", flex: "0 0 auto" }}>
        {keyWidths.map((k) => (
          <span key={k.label} style={{ ...regs.axis, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <svg width={26} height={Math.max(3, k.w)} aria-hidden="true" style={{ display: "block" }}>
              <rect x={0} y={0} width={26} height={Math.max(3, k.w)} fill={ribbon} fillOpacity={0.6} />
            </svg>
            {k.label}
          </span>
        ))}
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
          preserveAspectRatio="xMidYMid meet"
        >
          <desc>{alt}</desc>
          <rect x={0} y={0} width={width} height={height} fill={water} />
          {/* THE BASEMAP IS MAPTILER'S GEOGRAPHY, baked once per filed direction in that
              direction's own tints. The rect above is a backstop; the plate covers the box exactly,
              so `none` here is an identity and not a shear — the plot box carries the plate's own
              aspect. */}
          <image href={plate} x={0} y={0} width={width} height={height} preserveAspectRatio="none" />
          <path d={land} fill={landFill} stroke={landEdge} strokeWidth={0.5} vectorEffect="non-scaling-stroke" />

          {bands.map((b) => (
            <path key={b.code} d={b.path} fill={ribbon} fillOpacity={0.45} stroke="none" />
          ))}

          <circle cx={originPoint[0]} cy={originPoint[1]} r={6} fill={ribbon} stroke={ground} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />

          {bands.map((b) => (
            <circle
              key={`hit-${b.code}`}
              className="pt"
              cx={b.lx}
              cy={b.ly}
              r={7}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              aria-label={b.detail}
              data-detail={b.detail}
            />
          ))}
          <rect className="hit-area" x={0} y={0} width={width} height={height} fill="transparent" pointerEvents="all" />

          {bands.filter((b) => b.label !== null).map((b) => (
            <text pointerEvents="none"
              key={`l-${b.code}`}
              x={b.lx}
              y={b.ly}
              fill={label}
              fontFamily={String(regs.value.fontFamily)}
              fontSize={13}
              fontWeight={700}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {b.label}
            </text>
          ))}
          <text pointerEvents="none"
            x={originPoint[0]}
            y={originPoint[1] + 20}
            fill={label}
            fontFamily={String(regs.annot.fontFamily)}
            fontSize={13}
            fontWeight={700}
            textAnchor="middle"
          >
            {originLabel}
          </text>
        </svg>
        <div className="overlay" aria-hidden="true" />
        <div className="x-axis" />
      </div>

      <p className="chart-reading" style={{ ...regs.annot, margin: "6px 0 0" }}>{claimNote}</p>
      {remainder ? <p className="chart-reading" style={{ ...regs.annot, margin: "4px 0 0" }}>{remainder}</p> : null}
      <p className="chart-reading" style={{ ...regs.body, margin: "4px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "4px 0 0" }}>{source}</p>
    </figure>
  );
}
