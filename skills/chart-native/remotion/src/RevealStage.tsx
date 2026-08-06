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
import { captionAt, type CaptionClock } from "../../src/core/walk";
import { chartWalk, entranceOf } from "../../src/core/chart-walk";
import { themeColors, FONT, TYPE } from "../../src/core/tokens";
import { sourceFooterReserve } from "../../../../lib/core/text-fit";

/** What the stage needs off a chart config — the walk, and the ground its furniture derives from.
 *  Typed structurally rather than against one chart's Config, because every walk-capable type
 *  will pass its own. */
export type StageConfig = {
  beats?: readonly { text?: string; category?: string; x?: string }[];
  themeBg?: string;
  baseColor?: string;
  /** Loosely typed on purpose: 41 chart Configs pass through here and their row shapes differ
   *  (a bullet row carries a `number[]` of bands, a heatmap's cells are nested). The stage only
   *  ever reads ONE key of a row — the anchor field its type declares — so a narrower type would
   *  buy nothing and would make most Configs unassignable. */
  rows?: readonly Record<string, unknown>[];
};

/**
 * WHICH CLOCK this type's caption follows — read from the walk registry, never guessed.
 *
 * An anchored type has a per-subject entrance the sentence rides; a sequenced one has not, and its
 * beats share the timeline in equal parts. The anchored clock needs only the ENTRANCE and how many
 * subjects share it: beat k's subject enters at position k, because every anchored type permutes
 * its entrance into the walk's order (`walkEntryOrder`).
 *
 * ★ IT USED TO RESOLVE EACH BEAT'S SUBJECT through `config.rows`, and a rendered frame showed why
 * that was wrong: a lollipop's geometry SORTS its rows, so the index the caption computed was not
 * the position the component staggered on, and the sentence sat on another subject. Nothing but a
 * frame could have caught it.
 */
export function captionClock(
  nativeType: string | undefined,
  config: StageConfig,
): CaptionClock {
  const walk = nativeType ? chartWalk(nativeType) : undefined;
  // `accent` stages like a scrolly: the chart stands complete and the accent walks, so its steps
  // share the timeline equally — there is no entrance for a sentence to ride. Only `entrance`
  // reads the stagger schedule.
  if (!walk || walk.grain !== "entrance") return { grain: "sequenced" };
  return {
    grain: "entrance",
    entrance: entranceOf(nativeType!),
    count: (config.rows ?? []).length,
  };
}

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
  paddingScale: 0.035,
  /** the ground the band paints, over the chart's own */
  opacity: 0.92,
  /**
   * ★ THE BAND TAKES ITS SPACE FROM THE CHART, it does not sit ON it.
   *
   * The first version was an overlay, and the render showed the cost: it covered the category
   * labels — "Libéré dans les Alpes" was simply gone behind the sentence. A caption that hides the
   * name of the subject it is about is worse than no caption. So the chart is drawn into the
   * remaining height and the band lives below it.
   */
  reserveRatio: 0.2,
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
  /** The native type id (`"bar"`, `"pie"`, …) — what decides the caption's clock. Absent ⇒ the
   *  sequenced clock, which is what a hand-mounted composition with a walk should get rather than
   *  an entrance schedule invented for it. */
  nativeType?: string;
  children: React.ReactNode;
}> = ({ config, progress, width, height, scale = 1, nativeType, children }) => {
  const C = themeColors(config.themeBg, config.baseColor);

  // The clock this type actually renders on — anchored to its subjects' entrance, or the plain
  // sequence. One answer, read from the registry the component staggers from, never two.
  const caption = captionAt(
    config.beats,
    captionClock(nativeType, config),
    progress,
  );

  // NO WALK ⇒ the exact element these wrappers rendered before this component existed.
  if (!caption)
    return <div style={{ width, height, background: C.bg }}>{children}</div>;

  // The chart is re-sized into what the band leaves it. Done by cloning the single chart element
  // each wrapper passes, rather than by threading a height through all 41 of them.
  const bandBox = Math.round(height * BAND.reserveRatio);
  const chartHeight = height - bandBox;
  const sized = React.isValidElement(children)
    ? React.cloneElement(
        children as React.ReactElement<{ height?: number }>,
        { height: chartHeight },
      )
    : children;

  const short = Math.min(width, height);
  const fontSize = Math.round(short * BAND.fontScale);
  const padding = Math.round(short * BAND.paddingScale);

  return (
    <div style={{ width, height, background: C.bg, position: "relative" }}>
      {sized}
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
          // …and never taller than the room reserved for it, so it cannot climb back over the
          // chart's own labels the way the overlay version did.
          maxHeight: bandBox - sourceFooterReserve(TYPE.source) * scale,
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
