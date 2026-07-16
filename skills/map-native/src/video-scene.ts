// video-scene.ts — the shared two-scene model for map videos. Every map video opens
// on a full-screen title-card scene (from frame 0), then crossfades to the map scene
// (map + MapFrame furniture). resolveScene returns the complementary opacities so the
// title card fades out exactly as the furniture fades in. Pure, frame-deterministic.
import { interpolate, Easing } from "remotion";

// Constants live in scene-constants.ts (runtime-free — see that file's header); re-exported
// here so the 20+ video components keep their historical `from "../video-scene"` import.
export { TITLE_SCENE_FRAMES, CROSSFADE_FRAMES } from "./scene-constants";
import { CROSSFADE_FRAMES } from "./scene-constants";

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
