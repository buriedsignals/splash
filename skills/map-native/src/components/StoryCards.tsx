// Shared story overlay cards — extracted from ChoroplethStory so both
// ChoroplethStory and SymbolStory can reuse them without duplication.

import React from "react";
import { interpolate } from "remotion";
import type { Phase } from "../story-timeline";

// Caption lower-third card — semi-opaque, WCAG-contrasted.
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
          fontSize: 28,
          fontWeight: 600,
          lineHeight: 1.35,
          textAlign: "center",
          letterSpacing: "0.01em",
          textShadow: "0 1px 8px rgba(0,0,0,0.7)",
        }}
      >
        {text}
      </p>
    </div>
  );
};

// Title card — full-screen overlay shown only during the title beat (beatIndex 0).
// Map is blank behind it (fillReveal 0). Fades in at start, fades out near end of beat.
export const TitleCard: React.FC<{
  text: string;
  description?: string;
  phase: Phase;
  frame: number;
}> = ({ text, description, phase, frame }) => {
  const holdStart = phase.startFrame + phase.moveFrames;
  const holdEnd = holdStart + phase.holdFrames;
  // Fade in over first 0.3s of hold, fade out over last 0.5s.
  const fadeInEnd = holdStart + Math.round(phase.holdFrames * 0.15);
  const fadeOutStart = holdEnd - Math.round(phase.holdFrames * 0.25);

  const opacity = interpolate(
    frame,
    [holdStart, fadeInEnd, fadeOutStart, holdEnd],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
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
