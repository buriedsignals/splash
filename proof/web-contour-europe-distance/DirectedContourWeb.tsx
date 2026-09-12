/**
 * How far every point of Europe is from the sea, drawn as an isoline map THROUGH the design base and
 * delivered as an interactive page.
 *
 * `the-key-prints-its-breaks-in-the-data-s-units` — the interval is stated ONCE, in kilometres, and
 * every isoline carries its own break printed ON the line rather than in a key the reader must look
 * away to. A contour set's value only exists if the reader knows what one band represents.
 *
 * AN ISOLINE MAP NEEDS A FIELD ITS SOURCE DEFINES EVERYWHERE. A field made of records is only as
 * continuous as the records are complete, and a hole in it does not degrade — it lies, filled by
 * whatever surrounds it. So the field here is distance to the COASTLINE: nothing is missing from a
 * polygon.
 *
 * WHAT THE WEB ADDS. Between two contour lines a reader must interpolate by eye, which is exactly
 * what the form asks of them and exactly what nobody does accurately. This page answers with the
 * measured distance at any point of the land, plus the country it falls in — the interpolation the
 * lines only imply.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars, inkOnFill } from "#shared/design-base/web.mjs";

export type Probe = { key: string; cx: number; cy: number; detail: string };
export type LineSet = { level: number; label: string; d: string; lx: number; ly: number };

export function DirectedContourWeb({
  plate,
  bandPaths,
  lines,
  probes,
  levels,
  intervalNote,
  aspect,
  size,
  title,
  eyebrow,
  caveat,
  source,
  alt,
  reading,
  claimNote,
  limitNote,
  direction,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  bandPaths: string[];
  lines: LineSet[];
  probes: Probe[];
  levels: number[];
  intervalNote: string;
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
  limitNote: string;
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

  const water = mix(ground, ink, 0.03);
  const ramp = bandPaths.map((_, i) => mix(ground, accent, 0.12 + (i / Math.max(1, bandPaths.length - 1)) * 0.8));
  const lineInk = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;

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

      {/* THE INTERVAL, STATED ONCE — the one thing that makes an isoline map's shape a number. */}
      <p className="chart-caveat" style={{ ...regs.annot, margin: "6px 0 2px", flex: "0 0 auto" }}>{intervalNote}</p>

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

          {bandPaths.map((d, i) => (
            <path key={`b-${i}`} d={d} fill={ramp[i]} stroke="none" />
          ))}

          {lines.map((l) => (
            <path
              key={`l-${l.level}`}
              d={l.d}
              fill="none"
              stroke={lineInk}
              strokeWidth={l.level % 200 === 0 ? 1.3 : 0.6}
              strokeOpacity={l.level % 200 === 0 ? 0.9 : 0.5}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {probes.map((p) => (
            <circle
              key={p.key}
              className="pt"
              cx={p.cx}
              cy={p.cy}
              r={7}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              aria-label={p.detail}
              data-detail={p.detail}
            />
          ))}
          <rect className="hit-area" x={0} y={0} width={width} height={height} fill="transparent" pointerEvents="all" />

          {/* EVERY LINE CARRIES ITS OWN BREAK, ON ITSELF. */}
          {lines.filter((l) => l.level % 200 === 0).map((l) => (
            <g key={`t-${l.level}`}>
              <rect
                x={l.lx - 18}
                y={l.ly - 9}
                width={36}
                height={18}
                fill={ground}
                rx={2}
                pointerEvents="none"
              />
              <text pointerEvents="none"
                x={l.lx}
                y={l.ly}
                fill={lineInk}
                fontFamily={String(regs.value.fontFamily)}
                fontSize={12}
                fontWeight={700}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {l.label}
              </text>
            </g>
          ))}
        </svg>
        <div className="overlay" aria-hidden="true" />
        <div className="x-axis" />
      </div>

      <p className="chart-reading" style={{ ...regs.annot, margin: "6px 0 0" }}>{claimNote}</p>
      <p className="chart-reading" style={{ ...regs.annot, margin: "4px 0 0" }}>{limitNote}</p>
      <p className="chart-reading" style={{ ...regs.body, margin: "6px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "4px 0 0" }}>{source}</p>
    </figure>
  );
}
