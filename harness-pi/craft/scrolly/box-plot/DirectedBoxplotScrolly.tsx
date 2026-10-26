/**
 * France's per-capita CO₂ emissions, 1950–2024, drawn THROUGH the design base as a box plot by decade and CHOREOGRAPHED
 * by the scroll. The `box plot` type in the scrolly format: the subject of `more-boxplot-france-co2-decades` — the
 * median peaked in the 1970s and has fallen every decade since — told with the gestures a scroll can make
 * (`scrolly/references/directed-type-choreography.md`): every year a point in time, the points gathered by decade, each
 * column closed into its box, the medians joined, the spread read.
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: the whisker rule (1.5 × IQR) stated on the plate; a position encoding, so the
 * value axis is fitted, not anchored at zero; one hue for every box; the partial last decade said to be partial; an
 * outlier drawn as a point and named.
 *
 * `boxplot-drive.mjs` lays out every mark in the reader's pixels on each paint. What is rendered here is the last card's
 * picture, for a reader without a script.
 */

import type { CSSProperties } from "react";
import {
  adjustToContrast,
  mix,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";

export type Box = {
  label: string;
  decade: number;
  n: number;
  q1: number;
  median: number;
  q3: number;
  lo: number;
  hi: number;
  medianText: string;
  nText: string;
  spreadText: string;
  focus: boolean;
};
export type Point = {
  year: number;
  value: number;
  decade: number;
  outlier: boolean;
};
type Style = Record<string, string | number>;

export const NOTES = [
  "yearsNote",
  "decadesNote",
  "boxNote",
  "medianNote",
  "spreadNote",
  "ruleNote",
] as const;

export function DirectedBoxplotScrolly({
  boxes,
  points,
  domain,
  ticks,
  xTicks,
  peakYear,
  outlierText,
  words,
  alt,
  regs,
  stroke,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  boxes: Box[];
  points: Point[];
  domain: [number, number];
  ticks: number[];
  xTicks: number[];
  peakYear: { year: number; text: string };
  outlierText: string;
  words: Record<(typeof NOTES)[number] | "unit" | "rule", string>;
  alt: string;
  regs: Record<
    "display" | "eyebrow" | "body" | "axis" | "annot" | "value",
    Style
  >;
  stroke: { rule?: number };
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
}) {
  const accentInk =
    adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const inkOnGround = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const boxFill = mix(accent, ground, 0.72);
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
  const rule = stroke.rule ?? 1;

  // THE LAST CARD'S PICTURE WITHOUT A SCRIPT (kit addition). The drive lays out every mark in the
  // reader's pixels, so with no script the boxes have no geometry and every tick sits at the stage's
  // top-left corner. A <noscript> stylesheet hides the drive's layer and shows the same picture in
  // percentages of the plot: one column per decade, its box, median and whiskers, the years stepped
  // back but the outlier, the decade and its count under it, the whisker rule written.
  const [vLo, vHi] = domain;
  const sy = (v: number) => (1 - (v - vLo) / (vHi - vLo)) * 100;
  const sc = (i: number) => ((i + 0.5) / boxes.length) * 100;
  const boxWidth = `min(46px, ${55 / boxes.length}%)`;
  const capWidth = `min(23px, ${27.5 / boxes.length}%)`;
  const columnOf = new Map(boxes.map((b, i) => [b.decade, i]));
  const outlierPoint = points.find((p) => p.outlier);
  const bar = (i: number, from: number, to: number, width: string, height: string | null, extra: CSSProperties): CSSProperties => ({
    position: "absolute",
    left: `${sc(i)}%`,
    top: `${sy(Math.max(from, to))}%`,
    width,
    height: height ?? `${Math.abs(sy(from) - sy(to))}%`,
    transform: height ? "translate(-50%, -50%)" : "translateX(-50%)",
    boxSizing: "border-box",
    ...extra,
  });
  const noScript =
    `[data-boxplot] [data-part="stage"] > :not([data-part="still"]) { display: none !important; }` +
    `[data-boxplot] [data-part="still"] { display: block !important; }` +
    `[data-boxplot] [data-note="ruleNote"] { opacity: 1 !important; }`;

  return (
    <div
      role="img"
      aria-label={alt}
      data-boxplot={JSON.stringify({
        boxes: boxes.map(({ decade, n, q1, median, q3, lo, hi, focus }) => ({
          decade,
          n,
          q1,
          median,
          q3,
          lo,
          hi,
          focus,
        })),
        points: points.map((p) => [
          p.year,
          Math.round(p.value * 1000) / 1000,
          p.decade,
          p.outlier ? 1 : 0,
        ]),
        domain,
        ticks,
        xTicks,
        peakYear: peakYear.year,
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
              style={{ ...regs.value, ...slot, color: accentInk, opacity: 0 }}
            >
              {words[k]}
            </span>
          ))}
        </span>
      </div>

      <noscript
        style={{ display: "none" }}
        dangerouslySetInnerHTML={{ __html: `<style>${noScript}</style>` }}
      />
      <div data-part="stage" style={{ position: "relative", minHeight: 0 }}>
        <div data-part="still" style={{ display: "none", position: "absolute", inset: 0 }}>
          <span style={abs({ ...regs.axis, color: mutedInk, left: "auto", right: "6px", top: "40px", transform: "translateY(-100%)" })}>{words.rule}</span>
          <div style={{ position: "absolute", left: "30px", right: "6px", top: "44px", bottom: "46px" }}>
            {ticks.map((t) => (
              <div key={`sg${t}`}>
                <span style={{ position: "absolute", left: 0, right: 0, top: `${sy(t)}%`, height: 0, borderTop: `${rule}px solid ${grid}` }} />
                <span style={abs({ ...regs.axis, color: mutedInk, left: "-8px", top: `${sy(t)}%`, transform: "translate(-100%, -50%)" })}>{t}</span>
              </div>
            ))}
            {points
              .filter((p) => !p.outlier)
              .map((p) => {
                const slotIn = p.year - p.decade;
                const offset = (slotIn % 2 ? 1 : -1) * (Math.floor(slotIn / 2) + 0.5) * 8.3;
                return (
                  <span
                    key={`sp${p.year}`}
                    style={{ position: "absolute", left: `calc(${sc(columnOf.get(p.decade) ?? 0)}% + ${offset}px)`, top: `${sy(p.value)}%`, width: "6.4px", height: "6.4px", borderRadius: "50%", background: accent, opacity: 0.15, transform: "translate(-50%, -50%)" }}
                  />
                );
              })}
            {boxes.map((b, i) => (
              <div key={`sb${b.decade}`}>
                <span style={bar(i, b.lo, b.hi, `${rule}px`, null, { background: inkOnGround })} />
                <span style={bar(i, b.lo, b.lo, capWidth, `${rule}px`, { background: inkOnGround })} />
                <span style={bar(i, b.hi, b.hi, capWidth, `${rule}px`, { background: inkOnGround })} />
                <span style={bar(i, b.q1, b.q3, boxWidth, null, { background: boxFill, border: `${rule * 1.2}px solid ${accent}` })} />
                <span style={bar(i, b.median, b.median, boxWidth, `${rule * 2.2}px`, { background: inkOnGround })} />
                <span style={abs({ ...regs.annot, color: inkOnGround, left: `${sc(i)}%`, top: "calc(100% + 6px)", transform: "translateX(-50%)", textAlign: "center" })}>{b.label}</span>
                <span style={abs({ ...regs.axis, color: mutedInk, left: `${sc(i)}%`, top: "calc(100% + 24px)", transform: "translateX(-50%)", opacity: b.n < 10 ? 1 : 0.7 })}>{b.nText}</span>
              </div>
            ))}
            {outlierPoint && (
              <div>
                <span style={{ position: "absolute", left: `${sc(columnOf.get(outlierPoint.decade) ?? 0)}%`, top: `${sy(outlierPoint.value)}%`, width: "7.7px", height: "7.7px", borderRadius: "50%", background: accent, transform: "translate(-50%, -50%)" }} />
                <span style={abs({ ...regs.axis, color: inkOnGround, fontWeight: 700, textShadow: halo, left: `calc(${sc(columnOf.get(outlierPoint.decade) ?? 0)}% + min(29px, ${33.5 / boxes.length}%))`, top: `${sy(outlierPoint.value)}%`, transform: "translateY(-50%)" })}>{outlierText}</span>
              </div>
            )}
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
          {ticks.map((t) => (
            <line key={t} data-grid={t} stroke={grid} strokeWidth={rule} />
          ))}
          {boxes.map((b) => (
            <g key={b.decade} data-box={b.decade} opacity={0}>
              <line
                data-part="whisker"
                stroke={inkOnGround}
                strokeWidth={rule}
              />
              <line
                data-part="cap-lo"
                stroke={inkOnGround}
                strokeWidth={rule}
              />
              <line
                data-part="cap-hi"
                stroke={inkOnGround}
                strokeWidth={rule}
              />
              <rect
                data-part="iqr"
                fill={boxFill}
                stroke={accent}
                strokeWidth={rule * 1.2}
              />
              <line
                data-part="median"
                stroke={inkOnGround}
                strokeWidth={rule * 2.2}
              />
            </g>
          ))}
          <path
            data-part="median-line"
            fill="none"
            stroke={accentInk}
            strokeWidth={rule * 1.6}
            strokeDasharray="5 4"
            opacity={0}
          />
          {points.map((p) => (
            <circle key={p.year} data-point={p.year} r={3} fill={accent} />
          ))}
        </svg>

        {ticks.map((t) => (
          <span
            key={t}
            data-tick={t}
            style={abs({ ...regs.axis, color: mutedInk })}
          >
            {t}
          </span>
        ))}
        {xTicks.map((y) => (
          <span
            key={y}
            data-x-tick={y}
            style={abs({ ...regs.axis, color: mutedInk })}
          >
            {y}
          </span>
        ))}
        {boxes.map((b) => (
          <div key={b.decade}>
            <span
              data-decade={b.decade}
              style={abs({
                ...regs.annot,
                color: inkOnGround,
                opacity: 0,
                textAlign: "center",
              })}
            >
              {b.label}
            </span>
            <span
              data-n={b.decade}
              style={abs({ ...regs.axis, color: mutedInk, opacity: 0 })}
            >
              {b.nText}
            </span>
            <span
              data-median-label={b.decade}
              style={abs({
                ...regs.value,
                color: accentInk,
                fontWeight: 700,
                textShadow: halo,
                opacity: 0,
              })}
            >
              {b.medianText}
            </span>
            <span
              data-spread={b.decade}
              style={abs({
                ...regs.axis,
                color: inkOnGround,
                fontWeight: 700,
                textShadow: halo,
                opacity: 0,
              })}
            >
              {b.spreadText}
            </span>
          </div>
        ))}
        <span
          data-part="peak"
          style={abs({
            ...regs.value,
            color: accentInk,
            fontWeight: 700,
            textShadow: halo,
            opacity: 0,
          })}
        >
          {peakYear.text}
        </span>
        <span
          data-part="outlier"
          style={abs({
            ...regs.axis,
            color: inkOnGround,
            fontWeight: 700,
            textShadow: halo,
            opacity: 0,
          })}
        >
          {outlierText}
        </span>
        <span
          data-part="rule"
          style={abs({ ...regs.axis, color: mutedInk, opacity: 0 })}
        >
          {words.rule}
        </span>
      </div>
    </div>
  );
}
