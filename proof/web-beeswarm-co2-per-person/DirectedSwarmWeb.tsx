/**
 * Every country's CO₂ per person in 2023, drawn as a beeswarm THROUGH the design base and delivered
 * as an interactive page. The `beeswarm` beat of this tree's web format.
 *
 * WHAT THE WEB ADDS, AND IT IS THE THING THIS FORM MOST NEEDS. A swarm's whole argument is the
 * SHAPE of a distribution — where the mass sits, how far the tail runs — and the price it pays for
 * that shape is that 213 marks share one axis and almost none of them can be named. The static
 * plate labels two, both derived. This page names all 213: every circle answers with its country,
 * its own figure, its population, and the share of humanity that emits LESS than it does. That last
 * number is the one the shape makes a reader want and the plate cannot give.
 *
 * `a-countable-field-is-paired-with-its-own-figure` — the swarm is a field of marks whose sizes are
 * a quantity, and the quantity it stands for (the world's population) is stated as a figure beside
 * it rather than left to be summed by eye.
 *
 * THE PACKING IS DETERMINISTIC AND STATED. Marks are placed in descending order of radius, each at
 * the y closest to the axis that clears every circle already placed whose x-range it overlaps. No
 * force simulation, no random seed: the same file produces the same swarm on every machine, which
 * is what makes the picture a measurement rather than a rendering.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars, noteAnchor } from "#shared/design-base/web.mjs";

export const FRAME = { width: 900, height: 400, xAxisRowPx: 30 };

export type Mark = {
  code: string;
  name: string;
  value: number;
  r: number;
  detail: string;
  highlight: "subject" | "far" | null;
};

const pct = (value: number, extent: number) => (value / extent) * 100;

export function DirectedSwarmWeb({
  marks,
  xTicks,
  xMax,
  median,
  average,
  title,
  eyebrow,
  caveat,
  source,
  alt,
  unit,
  reading,
  notes,
  direction,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  marks: Mark[];
  xTicks: number[];
  xMax: number;
  median: { value: number; label: string };
  average: { value: number; label: string };
  title: string;
  eyebrow: string;
  caveat: string;
  source: string;
  alt: string;
  unit: string;
  reading: string;
  notes: { code: string; text: string }[];
  direction: any;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
}) {
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });

  let field = mix(ground, ink, 0.34);
  if (contrast(field, ground) < NON_TEXT_CONTRAST_MIN)
    field = adjustToContrast(field, ground, NON_TEXT_CONTRAST_MIN) ?? field;
  const rule = mix(ground, ink, 0.55);

  const x = (value: number) => (value / xMax) * FRAME.width;
  const axisY = FRAME.height - 8;

  // ── the packing, in one pass ────────────────────────────────────────────────────────────────
  const placed: { cx: number; cy: number; r: number }[] = [];
  const order = [...marks].sort((a, b) => b.r - a.r);
  const seated = new Map<string, { cx: number; cy: number }>();
  for (const m of order) {
    const cx = x(m.value);
    let cy = axisY - m.r - 1;
    for (let step = 0; step < 4000; step += 1) {
      const clash = placed.find(
        (p) => (p.cx - cx) ** 2 + (p.cy - cy) ** 2 < (p.r + m.r + 0.6) ** 2,
      );
      if (!clash) break;
      cy -= 1;
      if (cy - m.r < 0) {
        cy = axisY - m.r - 1;
        break;
      }
    }
    placed.push({ cx, cy, r: m.r });
    seated.set(m.code, { cx, cy });
  }

  const at = (code: string) => {
    const p = seated.get(code);
    if (!p) throw new Error(`${code} was never seated in the swarm`);
    return p;
  };

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

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: "0px",
          ["--x-axis-h" as string]: `${FRAME.xAxisRowPx}px`,
          aspectRatio: `${FRAME.width} / ${FRAME.height + FRAME.xAxisRowPx}`,
        }}
      >
        <div className="y-axis" />
        <svg
          role="group"
          aria-label={title}
          xmlns="http://www.w3.org/2000/svg"
          className="chart"
          viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
          preserveAspectRatio="none"
        >
          <desc>{alt}</desc>
          <rect x={0} y={0} width={FRAME.width} height={FRAME.height} fill={ground} />

          {xTicks.map((t) => (
            <line
              key={t}
              x1={x(t)}
              x2={x(t)}
              y1={0}
              y2={axisY}
              stroke={grid}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* The two levels a reader is owed before any single country: the median of the countries
              and the world's own average. They are furniture, drawn once, never a reading. */}
          {[median, average].map((level, i) => (
            <line
              key={level.label}
              x1={x(level.value)}
              x2={x(level.value)}
              y1={0}
              y2={axisY}
              stroke={rule}
              strokeWidth={direction.stroke?.rule ?? 0.8}
              strokeDasharray={i === 0 ? "5 4" : "2 3"}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          <line x1={0} x2={FRAME.width} y1={axisY} y2={axisY} stroke={rule} strokeWidth={1} vectorEffect="non-scaling-stroke" />

          {marks.map((m) => {
            const p = at(m.code);
            return (
              <circle
                key={m.code}
                className="pt"
                cx={p.cx}
                cy={p.cy}
                r={m.r}
                fill={m.highlight ? accent : field}
                fillOpacity={m.highlight ? 1 : 0.75}
                stroke={m.highlight ? ground : "none"}
                strokeWidth={m.highlight ? 1.2 : 0}
                tabIndex={0}
                role="img"
                aria-label={`${m.name} : ${m.detail}`}
                data-detail={`${m.name} · ${m.detail}`}
              />
            );
          })}
          <rect className="hit-area" x={0} y={0} width={FRAME.width} height={FRAME.height} fill="transparent" pointerEvents="all" />
        </svg>

        <div className="overlay" aria-hidden="true">
          {/* The two levels are stacked on two rows, not one. Measured on the first render: at
              3,1 and 4,6 t they are 1,5 t apart on a 40 t axis — 34px — and their labels ran into
              each other, the first reading "médi". A level's label belongs to its own rule, so the
              rows are staggered rather than the rules moved. */}
          {[median, average].map((level, i) => (
            <span
              key={level.label}
              className="note"
              style={{
                ...regs.annot,
                ...noteAnchor(pct(x(level.value), FRAME.width)),
                top: i === 0 ? "1%" : "8%",
              }}
            >
              {level.label}
            </span>
          ))}
          {notes.map((n) => {
            const p = at(n.code);
            return (
              <span
                key={n.code}
                className="note"
                style={{
                  ...regs.annot,
                  color: adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink,
                  ...noteAnchor(pct(p.cx, FRAME.width)),
                  top: `${pct(p.cy, FRAME.height)}%`,
                  transform: `${noteAnchor(pct(p.cx, FRAME.width)).transform} translateY(-160%)`,
                }}
              >
                {n.text}
              </span>
            );
          })}
        </div>

        <div className="x-axis">
          {xTicks.map((t) => (
            <span key={t} className="axis-label x" style={{ ...regs.axis, left: `${pct(x(t), FRAME.width)}%` }}>
              {t === xTicks[xTicks.length - 1] ? `${t} ${unit}` : t}
            </span>
          ))}
        </div>
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "10px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
