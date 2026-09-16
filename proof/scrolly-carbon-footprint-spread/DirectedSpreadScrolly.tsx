/**
 * CO₂ emissions per person in 213 countries, 2023, drawn THROUGH the design base as a histogram and CHOREOGRAPHED by the
 * scroll. The `histogram` type in the scrolly format: the subject of `static-carbon-footprint-spread` — six countries in
 * ten emit under 4 tonnes per person — told with the gestures a scroll can make
 * (`scrolly/references/directed-type-choreography.md`): every country a dot at its own value, the dots falling into
 * their 4-tonne bins, the threshold, the median, the far tail named.
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: ten bins, 4 tonnes wide, the last open; every country counts once, unweighted
 * by population; the bars in the muted field, the one accent spent on the cut; the unit named once under the axis.
 *
 * `spread-drive.mjs` lays out every dot and bar in the reader's pixels on each paint. What is rendered here is the last
 * card's picture, for a reader without a script.
 */

import type { CSSProperties } from "react";
import {
  adjustToContrast,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";

export type Country = { code: string; value: number };
export type Bin = { lo: number; open: boolean; count: number; label: string };
export type Tail = { code: string; label: string };
type Style = Record<string, string | number>;

export const NOTES = [
  "dotNote",
  "binNote",
  "cutNote",
  "medianNote",
  "tailNote",
  "readNote",
] as const;

export function DirectedSpreadScrolly({
  countries,
  bins,
  binWidth,
  threshold,
  median,
  tail,
  words,
  alt,
  regs,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  countries: Country[];
  bins: Bin[];
  binWidth: number;
  threshold: number;
  median: number;
  tail: Tail[];
  words: Record<
    (typeof NOTES)[number] | "unit" | "cutLabel" | "medianLabel",
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

  return (
    <div
      role="img"
      aria-label={alt}
      data-spread={JSON.stringify({
        countries: countries.map((c) => [
          c.code,
          Math.round(c.value * 100) / 100,
        ]),
        bins: bins.map((b) => ({ lo: b.lo, open: b.open, count: b.count })),
        binWidth,
        threshold,
        median,
        tail: tail.map((t) => t.code),
        colours: { field: muted, cut: accent },
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
          <line data-part="baseline" stroke={inkOnGround} strokeWidth={1} />
          {bins.map((b) => (
            <rect key={b.lo} data-bar={b.lo} fill={muted} opacity={0} />
          ))}
          {countries.map((c) => (
            <circle key={c.code} data-dot={c.code} fill={muted} />
          ))}
          <line
            data-part="cut"
            stroke={accentInk}
            strokeWidth={2}
            opacity={0}
          />
          <line
            data-part="median"
            stroke={inkOnGround}
            strokeWidth={1.4}
            strokeDasharray="4 3"
            opacity={0}
          />
        </svg>

        {bins.map((b) => (
          <div key={b.lo}>
            <span
              data-bin-label={b.lo}
              style={abs({ ...regs.axis, color: mutedInk })}
            >
              {b.label}
            </span>
            <span
              data-count={b.lo}
              style={abs({
                ...regs.value,
                color: inkOnGround,
                fontWeight: 700,
                opacity: 0,
              })}
            >
              {b.count}
            </span>
          </div>
        ))}
        <span
          data-part="cut-label"
          style={abs({
            ...regs.annot,
            color: accentInk,
            fontWeight: 700,
            textShadow: halo,
            opacity: 0,
          })}
        >
          {words.cutLabel}
        </span>
        <span
          data-part="median-label"
          style={abs({
            ...regs.annot,
            color: inkOnGround,
            textShadow: halo,
            opacity: 0,
          })}
        >
          {words.medianLabel}
        </span>
        {tail.map((t) => (
          <span
            key={t.code}
            data-tail={t.code}
            style={abs({
              ...regs.axis,
              color: inkOnGround,
              textShadow: halo,
              opacity: 0,
            })}
          >
            {t.label}
          </span>
        ))}
      </div>
    </div>
  );
}
