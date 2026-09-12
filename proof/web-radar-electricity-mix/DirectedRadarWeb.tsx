/**
 * France against Germany, 2024 electricity, on eight axes — drawn as a radar THROUGH the design base
 * and delivered as an interactive page.
 *
 * `the-grid-is-circles-and-the-ceiling-is-drawn` — the rings are drawn as CIRCLES, not as a polygon
 * joining the axes, and the outermost ring carries its own value. A polygonal grid makes a value
 * near an axis look larger than the same value between two, because the polygon's edge is closer to
 * the centre there; circles do not lie about that.
 *
 * TWO SHAPES, NEVER MORE. A radar is a shape-comparison instrument and it stops working at three:
 * the overlaps stop being readable and the fills stop being separable. Two is what this page draws,
 * and the reason is stated rather than left as a preference.
 *
 * WHAT THE WEB ADDS. A radar's shape is memorable and its values are not: a reader sees "France
 * spikes here, Germany spreads there" and cannot put a number on either point. Every vertex answers
 * with the country, the source, its exact share, the TWh behind it and what the OTHER country has on
 * the same axis — which is the comparison the shape suggests and the plate cannot state eight times.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars } from "#shared/design-base/web.mjs";

export const FRAME = { width: 620, height: 440 };

export type Axis = { key: string; name: string };
export type Shape = { code: string; name: string; values: number[]; tone: "a" | "b" };
export type Vertex = { code: string; axis: number; value: number; detail: string };

export function DirectedRadarWeb({
  axes,
  shapes,
  vertices,
  rings,
  ceiling,
  ceilingLabel,
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
  axes: Axis[];
  shapes: Shape[];
  vertices: Vertex[];
  rings: number[];
  ceiling: number;
  ceilingLabel: string;
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

  let second = mix(ground, ink, 0.5);
  if (contrast(second, ground) < NON_TEXT_CONTRAST_MIN)
    second = adjustToContrast(second, ground, NON_TEXT_CONTRAST_MIN) ?? second;
  const first = adjustToContrast(accent, ground, NON_TEXT_CONTRAST_MIN) ?? accent;
  const label = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const toneOf = (t: "a" | "b") => (t === "a" ? first : second);

  const cx = FRAME.width / 2;
  const cy = FRAME.height / 2;
  const R = Math.min(cx, cy) - 70;
  const angle = (i: number) => (i / axes.length) * Math.PI * 2 - Math.PI / 2;
  const at = (i: number, v: number) => [
    cx + (v / ceiling) * R * Math.cos(angle(i)),
    cy + (v / ceiling) * R * Math.sin(angle(i)),
  ];
  const poly = (s: Shape) => s.values.map((v, i) => at(i, v).join(",")).join(" ");

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

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0 18px", margin: "8px 0 4px", flex: "0 0 auto" }}>
        {shapes.map((s) => (
          <span key={s.code} style={{ ...regs.axis, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 14, height: 14, background: toneOf(s.tone), display: "inline-block", borderRadius: 2 }} />
            {s.name}
          </span>
        ))}
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: "0px",
          ["--x-axis-h" as string]: "0px",
          aspectRatio: `${FRAME.width} / ${FRAME.height}`,
        }}
      >
        <div className="y-axis" />
        <svg
          role="group"
          aria-label={title}
          xmlns="http://www.w3.org/2000/svg"
          className="chart"
          data-hit="cell"
          viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
          // A radial geometry cannot be stretched: an ellipse would make the same share read as two
          // different distances depending on which axis it sits on.
          preserveAspectRatio="xMidYMid meet"
        >
          <desc>{alt}</desc>
          <rect x={0} y={0} width={FRAME.width} height={FRAME.height} fill={ground} />

          {/* THE GRID IS CIRCLES. A polygonal grid joining the axes makes a value near an axis look
              larger than the same value between two. */}
          {rings.map((r) => (
            <circle key={r} cx={cx} cy={cy} r={(r / ceiling) * R} fill="none" stroke={grid} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}
          {axes.map((a, i) => {
            const [ex, ey] = at(i, ceiling);
            return <line key={a.key} x1={cx} y1={cy} x2={ex} y2={ey} stroke={grid} strokeWidth={1} vectorEffect="non-scaling-stroke" />;
          })}

          {shapes.map((s) => (
            <polygon
              key={s.code}
              points={poly(s)}
              fill={toneOf(s.tone)}
              fillOpacity={0.16}
              stroke={toneOf(s.tone)}
              strokeWidth={2}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {vertices.map((v) => {
            const [px, py] = at(v.axis, v.value);
            const s = shapes.find((z) => z.code === v.code)!;
            return (
              <circle
                key={`${v.code}-${v.axis}`}
                className="pt"
                cx={px}
                cy={py}
                r={4.5}
                fill={toneOf(s.tone)}
                stroke={ground}
                strokeWidth={1}
                tabIndex={0}
                role="img"
                aria-label={v.detail}
                data-detail={v.detail}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
          <rect className="hit-area" x={0} y={0} width={FRAME.width} height={FRAME.height} fill="transparent" pointerEvents="all" />

          {/* THE ONLY WORDS THIS BASE SETS INSIDE AN SVG, AND THE REASON IS THE PREVIOUS DECISION.
              The fluid frame keeps every word in HTML because `preserveAspectRatio="none"` would
              stretch a `<text>` out of shape. This beat does not stretch — a radial geometry cannot —
              so it letterboxes instead: the `<svg>` shrinks inside its grid cell and centres, and an
              HTML overlay positioned in percentages of that CELL no longer lands on the drawing.
              Measured on the first render, where every axis name sat in a corner of the frame with
              the radar small in the middle. Inside the viewBox the labels follow the drawing exactly,
              and because nothing stretches they keep their proportions; the cost, stated, is that
              they scale with the graphic instead of holding a fixed pixel size. */}
          {axes.map((a, i) => {
            const [lx, ly] = at(i, ceiling * 1.14);
            const anchor = lx > cx + 4 ? "start" : lx < cx - 4 ? "end" : "middle";
            return (
              <text
              pointerEvents="none"
                key={`n-${a.key}`}
                x={lx}
                y={ly}
                fill={label}
                fontFamily={String(regs.axis.fontFamily)}
                fontSize={14}
                fontWeight={regs.axis.fontWeight as number}
                fontStyle={regs.axis.fontStyle as string}
                textAnchor={anchor}
                dominantBaseline="middle"
              >
                {a.name}
              </text>
            );
          })}
          {/* The ceiling sits just INSIDE its own ring, not above it: above it is where the first
              axis name already is, and the two printed one on top of the other. */}
          <text
              pointerEvents="none"
            x={cx + 8}
            y={cy - R + 12}
            fill={label}
            fontFamily={String(regs.value.fontFamily)}
            fontSize={13}
            fontWeight={700}
            textAnchor="start"
          >
            {ceilingLabel}
          </text>
        </svg>

        <div className="overlay" aria-hidden="true" />
        <div className="x-axis" />
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "10px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
