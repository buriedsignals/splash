// RevealStage — the video stage every walk-capable chart reveal renders inside.
//
// WHAT IT ADDS. A chart video honoured the walk's ORDER (the bars enter in the journalist's
// order, 2026-08-04) and showed none of its WORDS: they wrote the sentences, validated them, and
// the video displayed nothing. Rémy's own test run said it to his face — "tes cinq phrases ne
// suivent pas". This is the surface that carries them.
//
// WHAT IT DOES NOT CHANGE. With no walk on the config it renders exactly the `<div>` the reveal
// wrappers rendered before it existed — same element, same style, same children. That is the
// invariant the whole sub-project is bounded by: a video nobody storyboarded must not move a
// pixel.

import React from "react";
import { captionAt } from "../../src/core/walk";
import { themeColors, FONT, TYPE } from "../../src/core/tokens";
import { sourceFooterReserve } from "../../../../lib/core/text-fit";

/** What the stage needs off a chart config — the walk, and the ground its furniture derives from.
 *  Typed structurally rather than against one chart's Config, because every walk-capable type
 *  will pass its own. */
export type StageConfig = {
  beats?: readonly { text?: string }[];
  themeBg?: string;
  baseColor?: string;
  catField?: string;
  rows?: readonly Record<string, string | number>[];
};

/**
 * WHERE THE SENTENCE SITS — a lower third, the same furniture a map video already uses
 * (`CaptionCard`, skills/map-native/src/components/StoryCards.tsx).
 *
 * Deliberately ONE placement for every aspect rather than three tuned ones. A journalist who has
 * seen a map video reads the same object in the same place; and inventing a chart-specific layout
 * per aspect would be three untested guesses where one shared convention already exists. It
 * scales off the frame's SHORTER side, so a 9:16 and a 16:9 give the text the same optical
 * weight instead of the same pixel count.
 */
const BAND = {
  /** of the shorter side — the type size */
  fontScale: 0.045,
  /** of the frame height — the band never eats more than this, whatever the sentence */
  maxHeightRatio: 0.38,
  paddingScale: 0.035,
  /** the ground the band paints, over the chart's own */
  opacity: 0.92,
} as const;

export const RevealStage: React.FC<{
  config: StageConfig;
  progress: number;
  width: number;
  height: number;
  /** The same factor the chart is rendered at. The frame's own furniture — the source line
   *  included — is laid out in SCALED pixels, so a caption positioned in unscaled ones drifts
   *  into it exactly when the scale is not 1. Measured on a real 1080×1920 portrait: the band
   *  bit into "Source: Glamos". Landscape at scale 1 had hidden it. */
  scale?: number;
  children: React.ReactNode;
}> = ({ config, progress, width, height, scale = 1, children }) => {
  const C = themeColors(config.themeBg, config.baseColor);

  // The walk's order, resolved the same way BarChart resolves it — one answer, not two. The
  // anchors are the chart's own category values; a config with no rows/catField (or no walk)
  // yields an identity order, which captionAt then turns into `null` anyway.
  const anchors = (config.rows ?? []).map((r) =>
    String(r[config.catField ?? ""] ?? ""),
  );
  const caption = captionAt(config.beats, anchors, progress);

  // NO WALK ⇒ the exact element these wrappers rendered before this component existed.
  if (!caption)
    return <div style={{ width, height, background: C.bg }}>{children}</div>;

  const short = Math.min(width, height);
  const fontSize = Math.round(short * BAND.fontScale);
  const padding = Math.round(short * BAND.paddingScale);

  return (
    <div style={{ width, height, background: C.bg, position: "relative" }}>
      {children}
      <div
        data-testid="reveal-caption"
        style={{
          position: "absolute",
          left: padding,
          right: padding,
          // ABOVE the frame's source line, never over it. The first render of this band sat on
          // top of "Source: Riverton city open data" — the exact defect this repo already fixed
          // once for the x-axis title, and `sourceFooterReserve` is the answer it settled on.
          // Read from the same helper, at the same unscaled source type size, so a change to the
          // footer moves the caption with it.
          bottom: sourceFooterReserve(TYPE.source) * scale,
          // AUTO height, capped. The sentence is never cut: it wraps and the band grows with it,
          // up to the cap. This repo has already shipped a truncation that ate DATA (slope's
          // "Interm."), so silently clipping a journalist's own sentence is the one behaviour
          // this band may not have. What happens past the cap is settled at the render proof,
          // not guessed here.
          maxHeight: `${Math.round(BAND.maxHeightRatio * 100)}%`,
          overflow: "hidden",
          boxSizing: "border-box",
          padding: `${Math.round(padding * 0.7)}px ${padding}px`,
          borderRadius: Math.round(short * 0.012),
          // Derived from the ground, never a literal: the produce-time conformance guard judges
          // contrast against the REAL background since 2026-07-14, and a hard-coded card would
          // fail it on a house theme.
          background: C.bg,
          opacity: BAND.opacity,
          color: C.ink,
          fontFamily: FONT,
          fontSize,
          lineHeight: 1.35,
        }}
      >
        {caption.text}
      </div>
    </div>
  );
};
