/**
 * Europe's low-carbon power stations, one hollow circle each sized by capacity, drawn THROUGH the design base as a
 * proportional symbol map and CHOREOGRAPHED by the scroll. The `proportional symbol` type in the scrolly format: the
 * subject of `static-proportional-symbol-europe-capacity` — a hundredth of the sites carries a third of the power or
 * more — told with the gestures a scroll can make (`scrolly/references/directed-type-choreography.md`): the stations
 * arriving largest first while a counter keeps their share of the sites and of the power, nuclear isolated, the field
 * filled to all 8,900 until it closes, then the static plate's cut.
 *
 * THE MAP IS A LIVE MAPTILER MAP (flat Web Mercator) DRIVEN BY THE PLAN (`plan.mjs`): the circles and the largest
 * station's name are MapLibre layers over the basemap's own land and sea, and the scroll moves the camera and the
 * paint (`symbol-drive.mjs`). Outside the map, and so outside the plan: the counter and its notes above it, the key
 * and the cut below it.
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: area proportional to capacity, the key's circles computed from the same
 * radius at the whole-map camera they are read with; hollow circles, so a large one never erases the small ones under it; the
 * basemap gives up its contrast; the cut is printed with its reason.
 *
 * UNDER THE LIVE MAP, ONE FROZEN IMAGE PER CARD (`live-map-cards.mjs`). THE MARKUP IS CARD 1; a reader without a
 * script gets the last card — the plate's cut, its note and its key.
 */

import type { CSSProperties } from "react";
import {
  adjustToContrast,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import {
  CardImages,
  noScriptCss,
  shapeSelectionCss,
} from "../../skills/scrolly/scripts/live-map-cards.mjs";

type Style = Record<string, string | number>;

export function DirectedProportionalScrolly({
  plan,
  fallbacks,
  reference,
  cumulative,
  maxMw,
  firstCounter,
  firstSwatchPx,
  sizes,
  circle,
  words,
  alt,
  regs,
  ground,
  accent,
  ink,
  muted,
  water,
}: {
  plan: Record<string, unknown>;
  fallbacks: Record<"wide" | "tall", { x1: string; x2: string }>[];
  reference: { width: number; height: number };
  /** running share of the capacity, in %, after each station largest first */
  cumulative: number[];
  maxMw: number;
  /** the counter as card 1 reads it */
  firstCounter: string;
  /** the largest station's radius, in CSS px, at the whole-map camera on the stage the page is measured at
   *  (1280 × 800): the key's first paint, and the box each of its circles is reserved */
  firstSwatchPx: number;
  sizes: { mw: number; label: string }[];
  circle: string;
  words: {
    unit: string;
    counter: string;
    subjectNote: string;
    cutNote: string;
    circleIs: string;
    cut: string;
  };
  alt: string;
  regs: Record<
    "display" | "eyebrow" | "body" | "axis" | "annot" | "value",
    Style
  >;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  water: string;
}) {
  const accentInk =
    adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
  const inkOnGround = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const slot: CSSProperties = {
    gridArea: "1 / 1",
    justifySelf: "end",
    textAlign: "right",
  };
  const keyItem: CSSProperties = {
    ...regs.axis,
    color: mutedInk,
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  };
  const scope = '[data-part="symbols"]';
  const shapes = shapeSelectionCss(scope, reference);
  const noScript =
    noScriptCss(scope, fallbacks.length - 1, [
      '[data-part="cut-note"]',
      '[data-part="cut"]',
    ]) + `${scope} [data-part="counter"]{opacity:0!important}`;
  // The key's ring is inset by 1.5 px, so its centre line sits on the map's ring: a diameter of 2·r + 1.5.
  // EACH CIRCLE SITS CENTRED IN A BOX OF FIXED SIZE: the driver resizes it for the stage, and a key row that grew
  // with it would shrink the stage the map's zoom is read from.
  const swatch = (mw: number) =>
    `${2 * firstSwatchPx * Math.sqrt(mw / maxMw) + 1.5}px`;

  return (
    <div
      data-part="symbols"
      role="img"
      aria-label={alt}
      data-symbols={JSON.stringify({ cumulative, maxMw })}
      style={{
        position: "absolute",
        inset: 0,
        background: ground,
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr) auto",
        gridTemplateColumns: "minmax(0, 1fr)",
        rowGap: "10px",
        padding: `12px var(--prose-gutter, clamp(16px, 6vw, 56px))`,
      }}
    >
      <noscript
        style={{ display: "none" }}
        dangerouslySetInnerHTML={{ __html: `<style>${noScript}</style>` }}
      />
      <style dangerouslySetInnerHTML={{ __html: shapes }} />
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
          <span
            data-part="counter"
            data-template={words.counter}
            style={{ ...regs.value, ...slot, color: inkOnGround }}
          >
            {firstCounter}
          </span>
          <span
            data-part="subject-note"
            style={{ ...regs.value, ...slot, color: accentInk, opacity: 0 }}
          >
            {words.subjectNote}
          </span>
          <span
            data-part="cut-note"
            style={{ ...regs.value, ...slot, color: accentInk, opacity: 0 }}
          >
            {words.cutNote}
          </span>
        </span>
      </div>

      <div
        data-part="stage"
        style={{
          position: "relative",
          minHeight: 0,
          overflow: "hidden",
          background: water,
        }}
      >
        <CardImages fallbacks={fallbacks} first={0} />
        <div
          data-part="live"
          style={{ position: "absolute", inset: 0, opacity: 0 }}
        />
        <script
          type="application/json"
          data-part="plan"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(plan).replace(/</g, "\\u003c"),
          }}
        />
      </div>

      <div style={{ display: "grid", gap: "4px" }}>
        <span
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "4px 14px",
            alignItems: "center",
          }}
        >
          <span style={keyItem}>{words.circleIs}</span>
          {sizes.map((s) => (
            <span key={s.mw} style={keyItem}>
              <span
                style={{
                  position: "relative",
                  display: "inline-block",
                  width: swatch(s.mw),
                  height: swatch(s.mw),
                }}
              >
                <span
                  data-mw={s.mw}
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                    width: swatch(s.mw),
                    height: swatch(s.mw),
                    borderRadius: "50%",
                    boxShadow: `inset 0 0 0 1.5px ${circle}`,
                  }}
                />
              </span>
              {s.label}
            </span>
          ))}
        </span>
        <span
          data-part="cut"
          style={{ ...regs.axis, color: mutedInk, opacity: 0 }}
        >
          {words.cut}
        </span>
      </div>
    </div>
  );
}
