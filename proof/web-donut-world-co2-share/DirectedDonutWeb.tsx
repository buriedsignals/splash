/**
 * Two concentric rings — the world's CO₂ in 2000 and in 2023, by the six largest emitters of 2023 —
 * drawn as a donut THROUGH the design base and delivered as an interactive page.
 *
 * WHY TWO RINGS AND NOT TWO PIES SIDE BY SIDE. A pie answers one question well: what share is this,
 * of that whole. Two pies side by side quietly answer a second one they cannot support — did the
 * whole change — because nothing on the page says the two circles stand for different totals.
 * Concentric rings share a centre and an angular scale, so a wedge's ANGLE is comparable between
 * them; the totals they came from are printed rather than drawn, which is the honest split.
 *
 * `conservation-is-kept-visible` — every ring is closed: the six named wedges plus "all the others"
 * make the whole, and the remainder is drawn as a wedge like any other rather than left as a gap.
 *
 * WHAT THE WEB ADDS. A wedge is an angle, and an angle is the least readable encoding on this list:
 * a reader can rank wedges and can barely measure one. Every wedge here answers with its country,
 * its share of its own year's world total, the tonnes behind it, and — the reading the pair exists
 * for — what the same country held in the other year.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars } from "#shared/design-base/web.mjs";

export const FRAME = { width: 760, height: 380 };

export type Wedge = {
  key: string;
  name: string;
  ring: number;
  from: number;
  to: number;
  tone: number;
  detail: string;
};

export type Ring = { key: string; label: string; total: string; inner: number; outer: number };

const polar = (cx: number, cy: number, r: number, a: number) => [
  cx + r * Math.cos(a - Math.PI / 2),
  cy + r * Math.sin(a - Math.PI / 2),
];

function arcPath(cx: number, cy: number, inner: number, outer: number, from: number, to: number) {
  const large = to - from > Math.PI ? 1 : 0;
  const [x1, y1] = polar(cx, cy, outer, from);
  const [x2, y2] = polar(cx, cy, outer, to);
  const [x3, y3] = polar(cx, cy, inner, to);
  const [x4, y4] = polar(cx, cy, inner, from);
  return (
    `M ${x1} ${y1} A ${outer} ${outer} 0 ${large} 1 ${x2} ${y2} ` +
    `L ${x3} ${y3} A ${inner} ${inner} 0 ${large} 0 ${x4} ${y4} Z`
  );
}

export function DirectedDonutWeb({
  wedges,
  rings,
  tones,
  toneLabels,
  title,
  eyebrow,
  caveat,
  source,
  alt,
  reading,
  centreNote,
  direction,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  wedges: Wedge[];
  rings: Ring[];
  tones: number;
  toneLabels: string[];
  title: string;
  eyebrow: string;
  caveat: string;
  source: string;
  alt: string;
  reading: string;
  centreNote: string[];
  direction: any;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
}) {
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });

  // THE RAMP RUNS THE OTHER WAY, and that is not a taste. The wedges are ordered largest first, so
  // tone 0 is the subject and the last tone is "everyone else" — the remainder that exists to close
  // the ring. A ramp that put its strongest step on the remainder would give the loudest colour to
  // the one slice that names nobody, which is exactly backwards.
  const ramp = Array.from({ length: tones }, (_, i) => {
    const c = mix(ground, accent, 0.18 + ((tones - 1 - i) / (tones - 1)) * 0.82);
    return contrast(c, ground) < NON_TEXT_CONTRAST_MIN
      ? (adjustToContrast(c, ground, NON_TEXT_CONTRAST_MIN) ?? c)
      : c;
  });
  const label = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const cx = FRAME.width / 2;
  const cy = FRAME.height / 2;

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
          // A WEDGE IS AN ANGLE. Stretching the box turns every angle into a different angle, which
          // is the one thing this form cannot survive — the same exception the pictogram states.
          preserveAspectRatio="xMidYMid meet"
        >
          <desc>{alt}</desc>
          <rect x={0} y={0} width={FRAME.width} height={FRAME.height} fill={ground} />

          {wedges.map((w) => (
            <path
              key={`${w.ring}-${w.key}`}
              d={arcPath(cx, cy, rings[w.ring].inner, rings[w.ring].outer, w.from, w.to)}
              fill={ramp[w.tone]}
              stroke={ground}
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {wedges.map((w) => {
            const mid = (w.from + w.to) / 2;
            const r = (rings[w.ring].inner + rings[w.ring].outer) / 2;
            const [px, py] = polar(cx, cy, r, mid);
            return (
              <circle
                key={`hit-${w.ring}-${w.key}`}
                className="pt"
                cx={px}
                cy={py}
                r={(rings[w.ring].outer - rings[w.ring].inner) / 2}
                fill="transparent"
                stroke="none"
                tabIndex={0}
                role="img"
                aria-label={w.detail}
                data-detail={w.detail}
              />
            );
          })}
          <rect className="hit-area" x={0} y={0} width={FRAME.width} height={FRAME.height} fill="transparent" pointerEvents="all" />
        </svg>

        <div className="overlay" aria-hidden="true">
          {/* THE HOLE IS NOT DECORATION: it is where the two totals are stated, because the rings
              carry shares and a share says nothing about the whole it is a share of. */}
          {centreNote.map((line, i) => (
            <span
              key={line}
              className="note"
              style={{
                ...regs.annot,
                color: label,
                left: "50%",
                top: `${50 + (i - (centreNote.length - 1) / 2) * 6}%`,
                transform: "translate(-50%, -50%)",
                background: "transparent",
                padding: 0,
                textAlign: "center",
                whiteSpace: "nowrap",
              }}
            >
              {line}
            </span>
          ))}
          {rings.map((r) => (
            <span
              key={r.key}
              className="end-label"
              style={{
                ...regs.value,
                fontSize: `${Math.max(11, Number.parseFloat(regs.value.fontSize as string) - 2)}px`,
                color: label,
                left: "50%",
                top: `${((cy - (r.inner + r.outer) / 2) / FRAME.height) * 100}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              {r.label}
            </span>
          ))}
        </div>
        <div className="x-axis" />
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "10px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
