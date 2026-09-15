/**
 * Europe's low-carbon electricity in 2024, drawn THROUGH the design base as a choropleth and CHOREOGRAPHED
 * by the scroll. The `choropleth` type in the scrolly format: the subject of
 * `static-choropleth-europe-lowcarbon` — seven countries above 94 %, six in the north-west and Albania —
 * told with the gestures a scroll can make (`scrolly/references/directed-type-choreography.md`).
 *
 * THE MAP IS A LIVE MAPTILER MAP (flat Web Mercator) DRIVEN BY THE PLAN (`plan.mjs`). Everything inside the map — the class
 * fills joined to MapTiler Countries by ISO A2, the borders, the names, the odd one's ring, the seas'
 * names — is a MapLibre layer; the scroll moves its camera and paint (`choropleth-drive.mjs`). Outside the
 * map, and so outside the plan: the counter above it, the key below it, and the odd one's name lifted
 * above the card that covers its country, with its leader.
 *
 * UNDER THE LIVE MAP, ONE FROZEN IMAGE PER CARD, baked from the same plan at the card's own camera and
 * state. Without a key, without a script, or while the live map warms, the reader sees those; the last
 * card's image is the one shown when no script runs. They are fitted `cover`, never stretched.
 */

import type { CSSProperties } from "react";
import {
  adjustToContrast,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";

export type Name = { iso: string; text: string; role: "odd" };
type Style = Record<string, string | number>;

export function DirectedChoroplethScrolly({
  plan,
  fallbacks,
  classFills,
  missingFill,
  breaks,
  odd,
  topCount,
  unit,
  missingLabel,
  alt,
  regs,
  stroke,
  ground,
  accent,
  ink,
  muted,
  water,
}: {
  plan: Record<string, unknown>;
  fallbacks: string[];
  classFills: string[];
  missingFill: string;
  breaks: string[];
  odd: Name;
  topCount: { template: string; value: number };
  unit: string;
  missingLabel: string;
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
  water: { water: string; land: string };
}) {
  const classCount = classFills.length;
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const accentInk =
    adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
  const abs = (extra: CSSProperties): CSSProperties => ({
    position: "absolute",
    ...extra,
  });

  return (
    <div
      role="img"
      aria-label={alt}
      style={{
        position: "absolute",
        inset: 0,
        background: ground,
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr) auto",
        rowGap: "10px",
        // The page's own side gutter — the header's — so the map's edges line up with the title's.
        padding: `12px var(--prose-gutter, clamp(16px, 6vw, 56px))`,
      }}
    >
      <div
        data-part="count-panel"
        style={{ display: "flex", justifyContent: "flex-end" }}
      >
        <span
          data-part="top-count"
          data-template={topCount.template}
          data-value={topCount.value}
          style={{ ...regs.value, color: accentInk, whiteSpace: "nowrap" }}
        >
          {topCount.template.replace("{n}", String(topCount.value))}
        </span>
      </div>

      {/* THE MAP FILLS ITS ROW, gutter to gutter: the live canvas is the stage, and each fallback image
          covers it without distortion. */}
      <div
        data-part="stage"
        style={{
          position: "relative",
          minHeight: 0,
          overflow: "hidden",
          background: water.water,
        }}
      >
        {fallbacks.map((src, k) => (
          <img
            key={k}
            data-fallback={k}
            src={src}
            alt=""
            style={abs({
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: k === fallbacks.length - 1 ? 1 : 0,
            })}
          />
        ))}
        <div data-part="live" style={abs({ inset: 0, opacity: 0 })} />
        <script
          type="application/json"
          data-part="plan"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(plan).replace(/</g, "\\u003c"),
          }}
        />
        {/* The leader from the odd one's name, lifted above the card that reads over it, down to its country. */}
        <div
          data-part="odd-leader"
          style={abs({
            left: 0,
            top: 0,
            width: 0,
            height: 0,
            borderLeft: `${(stroke.rule ?? 1) * 1.5}px solid ${accentInk}`,
            opacity: 0,
          })}
        />
        <span
          data-name={odd.iso}
          data-role="odd"
          style={abs({
            ...regs.axis,
            left: 0,
            top: 0,
            transform: "translate(-50%, -50%)",
            whiteSpace: "nowrap",
            background: ground,
            padding: "1px 5px",
            color: accentInk,
            fontWeight: 700,
            opacity: 0,
          })}
        >
          {odd.text}
        </span>
      </div>

      <div
        data-part="key"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          gap: "6px 16px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${classCount}, 34px)`,
            gap: "2px",
            paddingBottom: "1.5em",
          }}
        >
          {classFills.map((fill, i) => (
            <div
              key={`c${i}`}
              data-class-swatch={i}
              style={{ position: "relative", height: "12px", background: fill }}
            >
              {i < breaks.length && (
                <span
                  style={{
                    ...regs.axis,
                    color: mutedInk,
                    position: "absolute",
                    left: "100%",
                    top: "14px",
                    transform: "translateX(-50%)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {breaks[i]}
                </span>
              )}
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gap: "4px" }}>
          <span style={{ ...regs.axis, color: mutedInk }}>{unit}</span>
          <span
            style={{
              ...regs.axis,
              color: mutedInk,
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: "34px",
                height: "12px",
                background: missingFill,
              }}
            />
            {missingLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
