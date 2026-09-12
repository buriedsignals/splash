/**
 * Europe's low-carbon power stations as proportional symbols — one circle per country, its AREA the
 * installed capacity — drawn THROUGH the design base and delivered as an interactive page.
 *
 * `a-radius-is-not-read-by-eye` — the circles are scaled by AREA, never by radius, and the key gives
 * three named sizes rather than a continuous ramp nobody can interpolate. A reader can rank circles
 * and cannot measure one; that is the form's honest limit and the key states it.
 *
 * `the-basemap-gives-up-its-contrast` — the coastline is a step off the ground, quiet enough that
 * every symbol reads against it. A basemap that competes with the marks is a basemap that is being
 * asked to carry a reading it does not have.
 *
 * `an-overlap-accumulates-rather-than-occluding` — the symbols are translucent, so where two overlap
 * the overlap is visible as one. Solid symbols in a dense field draw a stacking order nobody chose.
 *
 * WHAT THE WEB ADDS. Circle area is the encoding a reader ranks and cannot measure. Every symbol
 * answers with its country, its megawatts, its share of the continent, its station count, and the
 * split between water-and-atom and wind-and-sun.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars } from "#shared/design-base/web.mjs";

export type Symbol_ = { code: string; name: string; cx: number; cy: number; r: number; detail: string; label: string | null };
export type KeySize = { r: number; label: string };

export function DirectedSymbolMapWeb({
  plate,
  symbols,
  keySizes,
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
  symbols: Symbol_[];
  keySizes: KeySize[];
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

  const landFill = mix(ground, ink, 0.1);
  const landEdge = mix(ground, ink, 0.24);
  const water = mix(ground, ink, 0.03);
  const symbolFill = adjustToContrast(accent, ground, NON_TEXT_CONTRAST_MIN) ?? accent;
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

      {/* THE KEY IS THREE NAMED SIZES, drawn at the map's own scale — never a continuous ramp. */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: "0 18px", margin: "8px 0 4px", flex: "0 0 auto" }}>
        {keySizes.map((k) => (
          <span key={k.label} style={{ ...regs.axis, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <svg width={k.r * 2 + 2} height={k.r * 2 + 2} aria-hidden="true" style={{ display: "block" }}>
              <circle cx={k.r + 1} cy={k.r + 1} r={k.r} fill={symbolFill} fillOpacity={0.55} stroke={symbolFill} strokeWidth={1} />
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
          {/* THE CAMERA CLIPS. An SVG does not clip its own children, and this beat's shapes reach
              past the plate: Greenland's rings project west of the frame's own west edge. Without
              this, they were painted on the bare page beside the map — geography with no basemap
              under it, which reads as a second, smaller map nobody drew. Every mark now lives inside
              the rectangle the plate covers, or it does not appear. */}
          <defs>
            <clipPath id="camera">
              <rect x={0} y={0} width={width} height={height} />
            </clipPath>
          </defs>
          <g clipPath="url(#camera)">
          <rect x={0} y={0} width={width} height={height} fill={water} />
          {/* THE BASEMAP IS MAPTILER'S GEOGRAPHY, baked once per filed direction in that
              direction's own tints. The rect above is a backstop; the plate covers the box exactly,
              so `none` here is an identity and not a shear — the plot box carries the plate's own
              aspect. */}
          <image href={plate} x={0} y={0} width={width} height={height} preserveAspectRatio="none" />
          <path d={land} fill={landFill} stroke={landEdge} strokeWidth={0.5} vectorEffect="non-scaling-stroke" />

          {/* Largest first, so a small symbol is never buried under a large one. */}
          {[...symbols].sort((a, b) => b.r - a.r).map((s) => (
            <circle
              key={s.code}
              cx={s.cx}
              cy={s.cy}
              r={s.r}
              fill={symbolFill}
              fillOpacity={0.5}
              stroke={symbolFill}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {symbols.map((s) => (
            <circle
              key={`hit-${s.code}`}
              className="pt"
              cx={s.cx}
              cy={s.cy}
              r={Math.max(5, s.r)}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              aria-label={s.detail}
              data-detail={s.detail}
            />
          ))}
          <rect className="hit-area" x={0} y={0} width={width} height={height} fill="transparent" pointerEvents="all" />

          {symbols.filter((s) => s.label !== null).map((s) => (
            <text
              pointerEvents="none"
              key={`l-${s.code}`}
              x={s.cx}
              y={s.cy}
              fill={label}
              fontFamily={String(regs.value.fontFamily)}
              fontSize={13}
              fontWeight={700}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {s.label}
            </text>
          ))}
          </g>
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
