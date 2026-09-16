/**
 * Europe measured from the sea, drawn on a live MapTiler map and CHOREOGRAPHED by the scroll. The
 * `contour / isoline` type in the scrolly format, matching the validated video beat's own visual treatment
 * (`proof/video-contour-europe-distance`, `quality/video`, owner 2026-09-15: « comme dans la vidéo »): a fill
 * sweeping inland from every coast at once, each isoline left where the front passed it, the camera closing
 * on the last point the sweep reaches.
 *
 * THE MAP IS A LIVE MAPTILER MAP (flat Web Mercator): the study land and the land outside the measurement
 * (Russia, cut by the frame) are MapTiler Countries fills; every isoline and number is a MapLibre layer whose
 * opacity is bound to the scroll's own `level`/`median`/`summit` fields — no JS needed for them. THE SWEEP is
 * the one thing a plan layer cannot draw (a `canvas` source, `contour-drive.mjs`).
 *
 * UNDER THE LIVE MAP, ONE FROZEN IMAGE PER CARD (`live-map-cards.mjs`). THE MARKUP IS CARD 1; a reader without
 * a script gets the last card, every line and its number, the summit marked.
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

export function DirectedContourScrolly({
  plan,
  fallbacks,
  reference,
  sweep,
  within,
  deepest,
  colours,
  count,
  unit,
  outsideLabel,
  levels,
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
  sweep: {
    cols: number;
    rows: number;
    stepKm: number;
    coordinates: number[][];
    bytes: string;
  };
  within: number[];
  deepest: number;
  colours: { tint: string; rim: string };
  count: string;
  unit: string;
  outsideLabel: string;
  levels: { level: number; label: string }[];
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
  const inkOnGround = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const accentInk =
    adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
  const scope = '[data-part="symbols"]';
  const shapes = shapeSelectionCss(scope, reference);
  const noScript =
    noScriptCss(scope, fallbacks.length - 1, []) +
    `${scope} [data-part="count"]{opacity:0!important}`;

  return (
    <div
      data-part="symbols"
      role="img"
      aria-label={alt}
      data-contour={JSON.stringify({
        cards: fallbacks.length,
        within,
        deepest,
        colours,
        sweep,
      })}
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
          {unit}
        </span>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginLeft: "auto",
          }}
        >
          <span
            data-part="count-swatch"
            style={{
              display: "inline-block",
              width: "10px",
              height: "10px",
              borderRadius: "2px",
              background: colours.tint,
              opacity: 0,
            }}
          />
          <span
            data-part="count"
            data-template={count}
            style={{ ...regs.value, color: accentInk, opacity: 0 }}
          >
            {count.replace("{p}", "").replace("{km}", "")}
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

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "4px 14px",
        }}
      >
        {levels.map((l) => (
          <span
            key={l.level}
            style={{
              ...regs.axis,
              color: mutedInk,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: "16px",
                height: "2px",
                background: mutedInk,
              }}
            />
            {l.label}
          </span>
        ))}
        <span style={{ ...regs.axis, color: mutedInk }}>{outsideLabel}</span>
      </div>
    </div>
  );
}
