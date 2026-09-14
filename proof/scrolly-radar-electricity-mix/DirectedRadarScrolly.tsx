/**
 * France's and Germany's 2024 electricity mixes, drawn THROUGH the design base as a radar and CHOREOGRAPHED by the
 * scroll. The `radar` type in the scrolly format: the subject of `static-radar-electricity-mix` — nearly the same
 * generation from opposite mixes — told with the gestures a scroll can make
 * (`scrolly/references/directed-type-choreography.md`): the two totals first, each polygon traced spoke by spoke, the
 * nine spokes merged into their three families, the scale tightened so the small shares open.
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: every spoke a share of the same denominator, the country's own generation;
 * the spokes in family order, clockwise from twelve o'clock; the grid concentric circles with a drawn, numbered
 * ceiling; every spoke's numbers printed, so nobody judges a radius by eye; the subject in the accent.
 *
 * `radar-drive.mjs` lays out every mark in the reader's pixels on each paint. What is rendered here is the last card's
 * picture, for a reader without a script.
 */

import type { CSSProperties } from "react";
import {
  adjustToContrast,
  mix,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";

export type Spoke = {
  key: string;
  label: string;
  family: number;
  shares: number[];
  texts: string[];
};
export type Family = { label: string; shares: number[]; texts: string[] };
type Style = Record<string, string | number>;

export const NOTES = [
  "totalNote",
  "subjectNote",
  "otherNote",
  "familyNote",
  "scaleNote",
  "legendNote",
] as const;

export function DirectedRadarScrolly({
  spokes,
  families,
  items,
  totals,
  ceilings,
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
  spokes: Spoke[];
  families: Family[];
  items: string[];
  totals: { value: number; text: string }[];
  ceilings: { value: number; text: string }[];
  words: Record<(typeof NOTES)[number], string>;
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
  grid: string;
}) {
  const rule = stroke.rule ?? 1;
  const hairline = stroke.hairline ?? 0.75;
  const accentInk =
    adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const inkOnGround = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const hues = [accent, muted];
  const inks = [accentInk, mutedInk];
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
  const barFill = [mix(accent, ground, 0.15), mix(muted, ground, 0.2)];

  const label = (
    name: string,
    texts: string[],
    attrs: Record<string, string | number>,
  ) => (
    <div {...attrs} style={abs({ textAlign: "center", opacity: 0 })}>
      <div style={{ ...regs.annot, color: inkOnGround, textShadow: halo }}>
        {name}
      </div>
      <div style={{ textShadow: halo }}>
        {texts.map((t, i) => (
          <span
            key={i}
            data-value={i}
            style={{
              ...regs.value,
              color: inks[i],
              fontWeight: i === 0 ? 700 : regs.value.fontWeight,
            }}
          >
            {i > 0 && (
              <span style={{ color: mutedInk, fontWeight: 400 }}>{" · "}</span>
            )}
            {t}
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <div
      role="img"
      aria-label={alt}
      data-radar={JSON.stringify({
        spokes: spokes.map((s) => ({ family: s.family, shares: s.shares })),
        families: families.map((f) => ({ shares: f.shares })),
        totals: totals.map((t) => t.value),
        ceilings: ceilings.map((c) => c.value),
        hues,
        ground,
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
        <span style={{ ...regs.annot }}>
          <span style={{ color: accentInk, fontWeight: 700 }}>{items[0]}</span>
          <span style={{ color: mutedInk }}>{` · ${items[1]}`}</span>
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
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <circle
              key={f}
              data-ring={f}
              fill="none"
              stroke={f === 1 ? mutedInk : grid}
              strokeWidth={f === 1 ? rule : hairline}
              strokeDasharray={f === 1 ? undefined : "3 3"}
            />
          ))}
          {spokes.map((s, i) => (
            <line
              key={s.key}
              data-spoke={i}
              stroke={grid}
              strokeWidth={hairline}
            />
          ))}
          {items
            .map((item, k) => (
              <g key={item} data-polygon={k}>
                <path
                  fill={hues[k]}
                  fillOpacity={k === 0 ? 0.18 : 0.22}
                  stroke={hues[k]}
                  strokeWidth={rule * 2}
                  strokeLinejoin="round"
                />
                {spokes.map((_, i) => (
                  <circle
                    key={i}
                    data-vertex={i}
                    r={rule * 1.8}
                    fill={hues[k]}
                    stroke={hues[k]}
                    strokeWidth={rule * 1.4}
                  />
                ))}
              </g>
            ))
            .reverse()}
        </svg>

        {ceilings.map((c, i) => (
          <span
            key={c.text}
            data-ceiling={i}
            style={abs({
              ...regs.axis,
              color: mutedInk,
              textShadow: halo,
              opacity: 0,
            })}
          >
            {c.text}
          </span>
        ))}
        {spokes.map((s, i) =>
          label(s.label, s.texts, { "data-spoke-label": i }),
        )}
        {families.map((f, i) =>
          label(f.label, f.texts, { "data-family-label": i }),
        )}

        {totals.map((t, i) => (
          <div key={items[i]} data-bar={i} style={abs({ opacity: 0 })}>
            <span
              data-part="bar-name"
              style={{
                ...regs.annot,
                color: inks[i],
                fontWeight: i === 0 ? 700 : regs.annot.fontWeight,
              }}
            >
              {items[i]}
            </span>
            <div
              data-part="bar"
              style={{
                position: "absolute",
                left: 0,
                height: "14px",
                background: barFill[i],
              }}
            />
            <span
              data-part="bar-value"
              style={{
                ...regs.value,
                position: "absolute",
                color: inks[i],
                fontWeight: 700,
              }}
            >
              {t.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
