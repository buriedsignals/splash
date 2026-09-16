/**
 * Ukrainians under temporary protection in Europe, drawn on a live MapTiler map and CHOREOGRAPHED by the
 * scroll. The `flow map` type in the scrolly format, matching the validated video beat's own visual treatment
 * (`proof/video-flow-map-ukraine-protection`, `quality/video`, owner 2026-09-15: « comme dans la vidéo »): the
 * bands traced out of Ukraine one by one, largest first, the share they carry counted, the countries too small
 * for a band dotted.
 *
 * THE MAP IS A LIVE MAPTILER MAP (flat Web Mercator), its camera fixed at the static plate's own box: every
 * band is a MapLibre `line` layer over the basemap's own land and sea, `flow-drive.mjs` cutting each to its own
 * drawn share and positioning the host names, drawn by the beat in French, as HTML labels over the stage.
 *
 * UNDER THE LIVE MAP, ONE FROZEN IMAGE PER CARD (`live-map-cards.mjs`). THE MARKUP IS CARD 1; a reader without a
 * script gets the last card, every band whole.
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

export type Band = { code: string; name: string; people: number; top: boolean };
type Style = Record<string, string | number>;

export function DirectedFlowMapScrolly({
  plan,
  fallbacks,
  reference,
  bands,
  others,
  total,
  keySizes,
  bandColour,
  subjectColour,
  landColour,
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
  bands: Band[];
  others: number;
  total: number;
  keySizes: { people: number; label: string }[];
  bandColour: string;
  subjectColour: string;
  landColour: string;
  words: {
    unit: string;
    totalNote: string;
    count: string;
    othersNote: string;
    drawnNote: string;
    othersKey: string;
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
  const inkOnGround = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const slot: CSSProperties = {
    gridArea: "1 / 1",
    justifySelf: "end",
    textAlign: "right",
  };
  // A name reads over the band it names as much as over the land: a halo of the land's own tint, not a flat
  // outline, so it stands clear of whatever passes under it (the static plate's own `halo` treatment).
  const halo = `0 0 3px ${landColour}, 0 0 3px ${landColour}, 0 0 2px ${landColour}`;
  const label: CSSProperties = {
    ...regs.axis,
    position: "absolute",
    left: 0,
    top: 0,
    whiteSpace: "nowrap",
    pointerEvents: "none",
    opacity: 0,
    textShadow: halo,
  };
  const scope = '[data-part="symbols"]';
  const shapes = shapeSelectionCss(scope, reference);
  const noScript =
    noScriptCss(scope, fallbacks.length - 1, []) +
    `${scope} [data-part="count"],${scope} [data-part="total-note"]{opacity:0!important}`;

  return (
    <div
      data-part="symbols"
      role="img"
      aria-label={alt}
      data-flow={JSON.stringify({
        cards: fallbacks.length,
        total,
        originName: "Ukraine",
        originCode: "UKR",
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
          {words.unit}
        </span>
        <span style={{ display: "grid", marginLeft: "auto" }}>
          <span
            data-part="total-note"
            style={{ ...regs.value, ...slot, color: inkOnGround, opacity: 0 }}
          >
            {words.totalNote}
          </span>
          <span
            data-part="count"
            data-template={words.count}
            style={{ ...regs.value, ...slot, color: accentInk, opacity: 0 }}
          >
            {words.count.replace("{p}", "")}
          </span>
          <span
            data-part="others-note"
            style={{ ...regs.value, ...slot, color: inkOnGround }}
          >
            {words.othersNote}
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
        {bands.map((b) => (
          <span
            key={b.code}
            data-label={b.code}
            style={{ ...label, color: b.top ? accentInk : inkOnGround }}
          >
            {b.name}
          </span>
        ))}
        <span
          data-part="node-label"
          style={{
            ...regs.value,
            ...label,
            color: inkOnGround,
            fontWeight: 700,
            transform: "translate(-50%, -50%)",
          }}
        >
          Ukraine
        </span>
      </div>

      <div
        data-part="key"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "4px 18px",
        }}
      >
        {keySizes.map((k) => (
          <span
            key={k.people}
            style={{
              ...regs.axis,
              color: mutedInk,
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span
              data-people={k.people}
              style={{
                display: "inline-block",
                width: "34px",
                height: `${k.px}px`,
                background: bandColour,
              }}
            />
            {k.label}
          </span>
        ))}
        <span style={{ ...regs.axis, color: mutedInk }}>{words.drawnNote}</span>
        <span
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
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              background: bandColour,
            }}
          />
          {words.othersKey}
        </span>
      </div>
    </div>
  );
}
