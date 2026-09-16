/**
 * EuropeLowCarbonLeaders — 40 European countries ranked by 2024 low-carbon electricity share, drawn
 * as columns from a zero baseline. The scroll (bar-and-column-drive.mjs) grows every bar from zero,
 * then pulls the top ten into the accent colour against the rest, naming the cut and the gap.
 *
 * Marks: one <rect data-mark="bar" data-idx> per country, tallest to shortest left to right.
 * Labels: four callouts (best, tenth/cut, eleventh, worst), absolutely positioned spans the driver
 * moves to each bar's own top edge — nothing else is labelled, so no label is ever cut or rotated.
 */
import type { CSSProperties } from "react";
import {
  adjustToContrast,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";

/** One id per header note the driver toggles exclusively, crossfaded on `state.note`. */
export const NOTES = ["scope", "gap"] as const;

type Country = { entity: string; code: string; share: number };

export function DirectedEuropeLowCarbonLeadersScrolly({
  countries,
  cutRank,
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
  countries: Country[];
  cutRank: number;
  words: Record<(typeof NOTES)[number] | "unit", string>;
  alt: string;
  regs: Record<
    "display" | "eyebrow" | "body" | "axis" | "annot" | "value",
    Record<string, string | number>
  >;
  stroke: { rule?: number; hairline?: number };
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
  const rule = stroke.rule ?? 1;
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

  // The four callouts: best of ten, the cut itself, the first of the rest, and the worst overall —
  // enough to name the ranking without labelling all 40 bars.
  const callouts = [
    { key: "best", idx: 0 },
    { key: "cut", idx: cutRank - 1 },
    { key: "afterCut", idx: cutRank },
    { key: "worst", idx: countries.length - 1 },
  ] as const;

  return (
    <div
      role="img"
      aria-label={alt}
      data-bar-and-column={JSON.stringify({
        notes: NOTES,
        cutRank,
        muted,
        accent,
        countries: countries.map((c) => ({
          entity: c.entity,
          code: c.code,
          share: c.share,
        })),
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

      <div data-part="stage" style={{ position: "relative", minHeight: 0 }}>
        <svg
          data-part="field"
          xmlns="http://www.w3.org/2000/svg"
          stroke={inkOnGround}
          strokeWidth={rule}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            overflow: "visible",
          }}
        >
          <line
            data-mark="cutline"
            x1={0}
            y1={0}
            x2={0}
            y2={0}
            stroke={accentInk}
            strokeDasharray="4 4"
            strokeWidth={rule}
            opacity={0}
          />
          <line
            data-mark="baseline"
            x1={0}
            y1={0}
            x2={0}
            y2={0}
            stroke={inkOnGround}
            strokeWidth={rule}
            opacity={0.5}
          />
          {countries.map((c, i) => (
            <rect
              key={c.code}
              data-mark="bar"
              data-idx={i}
              x={0}
              y={0}
              width={0}
              height={0}
              fill={muted}
              stroke="none"
            />
          ))}
        </svg>
        {callouts.map(({ key }) => (
          <span
            key={key}
            data-label={key}
            style={abs({
              ...regs.axis,
              color: mutedInk,
              opacity: 0,
              textAlign: "center",
              transform: "translate(-50%, -100%)",
            })}
          >
            {""}
          </span>
        ))}
        <span
          data-label="cutnote"
          style={abs({
            ...regs.axis,
            color: accentInk,
            opacity: 0,
            whiteSpace: "nowrap",
          })}
        >
          {words.gap}
        </span>
      </div>
    </div>
  );
}
