// SCAFFOLD: scaffolded --from proof/scrolly-dot-density-europe-stations — this file is that beat's own code, renamed for this one. The
// header comment below, and every region marked SCAFFOLD:, describe proof/scrolly-dot-density-europe-stations's own subject; rewrite them
// for this beat's. Read proof/scrolly-dot-density-europe-stations/BRIEF.md alongside this code before changing the choreography.
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

export function DirectedEuropeCoalConcentrationScrolly({
  plan,
  fallbacks,
  reference,
  total,
  firstCounter,
  sizes,
  dotColour,
  subjectColour,
  barBack,
  dotR,
  ringR,
  shareSites,
  shareCapacity,
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
  subjectColour: string;
  barBack: string;
  dotR: number;
  ringR: number;
  shareSites: number;
  shareCapacity: number;
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

  // SCAFFOLD: the JSX below is proof/scrolly-dot-density-europe-stations's own key/counter/notes around the live map. Adapt the words and

  // swatches to this beat's own subject, keeping the data-part contract the driver and CSS rely on.

  return (
    <div
      data-part="symbols"
      role="img"
      aria-label={alt}
      data-dots={JSON.stringify({ total, shareSites, shareCapacity })}
      style={{
        position: "absolute",
        inset: 0,
        background: ground,
        display: "grid",
        gridTemplateRows: "auto auto minmax(0, 1fr) auto",
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

      {/* THE SHARE BAR: nuclear's share of the sites, carried with the dots to its share of the power — one bar
          measuring both counts, matching the validated video beat (owner, 2026-09-15). */}
      <div
        data-part="bar"
        style={{
          position: "relative",
          height: "6px",
          borderRadius: "3px",
          background: barBack,
          overflow: "hidden",
          opacity: 0,
        }}
      >
        <div
          data-part="bar-fill"
          style={{
            position: "absolute",
            inset: 0,
            width: `${shareSites}%`,
            background: subjectColour,
          }}
        />
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
          {/* THE KEY: exactly the video's three symbols — the dot, the ring, one size reference. */}
          <span style={keyItem}>
            <span
              style={{
                display: "inline-block",
                width: `${2 * dotR * 1.6}px`,
                height: `${2 * dotR * 1.6}px`,
                borderRadius: "50%",
                background: dotColour,
              }}
            />
            {words.dotIs}
          </span>
          <span style={keyItem}>
            <span
              style={{
                position: "relative",
                display: "inline-block",
                width: `${2 * ringR}px`,
                height: `${2 * ringR}px`,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  width: `${2 * dotR * 1.6}px`,
                  height: `${2 * dotR * 1.6}px`,
                  borderRadius: "50%",
                  background: subjectColour,
                }}
              />
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  boxShadow: `0 0 0 1.2px ${subjectColour}`,
                }}
              />
            </span>
            {words.subjectIs}
          </span>
          <span style={keyItem}>
            <span
              style={{
                display: "inline-block",
                width: `${sizes[1].px}px`,
                height: `${sizes[1].px}px`,
                borderRadius: "50%",
                boxShadow: `0 0 0 1.2px ${mutedInk}`,
              }}
            />
            {sizes[1].label}
          </span>
        </span>
        <span style={{ ...regs.axis, color: mutedInk }}>{words.limit}</span>
      </div>
    </div>
  );
}
