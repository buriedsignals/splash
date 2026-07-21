// Single source of truth for map FURNITURE typography + colours (title / description /
// source). Mirrors chart-native's core/tokens.ts. Base px sizes are multiplied by the
// per-format `scale` from resolveMapFrame. The generic frame token set (distinct from
// theme/colors.ts, which holds the no-data colour).
//
// Theme/furniture derivation (FrameColors, FRAME_COLORS, resolveThemeBg, resolveFrameColors,
// DARK_FRAME_BG, FRAME_COLORS_DARK) lives in the shared core (lib/core/theme.ts) — re-exported
// here (bgIsDark as frameBgIsDark, the name every map-native call site uses) so every map-native
// component keeps its existing theme/map-tokens import unchanged.
import {
  type FrameColors,
  FRAME_COLORS,
  DARK_FRAME_BG,
  resolveThemeBg,
  bgIsDark,
  resolveFrameColors,
  FRAME_COLORS_DARK,
} from "../../../../lib/core/theme";
export {
  type FrameColors,
  FRAME_COLORS,
  DARK_FRAME_BG,
  resolveThemeBg,
  resolveFrameColors,
  FRAME_COLORS_DARK,
};
/** Is a resolved ground dark enough to want light chrome? (luminance < 0.4, false for null/light.) */
export const frameBgIsDark = bgIsDark;

export const FRAME_TYPE = { title: 22, description: 14, source: 12 } as const;
export const FRAME_FONT =
  'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
