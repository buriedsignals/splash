// Shared reduced-motion detection — the single source of "does this reader want motion
// disabled" for every engine's animation-triggering code: chart-native's interactive
// intro reveal (core/InteractiveChart.tsx), scrolly's camera flights (scrolly-camera.ts)
// and image crossfade (ScrollyImage.tsx), map-native's interaction-triggered eases
// (LocatorMap.tsx cluster zoom). WCAG 2.3.3 (Animation from Interactions): non-essential
// motion triggered by scroll or interaction must be disableable via the OS-level
// `prefers-reduced-motion` setting — the reader still gets the information (the final
// state), just without the tween/flight/crossfade getting there.
//
// SSR/non-browser guarded — false (motion allowed) when window/matchMedia is unavailable
// (Remotion/Node render paths, which drive their own explicit per-frame progress and never
// call this; video is baked motion, exempt under WCAG 2.3.3's "essential" carve-out — see
// each producer's SKILL.md).
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
