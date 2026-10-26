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
  half = 50,
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
  /** the last-year value the focus card keeps rows at or above (kit addition; the drive tests 50) */
  half?: number;
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
  // THE LAST CARD'S PICTURE WITHOUT A SCRIPT (kit addition). The drive lays out every cell in the
  // reader's pixels, so with no script every cell has no size and every label sits at the stage's
  // top-left corner. A <noscript> stylesheet hides the drive's layer and shows a static grid of the
  // same rows in their first-year order, every year filled, the first and last values written.
  const stillRows = orders.start.map((k) => rows.find((r) => r.key === k)).filter((r): r is Row => Boolean(r));
  const noScript =
    `[data-coal] [data-part="stage"] > :not([data-part="still"]) { display: none !important; }` +
    `[data-coal] [data-part="still"] { display: grid !important; }` +
    `[data-coal] [data-note="readNote"] { opacity: 1 !important; }`;

  return (
    <div
      role="img"
      aria-label={alt}
      data-coal={JSON.stringify({
        rows: rows.map((r) => ({
          key: r.key,
          classes: r.values.map(classOf),
          values: r.values.map((v) => Math.round(v * (50 / half) * 100) / 100),
          texts: r.valueTexts,
        })),
        years,
        orders,
        crisis,
        fills: Array.from({ length: classCount }, (_, i) => classFill(i)),
        firstBreak: breaks[0].value * (50 / half),
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
            gridTemplateColumns: `max-content repeat(${years.length}, minmax(0, 1fr)) max-content max-content`,
            gridTemplateRows: `auto repeat(${stillRows.length}, minmax(0, 1fr))`,
            gap: "2px",
            columnGap: "2px",
            alignItems: "stretch",
          }}
        >
          {years.map((y, i) => (
            <span key={`y${y}`} style={{ ...regs.axis, gridRow: 1, gridColumn: i + 2, textAlign: "center", color: mutedInk, whiteSpace: "nowrap", visibility: labelledYears.includes(y) ? "visible" : "hidden" }}>
              {y}
            </span>
          ))}
          <span style={{ ...regs.axis, gridRow: 1, gridColumn: years.length + 2, paddingLeft: "8px", color: inkOnGround, fontWeight: 700 }}>{years[0]}</span>
          <span style={{ ...regs.axis, gridRow: 1, gridColumn: years.length + 3, paddingLeft: "8px", color: inkOnGround, fontWeight: 700 }}>{years[last]}</span>
          {stillRows.map((r, j) => (
            <div key={`s${r.key}`} style={{ display: "contents" }}>
              <span style={{ ...regs.axis, gridRow: j + 2, gridColumn: 1, alignSelf: "center", textAlign: "right", paddingRight: "8px", color: inkOnGround, whiteSpace: "nowrap" }}>{r.label}</span>
              {r.values.map((v, c) => (
                <span key={c} style={{ gridRow: j + 2, gridColumn: c + 2, background: classFill(classOf(v)) }} />
              ))}
              <span style={{ ...regs.value, gridRow: j + 2, gridColumn: years.length + 2, alignSelf: "center", paddingLeft: "8px", color: mutedInk, whiteSpace: "nowrap" }}>{r.valueTexts[0]}</span>
              <span style={{ ...regs.value, gridRow: j + 2, gridColumn: years.length + 3, alignSelf: "center", paddingLeft: "8px", color: inkOnGround, fontWeight: 700, whiteSpace: "nowrap" }}>{r.valueTexts[last]}</span>
            </div>
          ))}
        </div>
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
