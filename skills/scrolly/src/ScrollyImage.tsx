// ScrollyImage — the image track's sticky graphic (spec §9). The current step drives
// an opacity CROSSFADE between consecutive prepped frames (all normalized to ONE box
// by image-native's prep, so the fade never "jumps"). Web-only: no MapTiler, no
// remotion. Every <img> carries its journalist-supplied alt (WCAG 1.1.1 — never
// generated), and `prefers-reduced-motion` degrades the fade to a HARD CUT (an
// opacity swap with no transition), the honest fallback for a motion-sensitive reader.
import React, { useEffect, useState } from "react";
import type { ImageStory } from "../../image-native/src/image-story";
import { deriveFurniture } from "../../chart-native/src/core/tokens";

export interface ImageScrollyConfig {
  visual: "image";
  /** the journalist-gated manifest (order, captions, alt, credits — spec §5) */
  story: ImageStory;
  /**
   * Build-time pointer to the prepped frames directory (frames/<id>.jpg). The scrolly
   * produce step inlines it into `frameSrcs`; kept for dev serving from disk.
   */
  framesDir?: string;
  /** Render-time frame sources, aligned 1:1 with story.frames (data URIs once built). */
  frameSrcs?: string[];
  /** newsroom house ground — the matte/scaffold theme (same model as the other tracks) */
  themeBg?: string;
  lang?: string;
  /** module source, surfaced by the scaffold's credit line (mirrors the other configs) */
  source?: { name: string; url?: string };
}

// The frame sources the renderer actually uses: inlined data URIs when the build
// provided them, else paths under framesDir (dev / folder-served bundle).
export function frameSources(config: ImageScrollyConfig): string[] {
  if (
    config.frameSrcs &&
    config.frameSrcs.length === config.story.frames.length
  )
    return config.frameSrcs;
  const dir = config.framesDir ?? "frames";
  return config.story.frames.map((f) => `${dir}/${f.id}.jpg`);
}

export const ScrollyImage: React.FC<{
  config: ImageScrollyConfig;
  /** the active FRAME index (the step's ref) */
  currentStep: number;
}> = ({ config, currentStep }) => {
  const frames = config.story.frames;
  const srcs = frameSources(config);
  const active = Math.min(Math.max(currentStep, 0), frames.length - 1);

  // prefers-reduced-motion → hard cut: the crossfade IS motion, so the transition is
  // dropped entirely (opacity still swaps — the sequence stays readable).
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const F = deriveFurniture(config.themeBg);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: F.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {frames.map((frame, i) => (
        <img
          key={frame.id}
          src={srcs[i]}
          alt={frame.alt}
          aria-hidden={i !== active}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            opacity: i === active ? 1 : 0,
            transition: reducedMotion ? "none" : "opacity 600ms ease-in-out",
          }}
        />
      ))}
    </div>
  );
};
