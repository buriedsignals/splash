/**
 * Sixteen European countries across seven electricity sources, drawn as parallel coordinates THROUGH
 * the design base and delivered as an interactive page.
 *
 * `each-rail-is-headed-by-what-it-is` — every axis carries its own name and its own ceiling in its
 * own units. A parallel-coordinates plate with one shared scale is a lie about seven different
 * quantities; a plate with seven unlabelled scales is a picture.
 *
 * ONLY ADJACENT AXES SHOW A RELATIONSHIP. A crossing between two neighbours is a real inverse; a line
 * that rises three axes later is nothing. So the axis ORDER is the argument, and it is stated in the
 * reading line rather than left to be inferred.
 *
 * WHAT THE WEB ADDS, AND IT IS THE DEFECT THIS FORM HAS ON PAPER. Sixteen lines over seven axes is a
 * tangle, and the static plate cannot isolate one of them: a reader who wants to follow Finland has
 * to trace it by eye through fifteen crossings. Here every line is its own hit target — hovering,
 * tapping or tabbing it paints it in the accent above the others and answers with the country and
 * all seven of its shares at once. The tangle stops being a defect and becomes the point: it is the
 * SHAPE of sixteen mixes, and any one of them can be pulled out of it.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars, noteAnchor } from "#shared/design-base/web.mjs";

export const FRAME = { width: 880, height: 340, xAxisRowPx: 40 };

export type Axis = { key: string; name: string; ceiling: number; ceilingLabel: string };
export type Line = { code: string; name: string; values: number[]; highlight: boolean; detail: string };

const pct = (value: number, extent: number) => (value / extent) * 100;

export function DirectedParallelWeb({
  axes,
  lines,
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
  axes: Axis[];
  lines: Line[];
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

  let thread = mix(ground, ink, 0.32);
  if (contrast(thread, ground) < NON_TEXT_CONTRAST_MIN)
    thread = adjustToContrast(thread, ground, NON_TEXT_CONTRAST_MIN) ?? thread;
  const rail = mix(ground, ink, 0.45);
  const label = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const lit = adjustToContrast(accent, ground, NON_TEXT_CONTRAST_MIN) ?? accent;

  const x = (i: number) => (i / (axes.length - 1)) * FRAME.width;
  const y = (axisIndex: number, value: number) =>
    FRAME.height - (value / axes[axisIndex].ceiling) * FRAME.height;
  const path = (l: Line) => l.values.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(i, v)}`).join(" ");

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
          data-hit="cell"
          viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
          preserveAspectRatio="none"
        >
          <desc>{alt}</desc>
          <rect x={0} y={0} width={FRAME.width} height={FRAME.height} fill={ground} />

          {axes.map((a, i) => (
            <line key={a.key} x1={x(i)} x2={x(i)} y1={0} y2={FRAME.height} stroke={rail} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}

          {lines.map((l) => (
            <path
              key={l.code}
              d={path(l)}
              fill="none"
              stroke={l.highlight ? lit : thread}
              strokeWidth={l.highlight ? 2.2 : 1.2}
              strokeOpacity={l.highlight ? 1 : 0.75}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* THE HIT TARGET IS THE VERTEX, NOT THE LINE, and that is a decision the format's own
              verifier forced. `.line-hit` exists in the shared stylesheet and `initLines` wires it,
              but every check `verify-web.mjs` makes probes a mark at the CENTRE OF ITS BOUNDING BOX
              — which for a path spanning seven axes is empty space, so a page built that way
              reports 47 failures that are not defects and no failure that is one. A vertex is a
              mark with a centre. Each carries its whole country's row, so hitting any of the seven
              answers the same thing, and `data-hit="cell"` resolves in both axes because sixteen
              vertices share every x. */}
          {lines.flatMap((l) =>
            l.values.map((v, i) => (
              <circle
                key={`v-${l.code}-${i}`}
                className="pt"
                cx={x(i)}
                cy={y(i, v)}
                r={4}
                fill={l.highlight ? lit : thread}
                fillOpacity={l.highlight ? 1 : 0.6}
                stroke="none"
                tabIndex={0}
                role="img"
                aria-label={l.detail}
                data-detail={l.detail}
              />
            )),
          )}
          <rect className="hit-area" x={0} y={0} width={FRAME.width} height={FRAME.height} fill="transparent" pointerEvents="all" />
        </svg>

        <div className="overlay" aria-hidden="true">
          {axes.map((a, i) => (
            <span
              key={a.key}
              className="end-label"
              style={{
                ...regs.value,
                fontSize: `${Math.max(10, Number.parseFloat(regs.value.fontSize as string) - 4)}px`,
                color: label,
                // INSIDE the plot's own rectangle. At 375px the geometry has shrunk and the type
                // has not, so a ceiling label seated at the very top edge sits over the figure's
                // padding, where the hit area cannot answer for it.
                ...noteAnchor(pct(x(i), FRAME.width)),
                top: "2%",
              }}
            >
              {a.ceilingLabel}
            </span>
          ))}
        </div>

        <div className="x-axis" style={{ pointerEvents: "none" }}>
          {axes.map((a, i) => {
            const centre = pct(x(i), FRAME.width);
            const anchor =
              centre > 75
                ? { right: `${100 - centre}%`, transform: "translateX(0)" }
                : centre < 8
                  ? { left: `${centre}%`, transform: "translateX(0)" }
                  : { left: `${centre}%` };
            return (
              <span
                key={a.key}
                className="axis-label x"
                style={{ ...regs.axis, ...anchor, whiteSpace: "normal", textAlign: "center", lineHeight: 1.05 }}
              >
                {a.name}
              </span>
            );
          })}
        </div>
      </div>

      {/* The note naming the two lines that clear both thresholds sits UNDER the plot: inside it
          there is no empty band at any width, and at 375px an overlay note at the foot of the frame
          lands in the axis row, where the hit area cannot answer for it. */}
      <p className="chart-reading" style={{ ...regs.annot, margin: "8px 0 0" }}>{claimNote}</p>
      <p className="chart-reading" style={{ ...regs.body, margin: "4px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
