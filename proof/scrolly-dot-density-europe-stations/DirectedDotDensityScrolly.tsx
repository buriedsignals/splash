/**
 * Europe's low-carbon power stations, one dot each, drawn THROUGH the design base as a dot density map and
 * CHOREOGRAPHED by the scroll. The `dot density` type in the scrolly format: the subject of
 * `static-dot-density-europe-stations` — 72 nuclear reactors among 8,900 stations carry a third of the power —
 * told with the gestures a scroll can make: the stations filling in fuel by fuel while a counter climbs, the
 * nuclear sites isolated and ringed, every dot re-encoded to the area of its capacity, the camera closing on the
 * country with the most nuclear sites, then pulling back.
 *
 * THE MAP IS A LIVE MAPTILER MAP (flat Web Mercator) DRIVEN BY THE PLAN (`plan.mjs`): every dot is a MapLibre
 * circle layer over the basemap's own land and sea — card 1, "the land, empty", is simply the basemap with no
 * dots yet, needing no beat-drawn land at all.
 *
 * UNDER THE LIVE MAP, ONE FROZEN IMAGE PER CARD (`live-map-cards.mjs`). THE MARKUP IS CARD 1; a reader without a
 * script gets the last card.
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

export function DirectedDotDensityScrolly({
  plan,
  fallbacks,
  reference,
  total,
  firstCounter,
  sizes,
  dotColour,
  ringColour,
  paleColour,
  words,
  alt,
  regs,
  ground,
  accent,
  ink,
  muted,
}: {
  plan: Record<string, unknown>;
  fallbacks: Record<"wide" | "tall", { x1: string; x2: string }>[];
  reference: { width: number; height: number };
  total: number;
  firstCounter: string;
  sizes: { mw: number; label: string; px: number }[];
  dotColour: string;
  ringColour: string;
  paleColour: string;
  words: {
    unit: string;
    count: string;
    subjectNote: string;
    weightNote: string;
    zoomNote: string;
    dotIs: string;
    subjectIs: string;
    weightIs: string;
    limit: string;
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
}) {
  const accentInk =
    adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
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
    noScriptCss(scope, fallbacks.length - 1, []) +
    `${scope} [data-part="counter"]{opacity:0!important}`;

  return (
    <div
      data-part="symbols"
      role="img"
      aria-label={alt}
      data-dots={JSON.stringify({ total })}
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
            data-template={words.count}
            style={{
              ...regs.value,
              ...slot,
              color: adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink,
            }}
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
            data-part="weight-note"
            style={{ ...regs.value, ...slot, color: accentInk, opacity: 0 }}
          >
            {words.weightNote}
          </span>
          <span
            data-part="zoom-note"
            style={{ ...regs.value, ...slot, color: accentInk, opacity: 0 }}
          >
            {words.zoomNote}
          </span>
        </span>
      </div>

      <div
        data-part="stage"
        style={{ position: "relative", minHeight: 0, overflow: "hidden" }}
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
          <span style={keyItem}>{words.dotIs}</span>
          <span style={keyItem}>
            <span
              style={{
                position: "relative",
                display: "inline-block",
                width: "6px",
                height: "6px",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  inset: "1px",
                  borderRadius: "50%",
                  background: dotColour,
                }}
              />
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  boxShadow: `0 0 0 1px ${ringColour}`,
                }}
              />
            </span>
            {words.subjectIs}, cerclés
          </span>
          <span style={keyItem}>{words.weightIs}</span>
          <span style={keyItem}>
            <span
              style={{
                display: "inline-block",
                width: "14px",
                height: "14px",
                borderRadius: "50%",
                background: dotColour,
              }}
            />
            site nucléaire
          </span>
          <span style={keyItem}>
            <span
              style={{
                display: "inline-block",
                width: "14px",
                height: "14px",
                borderRadius: "50%",
                background: paleColour,
              }}
            />
            autre centrale
          </span>
          {sizes.map((s) => (
            <span key={s.mw} style={keyItem}>
              <span
                style={{
                  display: "inline-block",
                  width: `${s.px}px`,
                  height: `${s.px}px`,
                  borderRadius: "50%",
                  background: paleColour,
                }}
              />
              {s.label}
            </span>
          ))}
        </span>
        <span style={{ ...regs.axis, color: mutedInk }}>{words.limit}</span>
      </div>
    </div>
  );
}
