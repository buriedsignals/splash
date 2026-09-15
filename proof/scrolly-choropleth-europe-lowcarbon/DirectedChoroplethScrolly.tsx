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
 *
 * THE MARKUP IS CARD 1, THE NO-JS PICTURE IS THE LAST CARD. The page is megabytes of inlined images and its
 * scripts come after them, so a browser paints the markup before the driver has run: that first paint
 * must already be card 1's picture (`first`), not the last card's words, counter and key flashing away.
 * A reader without a script gets the last card through the `<noscript>` rules below.
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
  first,
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
  first: { card: number; classes: number; filter: number };
  fallbacks: { x1: string; x2: string }[];
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
  const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const scope = '[data-part="choropleth"]';
  const noScript =
    `${scope} [data-fallback]{opacity:0!important}` +
    `${scope} [data-fallback="${fallbacks.length - 1}"],${scope} [data-part="key"],${scope} [data-class-swatch],${scope} [data-part="top-count"]{opacity:1!important}`;

  return (
    <div
      data-part="choropleth"
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
      {/* Not a box: shown without a script it would take the grid's first row from the counter. */}
      <noscript
        style={{ display: "none" }}
        dangerouslySetInnerHTML={{ __html: `<style>${noScript}</style>` }}
      />
      <div
        data-part="count-panel"
        style={{ display: "flex", justifyContent: "flex-end" }}
      >
        <span
          data-part="top-count"
          data-template={topCount.template}
          data-value={topCount.value}
          style={{
            ...regs.value,
            color: accentInk,
            whiteSpace: "nowrap",
            opacity: first.filter,
          }}
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
        {/* EACH CARD AT THE READER'S DENSITY, chosen by a media query and not by `srcset`'s `2x`: Chrome
            treats an inlined data URI as already cached and so always takes the densest candidate, which
            gave a 1x screen the 2x bake anyway (measured 2026-09-15). */}
        {fallbacks.map((src, k) => (
          <picture key={k}>
            <source media="(min-resolution: 1.5dppx)" srcSet={src.x2} />
            <img
              data-fallback={k}
              src={src.x1}
              alt=""
              style={abs({
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: k === first.card ? 1 : 0,
              })}
            />
          </picture>
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
          opacity: clamp(first.classes * classCount),
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
              style={{
                position: "relative",
                height: "12px",
                background: fill,
                opacity: clamp(first.classes * classCount - i),
              }}
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
