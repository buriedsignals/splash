/**
 * Coal's share of electricity in the twelve EU-plus-UK countries that leaned on it most in 2010, drawn THROUGH the
 * design base as a heatmap and CHOREOGRAPHED by the scroll. The `heatmap` type in the scrolly format: the subject of
 * `static-heatmap-coal-share-europe` — coal fell in all twelve, Poland alone still above half — told with the gestures
 * a scroll can make (`scrolly/references/directed-type-choreography.md`): the years filled one column at a time, the
 * 2022 relapse read on its own, 2024 filtered, the rows re-sorted by how far coal fell.
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: one hue, lightness falling the whole way, the palest stop floored against
 * the ground; years left to right; rows in their 2010 order until a card sorts them.
 *
 * `coal-heatmap-drive.mjs` lays out every cell in the reader's pixels on each paint. What is rendered here is the last
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

export type Row = {
  key: string;
  label: string;
  values: number[];
  valueTexts: string[];
  fallText: string;
};
type Style = Record<string, string | number>;

export const NOTES = [
  "startNote",
  "countNote",
  "crisisNote",
  "endNote",
  "sortNote",
  "readNote",
] as const;

export function DirectedCoalHeatmapScrolly({
  rows,
  years,
  labelledYears,
  breaks,
  orders,
  crisis,
  words,
  alt,
  regs,
  ground,
  accent,
  ink,
  muted,
}: {
  rows: Row[];
  years: number[];
  labelledYears: number[];
  breaks: { value: number; label: string }[];
  /** row keys: in their 2010 order, by relative fall */
  orders: { start: string[]; fall: string[] };
  /** the relapse year, and the rows the crisis card marks */
  crisis: { year: number; marked: string[] };
  words: Record<
    (typeof NOTES)[number] | "unit" | "fallHead" | "countTemplate" | "legend",
    string
  >;
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
  // The palest stop walks from the ground toward the accent until it clears the non-text floor, so it keeps the
  // accent's hue instead of being darkened toward a grey.
  let low = accent;
  for (let t = 0.95; t >= 0; t -= 0.01) {
    const probe = mix(accent, ground, t);
    if (contrast(probe, ground) >= NON_TEXT_CONTRAST_MIN) {
      low = probe;
      break;
    }
  }
  const high = mix(accent, ink, 0.35);
  const classCount = breaks.length + 1;
  const classFill = (i: number) => mix(low, high, i / (classCount - 1));
  const classOf = (v: number) => breaks.filter((b) => v >= b.value).length;
  const accentInk =
    adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
  const inkOnGround = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
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
  const last = years.length - 1;

  return (
    <div
      role="img"
      aria-label={alt}
      data-coal={JSON.stringify({
        rows: rows.map((r) => ({
          key: r.key,
          classes: r.values.map(classOf),
          values: r.values.map((v) => Math.round(v * 100) / 100),
          texts: r.valueTexts,
        })),
        years,
        orders,
        crisis,
        fills: Array.from({ length: classCount }, (_, i) => classFill(i)),
        firstBreak: breaks[0].value,
        notes: NOTES,
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
          {NOTES.map((k) => (
            <span
              key={k}
              data-note={k}
              data-template={
                k === "countNote" ? words.countTemplate : undefined
              }
              style={{ ...regs.value, ...slot, color: accentInk, opacity: 0 }}
            >
              {words[k]}
            </span>
          ))}
        </span>
      </div>

      <div data-part="stage" style={{ position: "relative", minHeight: 0 }}>
        {years.map((y) => (
          <span
            key={y}
            data-year={y}
            style={abs({
              ...regs.axis,
              color: mutedInk,
              visibility: labelledYears.includes(y) ? "visible" : "hidden",
            })}
          >
            {y}
          </span>
        ))}
        <span
          data-part="start-head"
          style={abs({ ...regs.axis, color: inkOnGround, fontWeight: 700 })}
        >
          {years[0]}
        </span>
        <span
          data-part="value-head"
          data-fall={words.fallHead}
          style={abs({ ...regs.axis, color: inkOnGround, fontWeight: 700 })}
        >
          {years[last]}
        </span>
        <div
          data-part="crisis-column"
          style={abs({ boxShadow: `inset 0 0 0 1px ${mutedInk}`, opacity: 0 })}
        />
        {rows.map((r) => (
          <div key={r.key} data-row={r.key} style={abs({})}>
            <span
              data-part="name"
              style={abs({
                ...regs.axis,
                color: inkOnGround,
                textAlign: "right",
              })}
            >
              {r.label}
            </span>
            {r.values.map((v, c) => (
              <div
                key={c}
                data-cell={c}
                style={abs({ background: classFill(classOf(v)) })}
              />
            ))}
            <div
              data-part="mark"
              style={abs({
                boxShadow: `0 0 0 2px ${inkOnGround}`,
                opacity: 0,
              })}
            />
            <span
              data-part="start-value"
              style={abs({ ...regs.value, color: mutedInk })}
            >
              {r.valueTexts[0]}
            </span>
            <span
              data-part="value"
              style={abs({
                ...regs.value,
                color: inkOnGround,
                fontWeight: 700,
              })}
            >
              {r.valueTexts[last]}
            </span>
            <span
              data-part="fall"
              style={abs({
                ...regs.value,
                color: accentInk,
                fontWeight: 700,
                opacity: 0,
              })}
            >
              {r.fallText}
            </span>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          gap: "4px 14px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${classCount}, 44px)`,
            gap: "2px",
            paddingBottom: "1.4em",
          }}
        >
          {Array.from({ length: classCount }, (_, i) => (
            <div
              key={i}
              style={{
                position: "relative",
                height: "10px",
                background: classFill(i),
              }}
            >
              {i < breaks.length && (
                <span
                  style={{
                    ...regs.axis,
                    position: "absolute",
                    left: "100%",
                    top: "12px",
                    transform: "translateX(-50%)",
                    whiteSpace: "nowrap",
                    color: mutedInk,
                  }}
                >
                  {breaks[i].label}
                </span>
              )}
            </div>
          ))}
        </div>
        <span style={{ ...regs.axis, color: mutedInk }}>{words.legend}</span>
      </div>
    </div>
  );
}
