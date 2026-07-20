// Shared story overlay cards — extracted from ChoroplethStory so both
// ChoroplethStory and SymbolStory can reuse them without duplication.

import React from "react";
import { interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";

const { fontFamily } = loadFont();

// Caption lower-third card — semi-opaque, WCAG-contrasted. Typography mirrors CountryLabel
// (same Space Grotesk font-var + shadow-var) so the reveal-beat central label and the
// takeaway caption read as one concordant design language, not two unrelated text styles.
export const CaptionCard: React.FC<{ text: string; reveal: number }> = ({
  text,
  reveal,
}) => {
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
