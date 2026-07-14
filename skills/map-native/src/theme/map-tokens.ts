// Single source of truth for map FURNITURE typography + colours (title / description /
// source). Mirrors chart-native's core/tokens.ts. Base px sizes are multiplied by the
// per-format `scale` from resolveMapFrame. The generic frame token set (distinct from
// theme/colors.ts, which holds the no-data colour).
import { relativeLuminance } from "./house-ramp";

export const FRAME_TYPE = { title: 22, description: 14, source: 12 } as const;
export const FRAME_FONT =
  'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export interface FrameColors {
  pill: string; // backing behind web furniture, legible over the basemap
  ink: string; // title text
  muted: string; // description / source text
}

export const FRAME_COLORS: FrameColors = {
  pill: "rgba(255,255,255,0.92)", // backing behind web furniture, legible over any basemap
  ink: "#1a1a1a", // title text
  muted: "#5f5f5f", // description / source text
} as const;

// ── Arbitrary-background furniture derivation ────────────────────────────────────────────
// A newsroom `theme` is "light", "dark", or ANY #rrggbb ground (grey, navy, pink…). The map
// FURNITURE (pill/ink/muted) is DERIVED from that ground by contrast — never a hand-authored
// per-theme set — so the chrome always reads on whatever colour the newsroom picks. This mirrors
// chart-native's deriveFurniture: the theme adapts, it is not one of two presets.
//
// Honest scope: the BASEMAP itself stays the light/dark MapTiler style already chosen by
// `mapStyle` (raster/vector tiles can't take an arbitrary tint — a known constraint). Only the
// FURNITURE that overlays the basemap adapts to the branded ground. The `mapStyle` luminance and
// the `themeBg` luminance agree (the merge snaps both off the same ground), so a branded dark
// ground gets a dark basemap AND a branded-dark pill; a branded light ground, the reverse.
const PRESET_BG: Record<string, string> = { light: "#FFFFFF", dark: "#18181B" };
const HEX6 = /^#[0-9a-fA-F]{6}$/;

/** The dark PRESET ground — resolveFrameColors(DARK_FRAME_BG) reproduces the pre-generalization
 * dark furniture (pill rgba(24,24,27,0.82), ink #f4f4f5). The mapStyle-dark-without-themeBg path
 * (a per-element dark basemap with no house theme) resolves through this, so dark stays unchanged. */
export const DARK_FRAME_BG = "#18181B";

/** A `theme`/`themeBg` value (preset name or #rrggbb) → a background hex, or null for the light
 * default (→ caller keeps the byte-identical legacy light furniture). */
export function resolveThemeBg(themeBg?: string): string | null {
  if (!themeBg) return null;
  const t = themeBg.trim();
  const bg =
    PRESET_BG[t.toLowerCase()] ?? (HEX6.test(t) ? t.toUpperCase() : null);
  return !bg || bg === "#FFFFFF" ? null : bg;
}

function _rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function _hex(r: number, g: number, b: number): string {
  const h = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}
// Linear sRGB blend (t=0→a, t=1→b) — good enough for neutral furniture greys.
function _mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = _rgb(a);
  const [br, bg, bb] = _rgb(b);
  return _hex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}

/** Is a resolved ground dark enough to want light chrome? (luminance < 0.4, false for null/light.) */
export function frameBgIsDark(themeBg?: string): boolean {
  const bg = resolveThemeBg(themeBg);
  return bg != null && relativeLuminance(bg) < 0.4;
}
// WCAG contrast ratio between two hex colours (from their relative luminances).
function _contrast(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return la >= lb ? (la + 0.05) / (lb + 0.05) : (lb + 0.05) / (la + 0.05);
}

// The furniture set for an arbitrary ground. ink = the max-contrast foreground (near-black or
// near-white, whichever reads better on THIS ground — WCAG-correct at every luminance, mirroring
// chart-native's deriveFurniture); muted is ink mixed 22% toward the ground (still body-text legible
// on the pill, which reads as the ground); pill is the ground itself at 0.82 opacity — a translucent
// branded backing that reads over the (light/dark) basemap it overlays. Light (undefined / #FFFFFF /
// "light") short-circuits to the exact legacy FRAME_COLORS, keeping the untouched light furniture
// byte-identical.
export function resolveFrameColors(themeBg?: string): FrameColors {
  const bg = resolveThemeBg(themeBg);
  if (!bg) return FRAME_COLORS; // light default — legacy tokens, byte-identical
  // the softened extremes read best on clearly light/dark grounds (which they clear ≥ 4.5:1); on a
  // narrow mid-luminance band (grey ≈ #717171–#818181) the better softened extreme is only ~4.0:1,
  // so escalate to the PURE pole there (pure #000/#FFF clears ≥ 4.5:1 at every ground luminance) —
  // mirrors chart-native's deriveFurniture so map + chart furniture never ship illegible on a house
  // ground. Byte-identical for the dark preset (#18181B → #f4f4f5, which clears 4.5:1 comfortably).
  const softDark = _contrast("#1a1a1a", bg) >= _contrast("#f4f4f5", bg);
  let ink = softDark ? "#1a1a1a" : "#f4f4f5";
  if (_contrast(ink, bg) < 4.5) ink = softDark ? "#000000" : "#ffffff";
  const [r, g, b] = _rgb(bg);
  return {
    pill: `rgba(${r},${g},${b},0.82)`,
    ink,
    muted: _mix(ink, bg, 0.22),
  };
}

// The dark PRESET furniture, derived once — kept as a named export for back-references (the produce
// conformance guard, the conformance WCAG test). It is exactly resolveFrameColors(DARK_FRAME_BG):
// ink #f4f4f5 on pill rgba(24,24,27,0.82) = 16.12:1, muted ≈ #c4c4c5 = 10.1:1 (WCAG ≥ 4.5:1).
export const FRAME_COLORS_DARK: FrameColors = resolveFrameColors(DARK_FRAME_BG);
