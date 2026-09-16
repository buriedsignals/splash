/**
 * Where Europe's nuclear electricity is concentrated in 2024, drawn as a choropleth and CHOREOGRAPHED by the
 * scroll (`choropleth` type, `scrolly/references/types/choropleth.md`). THE MAP IS A LIVE MAPTILER MAP (flat
 * Web Mercator) DRIVEN BY THE PLAN (`choropleth-plan.mjs`) — the class fills joined to MapTiler Countries by
 * ISO A2, the borders, France's ring and name, are all MapLibre layers; the scroll moves the camera and paint
 * (`choropleth-drive.mjs`).
 *
 * UNDER THE LIVE MAP, ONE FROZEN IMAGE PER CARD, baked from the same plan. Without a script, or while the
 * live map warms, the reader sees those; the last card's image is the no-JS picture (`live-map-cards.mjs`).
 */

import {
  CardImages,
  noScriptCss,
  shapeSelectionCss,
} from "../../skills/scrolly/scripts/live-map-cards.mjs";

export function DirectedNuclearChoropleth({
  plan,
  first,
  fallbacks,
  reference,
  alt,
  ground,
  water,
}: {
  plan: Record<string, unknown>;
  first: { card: number };
  fallbacks: Record<"wide" | "tall", { x1: string; x2: string }>[];
  reference: { width: number; height: number };
  alt: string;
  ground: string;
  water: { water: string; land: string };
}) {
  const scope = '[data-part="nuclear-choropleth"]';
  const shapes = shapeSelectionCss(scope, reference);
  const noScript = noScriptCss(scope, fallbacks.length - 1, []);

  return (
    <div
      data-part="nuclear-choropleth"
      role="img"
      aria-label={alt}
      style={{ position: "absolute", inset: 0, background: ground }}
    >
      <noscript
        style={{ display: "none" }}
        dangerouslySetInnerHTML={{ __html: `<style>${noScript}</style>` }}
      />
      <style dangerouslySetInnerHTML={{ __html: shapes }} />
      <div
        data-part="stage"
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          background: water.water,
        }}
      >
        <CardImages fallbacks={fallbacks} first={first.card} />
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
