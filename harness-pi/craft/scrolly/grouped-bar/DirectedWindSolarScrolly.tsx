/**
 * Wind's and solar's share of electricity in six European countries, 2024, drawn THROUGH the design base as grouped
 * bars and CHOREOGRAPHED by the scroll. The `grouped bar` type in the scrolly format: the subject of
 * `static-wind-vs-solar` — in five of the six wind leads, Switzerland is the exception — told with the gestures a scroll
 * can make (`scrolly/references/directed-type-choreography.md`): wind alone, solar beside it, every pair collapsed into
 * its difference either side of zero, the groups re-sorted by that difference, 2015's difference as a ghost.
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: colour carries the series (wind in the accent, solar in the muted step), named
 * once in a key; every bar's value written above it; the groups ordered by the gap, not the alphabet, once the gap is
 * on the plate; the exception named in words, not a third colour.
 *
 * `windsolar-drive.mjs` lays out every bar in the reader's pixels on each paint. What is rendered here is the last
 * card's picture, for a reader without a script.
 */

import type { CSSProperties } from "react";
import {
  adjustToContrast,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";

export type Group = {
  key: string;
  label: string;
  wind: number;
  solar: number;
  before: number;
  windText: string;
  solarText: string;
  gapText: string;
  beforeText: string;
  exception: boolean;
};
type Style = Record<string, string | number>;

export const NOTES = [
  "windNote",
  "solarNote",
  "gapNote",
  "sortNote",
  "ghostNote",
  "readNote",
] as const;

export function DirectedWindSolarScrolly({
  groups,
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
  groups: Group[];
  /** group indices in slot order: alphabetical, by gap */
  orders: number[][];
  words: Record<
    | (typeof NOTES)[number]
    | "wind"
    | "solar"
    | "windAhead"
    | "solarAhead",
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
  grid: string;
}) {
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
  // THE LAST CARD'S PICTURE WITHOUT A SCRIPT (kit addition). The drive lays out every bar in the
  // reader's pixels, so with no script the SVG's rects have no geometry and every name and value sits
  // at the stage's top-left corner. A <noscript> stylesheet hides the drive's layer and shows a static
  // grid of the same pairs, in the last card's order (by gap), on one scale from zero, every value written.
  const stillMax = Math.max(...groups.flatMap((g) => [g.wind, g.solar]));
  const stillGroups = (orders[orders.length - 1] ?? groups.map((_, i) => i)).map((i) => groups[i]);
  const noScript =
    `[data-windsolar] [data-part="stage"] > :not([data-part="still"]) { display: none !important; }` +
    `[data-windsolar] [data-part="still"] { display: grid !important; }` +
    `[data-windsolar] [data-note="readNote"] { opacity: 1 !important; }`;
  const stillBar = (value: number, text: string, fill: string, colour: string) => (
    <span style={{ position: "relative", width: "min(46px, 34%)" }}>
      <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: `${(value / stillMax) * 88}%`, background: fill }} />
      <span style={{ ...regs.value, position: "absolute", left: "50%", bottom: `calc(${(value / stillMax) * 88}% + 3px)`, transform: "translateX(-50%)", color: colour, fontWeight: 700, whiteSpace: "nowrap" }}>
        {text}
      </span>
    </span>
  );
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
      data-windsolar={JSON.stringify({
        groups: groups.map(({ key, wind, solar, before, exception }) => ({
          key,
          wind,
          solar,
          before,
          exception,
        })),
        orders,
        accent,
        muted,
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
          <span
            data-part="wind-key"
            style={{ color: accentInk, marginRight: "14px" }}
          >
            <span style={swatch(accent)} />
            {words.wind}
          </span>
          <span data-part="solar-key">
            <span style={swatch(muted)} />
            {words.solar}
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
            gridTemplateColumns: `repeat(${stillGroups.length}, minmax(0, 1fr))`,
            gridTemplateRows: "minmax(0, 1fr) auto",
            rowGap: "6px",
          }}
        >
          {stillGroups.map((g, i) => (
            <span key={g.key} style={{ gridColumn: i + 1, gridRow: 1, display: "flex", justifyContent: "center", gap: "4px", borderBottom: `1px solid ${inkOnGround}` }}>
              {stillBar(g.wind, g.windText, accent, accentInk)}
              {stillBar(g.solar, g.solarText, muted, mutedInk)}
            </span>
          ))}
          {stillGroups.map((g, i) => (
            <span key={`n${g.key}`} style={{ ...regs.annot, gridColumn: i + 1, gridRow: 2, textAlign: "center", color: g.exception ? inkOnGround : mutedInk, fontWeight: g.exception ? 700 : regs.annot.fontWeight }}>
              {g.label}
            </span>
          ))}
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
          <line data-part="zero" stroke={inkOnGround} strokeWidth={1} />
          {groups.map((g) => (
            <g key={g.key} data-group={g.key}>
              <rect data-part="wind" fill={accent} />
              <rect data-part="solar" fill={muted} />
              <rect
                data-part="ghost"
                fill="none"
                stroke={inkOnGround}
                strokeWidth={1.2}
                strokeDasharray="3 2"
                opacity={0}
              />
            </g>
          ))}
        </svg>

        <span
          data-part="wind-ahead"
          style={abs({
            ...regs.axis,
            color: accentInk,
            fontWeight: 700,
            opacity: 0,
          })}
        >
          {words.windAhead}
        </span>
        <span
          data-part="solar-ahead"
          style={abs({
            ...regs.axis,
            color: mutedInk,
            fontWeight: 700,
            opacity: 0,
          })}
        >
          {words.solarAhead}
        </span>
        {groups.map((g) => (
          <div key={g.key}>
            <span
              data-name={g.key}
              style={abs({
                ...regs.annot,
                color: g.exception ? inkOnGround : mutedInk,
                fontWeight: g.exception ? 700 : regs.annot.fontWeight,
              })}
            >
              {g.label}
            </span>
            <span
              data-wind-value={g.key}
              style={abs({ ...regs.value, color: accentInk, fontWeight: 700 })}
            >
              {g.windText}
            </span>
            <span
              data-solar-value={g.key}
              style={abs({ ...regs.value, color: mutedInk, fontWeight: 700 })}
            >
              {g.solarText}
            </span>
            <span
              data-gap-value={g.key}
              style={abs({
                ...regs.value,
                color: g.exception ? mutedInk : accentInk,
                fontWeight: 700,
                opacity: 0,
              })}
            >
              {g.gapText}
            </span>
            <span
              data-before-value={g.key}
              style={abs({ ...regs.axis, color: inkOnGround, opacity: 0 })}
            >
              {g.beforeText}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
