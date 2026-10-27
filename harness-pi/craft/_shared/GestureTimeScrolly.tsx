/**
 * A Time-series scrolly — line, area (stacked when several series), streamgraph or bump chart (prop `variant`) — whose
 * staging is the beat's own `gestures`. The marks are drawn by the drive (`applyTimeState`, gesture-time-scrolly.mjs)
 * in the reader's pixels on each paint: every series up to its playhead, linear in time; the time window a zoom opens;
 * a name's ring, a compare's rewound level or copied thickness, a crossing's solved rings, a bracket's brace and its
 * layer in full ink, a reference rule; a direct label at every series' head, in its own ink, no legend.
 *
 * What is rendered here besides the drive's layer is the closing card's picture for a reader without a script: the
 * whole span, every series, the same marks, every note written.
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: a line's value axis is fitted, an area stands on zero, a stream has no value
 * axis, a bump runs rank 1 at the top; one accent, the claim's series; a gap is drawn as a gap.
 */

import type { CSSProperties } from "react";
import {
  adjustToContrast,
  mix,
  NON_TEXT_CONTRAST_MIN,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";

type Style = Record<string, string | number>;
export type TimeScrollySeries = {
  name: string;
  /** per reading, its printed value (absent for a bump: its label is the name) */
  vals?: string[];
  label: string;
  pts: [number, number | null, number | null, number][];
};
export type TimeScrollyItem = {
  k: number;
  do: string;
  kind?: string;
  t?: number;
  y?: number;
  ring?: boolean;
  a?: number[];
  b?: number[];
  pts?: number[][];
  from?: number;
  to?: number;
  layers?: number[];
  value?: number;
};
export type TimeScrollyGap = {
  from: number;
  to: number;
  rect: boolean;
  a?: number;
  b?: number;
};

export function GestureTimeScrolly({
  variant,
  series,
  plan,
  gaps,
  gapLabel,
  domain,
  t0,
  t1,
  traced,
  yTicks,
  yLabels,
  xTicks,
  notes,
  still,
  unit,
  alt,
  regs,
  ground,
  accent,
  ink,
  muted,
}: {
  variant: string;
  series: TimeScrollySeries[];
  plan: TimeScrollyItem[];
  gaps: TimeScrollyGap[];
  gapLabel: string;
  domain: [number, number];
  t0: number;
  t1: number;
  traced: number[];
  yTicks: number[];
  yLabels: string[];
  xTicks: number[];
  /** per gesture, the note its card's header reads ("" for none) */
  notes: string[];
  /** the closing card's emphasis per series */
  still: { accent: boolean[]; ring: boolean[] };
  unit: string;
  alt: string;
  regs: Record<
    "display" | "eyebrow" | "body" | "axis" | "annot" | "value",
    Style
  >;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
}) {
  const band = variant === "area-and-stacked-area" || variant === "streamgraph";
  const accentMark =
    adjustToContrast(accent, ground, NON_TEXT_CONTRAST_MIN) ?? accent;
  const accentInk =
    adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const inkOnGround = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const neutral =
    adjustToContrast(mix(ground, ink, 0.42), ground, NON_TEXT_CONTRAST_MIN) ??
    mix(ground, ink, 0.42);
  const light = mix(ground, ink, 0.24);
  const ringInk =
    adjustToContrast(mix(ground, ink, 0.8), ground, NON_TEXT_CONTRAST_MIN) ??
    ink;
  const grid = mix(ground, ink, 0.12);
  const halo = `0 0 2px ${ground}, 0 0 3px ${ground}, 0 0 4px ${ground}`;
  const abs = (extra: CSSProperties): CSSProperties => ({
    position: "absolute",
    left: 0,
    top: 0,
    whiteSpace: "nowrap",
    ...extra,
  });

  // ── the no-JS still: the closing card's picture, drawn once at a fixed frame
  const SW = 1000;
  const SH = 520;
  const sx = (t: number) => 70 + ((t - t0) / (t1 - t0 || 1)) * (SW - 70 - 230);
  const sy = (v: number) =>
    SH - 30 - ((v - domain[0]) / (domain[1] - domain[0] || 1)) * (SH - 60);
  const runsOf = (pts: TimeScrollySeries["pts"]) => {
    const out: TimeScrollySeries["pts"][] = [];
    let run: TimeScrollySeries["pts"] = [];
    for (const p of pts) {
      if (p[3]) {
        if (run.length) out.push(run);
        run = [];
      } else run.push(p);
    }
    if (run.length) out.push(run);
    return out;
  };
  const stillPath = (pts: TimeScrollySeries["pts"]) =>
    runsOf(pts)
      .map((r) =>
        band
          ? `${r.map((p, k) => `${k ? "L" : "M"}${sx(p[0]).toFixed(1)},${sy(p[2]!).toFixed(1)}`).join("")}${[
              ...r,
            ]
              .reverse()
              .map((p) => `L${sx(p[0]).toFixed(1)},${sy(p[1]!).toFixed(1)}`)
              .join("")}Z`
          : r
              .map(
                (p, k) =>
                  `${k ? "L" : "M"}${sx(p[0]).toFixed(1)},${sy(p[2]!).toFixed(1)}`,
              )
              .join(""),
      )
      .join("");
  const colourOf = (i: number) =>
    still.accent[i]
      ? accentMark
      : still.ring[i]
        ? ringInk
        : band && i % 2
          ? light
          : neutral;
  const writtenNotes = notes.filter((t) => t.trim());
  const noScript =
    `[data-gtime] [data-part="stage"] > :not([data-part="still"]) { display: none !important; }` +
    `[data-gtime] [data-part="still"] { display: flex !important; }`;
  const slot: CSSProperties = {
    gridArea: "1 / 1",
    justifySelf: "end",
    textAlign: "right",
  };
  const lastOf = (s: TimeScrollySeries) =>
    [...s.pts].reverse().find((p) => !p[3]);
  // The still's end labels, nudged apart from top to bottom so no two print through each other.
  const endY = new Map<number, number>();
  {
    const pitch = (Number.parseFloat(String(regs.annot.fontSize ?? 13)) || 13) * 1.3;
    const placed = series
      .map((s, i) => {
        const p = lastOf(s);
        if (!p) return null;
        return { i, y: band ? sy(((p[1] as number) + (p[2] as number)) / 2) : sy(p[2] as number) };
      })
      .filter((e): e is { i: number; y: number } => e !== null)
      .sort((a, b) => a.y - b.y);
    for (let k = 1; k < placed.length; k++) if (placed[k].y - placed[k - 1].y < pitch) placed[k].y = placed[k - 1].y + pitch;
    for (let k = placed.length - 1; k >= 0; k--) {
      const limit = k === placed.length - 1 ? SH - 24 : placed[k + 1].y - pitch;
      if (placed[k].y > limit) placed[k].y = limit;
    }
    for (const e of placed) endY.set(e.i, e.y);
  }

  return (
    <div
      role="img"
      aria-label={alt}
      data-gtime={JSON.stringify({
        variant,
        band,
        series: series.map((s) => ({ pts: s.pts, name: s.name, vals: s.vals })),
        plan,
        gaps,
        domain,
        t0,
        t1,
        traced,
        yTicks,
        xTicks,
        colours: {
          accent: accentMark,
          accentInk,
          ink: inkOnGround,
          neutral,
          light,
          ring: ringInk,
          ground,
        },
      })}
      style={{
        position: "absolute",
        inset: 0,
        background: ground,
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr)",
        gridTemplateColumns: "minmax(0, 1fr)",
        rowGap: "10px",
        padding: `12px var(--prose-gutter, clamp(16px, 6vw, 56px))`,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: "4px 16px",
        }}
      >
        <span style={{ ...regs.axis, color: mutedInk, fontWeight: 700 }}>
          {unit}
        </span>
        <span style={{ display: "grid", marginLeft: "auto" }}>
          {plan.map((p, j) => (
            <span
              key={p.k}
              data-note={p.k}
              style={{ ...regs.value, ...slot, color: accentInk, opacity: 0 }}
            >
              {notes[j]}
            </span>
          ))}
        </span>
      </div>

      <noscript
        style={{ display: "none" }}
        dangerouslySetInnerHTML={{ __html: `<style>${noScript}</style>` }}
      />
      <div data-part="stage" style={{ position: "relative", minHeight: 0 }}>
        <div
          data-part="still"
          style={{
            display: "none",
            position: "absolute",
            inset: 0,
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <svg
            viewBox={`0 0 ${SW} ${SH}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ flex: "1 1 auto", minHeight: 0, width: "100%" }}
          >
            {yTicks.map((v, j) => (
              <g key={j}>
                <line
                  x1={70}
                  x2={SW - 230}
                  y1={sy(v)}
                  y2={sy(v)}
                  stroke={grid}
                  strokeWidth={1}
                />
                <text
                  x={62}
                  y={sy(v) + 4}
                  textAnchor="end"
                  style={{ ...regs.axis, fill: mutedInk } as CSSProperties}
                >
                  {yLabels[j]}
                </text>
              </g>
            ))}
            {series.map((s, i) => (
              <path
                key={i}
                d={stillPath(s.pts) || "M0,0"}
                fill={band ? colourOf(i) : "none"}
                stroke={band ? ground : colourOf(i)}
                strokeWidth={band ? 0.8 : still.accent[i] ? 3 : 1.4}
              />
            ))}
            {series.map((s, i) => {
              const p = lastOf(s);
              if (
                !p ||
                (variant === "bump-ranking-over-time" &&
                  p[0] !== t1 &&
                  !still.accent[i])
              )
                return null;
              return (
                <text
                  key={`e${i}`}
                  x={sx(p[0]) + 6}
                  y={(endY.get(i) ?? 0) + 4}
                  style={
                    {
                      ...regs.annot,
                      fill: still.accent[i] ? accentInk : inkOnGround,
                      fontWeight: still.accent[i] ? 700 : regs.annot.fontWeight,
                    } as CSSProperties
                  }
                >
                  {s.label}
                </text>
              );
            })}
            {xTicks.map((t) => (
              <text
                key={`x${t}`}
                x={sx(t)}
                y={SH - 8}
                textAnchor="middle"
                style={{ ...regs.axis, fill: mutedInk } as CSSProperties}
              >
                {t}
              </text>
            ))}
          </svg>
          {writtenNotes.length ? (
            <p
              style={{
                ...regs.value,
                color: accentInk,
                margin: 0,
                flex: "0 0 auto",
              }}
            >
              {writtenNotes.join(" · ")}
            </p>
          ) : null}
          {gaps.length ? (
            <p
              style={{
                ...regs.axis,
                color: mutedInk,
                margin: 0,
                flex: "0 0 auto",
              }}
            >
              {gapLabel}
            </p>
          ) : null}
        </div>

        <svg
          data-part="field"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            overflow: "visible",
          }}
        >
          <defs>
            <clipPath id="gtime-clip">
              <rect data-part="clip" x={0} y={0} width={1} height={1} />
            </clipPath>
          </defs>
          {yTicks.map((_, j) => (
            <line key={j} data-ygrid={j} stroke={grid} strokeWidth={1} />
          ))}
          <line data-part="baseline" stroke={mutedInk} strokeWidth={1} />
          {gaps.map((g, j) =>
            g.rect ? (
              <rect
                key={j}
                data-gap={j}
                fill={mix(ground, ink, 0.06)}
                stroke={mutedInk}
                strokeWidth={0.6}
                strokeDasharray="2 3"
                opacity={0}
              />
            ) : (
              <line
                key={j}
                data-gap={j}
                stroke={mutedInk}
                strokeWidth={1.2}
                strokeDasharray="1.5 3"
                opacity={0}
              />
            ),
          )}
          <g clipPath="url(#gtime-clip)">
            {series.map((_, i) =>
              band ? (
                <g key={i}>
                  <path data-series={i} fill={neutral} />
                  <path data-tint={i} fill={accentMark} opacity={0} />
                </g>
              ) : (
                <path
                  key={i}
                  data-series={i}
                  fill="none"
                  stroke={neutral}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ),
            )}
          </g>
          <line
            data-part="playhead"
            stroke={mutedInk}
            strokeWidth={1}
            strokeDasharray="3 3"
            opacity={0}
          />
          {plan.map((p) => {
            if (p.do === "name" || p.do === "annotate")
              return p.ring ? (
                <circle
                  key={p.k}
                  data-pk={p.k}
                  fill="none"
                  stroke={ringInk}
                  strokeWidth={1.8}
                  opacity={0}
                />
              ) : (
                <circle
                  key={p.k}
                  data-pk={p.k}
                  fill={inkOnGround}
                  opacity={0}
                />
              );
            if (p.do === "compare" && p.kind === "crossing")
              return (
                <g key={p.k}>
                  {(p.pts ?? []).map((_, j) => (
                    <circle
                      key={j}
                      data-pk={p.k}
                      fill="none"
                      stroke={ringInk}
                      strokeWidth={1.8}
                      opacity={0}
                    />
                  ))}
                </g>
              );
            if (p.do === "compare" && p.kind === "level")
              return (
                <g key={p.k}>
                  <line
                    data-pk={p.k}
                    stroke={inkOnGround}
                    strokeWidth={1.2}
                    strokeDasharray="3 3"
                    opacity={0}
                  />
                  <circle
                    data-pk={p.k}
                    fill={ground}
                    stroke={inkOnGround}
                    strokeWidth={1.5}
                    opacity={0}
                  />
                  <line
                    data-pk={p.k}
                    stroke={accentMark}
                    strokeWidth={2.2}
                    opacity={0}
                  />
                  <circle data-pk={p.k} fill={accentMark} opacity={0} />
                </g>
              );
            if (p.do === "compare")
              return (
                <g key={p.k}>
                  <rect data-pk={p.k} fill={inkOnGround} opacity={0} />
                  <rect
                    data-pk={p.k}
                    fill="none"
                    stroke={inkOnGround}
                    strokeWidth={1}
                    opacity={0}
                  />
                </g>
              );
            if (p.do === "bracket")
              return (
                <path
                  key={p.k}
                  data-pk={p.k}
                  fill="none"
                  stroke={inkOnGround}
                  strokeWidth={1.4}
                  opacity={0}
                />
              );
            if (p.do === "reference")
              return (
                <line
                  key={p.k}
                  data-pk={p.k}
                  stroke={inkOnGround}
                  strokeWidth={1.2}
                  strokeDasharray="5 4"
                  opacity={0}
                />
              );
            return null;
          })}
        </svg>

        {yLabels.map((l, j) => (
          <span
            key={j}
            data-ylabel={j}
            style={abs({ ...regs.axis, color: mutedInk })}
          >
            {l}
          </span>
        ))}
        {xTicks.map((t, j) => (
          <span
            key={j}
            data-xlabel={j}
            style={abs({ ...regs.axis, color: mutedInk })}
          >
            {t}
          </span>
        ))}
        <span
          data-part="headlabel"
          style={abs({
            ...regs.axis,
            color: mutedInk,
            fontWeight: 700,
            opacity: 0,
          })}
        >
          {t0}
        </span>
        {series.map((s, i) => (
          <span
            key={i}
            data-end={i}
            style={abs({
              ...regs.annot,
              color: inkOnGround,
              textShadow: halo,
              lineHeight: 1.15,
            })}
          >
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
