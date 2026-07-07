// legend-theme — single source for the themed ink/sub/background/stroke colours used by
// every on-map legend panel (Hex/Cartogram/DotDensity/Symbol/Locator). Extracted after these
// values were found duplicated across the components — HexGridMap/CartogramMap/DotDensityMap
// already agreed byte-for-byte; LocatorMap had DIVERGED (ink #333 vs #444, bg alpha 0.85 vs
// 0.92/0.88 light or 0.88 dark) — a latent inconsistency, not an intentional design choice.
// Unified to the 3-way canonical values; LocatorMap now conforms (render-verified, see
// task-1-report.md). Pure, framework-free — no React/MapTiler import.
export interface LegendTheme {
  ink: string;
  sub: string;
  bg: string;
  stroke: string;
}

export function legendTheme(dark: boolean): LegendTheme {
  return dark
    ? {
        ink: "#f4f4f5",
        sub: "#c8c8cf",
        bg: "rgba(24,24,27,0.88)",
        stroke: "rgba(0,0,0,.15)",
      }
    : {
        ink: "#444",
        sub: "#555",
        bg: "rgba(255,255,255,0.92)",
        stroke: "rgba(0,0,0,.15)",
      };
}
