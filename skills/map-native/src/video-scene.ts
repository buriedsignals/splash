// video-scene.ts — the shared two-scene model for map videos. Every map video opens
// on a full-screen title-card scene (from frame 0), then crossfades to the map scene
// (map + MapFrame furniture). resolveScene returns the complementary opacities so the
// title card fades out exactly as the furniture fades in. Pure, frame-deterministic.
import { interpolate, Easing } from "remotion";

export const TITLE_SCENE_FRAMES = 75; // ~2.5s @ 30fps — matches the storytelling title hold
export const CROSSFADE_FRAMES = 12; // ~0.4s @ 30fps

export function resolveScene(
  frame: number,
  opts: { titleSceneEndFrame: number; crossfadeFrames?: number },
): { titleOpacity: number; furnitureOpacity: number } {
  const cf = opts.crossfadeFrames ?? CROSSFADE_FRAMES;
  const start = opts.titleSceneEndFrame - cf;
  const titleOpacity = interpolate(
    frame,
    [start, opts.titleSceneEndFrame],
    [1, 0],
    {
      easing: Easing.inOut(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  return { titleOpacity, furnitureOpacity: 1 - titleOpacity };
}
