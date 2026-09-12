/**
 * Nine sources flowing into six countries' 2024 electricity, drawn as a sankey THROUGH the design
 * base and delivered as an interactive page.
 *
 * `every-node-carries-its-own-total` — a sankey's promise is conservation, and a node that does not
 * print its own total is asking to be trusted rather than checked. Every node here prints its TWh,
 * and the runner asserts that each node's total equals the sum of its own ribbons on BOTH sides.
 *
 * `ribbons-are-translucent-so-crossings-are-honest` — where two ribbons cross, the overlap is
 * visible as an overlap rather than as whichever ribbon was drawn last. Opacity is what makes a
 * crossing readable instead of a stacking order nobody chose.
 *
 * `a-band-too-thin-to-see-is-not-drawn-it-is-counted` — a ribbon under half a pixel at the frame's
 * own scale is not a ribbon; it is counted into a stated remainder rather than drawn as a hairline
 * that reads as zero.
 *
 * WHAT THE WEB ADDS. A ribbon's width is a quantity and no reader can measure one, least of all when
 * it is one of fifty crossing each other. Every ribbon answers with both of its ends, its TWh, its
 * share of the source it leaves and its share of the country it enters — the two shares that make a
 * ribbon mean something, and that a plate can print for perhaps three of them.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars } from "#shared/design-base/web.mjs";

export const FRAME = { width: 1000, height: 520 };
const NODE_W = 14;

export type Node = { key: string; name: string; side: 0 | 1; y: number; h: number; label: string; tone: number };
export type Ribbon = { key: string; from: string; to: string; y0: number; y1: number; w: number; tone: number; detail: string };

export function DirectedSankeyWeb({
  nodes,
  ribbons,
  tones,
  remainder,
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
  nodes: Node[];
  ribbons: Ribbon[];
  tones: number;
  remainder: string | null;
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
  const nodeInk = mix(ground, ink, 0.55);

  const leftX = 0;
  const rightX = FRAME.width - NODE_W;
  const ribbonPath = (r: Ribbon) => {
    const x0 = leftX + NODE_W;
    const x1 = rightX;
    const cx = (x0 + x1) / 2;
    return (
      `M ${x0} ${r.y0} C ${cx} ${r.y0}, ${cx} ${r.y1}, ${x1} ${r.y1} ` +
      `L ${x1} ${r.y1 + r.w} C ${cx} ${r.y1 + r.w}, ${cx} ${r.y0 + r.w}, ${x0} ${r.y0 + r.w} Z`
    );
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
          ["--x-axis-h" as string]: "0px",
          aspectRatio: `${FRAME.width} / ${FRAME.height}`,
          margin: "10px 0 0",
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
          preserveAspectRatio="xMidYMid meet"
        >
          <desc>{alt}</desc>
          <rect x={0} y={0} width={FRAME.width} height={FRAME.height} fill={ground} />

          {ribbons.map((r) => (
            <path key={r.key} d={ribbonPath(r)} fill={ramp[r.tone]} fillOpacity={0.55} />
          ))}

          {nodes.map((n) => (
            <rect
              key={n.key}
              x={n.side === 0 ? leftX : rightX}
              y={n.y}
              width={NODE_W}
              height={Math.max(1, n.h)}
              fill={n.side === 0 ? ramp[n.tone] : nodeInk}
            />
          ))}

          {ribbons.map((r) => {
            const x0 = leftX + NODE_W;
            const x1 = rightX;
            return (
              <circle
                key={`hit-${r.key}`}
                className="pt"
                cx={(x0 + x1) / 2}
                cy={(r.y0 + r.y1) / 2 + r.w / 2}
                r={Math.max(3, Math.min(9, r.w / 2))}
                fill="transparent"
                stroke="none"
                tabIndex={0}
                role="img"
                aria-label={r.detail}
                data-detail={r.detail}
              />
            );
          })}
          <rect className="hit-area" x={0} y={0} width={FRAME.width} height={FRAME.height} fill="transparent" pointerEvents="all" />

          {/* Words inside the viewBox for the same reason the radar's are: this beat letterboxes
              rather than stretching, so an HTML overlay in percentages of the grid cell would not
              land on the drawing. */}
          {nodes.map((n) => (
            <text
              pointerEvents="none"
              key={`l-${n.key}`}
              x={n.side === 0 ? leftX + NODE_W + 8 : rightX - 8}
              y={n.y + n.h / 2}
              fill={label}
              fontFamily={String(regs.axis.fontFamily)}
              fontSize={13}
              fontWeight={regs.axis.fontWeight as number}
              textAnchor={n.side === 0 ? "start" : "end"}
              dominantBaseline="middle"
            >
              {n.label}
            </text>
          ))}
        </svg>
        <div className="overlay" aria-hidden="true" />
        <div className="x-axis" />
      </div>

      {remainder ? (
        <p className="chart-reading" style={{ ...regs.annot, margin: "8px 0 0" }}>{remainder}</p>
      ) : null}
      <p className="chart-reading" style={{ ...regs.body, margin: "8px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
