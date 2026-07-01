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

// Dark-basemap variant — ink (#f4f4f5) on pill (#18181b) = 16.12:1, muted (#c4c4c8) = 10.19:1 (WCAG ≥4.5:1)
export const FRAME_COLORS_DARK = {
  pill: "rgba(24,24,27,0.82)", // dark translucent pill over dark basemap
  ink: "#f4f4f5", // near-white title text
  muted: "#c4c4c8", // subdued light text for description / source
} as const;
