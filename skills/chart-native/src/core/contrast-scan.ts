// Pure decision layer for the render-time contrast guard (snap-contrast.mjs): given
// a text fill and the background colours sampled behind it, report the WORST WCAG
// contrast and whether it violates the 4.5:1 floor. Worst-case is deliberate — a
// label straddling two stacked segments must clear contrast on BOTH.
//
// The primitives (thresholds + worstContrast/isContrastViolation/wcagMinContrast) live
// in the shared core (lib/core/contrast.ts) — re-exported here so the render-snap
// consumers (snap-contrast.mjs, snap-interactive-contrast.mjs, snap-tooltip-contrast.mjs)
// keep their existing contrast-scan import unchanged, mirroring core/tokens.ts's shim
// of lib/core/theme.
import {
  MIN_CONTRAST,
  LARGE_TEXT_CONTRAST,
  LARGE_TEXT_NORMAL_PX,
  LARGE_TEXT_BOLD_PX,
  wcagMinContrast,
  worstContrast,
  isContrastViolation,
} from "../../../../lib/core/contrast";
export {
  MIN_CONTRAST,
  LARGE_TEXT_CONTRAST,
  LARGE_TEXT_NORMAL_PX,
  LARGE_TEXT_BOLD_PX,
  wcagMinContrast,
  worstContrast,
  isContrastViolation,
};
