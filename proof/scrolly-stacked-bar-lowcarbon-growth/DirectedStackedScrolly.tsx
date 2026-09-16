/**
 * Low-carbon electricity produced in 2000 and added by 2024, twelve European countries, drawn THROUGH the design base
 * as stacked bars and CHOREOGRAPHED by the scroll. The `stacked bar` type in the scrolly format: the subject of
 * `static-stacked-bar-lowcarbon-growth` — Spain added more than France, having started five times lower — told with the
 * gestures a scroll can make (`scrolly/references/directed-type-choreography.md`): the 2000 levels alone, the
 * additions growing onto them, the rows re-sorted by what was added, the additions detached onto one baseline, the
 * pair alone.
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: the stack is [level, growth], so no segment's number has to be subtracted from
 * another; every segment prints its own number, a segment too narrow for it writing both past the bar as one run; the
 * total past the bar in its own register; one hue at two strengths for the one measure at two moments.
 *
 * `stacked-drive.mjs` lays out every row in the reader's pixels on each paint. What is rendered here is the last card's
 * picture, for a reader without a script.
 */

import type { CSSProperties } from "react";
import {
  adjustToContrast,
  contrast,
  mix,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";

export type Row = {
  key: string;
  label: string;
  level: number;
  growth: number;
  total: number;
  levelText: string;
  growthText: string;
  totalText: string;
  pair: boolean;
};
type Style = Record<string, string | number>;

export const NOTES = [
  "levelNote",
  "totalNote",
  "sortNote",
  "addNote",
  "pairNote",
  "unitNote",
] as const;

export function DirectedStackedScrolly({
  rows,
  orders,
  words,
  alt,
  regs,
  ground,
  accent,
  ink,
  muted,
}: {
  rows: Row[];
  /** row indices in slot order: by 2000 level, by growth */
  orders: number[][];
  words: Record<(typeof NOTES)[number] | "levelKey" | "growthKey", string>;
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
  const levelFill = mix(accent, ground, 0.62);
  const growthFill = accent;
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
      data-stacked={JSON.stringify({
        rows: rows.map(({ key, level, growth, total, pair }) => ({
          key,
          level,
          growth,
          total,
          pair,
        })),
        orders,
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
        <span style={{ ...regs.annot, color: mutedInk }}>
          <span data-part="level-key">
            <span style={swatch(levelFill)} />
            {words.levelKey}
          </span>
          <span
            data-part="growth-key"
            style={{ marginLeft: "14px", color: accentInk }}
          >
            <span style={swatch(growthFill)} />
            {words.growthKey}
          </span>
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
        {rows.map((r) => (
          <div key={r.key} data-row={r.key}>
            <span
              data-part="name"
              style={abs({
                ...regs.annot,
                color: r.pair ? accentInk : inkOnGround,
                fontWeight: r.pair ? 700 : regs.annot.fontWeight,
              })}
            >
              {r.label}
            </span>
            <div data-part="level" style={abs({ background: levelFill })} />
            <div data-part="growth" style={abs({ background: growthFill })} />
            <span
              data-part="level-text"
              style={abs({ ...regs.annot, color: onFill(levelFill) })}
            >
              {r.levelText}
            </span>
            <span
              data-part="growth-text"
              style={abs({ ...regs.annot, color: onFill(growthFill) })}
            >
              {r.growthText}
            </span>
            <span
              data-part="run"
              style={abs({ ...regs.annot, color: inkOnGround, opacity: 0 })}
            >
              {`${r.levelText} + ${r.growthText}`}
            </span>
            <span
              data-part="growth-run"
              style={abs({ ...regs.annot, color: accentInk, opacity: 0 })}
            >
              {r.growthText}
            </span>
            <span
              data-part="total"
              style={abs({
                ...regs.value,
                color: r.pair ? accentInk : inkOnGround,
                fontWeight: 700,
              })}
            >
              {r.totalText}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
