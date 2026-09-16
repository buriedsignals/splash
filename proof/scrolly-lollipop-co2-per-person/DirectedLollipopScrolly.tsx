/**
 * CO₂ per person in the six largest emitters, 2000 and 2023, drawn THROUGH the design base as paired lollipops and
 * CHOREOGRAPHED by the scroll. The `lollipop` type in the scrolly format: the subject of
 * `static-lollipop-co2-per-person` — China tripled, the American average fell, the ratio went from 7.5 to 1.7 — told
 * with the gestures a scroll can make (`scrolly/references/directed-type-choreography.md`): the 2000 stems growing
 * from zero, the 2023 stems beside them, China and the United States drawn together and their ratio measured, every
 * pair's direction of change, the pull back.
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: each state its own stem from zero; the earlier state a lighter tint of the
 * later state's own hue, floored against the ground; the direction of change a drawn triangle before its number; the
 * six a computed rule, printed.
 *
 * `lollipop-drive.mjs` places every mark in the reader's pixels on each paint. What is rendered here is the last
 * card's picture, for a reader without a script.
 */

import type { CSSProperties } from "react";
import {
  adjustToContrast,
  contrast,
  mix,
  NON_TEXT_CONTRAST_MIN,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";

export type Pair = {
  code: string;
  name: string;
  before: number;
  after: number;
  change: number;
  beforeText: string;
  afterText: string;
  changeText: string;
};
type Style = Record<string, string | number>;

export function DirectedLollipopScrolly({
  pairs,
  subject,
  other,
  years,
  max,
  words,
  alt,
  regs,
  stroke,
  ground,
  accent,
  ink,
  muted,
}: {
  pairs: Pair[];
  subject: string;
  other: string;
  years: [string, string];
  max: number;
  words: {
    unit: string;
    rule: string;
    beforeRatio: string;
    afterRatio: string;
    pairNote: string;
    changeNote: string;
    shareNote: string;
  };
  alt: string;
  regs: Record<
    "display" | "eyebrow" | "body" | "axis" | "annot" | "value",
    Style
  >;
  stroke: { rule?: number; hairline?: number };
  ground: string;
  accent: string;
  ink: string;
  muted: string;
}) {
  const present =
    adjustToContrast(accent, ground, NON_TEXT_CONTRAST_MIN) ?? accent;
  let past = mix(accent, ground, 0.6);
  if (contrast(past, ground) < NON_TEXT_CONTRAST_MIN)
    past =
      adjustToContrast(past, ground, NON_TEXT_CONTRAST_MIN) ??
      mix(accent, ground, 0.35);
  const accentInk =
    adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
  const pastInk =
    adjustToContrast(past, ground, TEXT_CONTRAST_MIN) ??
    adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ??
    muted;
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const inkOnGround = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const baseline = mix(ground, ink, 0.75);
  const rule = stroke.rule ?? 1;
  const abs = (extra: CSSProperties): CSSProperties => ({
    position: "absolute",
    left: 0,
    top: 0,
    ...extra,
  });
  const slot: CSSProperties = {
    gridArea: "1 / 1",
    justifySelf: "end",
    textAlign: "right",
  };
  const triangle = (up: boolean) =>
    up ? "M0 8 L4.5 0 L9 8 Z" : "M0 0 L9 0 L4.5 8 Z";

  return (
    <div
      role="img"
      aria-label={alt}
      data-lollipops={JSON.stringify({
        pairs: pairs.map(({ code, before, after, change }) => ({
          code,
          before,
          after,
          change,
        })),
        subject,
        other,
        max,
      })}
      style={{
        position: "absolute",
        inset: 0,
        background: ground,
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr) auto",
        gridTemplateColumns: "minmax(0, 1fr)",
        rowGap: "8px",
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
          {(["pairNote", "changeNote", "shareNote"] as const).map((k) => (
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

      <div data-part="stage" style={{ position: "relative", minHeight: 0 }}>
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
          <line data-part="baseline" stroke={baseline} strokeWidth={rule} />
          {(["before", "after"] as const).map((k) => (
            <g key={k} data-ratio={k} opacity={0}>
              <line
                data-part="ratio-rule"
                stroke={k === "before" ? pastInk : accentInk}
                strokeWidth={rule}
                strokeDasharray="4 3"
              />
              <line
                data-part="ratio-span"
                stroke={k === "before" ? pastInk : accentInk}
                strokeWidth={rule * 1.5}
              />
            </g>
          ))}
          {pairs.map((p) => (
            <g key={p.code} data-pair={p.code}>
              <line data-stem="before" stroke={past} strokeWidth={rule * 2} />
              <line data-stem="after" stroke={present} strokeWidth={rule * 2} />
              <circle data-head="before" r={7} fill={past} />
              <circle data-head="after" r={7} fill={present} />
              {p.code === subject && (
                <circle
                  data-part="subject-ring"
                  r={11}
                  fill="none"
                  stroke={present}
                  strokeWidth={rule}
                />
              )}
              <path
                data-part="triangle"
                d={triangle(p.change >= 0)}
                fill={p.code === subject ? accentInk : inkOnGround}
              />
            </g>
          ))}
        </svg>
        {pairs.map((p) => (
          <div key={p.code} data-labels={p.code}>
            <span
              data-value="before"
              style={abs({
                ...regs.value,
                color: pastInk,
                whiteSpace: "nowrap",
              })}
            >
              {p.beforeText}
            </span>
            <span
              data-value="after"
              style={abs({
                ...regs.value,
                color: accentInk,
                whiteSpace: "nowrap",
              })}
            >
              {p.afterText}
            </span>
            <span
              data-year="before"
              style={abs({
                ...regs.axis,
                color: mutedInk,
                whiteSpace: "nowrap",
              })}
            >
              {years[0]}
            </span>
            <span
              data-year="after"
              style={abs({
                ...regs.axis,
                color: mutedInk,
                whiteSpace: "nowrap",
              })}
            >
              {years[1]}
            </span>
            <span
              data-part="change"
              style={abs({
                ...regs.value,
                color: p.code === subject ? accentInk : inkOnGround,
                whiteSpace: "nowrap",
              })}
            >
              {p.changeText}
            </span>
            <span
              data-part="name"
              style={abs({
                ...regs.annot,
                color: p.code === subject ? accentInk : inkOnGround,
                whiteSpace: "nowrap",
                fontWeight: p.code === subject ? 700 : regs.annot.fontWeight,
              })}
            >
              {p.name}
            </span>
          </div>
        ))}
        <span
          data-ratio-label="before"
          style={abs({
            ...regs.value,
            color: pastInk,
            whiteSpace: "nowrap",
            opacity: 0,
          })}
        >
          {words.beforeRatio}
        </span>
        <span
          data-ratio-label="after"
          style={abs({
            ...regs.value,
            color: accentInk,
            whiteSpace: "nowrap",
            opacity: 0,
          })}
        >
          {words.afterRatio}
        </span>
      </div>

      <span style={{ ...regs.axis, color: mutedInk }}>{words.rule}</span>
    </div>
  );
}
