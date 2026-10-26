/**
 * Switzerland's electricity by source, 2000–2024, drawn THROUGH the design base as a streamgraph and CHOREOGRAPHED by
 * the scroll. The `streamgraph` type in the scrolly format: the subject of `static-streamgraph-swiss-electricity` —
 * solar became the third source in 2016 — told with the gestures a scroll can make
 * (`scrolly/references/directed-type-choreography.md`): the stream drawn year by year, then the two giants withdrawn
 * so the thin layers fill the frame and the crossing can be seen, then the giants given back.
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: silhouette offset, layers inside-out, so no band starts at zero and there is no
 * value axis — the quantities are written; every band a reader could name is named inside itself; one ramp of the
 * accent by size, the tracked band at full accent.
 *
 * `stream-drive.mjs` lays out every band in the reader's pixels on each paint. What is rendered here is the last card's
 * picture, for a reader without a script.
 */

import type { CSSProperties } from "react";
import {
  adjustToContrast,
  contrast,
  mix,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";

export type Layer = {
  key: string;
  label: string;
  values: number[];
  giant: boolean;
};
type Style = Record<string, string | number>;

export const NOTES = [
  "drawNote",
  "totalNote",
  "smallNote",
  "crossNote",
  "endNote",
  "readNote",
] as const;

export function DirectedStreamScrolly({
  layers,
  order,
  years,
  tracked,
  rival,
  marks,
  xTicks,
  words,
  alt,
  regs,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  layers: Layer[];
  /** layer indices bottom to top, inside-out */
  order: number[];
  years: number[];
  tracked: string;
  rival: string;
  marks: { year: number; text: string }[];
  xTicks: number[];
  words: Record<(typeof NOTES)[number] | "unit", string>;
  alt: string;
  regs: Record<
    "display" | "eyebrow" | "body" | "axis" | "annot" | "value",
    Style
  >;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
}) {
  /** One ramp of the accent by size, darkest for the largest; the tracked band at full accent. */
  const bySize = [...layers]
    .sort(
      (a, b) =>
        b.values.reduce((s, v) => s + v, 0) -
        a.values.reduce((s, v) => s + v, 0),
    )
    .map((l) => l.key);
  const rampFrom = mix(accent, ink, 0.45);
  const rampTo = mix(accent, ground, 0.78);
  const fillOf = (l: Layer) =>
    l.key === tracked
      ? accent
      : mix(
          rampFrom,
          rampTo,
          bySize.indexOf(l.key) / Math.max(1, bySize.length - 1),
        );
  const legibleOn = (fill: string) =>
    contrast(ink, fill) >= contrast(ground, fill) ? ink : ground;
  const accentInk =
    adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const inkOnGround = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const halo = `0 0 2px ${ground}, 0 0 3px ${ground}, 0 0 4px ${ground}`;
  const abs = (extra: CSSProperties): CSSProperties => ({
    position: "absolute",
    left: 0,
    top: 0,
    whiteSpace: "nowrap",
    ...extra,
  });
  const slot: CSSProperties = {
    gridArea: "1 / 1",
    justifySelf: "end",
    textAlign: "right",
  };

  // THE LAST CARD'S PICTURE WITHOUT A SCRIPT (kit addition). The drive draws every band in the
  // reader's pixels, so with no script the paths were empty, the playhead's clip unsized and every
  // label and tick sat at the stage's top-left corner. A <noscript> stylesheet hides the drive's
  // layer and shows the last card's picture: the whole stream, every band at its full thickness, the
  // same silhouette stack in the same inside-out order and the same smoothing, in a 1000×600 box
  // stretched to the stage; each band named inside itself where it is thickest when it holds its
  // name, the year ticks under it.
  const SVW = 1000;
  const SVH = 600;
  const nY = years.length;
  const sx = (yr: number) =>
    ((yr - years[0]) / (years[nY - 1] - years[0])) * SVW;
  const stillTotals = years.map((_, t) =>
    layers.reduce((s, l) => s + l.values[t], 0),
  );
  const stillMax = Math.max(...stillTotals) * 1.08;
  const sy = (v: number) => SVH / 2 - (v / stillMax) * SVH;
  const stillRun = stillTotals.map((T) => -T / 2);
  const stillEdges = new Map<string, { lo: number[]; hi: number[] }>();
  for (const index of order) {
    const l = layers[index];
    const lo = stillRun.slice();
    const hi = stillRun.map((v, t) => v + l.values[t]);
    for (let t = 0; t < nY; t++) stillRun[t] = hi[t];
    stillEdges.set(l.key, { lo, hi });
  }
  const stillSmooth = (pts: number[][]) => {
    let d = "";
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    return d;
  };
  const stillBands = layers.map((l) => {
    const { lo, hi } = stillEdges.get(l.key)!;
    const upper = years.map((yr, t) => [sx(yr), sy(hi[t])]);
    const lower = years.map((yr, t) => [sx(yr), sy(lo[t])]).reverse();
    let bestT = 0;
    for (let t = 0; t < nY; t++)
      if (hi[t] - lo[t] > hi[bestT] - lo[bestT]) bestT = t;
    // Named when the band is at least a twentieth of the box's height where it is thickest.
    const named = ((hi[bestT] - lo[bestT]) / stillMax) > 0.05;
    return {
      l,
      d: `M${upper[0][0]} ${upper[0][1]}${stillSmooth(upper)} L${lower[0][0]} ${lower[0][1]}${stillSmooth(lower)} Z`,
      named,
      left: Math.max(2, Math.min(92, (sx(years[bestT]) / SVW) * 100)),
      top: (sy((hi[bestT] + lo[bestT]) / 2) / SVH) * 100,
    };
  });
  const noScript =
    `[data-stream] [data-part="stage"] > :not([data-part="still"]) { display: none !important; }` +
    `[data-stream] [data-part="still"] { display: block !important; }` +
    `[data-stream] [data-note="readNote"] { opacity: 1 !important; }`;

  return (
    <div
      role="img"
      aria-label={alt}
      data-stream={JSON.stringify({
        layers: layers.map(({ key, values, giant }) => ({
          key,
          values,
          giant,
        })),
        order,
        years,
        tracked,
        rival,
        marks: marks.map((m) => m.year),
        xTicks,
        notes: NOTES,
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
          {words.unit}
        </span>
        <span style={{ display: "grid", marginLeft: "auto" }}>
          {NOTES.map((k) => (
            <span
              key={k}
              data-note={k}
              data-template={k === "drawNote" ? words[k] : undefined}
              style={{ ...regs.value, ...slot, color: accentInk, opacity: 0 }}
            >
              {words[k].replace("{year}", String(years[years.length - 1]))}
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
          style={{ display: "none", position: "absolute", inset: 0 }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: "28px",
              bottom: "26px",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox={`0 0 ${SVW} ${SVH}`}
              preserveAspectRatio="none"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                overflow: "visible",
              }}
            >
              {xTicks.map((t) => (
                <line
                  key={t}
                  x1={sx(t)}
                  x2={sx(t)}
                  y1={0}
                  y2={SVH}
                  stroke={grid}
                  strokeWidth={1}
                  opacity={0.6}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {stillBands.map((b) => (
                <path
                  key={b.l.key}
                  d={b.d}
                  fill={fillOf(b.l)}
                  stroke={ground}
                  strokeWidth={0.6}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
            {stillBands
              .filter((b) => b.named)
              .map((b) => (
                <span
                  key={b.l.key}
                  style={{
                    ...regs.annot,
                    position: "absolute",
                    whiteSpace: "nowrap",
                    left: `${b.left.toFixed(2)}%`,
                    top: `${b.top.toFixed(2)}%`,
                    transform: "translate(-50%, -50%)",
                    color: legibleOn(fillOf(b.l)),
                    fontWeight:
                      b.l.key === tracked ? 700 : regs.annot.fontWeight,
                  }}
                >
                  {b.l.label}
                </span>
              ))}
            {xTicks.map((t) => (
              <span
                key={t}
                style={{
                  ...regs.axis,
                  position: "absolute",
                  whiteSpace: "nowrap",
                  top: "calc(100% + 4px)",
                  left: `${((sx(t) / SVW) * 100).toFixed(2)}%`,
                  transform: `translateX(${t === years[0] ? 0 : t === years[nY - 1] ? -100 : -50}%)`,
                  color: mutedInk,
                }}
              >
                {t}
              </span>
            ))}
          </div>
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
            <clipPath id="stream-playhead">
              <rect
                data-part="playhead"
                x={0}
                y={-10000}
                width={100000}
                height={20000}
              />
            </clipPath>
          </defs>
          {xTicks.map((t) => (
            <line key={t} data-x-grid={t} stroke={grid} strokeWidth={1} />
          ))}
          <g clipPath="url(#stream-playhead)">
            {layers.map((l) => (
              <path
                key={l.key}
                data-layer={l.key}
                fill={fillOf(l)}
                stroke={ground}
                strokeWidth={0.6}
              />
            ))}
          </g>
          {marks.map((m) => (
            <line
              key={m.year}
              data-mark={m.year}
              stroke={inkOnGround}
              strokeWidth={1.2}
              strokeDasharray="4 3"
              opacity={0}
            />
          ))}
        </svg>

        {layers.map((l) => (
          <span
            key={l.key}
            data-label={l.key}
            style={abs({
              ...regs.annot,
              color: legibleOn(fillOf(l)),
              fontWeight: l.key === tracked ? 700 : regs.annot.fontWeight,
              opacity: 0,
            })}
          >
            {l.label}
          </span>
        ))}
        {marks.map((m) => (
          <span
            key={m.year}
            data-mark-label={m.year}
            style={abs({
              ...regs.value,
              color: inkOnGround,
              fontWeight: 700,
              textShadow: halo,
              opacity: 0,
            })}
          >
            {m.text}
          </span>
        ))}
        {xTicks.map((t) => (
          <span
            key={t}
            data-x-tick={t}
            style={abs({ ...regs.axis, color: mutedInk })}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
