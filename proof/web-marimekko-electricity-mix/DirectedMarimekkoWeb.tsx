/**
 * Six European countries' 2024 electricity, drawn as a marimekko THROUGH the design base and
 * delivered as an interactive page: column WIDTH is the country's own generation, column HEIGHT is
 * its mix, so a band's AREA is a real quantity in TWh.
 *
 * `the-width-dimension-is-named-on-the-plate` — a marimekko has two scales and only one of them is
 * obvious. The width scale is stated in words above the columns and each column prints its own TWh,
 * because a reader who does not know what width means reads this as a stacked bar with sloppy
 * spacing.
 *
 * `a-band-is-named-inside-itself-or-it-is-texture` — a band wide and tall enough carries its own
 * name; every band that is not gets its name from the pointer instead. A band nobody can name is
 * texture, and texture in a chart is decoration.
 *
 * WHAT THE WEB ADDS. The whole point of this form is that AREA is a quantity — and area is the one
 * thing an eye cannot read off a page. Every band answers with its country, its source, its share of
 * that country's mix, its TWh, and its share of the six countries' total: the number the area stands
 * for, which no reader can recover by looking.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars, noteAnchor } from "#shared/design-base/web.mjs";
import { inkOnFill } from "#shared/design-base/web.mjs";

export const FRAME = { width: 900, height: 380, xAxisRowPx: 42 };

export type Band = {
  code: string;
  source: string;
  x: number;
  w: number;
  y: number;
  h: number;
  tone: number;
  label: string | null;
  detail: string;
};

export type Column = { code: string; name: string; x: number; w: number; twh: string };

const pct = (value: number, extent: number) => (value / extent) * 100;

export function DirectedMarimekkoWeb({
  bands,
  columns,
  tones,
  toneLabels,
  widthNote,
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
  columns: Column[];
  tones: number;
  toneLabels: string[];
  widthNote: string;
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

  /** One hue, as many chromas as there are sources, ordered so the darkest is the last band —
   *  nine sources are nine steps of one ramp, never nine hues. */
  const ramp = Array.from({ length: tones }, (_, i) => mix(ground, accent, 0.14 + (i / (tones - 1)) * 0.86));
  const edge = mix(ground, ink, 0.25);
  const label = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const onBand = (tone: number) => inkOnFill(ramp[tone], { ink, ground }, contrast, adjustToContrast, TEXT_CONTRAST_MIN);

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

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0 10px", margin: "6px 0 2px", flex: "0 0 auto" }}>
        {toneLabels.map((t, i) => (
          <span key={t} style={{ ...regs.axis, display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 13, height: 13, background: ramp[i], display: "inline-block", borderRadius: 2, border: `1px solid ${edge}` }} />
            {t}
          </span>
        ))}
      </div>
      <p className="chart-caveat" style={{ ...regs.annot, margin: "0 0 4px", flex: "0 0 auto" }}>
        {`${widthNote} ${claimNote}`}
      </p>

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

          {bands.map((b) => (
            <rect
              key={`${b.code}-${b.source}`}
              x={b.x}
              y={b.y}
              width={b.w}
              height={b.h}
              fill={ramp[b.tone]}
              stroke={ground}
              strokeWidth={0.8}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {columns.map((c) => (
            <rect
              key={c.code}
              x={c.x}
              y={0}
              width={c.w}
              height={FRAME.height}
              fill="none"
              stroke={edge}
              strokeWidth={0.8}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {bands.map((b) => (
            <circle
              key={`hit-${b.code}-${b.source}`}
              className="pt"
              cx={b.x + b.w / 2}
              cy={b.y + b.h / 2}
              r={Math.max(3, Math.min(b.w, b.h) / 2)}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              aria-label={b.detail}
              data-detail={b.detail}
            />
          ))}
          <rect className="hit-area" x={0} y={0} width={FRAME.width} height={FRAME.height} fill="transparent" pointerEvents="all" />
        </svg>

        <div className="overlay" aria-hidden="true">
          {bands.filter((b) => b.label !== null).map((b) => (
            <span
              key={`l-${b.code}-${b.source}`}
              className="end-label"
              style={{
                ...regs.value,
                fontSize: `${Math.max(10, Number.parseFloat(regs.value.fontSize as string) - 4)}px`,
                color: onBand(b.tone),
                left: `${pct(b.x + b.w / 2, FRAME.width)}%`,
                top: `${pct(b.y + b.h / 2, FRAME.height)}%`,
                transform: "translate(-50%, -50%)",
                background: "transparent",
                padding: 0,
                textAlign: "center",
                whiteSpace: "normal",
                lineHeight: 1.05,
                maxWidth: `${(b.w / FRAME.width) * 100}%`,
              }}
            >
              {b.label}
            </span>
          ))}
        </div>

        <div className="x-axis">
          {columns.map((c) => {
            // A column label is centred on its own column until the column is at an edge: the last
            // column here is 30px wide at 375px and its two-line label is wider than that, so a
            // centred label hangs past the frame. Anchored from the right, it cannot.
            const centre = pct(c.x + c.w / 2, FRAME.width);
            const edgeAnchor =
              centre > 75
                ? { right: `${100 - pct(c.x + c.w, FRAME.width)}%`, transform: "translateX(0)" }
                : centre < 25
                  ? { left: `${pct(c.x, FRAME.width)}%`, transform: "translateX(0)" }
                  : { left: `${centre}%` };
            return (
            <span
              key={c.code}
              className="axis-label x"
              style={{
                ...regs.axis,
                ...edgeAnchor,
                textAlign: "center",
                whiteSpace: "normal",
                lineHeight: 1.05,
                maxWidth: `${(c.w / FRAME.width) * 100}%`,
                overflowWrap: "anywhere",
              }}
            >
              {c.name}
              <br />
              <span style={{ opacity: 0.8 }}>{c.twh}</span>
            </span>
            );
          })}
        </div>
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "8px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "4px 0 0" }}>{source}</p>
    </figure>
  );
}
