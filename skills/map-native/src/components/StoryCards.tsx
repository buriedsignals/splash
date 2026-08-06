// Shared story overlay cards — extracted from ChoroplethStory so both
// ChoroplethStory and SymbolStory can reuse them without duplication.

import React from "react";
import { interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";

const { fontFamily } = loadFont();

/**
 * Caption lower-third card — semi-opaque, WCAG-contrasted.
 *
 * ★ IT CARRIES THE SUBJECT TOO, since 2026-08-06. An authored step used to put the place name in
 * a giant centred overlay AND the journalist's sentence in a card at the bottom, in another type
 * treatment — two text objects saying one thing, in two styles. Rémy, on seeing it: « tu ressors
 * le titre en gros au centre et tu mets le texte en bas d'un autre style. Il faut homogénéiser. »
 *
 * So the name (and its value, where the type has one) becomes an EYEBROW on this card, and the
 * centred overlay is not drawn for that step. One object, one type scale, nothing lost — the
 * derived stories, which have no sentence, keep the centred label exactly as before.
 */
export const CaptionCard: React.FC<{
  text: string;
  reveal: number;
  /** The step's subject — drawn above the sentence, small, when this card replaces the centred
   *  label. Absent ⇒ the card renders as it always did. */
  eyebrow?: string;
  /** The subject's value, appended to the eyebrow. Empty for types that carry none (a locator
   *  marker has no number), which is why it is separate rather than baked into `eyebrow`. */
  value?: string;
}> = ({ text, reveal, eyebrow, value }) => {
  const opacity = interpolate(reveal, [0, 0.4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        bottom: 64,
        left: "50%",
        transform: "translateX(-50%)",
        maxWidth: "72%",
        background: "rgba(10,10,10,0.72)",
        backdropFilter: "blur(6px)",
        borderRadius: 10,
        padding: "18px 32px",
        opacity,
        pointerEvents: "none",
      }}
    >
      {eyebrow && (
        <p
          style={{
            margin: "0 0 6px",
            color: "#F5F2ED",
            opacity: 0.72,
            fontFamily: `var(--map-label-font, ${fontFamily})`,
            fontSize: 18,
            fontWeight: 600,
            lineHeight: 1.2,
            textAlign: "center",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {eyebrow}
          {value ? ` · ${value}` : ""}
        </p>
      )}
      <p
        style={{
          margin: 0,
          color: "#F5F2ED",
          fontFamily: `var(--map-label-font, ${fontFamily})`,
          fontSize: 28,
          fontWeight: 600,
          lineHeight: 1.35,
          textAlign: "center",
          letterSpacing: "0.01em",
          textShadow:
            "var(--map-label-shadow, 0 2px 18px rgba(0,0,0,0.9), 0 0 3px rgba(0,0,0,0.7))",
        }}
      >
        {text}
      </p>
    </div>
  );
};

// Title card — full-screen scene-1 overlay. Opacity is supplied by the caller
// (via resolveScene): 1 from frame 0 through the title hold, fading out only at the
// crossfade to the map scene.
export const TitleCard: React.FC<{
  text: string;
  description?: string;
  opacity: number;
}> = ({ text, description, opacity }) => {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 20, // above the MapFrame furniture (zIndex 10) — title scene sits on top during the crossfade
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1c1c1c",
        opacity,
        pointerEvents: "none",
      }}
    >
      <div style={{ maxWidth: "70%", textAlign: "center" }}>
        <p
          style={{
            margin: 0,
            color: "#F5F2ED",
            fontSize: 48,
            fontWeight: 700,
            lineHeight: 1.25,
            letterSpacing: "-0.01em",
            textShadow: "0 2px 16px rgba(0,0,0,0.8)",
          }}
        >
          {text}
        </p>
        {description && (
          <p
            style={{
              margin: "18px 0 0",
              color: "#C9C4BB",
              fontSize: 24,
              fontWeight: 400,
              lineHeight: 1.3,
              textShadow: "0 2px 12px rgba(0,0,0,0.7)",
            }}
          >
            {description}
          </p>
        )}
      </div>
    </div>
  );
};
