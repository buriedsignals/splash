/**
 * Where Zaporizhzhia is — a locator map drawn THROUGH the design base and delivered as an
 * interactive page.
 *
 * `three-classes-of-place-three-treatments` — the SUBJECT, the places that tell a reader where they
 * are, and the other stations of the same kind. Three treatments, and a reader can tell which is
 * which without reading a key.
 *
 * `the-subject-is-ringed-not-recoloured` — the accent already belongs to the station class, so the
 * subject is marked by a ring rather than by taking a second colour the page has not defined.
 *
 * `the-basemap-gives-up-its-contrast` — a locator's only job is to say WHERE. The border and the
 * water are steps off the ground and nothing more.
 *
 * WHAT THE WEB ADDS. A locator answers one question — where — and a static one can label perhaps four
 * places before the names collide. Every mark here answers with its name, what it is, and its
 * distance from the subject in kilometres: the reading that turns "near Zaporizhzhia" into a number.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars } from "#shared/design-base/web.mjs";

export type Mark = {
  key: string;
  cx: number;
  cy: number;
  kind: "subject" | "place" | "station";
  r: number;
  label: string | null;
  detail: string;
};

export function DirectedLocatorWeb({
  plate,
  marks,
  border,
  scaleBar,
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
  kinds,
  direction,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  /** The baked MapTiler basemap for THIS direction, already a data URI. */
  plate: string;
  marks: Mark[];
  border: string;
  scaleBar: { x: number; y: number; w: number; label: string };
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
  kinds: { label: string }[];
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

  const water = mix(ground, ink, 0.05);
  const borderInk = mix(ground, ink, 0.35);
  const lit = adjustToContrast(accent, ground, NON_TEXT_CONTRAST_MIN) ?? accent;
  let place = mix(ground, ink, 0.55);
  if (contrast(place, ground) < NON_TEXT_CONTRAST_MIN)
    place = adjustToContrast(place, ground, NON_TEXT_CONTRAST_MIN) ?? place;
  const other = mix(lit, ground, 0.55);
  const label = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const fillOf = (m: Mark) => (m.kind === "subject" ? lit : m.kind === "station" ? other : place);

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
        {[lit, other, place].map((c, i) => (
          <span key={kinds[i].label} style={{ ...regs.axis, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <svg width={16} height={16} aria-hidden="true" style={{ display: "block" }}>
              <circle cx={8} cy={8} r={i === 0 ? 6 : 4} fill={c} stroke={i === 0 ? label : "none"} strokeWidth={i === 0 ? 1.6 : 0} />
            </svg>
            {kinds[i].label}
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
          {/* THE LAND AND THE SEA ARE MAPTILER'S, baked once per filed direction in that direction's
              own tints; the rect above is a backstop. The BORDERS are not: every boundary layer was
              hidden before the shutter, because a basemap's own borders come in a colour nobody here
              chose. So the plate carries the geography and the beat carries the lines on it. */}
          <image href={plate} x={0} y={0} width={width} height={height} preserveAspectRatio="none" />
          <path d={border} fill="none" stroke={borderInk} strokeWidth={1} vectorEffect="non-scaling-stroke" />

          {marks.map((m) => (
            <circle
              key={m.key}
              className="pt"
              cx={m.cx}
              cy={m.cy}
              r={m.r}
              fill={fillOf(m)}
              fillOpacity={m.kind === "station" ? 0.75 : 1}
              stroke={m.kind === "subject" ? label : ground}
              strokeWidth={m.kind === "subject" ? 2.4 : 0.8}
              tabIndex={0}
              role="img"
              aria-label={m.detail}
              data-detail={m.detail}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <rect className="hit-area" x={0} y={0} width={width} height={height} fill="transparent" pointerEvents="all" />

          {/* THE SCALE BAR — a locator without one says "near" and refuses to say how near. */}
          <g>
            <line
              x1={scaleBar.x}
              x2={scaleBar.x + scaleBar.w}
              y1={scaleBar.y}
              y2={scaleBar.y}
              stroke={label}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
            <line x1={scaleBar.x} x2={scaleBar.x} y1={scaleBar.y - 5} y2={scaleBar.y + 5} stroke={label} strokeWidth={2} vectorEffect="non-scaling-stroke" />
            <line x1={scaleBar.x + scaleBar.w} x2={scaleBar.x + scaleBar.w} y1={scaleBar.y - 5} y2={scaleBar.y + 5} stroke={label} strokeWidth={2} vectorEffect="non-scaling-stroke" />
            <text pointerEvents="none"
              x={scaleBar.x + scaleBar.w / 2}
              y={scaleBar.y - 10}
              fill={label}
              fontFamily={String(regs.value.fontFamily)}
              fontSize={13}
              fontWeight={700}
              textAnchor="middle"
            >
              {scaleBar.label}
            </text>
          </g>

          {marks.filter((m) => m.label !== null).map((m) => (
            <text pointerEvents="none"
              key={`l-${m.key}`}
              x={m.cx + m.r + 6}
              y={m.cy}
              fill={label}
              fontFamily={String(regs.value.fontFamily)}
              fontSize={m.kind === "subject" ? 15 : 13}
              fontWeight={m.kind === "subject" ? 700 : 500}
              dominantBaseline="middle"
            >
              {m.label}
            </text>
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
