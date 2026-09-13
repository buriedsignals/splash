/**
 * The change in CO₂ per person since 1990 in the 27 EU member states, drawn THROUGH the design base as a
 * diverging bar and CHOREOGRAPHED by the scroll. The `diverging bar` type in the scrolly format: the subject
 * of `static-diverging-bar-eu-per-capita` — Croatia the only rise, by 0.03 t — told with the gestures a
 * scroll can make (`scrolly/references/directed-type-choreography.md`): the levels first, 1990 then 2024;
 * the switch to the change alone, rows re-sorted; the axis closed onto ±0.5 t so a rise of 0.03 t has a
 * length; the mean of the falls; the pull back.
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: one row per country, name then value then bar; bars out of a zero
 * line, sorted from the largest rise to the largest fall; the rise in the accent, the falls in the muted
 * fill; the mean of the falls as a rule. Names are French here (the static plate prints them in English).
 *
 * Every mark is placed by `diverging-drive.mjs` in the reader's pixels on each paint; what is rendered here
 * is the last card's picture in percentages, for a reader without a script.
 */

import type { CSSProperties } from "react";
import {
  adjustToContrast,
  mix,
  NON_TEXT_CONTRAST_MIN,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";

export type Row = {
  code: string;
  name: string;
  from: number;
  to: number;
  change: number;
};
type Style = Record<string, string | number>;

export function DirectedDivergingScrolly({
  rows,
  years,
  subject,
  mean,
  zoomDomain,
  ticks,
  words,
  alt,
  regs,
  stroke,
  ground,
  accent,
  ink,
  muted,
}: {
  rows: Row[];
  years: [string, string];
  subject: string;
  mean: number;
  zoomDomain: [number, number];
  ticks: { level: number[]; change: number[]; zoom: number[] };
  words: {
    levelUnit: string;
    changeUnit: string;
    fell: { template: string; value: number };
    note: string;
    meanNote: string;
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
  const accentFill =
    adjustToContrast(accent, ground, NON_TEXT_CONTRAST_MIN) ?? accent;
  const accentInk =
    adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
  const barFill =
    adjustToContrast(muted, ground, NON_TEXT_CONTRAST_MIN) ?? muted;
  const faded = mix(ground, barFill, 0.3);
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const inkOnGround = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const ghost = mix(ground, ink, 0.35);
  const rule = stroke.rule ?? 1;
  const abs = (extra: CSSProperties): CSSProperties => ({
    position: "absolute",
    ...extra,
  });
  const byChange = [...rows].sort((a, b) => b.change - a.change);
  const lo = Math.min(...rows.map((r) => r.change));
  const hi = Math.max(0, ...rows.map((r) => r.change));
  const pct = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`;
  const two = (v: number) =>
    `${v > 0 ? "+" : "−"}${Math.abs(v).toFixed(2).replace(".", ",")}`;
  const slot: CSSProperties = {
    gridArea: "1 / 1",
    justifySelf: "end",
    textAlign: "right",
  };

  return (
    <div
      role="img"
      aria-label={alt}
      data-diverging={JSON.stringify({
        rows,
        years,
        subject,
        mean,
        zoomDomain,
        colours: {
          accentFill,
          accentInk,
          barFill,
          faded,
          mutedInk,
          inkOnGround,
        },
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
        <span style={{ display: "grid" }}>
          <span
            data-part="level-unit"
            data-template={words.levelUnit}
            style={{
              ...regs.axis,
              gridArea: "1 / 1",
              color: mutedInk,
              fontWeight: 700,
              opacity: 0,
            }}
          >
            {words.levelUnit}
          </span>
          <span
            data-part="change-unit"
            style={{
              ...regs.axis,
              gridArea: "1 / 1",
              color: mutedInk,
              fontWeight: 700,
            }}
          >
            {words.changeUnit}
          </span>
        </span>
        <span style={{ display: "grid", marginLeft: "auto" }}>
          <span
            data-part="fell"
            data-template={words.fell.template}
            data-value={words.fell.value}
            style={{ ...regs.value, ...slot, color: inkOnGround, opacity: 0 }}
          >
            {words.fell.template.replace("{n}", String(words.fell.value))}
          </span>
          <span
            data-part="note"
            style={{ ...regs.value, ...slot, color: accentInk, opacity: 0 }}
          >
            {words.note}
          </span>
          <span
            data-part="mean-note"
            style={{ ...regs.value, ...slot, color: inkOnGround }}
          >
            {words.meanNote}
          </span>
        </span>
      </div>

      <div data-part="stage" style={{ position: "relative", minHeight: 0 }}>
        <div
          data-part="zero"
          style={abs({
            top: 0,
            bottom: 0,
            width: `${rule}px`,
            left: `calc(36% + ${pct(0)} * 0.64)`,
            background: inkOnGround,
          })}
        />
        <div
          data-part="mean"
          style={abs({
            top: 0,
            bottom: 0,
            width: 0,
            left: `calc(36% + ${pct(mean)} * 0.64)`,
            borderLeft: `${rule}px dashed ${inkOnGround}`,
          })}
        />
        {byChange.map((r, i) => {
          const top = `${(i / rows.length) * 100}%`;
          const height = `${(1 / rows.length) * 100}%`;
          const isSubject = r.code === subject;
          return (
            <div
              key={r.code}
              data-row={r.code}
              style={abs({ left: 0, right: 0, top, height })}
            >
              <span
                data-part="name"
                style={abs({
                  ...regs.axis,
                  left: 0,
                  width: "22%",
                  top: "50%",
                  transform: "translateY(-50%)",
                  textAlign: "right",
                  whiteSpace: "nowrap",
                  color: isSubject ? accentInk : inkOnGround,
                  fontWeight: isSubject ? 700 : regs.axis.fontWeight,
                })}
              >
                {r.name}
              </span>
              <span
                data-part="value"
                style={abs({
                  ...regs.axis,
                  left: "22%",
                  width: "12%",
                  top: "50%",
                  transform: "translateY(-50%)",
                  textAlign: "right",
                  whiteSpace: "nowrap",
                  fontVariantNumeric: "tabular-nums",
                  color: isSubject ? accentInk : mutedInk,
                })}
              >
                {two(r.change)}
              </span>
              <div
                data-part="ghost"
                style={abs({
                  top: "20%",
                  height: "60%",
                  left: 0,
                  width: 0,
                  boxShadow: `inset 0 0 0 1px ${ghost}`,
                  opacity: 0,
                })}
              />
              <div
                data-part="bar"
                style={abs({
                  top: "20%",
                  height: "60%",
                  left: `calc(36% + ${r.change < 0 ? pct(r.change) : pct(0)} * 0.64)`,
                  width: `calc(${(Math.abs(r.change) / (hi - lo)) * 100}% * 0.64)`,
                  background: isSubject ? accentFill : barFill,
                })}
              />
            </div>
          );
        })}
      </div>

      <div data-part="ticks" style={{ position: "relative", height: "1.5em" }}>
        {(["level", "change", "zoom"] as const).flatMap((set) =>
          ticks[set].map((t) => (
            <span
              key={`${set}${t}`}
              data-tick={t}
              data-set={set}
              style={abs({
                ...regs.axis,
                top: 0,
                left: set === "change" ? `calc(36% + ${pct(t)} * 0.64)` : 0,
                transform: "translateX(-50%)",
                whiteSpace: "nowrap",
                color: mutedInk,
                fontVariantNumeric: "tabular-nums",
                opacity: set === "change" ? 1 : 0,
              })}
            >
              {t === 0
                ? "0"
                : `${t < 0 ? "−" : ""}${String(Math.abs(t)).replace(".", ",")}`}
            </span>
          )),
        )}
      </div>
    </div>
  );
}
