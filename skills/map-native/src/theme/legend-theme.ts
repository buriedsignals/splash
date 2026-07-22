// legend-theme — single source for the themed ink/sub/background/stroke colours used by
// every on-map legend panel (Hex/Cartogram/DotDensity/Symbol/Locator). Extracted after these
// values were found duplicated across the components — HexGridMap/CartogramMap/DotDensityMap
// already agreed byte-for-byte; LocatorMap had DIVERGED (ink #333 vs #444, bg alpha 0.85 vs
// 0.92/0.88 light or 0.88 dark) — a latent inconsistency, not an intentional design choice.
// Unified to the 3-way canonical values; LocatorMap now conforms (render-verified, see
// task-1-report.md). Pure, framework-free — no React/MapTiler import.
import { resolveFrameColors, resolveThemeBg } from "./map-tokens";

export interface LegendTheme {
  ink: string;
  sub: string;
  bg: string;
  stroke: string;
}

// The swatch ring — theme-invariant (a faint dark hairline reads on both the light and dark
// legend panel). Kept as the single literal both the binary presets and the branded path use.
const LEGEND_STROKE = "rgba(0,0,0,.15)";

// `dark` (from the basemap `mapStyle`) picks the binary preset; `themeBg` (the newsroom's arbitrary
// house ground, set by the Foundation merge) — when present — themes the legend panel from that
// ground instead, so a coloured newsroom theme brands the legend chrome the same way it brands the
// MapFrame furniture (both route through resolveFrameColors). No themeBg → the exact canonical
// binary values (byte-identical; the untouched light/dark maps are unchanged).
export function legendTheme(
  dark: boolean,
  themeBg?: string,
  houseHue?: string,
): LegendTheme {
  if (resolveThemeBg(themeBg)) {
    const fc = resolveFrameColors(themeBg, houseHue);
    return { ink: fc.ink, sub: fc.muted, bg: fc.pill, stroke: LEGEND_STROKE };
  }
  return dark
    ? {
        ink: "#f4f4f5",
        sub: "#c8c8cf",
        bg: "rgba(24,24,27,0.88)",
        stroke: LEGEND_STROKE,
      }
    : {
        ink: "#444",
        sub: "#555",
        bg: "rgba(255,255,255,0.92)",
        stroke: LEGEND_STROKE,
      };
}
