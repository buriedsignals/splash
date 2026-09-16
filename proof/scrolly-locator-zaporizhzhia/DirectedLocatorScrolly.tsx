/**
 * Where Europe's largest low-carbon power station is, drawn THROUGH the design base as a locator map and CHOREOGRAPHED
 * by the scroll. The `locator` type in the scrolly format: the subject of `static-locator-zaporizhzhia` — Zaporizhzhia,
 * 6,000 MW, in the one European country whose 2024 generation is not reported — told with the gestures a scroll can
 * make: the largest stations across Europe, the country singled out, the camera closing on the region, the three
 * classes of place named, the station ringed.
 *
 * THE MAP IS A LIVE MAPTILER MAP (flat Web Mercator) DRIVEN BY THE PLAN (`plan.mjs`): Ukraine's fill and outline, its
 * oblasts, the four stations and the subject's ring are MapLibre layers over the basemap's own land and sea. Country,
 * settlement and water NAMES are MapTiler's own label layers, filtered and faded by `locator-drive.mjs` — not drawn
 * by this beat (owner ruling 2026-09-15).
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

export function DirectedLocatorScrolly({
  plan,
  fallbacks,
  reference,
  native,
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
  native: Record<string, unknown>;
  words: {
    unit: string;
    topNote: string;
    countryNote: string;
    zoomNote: string;
    subjectNote: string;
    limitNote: string;
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
  const scope = '[data-part="symbols"]';
  const shapes = shapeSelectionCss(scope, reference);
  const noScript = noScriptCss(scope, fallbacks.length - 1, []);

  return (
    <div
      data-part="symbols"
      role="img"
      aria-label={alt}
      data-locator={JSON.stringify({ native })}
      style={{
        position: "absolute",
        inset: 0,
        background: ground,
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr)",
        gridTemplateColumns: "minmax(0, 1fr)",
        rowGap: "8px",
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
          {(
            [
              "topNote",
              "countryNote",
              "zoomNote",
              "subjectNote",
              "limitNote",
            ] as const
          ).map((k) => (
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
    </div>
  );
}
