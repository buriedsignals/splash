/**
 * Every low-carbon power station the database lists in Europe, one dot each — drawn as a dot-density
 * map THROUGH the design base and delivered as an interactive page.
 *
 * `the-dots-resolution-is-what-the-data-supports` — ONE DOT IS ONE STATION, not a rounded quantity of
 * megawatts. The file is a register of places, so the dot is a place; a dot that stood for "50 MW"
 * would invent a resolution the source does not have.
 *
 * `three-classes-of-place-three-treatments` — the fuels are drawn as three treatments, not as a
 * continuous ramp: the claim is about counting places by KIND.
 *
 * `the-basemap-gives-up-its-contrast` — the coastline is a step off the ground and nothing more.
 *
 * WHAT THE WEB ADDS, AND WHAT THIS FORM CANNOT DO ON PAPER. A dot map shows WHERE and HOW MANY and
 * says nothing about how big: 8 299 dots and the reader cannot tell the 1 600 MW reactor from the
 * 2 MW run-of-river weir. Every dot here answers with the station's fuel, its megawatts, its country
 * and its share of that country's fleet — the weight the count deliberately drops.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars } from "#shared/design-base/web.mjs";

export type Dot = { key: string; cx: number; cy: number; kind: number; detail: string };
export type Kind = { label: string; count: string };

export function DirectedDotMapWeb({
  plate,
  dots,
  kinds,
  land,
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
  dots: Dot[];
  kinds: Kind[];
  land: string;
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

  const landFill = mix(ground, ink, 0.08);
  const landEdge = mix(ground, ink, 0.2);
  const water = mix(ground, ink, 0.02);
  const lit = adjustToContrast(accent, ground, NON_TEXT_CONTRAST_MIN) ?? accent;
  let quiet = mix(ground, ink, 0.45);
  if (contrast(quiet, ground) < NON_TEXT_CONTRAST_MIN)
    quiet = adjustToContrast(quiet, ground, NON_TEXT_CONTRAST_MIN) ?? quiet;
  const mid = mix(quiet, ground, 0.35);
  const tone = [lit, quiet, mid];
  const radius = [3.4, 1.7, 1.7];

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

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0 14px", margin: "6px 0 2px", flex: "0 0 auto" }}>
        {kinds.map((k, i) => (
          <span key={k.label} style={{ ...regs.axis, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <svg width={10} height={10} aria-hidden="true" style={{ display: "block" }}>
              <circle cx={5} cy={5} r={i === 0 ? 4 : 2.4} fill={tone[i]} />
            </svg>
            {`${k.label} · ${k.count}`}
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

          {/* The quiet kinds first, the named kind last: the claim is about the rare places, and a
              rare dot buried under a common one is a claim nobody can check. */}
          {[2, 1, 0].map((kind) =>
            dots
              .filter((d) => d.kind === kind)
              .map((d) => (
                <circle
                  key={d.key}
                  className="pt"
                  cx={d.cx}
                  cy={d.cy}
                  r={radius[kind]}
                  fill={tone[kind]}
                  fillOpacity={kind === 0 ? 0.95 : 0.6}
                  stroke="none"
                  tabIndex={0}
                  role="img"
                  aria-label={d.detail}
                  data-detail={d.detail}
                />
              )),
          )}
          <rect className="hit-area" x={0} y={0} width={width} height={height} fill="transparent" pointerEvents="all" />
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
