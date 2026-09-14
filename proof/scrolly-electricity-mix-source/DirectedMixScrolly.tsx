/**
 * Six countries' 2024 electricity by family, drawn THROUGH the design base as 100 %-stacked columns and CHOREOGRAPHED by
 * the scroll. The `stacked bar` type (100 %) in the scrolly format: the subject of `static-electricity-mix-source` —
 * Norway on 99 % renewables, Poland leaning on fossil fuel at 69 % — told with the gestures a scroll can make
 * (`scrolly/references/directed-type-choreography.md`): the columns filled family by family, sorted twice, fossil moved
 * to the baseline, the two low-carbon families merged.
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: every column is 100 % of its own country's generation; the families stacked
 * in one order in every column; every segment large enough carries its own percentage, in an ink measured on its fill.
 *
 * `mix-drive.mjs` lays out every segment in the reader's pixels on each paint. What is rendered here is the last card's
 * picture, for a reader without a script.
 */

import type { CSSProperties } from "react";
import {
  adjustToContrast,
  contrast,
  mix,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";

export type Column = {
  key: string;
  label: string;
  shares: number[];
  texts: string[];
  lowText: string;
};
type Style = Record<string, string | number>;

export const NOTES = [
  "renNote",
  "nucNote",
  "fosNote",
  "sortNote",
  "lowNote",
  "readNote",
] as const;

export function DirectedMixScrolly({
  columns,
  families,
  orders,
  words,
  alt,
  regs,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  columns: Column[];
  families: string[];
  /** column indices in slot order: by renewables, by fossil */
  orders: number[][];
  words: Record<(typeof NOTES)[number] | "unit" | "low", string>;
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
  const fills = [accent, mix(accent, ground, 0.55), mix(muted, ground, 0.15)];
  const onFill = (fill: string) =>
    contrast(ink, fill) >= contrast(ground, fill) ? ink : ground;
  const accentInk =
    adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const inkOnGround = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
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
  const swatch = (fill: string): CSSProperties => ({
    display: "inline-block",
    width: "10px",
    height: "10px",
    background: fill,
    marginRight: "5px",
    verticalAlign: "middle",
  });

  return (
    <div
      role="img"
      aria-label={alt}
      data-mix={JSON.stringify({
        columns: columns.map((c) => ({ key: c.key, shares: c.shares })),
        orders,
        fills,
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
        <span
          style={{
            ...regs.annot,
            color: mutedInk,
            display: "flex",
            flexWrap: "wrap",
            gap: "2px 12px",
          }}
        >
          {families.map((f, i) => (
            <span key={f} data-key={i}>
              <span style={swatch(fills[i])} />
              {f}
            </span>
          ))}
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
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            overflow: "visible",
          }}
        >
          {[0, 50, 100].map((t) => (
            <line key={t} data-grid={t} stroke={grid} strokeWidth={1} />
          ))}
          {columns.map((c) => (
            <g key={c.key} data-column={c.key}>
              {families.map((_, i) => (
                <rect key={i} data-segment={i} fill={fills[i]} />
              ))}
            </g>
          ))}
        </svg>
        {[0, 50, 100].map((t) => (
          <span
            key={t}
            data-tick={t}
            style={abs({ ...regs.axis, color: mutedInk })}
          >
            {t === 100 ? words.unit : String(t)}
          </span>
        ))}
        {columns.map((c) => (
          <div key={c.key}>
            <span
              data-name={c.key}
              style={abs({ ...regs.annot, color: inkOnGround })}
            >
              {c.label}
            </span>
            {c.texts.map((t, i) => (
              <span
                key={i}
                data-share={`${c.key}:${i}`}
                style={abs({
                  ...regs.value,
                  color: onFill(fills[i]),
                  fontWeight: 700,
                })}
              >
                {t}
              </span>
            ))}
            <span
              data-low={c.key}
              style={abs({
                ...regs.value,
                color: onFill(fills[0]),
                fontWeight: 700,
                opacity: 0,
              })}
            >
              {c.lowText}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
