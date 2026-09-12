/**
 * Switzerland's electricity by source, 2000 to 2024, drawn as a streamgraph THROUGH the design base
 * and delivered as an interactive page.
 *
 * `a-free-baseline-forbids-a-value-axis` — a streamgraph's baseline wanders by construction, so no
 * band is measured from a fixed zero and a value axis would be a lie. The page carries no value axis
 * at all; the total is printed instead, at both ends, and every band's own number comes from the
 * pointer.
 *
 * `a-band-is-named-inside-itself-or-it-is-texture` — a band thick enough carries its own name where
 * it is thickest; the thin ones are named by the pointer. A band nobody can name is texture.
 *
 * WHAT THE WEB ADDS, AND IT IS THIS FORM'S WHOLE DEBT. A streamgraph is the least measurable chart
 * in this catalogue: a reader can see a band swell and cannot say by how much, from what, or when it
 * passed the band beside it. Every band-year here answers with the source, the year, its TWh, its
 * share of that year's total, and its rank among the sources that year.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars, noteAnchor } from "#shared/design-base/web.mjs";
import { inkOnFill } from "#shared/design-base/web.mjs";

export const FRAME = { width: 900, height: 400, xAxisRowPx: 28 };

export type Band = {
  key: string;
  name: string;
  tone: number;
  path: string;
  label: { x: number; y: number; text: string } | null;
};

export type Mark = { key: string; x: number; y: number; detail: string };

const pct = (value: number, extent: number) => (value / extent) * 100;

export function DirectedStreamWeb({
  bands,
  marks,
  xTicks,
  tones,
  toneLabels,
  totals,
  crossing,
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
  bands: Band[];
  marks: Mark[];
  xTicks: { year: number; x: number }[];
  tones: number;
  toneLabels: string[];
  totals: { left: string; right: string };
  crossing: { x: number; y: number; text: string } | null;
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

  const ramp = Array.from({ length: tones }, (_, i) => {
    const c = mix(ground, accent, 0.2 + ((tones - 1 - i) / (tones - 1)) * 0.8);
    return contrast(c, ground) < NON_TEXT_CONTRAST_MIN
      ? (adjustToContrast(c, ground, NON_TEXT_CONTRAST_MIN) ?? c)
      : c;
  });
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

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0 12px", margin: "8px 0 4px", flex: "0 0 auto" }}>
        {toneLabels.map((t, i) => (
          <span key={t} style={{ ...regs.axis, display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 13, height: 13, background: ramp[i], display: "inline-block", borderRadius: 2 }} />
            {t}
          </span>
        ))}
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
          data-hit="cell"
          viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
          preserveAspectRatio="none"
        >
          <desc>{alt}</desc>
          <rect x={0} y={0} width={FRAME.width} height={FRAME.height} fill={ground} />

          {xTicks.map((t) => (
            <line key={t.year} x1={t.x} x2={t.x} y1={0} y2={FRAME.height} stroke={grid} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}

          {bands.map((b) => (
            <path key={b.key} d={b.path} fill={ramp[b.tone]} stroke={ground} strokeWidth={0.7} vectorEffect="non-scaling-stroke" />
          ))}

          {crossing ? (
            <circle cx={crossing.x} cy={crossing.y} r={6} fill="none" stroke={label} strokeWidth={2} vectorEffect="non-scaling-stroke" />
          ) : null}

          {marks.map((m) => (
            <circle
              key={m.key}
              className="pt"
              cx={m.x}
              cy={m.y}
              r={5}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              aria-label={m.detail}
              data-detail={m.detail}
            />
          ))}
          <rect className="hit-area" x={0} y={0} width={FRAME.width} height={FRAME.height} fill="transparent" pointerEvents="all" />
        </svg>

        <div className="overlay" aria-hidden="true">
          {bands.filter((b) => b.label !== null).map((b) => (
            <span
              key={`l-${b.key}`}
              className="end-label"
              style={{
                ...regs.value,
                fontSize: `${Math.max(11, Number.parseFloat(regs.value.fontSize as string) - 2)}px`,
                color: inkOnFill(ramp[b.tone], { ink, ground }, contrast, adjustToContrast, TEXT_CONTRAST_MIN),
                left: `${pct(b.label!.x, FRAME.width)}%`,
                top: `${pct(b.label!.y, FRAME.height)}%`,
                transform: "translate(-50%, -50%)",
                background: "transparent",
                padding: 0,
              }}
            >
              {b.label!.text}
            </span>
          ))}
          {crossing ? (
            <span
              className="note"
              style={{
                ...regs.annot,
                color: label,
                ...noteAnchor(pct(crossing.x, FRAME.width)),
                top: `${pct(crossing.y, FRAME.height)}%`,
                transform: `${noteAnchor(pct(crossing.x, FRAME.width)).transform} translateY(-160%)`,
              }}
            >
              {crossing.text}
            </span>
          ) : null}
          {/* A FREE BASELINE FORBIDS A VALUE AXIS, so the total is printed at both ends instead. */}
          <span className="note" style={{ ...regs.annot, color: label, left: "0%", top: "1%", background: "transparent", padding: 0 }}>
            {totals.left}
          </span>
          <span className="note" style={{ ...regs.annot, color: label, right: "0%", top: "1%", background: "transparent", padding: 0 }}>
            {totals.right}
          </span>
        </div>

        <div className="x-axis" style={{ pointerEvents: "none" }}>
          {xTicks.map((t) => (
            <span key={t.year} className="axis-label x" style={{ ...regs.axis, left: `${pct(t.x, FRAME.width)}%` }}>
              {t.year}
            </span>
          ))}
        </div>
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "10px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
