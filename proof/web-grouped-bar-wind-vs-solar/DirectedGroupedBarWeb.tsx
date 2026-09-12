/**
 * Wind against solar in six countries' 2024 electricity, drawn as grouped columns THROUGH the design
 * base and delivered as an interactive page.
 *
 * `the-group-boundary-is-drawn` — the two bars that belong to one country are set tight against each
 * other and the NEXT country starts after a gap wider than the bars themselves. Without that a
 * grouped bar reads as one long row of alternating colours and the grouping, which is the whole
 * device, disappears.
 *
 * WHAT THE WEB ADDS. A grouped bar puts two numbers side by side and answers "which is bigger" at a
 * glance; it cannot answer "by how much" without the reader measuring, and it says nothing at all
 * about the whole the two shares came out of. Every group here answers with both shares, their
 * ratio, the TWh behind each, and the country's total generation — four readings that turn a
 * comparison back into quantities.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars, noteAnchor, fitY } from "#shared/design-base/web.mjs";

export const FRAME = { width: 820, height: 340, xAxisRowPx: 30 };

export type Group = {
  code: string;
  name: string;
  a: number;
  b: number;
  aLabel: string;
  bLabel: string;
  detail: string;
};

const pct = (value: number, extent: number) => (value / extent) * 100;

export function DirectedGroupedBarWeb({
  groups,
  subject,
  seriesLabels,
  yTicks,
  unit,
  title,
  eyebrow,
  caveat,
  source,
  alt,
  reading,
  subjectNote,
  direction,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  groups: Group[];
  subject: string;
  seriesLabels: { a: string; b: string };
  yTicks: number[];
  unit: string;
  title: string;
  eyebrow: string;
  caveat: string;
  source: string;
  alt: string;
  reading: string;
  subjectNote: string;
  direction: any;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
}) {
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });

  // Two series, one hue at two chromas — they are two forms of the same quantity (a share of the
  // same electricity), not two categories that happen to sit together.
  const seriesA = accent;
  let seriesB = mix(accent, ground, 0.58);
  if (contrast(seriesB, ground) < NON_TEXT_CONTRAST_MIN)
    seriesB = adjustToContrast(seriesB, ground, NON_TEXT_CONTRAST_MIN) ?? seriesB;
  const baseline = mix(ground, ink, 0.7);
  const label = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;

  const y = fitY(0, yTicks[yTicks.length - 1], FRAME.height);
  const band = FRAME.width / groups.length;
  // The group's own boundary: two bars tight together, then a gap wider than one bar.
  const barW = band * 0.24;
  const cx = (i: number) => band * i + band / 2;

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

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0 18px", margin: "10px 0 4px", flex: "0 0 auto" }}>
        {[{ c: seriesA, t: seriesLabels.a }, { c: seriesB, t: seriesLabels.b }].map((k) => (
          <span key={k.t} style={{ ...regs.axis, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 14, height: 14, background: k.c, display: "inline-block", borderRadius: 2 }} />
            {k.t}
          </span>
        ))}
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: "44px",
          ["--x-axis-h" as string]: `${FRAME.xAxisRowPx}px`,
          aspectRatio: `${FRAME.width + 44} / ${FRAME.height + FRAME.xAxisRowPx}`,
        }}
      >
        <div className="y-axis" style={{ pointerEvents: "none" }}>
          {yTicks.map((t) => (
            <span key={t} className="axis-label y" style={{ ...regs.axis, top: `${pct(y(t), FRAME.height)}%` }}>
              {`${t} %`}
            </span>
          ))}
        </div>

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

          {yTicks.slice(1).map((t) => (
            <line key={t} x1={0} x2={FRAME.width} y1={y(t)} y2={y(t)} stroke={grid} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}

          {groups.map((g, i) => (
            <g key={g.code}>
              <rect x={cx(i) - barW} y={y(g.a)} width={barW} height={FRAME.height - y(g.a)} fill={seriesA} />
              <rect x={cx(i)} y={y(g.b)} width={barW} height={FRAME.height - y(g.b)} fill={seriesB} />
            </g>
          ))}

          <line x1={0} x2={FRAME.width} y1={FRAME.height} y2={FRAME.height} stroke={baseline} strokeWidth={1} vectorEffect="non-scaling-stroke" />

          {groups.map((g, i) => (
            <circle
              key={g.code}
              className="pt"
              cx={cx(i)}
              cy={y(Math.max(g.a, g.b))}
              r={7}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              aria-label={g.detail}
              data-detail={g.detail}
            />
          ))}
          <rect className="hit-area" x={0} y={0} width={FRAME.width} height={FRAME.height} fill="transparent" pointerEvents="all" />
        </svg>

        <div className="overlay" aria-hidden="true">
          {groups.map((g, i) => (
            <span key={g.code}>
              <span
                className="end-label"
                style={{
                  ...regs.value,
                  fontSize: `${Math.max(11, Number.parseFloat(regs.value.fontSize as string) - 2)}px`,
                  color: label,
                  left: `${pct(cx(i) - barW / 2, FRAME.width)}%`,
                  top: `${pct(y(g.a), FRAME.height)}%`,
                  transform: "translate(-50%, -100%) translateY(-3px)",
                }}
              >
                {g.aLabel}
              </span>
              <span
                className="end-label"
                style={{
                  ...regs.value,
                  fontSize: `${Math.max(11, Number.parseFloat(regs.value.fontSize as string) - 2)}px`,
                  color: label,
                  left: `${pct(cx(i) + barW / 2, FRAME.width)}%`,
                  top: `${pct(y(g.b), FRAME.height)}%`,
                  transform: "translate(-50%, -100%) translateY(-3px)",
                }}
              >
                {g.bLabel}
              </span>
            </span>
          ))}
          <span
            className="note"
            style={{
              ...regs.annot,
              color: accent,
              ...noteAnchor(pct(cx(groups.findIndex((g) => g.code === subject)), FRAME.width)),
              top: "2%",
            }}
          >
            {subjectNote}
          </span>
        </div>

        <div className="x-axis">
          {groups.map((g, i) => (
            <span
              key={g.code}
              className="axis-label x"
              style={{
                ...regs.axis,
                left: `${pct(cx(i), FRAME.width)}%`,
                color: g.code === subject ? accent : (regs.axis.color as string),
                fontWeight: g.code === subject ? 700 : regs.axis.fontWeight,
              }}
            >
              {g.name}
            </span>
          ))}
        </div>
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "10px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
