/**
 * Europe's low-carbon electricity share by country, drawn as a choropleth THROUGH the design base and
 * delivered as an interactive page.
 *
 * THIS MAP DRAWS ITS OWN GEOMETRY, so it goes through the CHART format's machinery, exactly as its
 * static sibling goes through `chart-beat`'s rasteriser rather than `map-beat`'s. `map-web` exists
 * for a tiled basemap and its live-plan interaction; a projected vector map with no tiles has no use
 * for either, and pulling one in would add a third-party host to a page that needs none.
 *
 * `the-key-names-its-classes-in-their-own-colours` — the key is the classes, in their own swatches,
 * with their own bounds in per cent. A choropleth without one is a picture of an opinion.
 * `the-ramp-is-monotone-in-lightness` — the classes step in one direction only, so the order survives
 * a monochrome print and a colour-vision deficiency.
 * `a-missing-cell-is-drawn-as-missing` — a country the file has no reading for is drawn hollow and
 * named as missing, never left in the lowest class. The lowest class is a country at 10 %; a country
 * with no data is neither.
 *
 * WHAT THE WEB ADDS. A choropleth turns a number into a CLASS, and a class is a band a reader cannot
 * narrow: two countries in the same colour may be twelve points apart. Every country here answers
 * with its exact share, the class it fell in and that class's bounds, its low-carbon TWh, and its
 * rank among the countries the file carries.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars, inkOnFill } from "#shared/design-base/web.mjs";

export type Shape = {
  code: string;
  name: string;
  path: string;
  klass: number | null;
  /** The hit target's own seat: a point INSIDE the country, not its centroid. A centroid can land
   *  outside a concave or islanded shape, which is exactly the kind of thing nobody notices until a
   *  pointer answers with the wrong country. */
  cx: number;
  cy: number;
  detail: string;
};
export type Klass = { label: string };

export function DirectedChoroplethWeb({
  plate,
  shapes,
  classes,
  missingLabel,
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
  shapes: Shape[];
  classes: Klass[];
  missingLabel: string;
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

  const ramp = classes.map((_, i) =>
    mix(ground, accent, 0.14 + (i / (classes.length - 1)) * 0.86),
  );
  const missingFill = "none";
  const edge = mix(ground, ink, 0.35);

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

      {/* THE KEY NAMES ITS CLASSES IN THEIR OWN COLOURS, and says what a hollow shape means. */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0 12px", margin: "8px 0 4px", flex: "0 0 auto" }}>
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
          // A MAP CANNOT STRETCH. `preserveAspectRatio="none"` is right when the geometry carries a
          // reading that survives a shear; a coastline does not, and an equal-area projection
          // stretched on one axis is no longer equal-area.
          preserveAspectRatio="xMidYMid meet"
        >
          <desc>{alt}</desc>
          {/* THE BASEMAP IS MAPTILER'S GEOGRAPHY, baked once per filed direction in that direction's
              own tints, and stretched to the frame it was baked for — the plot box carries the
              plate's own aspect, so `none` here is an identity, not a shear. The country shapes draw
              over it: the plate carries the coastline and the sea, the shapes carry the classes. */}
          <image href={plate} x={0} y={0} width={width} height={height} preserveAspectRatio="none" />

          {shapes.map((s) => (
            <path
              key={s.code}
              d={s.path}
              fill={s.klass === null ? missingFill : ramp[s.klass]}
              stroke={edge}
              strokeWidth={s.klass === null ? 0.8 : 0.5}
              strokeDasharray={s.klass === null ? "2 2" : undefined}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {shapes.map((s) => (
            <circle
              key={`hit-${s.code}`}
              className="pt"
              cx={s.cx}
              cy={s.cy}
              r={6}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              aria-label={s.detail}
              data-detail={s.detail}
            />
          ))}
          <rect className="hit-area" x={0} y={0} width={width} height={height} fill="transparent" pointerEvents="all" />
        </svg>
        <div className="overlay" aria-hidden="true" />
        <div className="x-axis" />
      </div>

      <p className="chart-reading" style={{ ...regs.annot, margin: "8px 0 0" }}>{claimNote}</p>
      <p className="chart-reading" style={{ ...regs.body, margin: "6px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
