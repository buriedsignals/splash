// Single source of truth for map FURNITURE typography + colours (title / description /
// source). Mirrors chart-native's core/tokens.ts. Base px sizes are multiplied by the
// per-format `scale` from resolveMapFrame. Distinct from theme/tokens.ts (the Water-Wars
// video motion brand) — this is the generic frame token set.
export const FRAME_TYPE = { title: 22, description: 14, source: 12 } as const;
export const FRAME_FONT =
  'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
export const FRAME_COLORS = {
  pill: "rgba(255,255,255,0.92)", // backing behind web furniture, legible over any basemap
  ink: "#1a1a1a", // title text
  muted: "#5f5f5f", // description / source text
} as const;
