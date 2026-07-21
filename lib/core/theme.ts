// Shared theme derivation — the single source of "arbitrary background → legible furniture"
// for every engine. Previously duplicated as chart-native's `deriveFurniture` (chart furniture:
// line/head/headGlow/ink/muted/axis/grid/bg) and map-native's `resolveFrameColors` (map frame
// furniture: pill/ink/muted) — same ink-picking algorithm, two different output shapes for two
// different rendering contexts. Both now live here; each engine's tokens module re-exports.
import { relativeLuminance, contrastRatio } from "./contrast";

// ── Chart furniture (chart-native) ────────────────────────────────────────────

export type ColorTokens = {
  readonly line: string;
  readonly head: string;
  readonly headGlow: string;
  readonly ink: string;
  readonly muted: string;
  readonly axis: string;
  readonly grid: string;
  readonly bg: string;
};

export const COLORS: ColorTokens = {
  line: "#0072B2",
  head: "#FFFFFF",
  headGlow: "#0072B2",
  ink: "#1A1A1A", // WCAG ≥ 4.5:1 on white
  muted: "#6B6B6B",
  grid: "#E6E6E6",
  axis: "#CFCFCF",
  bg: "#FFFFFF",
} as const;

// Okabe-Ito blue/skyblue — the two `line` candidates deriveFurniture picks between by contrast
// against the ground. Inlined (not imported from chart-native's OKABE_ITO palette) to avoid a
// core→engine import cycle; palette extraction is a separate, later concern.
const LINE_BLUE = "#0072B2";
const LINE_SKYBLUE = "#56B4E9";

// ── Map frame furniture (map-native) ──────────────────────────────────────────

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

// ── Arbitrary-background derivation (shared) ──────────────────────────────────
// A newsroom `theme` is "light", "dark", or ANY #rrggbb ground (grey, navy, pink…). Furniture is
// DERIVED from that ground by contrast — never a hand-authored per-theme set — so the chrome
// always reads on whatever colour the newsroom picks. Light (#FFFFFF / undefined) short-circuits
// to the exact legacy tokens, keeping the untouched light path byte-identical.
const PRESET_BG: Record<string, string> = { light: "#FFFFFF", dark: "#18181B" };
export const HEX6 = /^#[0-9a-fA-F]{6}$/;

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

/** `theme.dark` predicate for a resolved bg — a ground darker than mid-grey wants light chrome. */
export function bgIsDark(bg?: string): boolean {
  const b = resolveThemeBg(bg);
  return b != null && relativeLuminance(b) < 0.4;
}

// The chart furniture set for an arbitrary background. ink = the max-contrast foreground (near-
// black or near-white, whichever reads better on THIS ground); muted is mixed 30% toward the bg
// (still body-text legible); axis/grid are faint hairlines (mixed most of the way to the bg).
// `line` (the default series when no subject-fit baseColor is set) picks the Okabe-Ito blue vs
// skyblue that clears the 3:1 non-text bar on this ground.
export function deriveFurniture(bg?: string): ColorTokens {
  const b = resolveThemeBg(bg);
  if (!b) return COLORS; // light default — legacy tokens, byte-identical
  // pick the ink WCAG-correctly at every luminance: a mid-luminance house ground (grey) picks the
  // BETTER of near-black/near-white, not a fixed <0.4 flip that could pick the worse one. Byte-
  // identical for the presets: #FFFFFF → near-black, #18181B → near-white.
  const softDark = contrastRatio("#1A1A1A", b) >= contrastRatio("#F4F4F5", b);
  // the softened extremes read best on clearly light/dark grounds (which they clear ≥ 4.5:1), but a
  // narrow mid-luminance band (grey ≈ #717171–#818181) leaves the better softened extreme at only
  // ~4.0:1 — below the WCAG text floor. Escalate to the PURE pole there (pure #000/#FFF clears
  // ≥ 4.5:1 at EVERY ground luminance), so primary text never ships illegible on any house ground.
  let fg = softDark ? "#1A1A1A" : "#F4F4F5";
  if (contrastRatio(fg, b) < 4.5) fg = softDark ? "#000000" : "#FFFFFF";
  const line =
    relativeLuminance(LINE_BLUE) < relativeLuminance(b)
      ? LINE_BLUE
      : LINE_SKYBLUE;
  return {
    line,
    head: "#FFFFFF",
    headGlow: line,
    ink: fg,
    // muted is de-emphasized secondary text (subtitle/source/axis labels) that must still clear the
    // 4.5:1 WCAG text floor. 30% toward the ground keeps it clearly softer than ink yet ≥ 4.5:1 with
    // margin on every real house ground (incl. saturated dark blues/greens where 0.38 dipped to
    // ~4.47:1); a genuinely illegible mid-grey ground still fails (muted ~3.7:1), which the produce
    // guard surfaces so the newsroom picks a legible ground rather than shipping unreadable text.
    muted: _mix(fg, b, 0.3),
    axis: _mix(fg, b, 0.72),
    grid: _mix(fg, b, 0.86),
    bg: b,
  };
}

// The dark PRESET furniture, derived once — kept as a named export for back-references (the a11y
// test, the heatmap produce guard). It is exactly deriveFurniture("#18181B").
export const COLORS_DARK: ColorTokens = deriveFurniture("#18181B");

// The map frame furniture set for an arbitrary ground. ink = the max-contrast foreground (near-
// black or near-white, whichever reads better on THIS ground — WCAG-correct at every luminance,
// mirroring deriveFurniture above); muted is ink mixed 22% toward the ground (still body-text
// legible on the pill, which reads as the ground); pill is the ground itself at 0.82 opacity — a
// translucent branded backing that reads over the (light/dark) basemap it overlays. Light
// (undefined / #FFFFFF / "light") short-circuits to the exact legacy FRAME_COLORS, keeping the
// untouched light furniture byte-identical.
export function resolveFrameColors(themeBg?: string): FrameColors {
  const bg = resolveThemeBg(themeBg);
  if (!bg) return FRAME_COLORS; // light default — legacy tokens, byte-identical
  // the softened extremes read best on clearly light/dark grounds (which they clear ≥ 4.5:1); on a
  // narrow mid-luminance band (grey ≈ #717171–#818181) the better softened extreme is only ~4.0:1,
  // so escalate to the PURE pole there (pure #000/#FFF clears ≥ 4.5:1 at every ground luminance) —
  // mirrors deriveFurniture so map + chart furniture never ship illegible on a house ground.
  // Byte-identical for the dark preset (#18181B → #f4f4f5, which clears 4.5:1 comfortably).
  const softDark = contrastRatio("#1a1a1a", bg) >= contrastRatio("#f4f4f5", bg);
  let ink = softDark ? "#1a1a1a" : "#f4f4f5";
  if (contrastRatio(ink, bg) < 4.5) ink = softDark ? "#000000" : "#ffffff";
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
