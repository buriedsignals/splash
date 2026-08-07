// Shared theme derivation — the single source of "arbitrary background → legible furniture"
// for every engine. Previously duplicated as chart-native's `deriveFurniture` (chart furniture:
// line/head/headGlow/ink/muted/axis/grid/bg) and map-native's `resolveFrameColors` (map frame
// furniture: pill/ink/muted) — same ink-picking algorithm, two different output shapes for two
// different rendering contexts. Both now live here; each engine's tokens module re-exports.
import { relativeLuminance, contrastRatio, MIN_CONTRAST } from "./contrast";
import { hexToOklch, oklchToHex } from "./house-ramp";

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

const TINT_CHROMA = 0.03; // OKLCH chroma of a tinted neutral — a whisper of the house hue, not a colour.
//                            Render-proof knob (spec §5): low enough to read as grey, enough to cohere.

// A tinted neutral: the input grey's OWN OKLCH lightness, re-hued to the house hue at a low chroma.
// Lightness (hence luminance-based WCAG contrast) is preserved — the grey keeps its a11y role, it just
// stops being dead-neutral. Returns the grey unchanged when houseHue is not a #rrggbb.
export function tintNeutral(
  greyHex: string,
  houseHue: string,
  chroma = TINT_CHROMA,
): string {
  if (!/^#[0-9a-f]{6}$/i.test(houseHue.trim())) return greyHex;
  return oklchToHex({
    L: hexToOklch(greyHex).L,
    C: chroma,
    h: hexToOklch(houseHue).h,
  });
}

// THE SECONDARY TEXT IS SOFTENED AS FAR AS THE GROUND ALLOWS, AND NO FURTHER.
//
// `muted` (subtitle / source / axis label) is `ink` mixed part of the way toward the ground: the
// further it goes, the more clearly it reads as secondary, and the closer it comes to the WCAG
// text floor. Both derivations below used a FIXED fraction, and a fixed fraction is a promise
// about a ground nobody measured. On the saturated band a real newsroom actually uses it broke:
// a house green #0A5C36 came out at 4.47:1 — under the floor — so the chart producer refused a
// ground whose title text reads at 7.36:1. The colour was fine; the fraction was.
//
// So the fraction is now the LARGEST one this ground can carry: it starts at the intended value
// and backs off only when that value would ship illegible text. Every ground on which the
// intended fraction already clears the floor is byte-identical — the walk cannot run there — so
// nothing that produces today changes colour.
//
// MUTED_MIN_BLEND is what keeps this a derivation and not a loophole. Without a floor the search
// would walk `muted` all the way onto `ink` and call any ground legible, which is how a guard
// stops guarding: a mid-grey #717171 would "pass" with secondary text indistinguishable from the
// title. At 0.15 the role survives (still visibly softer) and the grounds that genuinely cannot
// carry text still fail loud — #717171 tops out at 4.06:1 and #8A6D3B at 4.01:1, both refused.
const MUTED_MIN_BLEND = 0.15;
const MUTED_BLEND_STEP = 0.01;

function softenedMuted(
  ink: string,
  bg: string,
  start: number,
  houseHue?: string,
): string {
  // The tint is applied INSIDE the search, not after it: `tintNeutral` preserves OKLCH lightness,
  // not WCAG luminance, so a tinted grey lands a little either side of the untinted one (the same
  // green measured 4.47:1 plain and 4.37:1 tinted). Measuring the value that is not painted is
  // the whole defect this file is repairing, one level up.
  const shade = (t: number): string => {
    const m = _mix(ink, bg, t);
    return houseHue !== undefined ? tintNeutral(m, houseHue) : m;
  };
  const steps = Math.round((start - MUTED_MIN_BLEND) / MUTED_BLEND_STEP);
  for (let i = 0; i <= steps; i++) {
    const candidate = shade(start - i * MUTED_BLEND_STEP);
    if (contrastRatio(candidate, bg) >= MIN_CONTRAST) return candidate;
  }
  return shade(MUTED_MIN_BLEND);
}

/** `theme.dark` predicate for a resolved bg — a ground darker than mid-grey wants light chrome. */
export function bgIsDark(bg?: string): boolean {
  const b = resolveThemeBg(bg);
  return b != null && relativeLuminance(b) < 0.4;
}

// The chart furniture set for an arbitrary background. ink = the max-contrast foreground (near-
// black or near-white, whichever reads better on THIS ground); muted is mixed toward the bg —
// 30% wherever 30% still clears the text floor, and no further than the ground allows
// (softenedMuted above); axis/grid are faint hairlines (mixed most of the way to the bg).
// `line` (the default series when no subject-fit baseColor is set) picks the Okabe-Ito blue vs
// skyblue that clears the 3:1 non-text bar on this ground.
export function deriveFurniture(bg?: string, houseHue?: string): ColorTokens {
  const b = resolveThemeBg(bg);
  const tint =
    houseHue !== undefined && /^#[0-9a-f]{6}$/i.test(houseHue.trim());
  if (!b) {
    // light default — legacy COLORS, byte-identical WITHOUT a house hue; tinted greys WITH one.
    if (!tint) return COLORS;
    return {
      ...COLORS,
      muted: tintNeutral(COLORS.muted, houseHue!),
      axis: tintNeutral(COLORS.axis, houseHue!),
      grid: tintNeutral(COLORS.grid, houseHue!),
    };
  }
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
  // muted is de-emphasized secondary text (subtitle/source/axis labels) that must still clear the
  // 4.5:1 WCAG text floor. 30% toward the ground keeps it clearly softer than ink — and this
  // comment used to claim 30% cleared 4.5:1 "on every real house ground". It does not: the number
  // it cites, ~4.47:1, is what 30% ACTUALLY produces on a saturated house green (#0A5C36), and it
  // is under the floor, so the chart producer refused a colour whose title reads at 7.36:1.
  // `softenedMuted` now backs the fraction off only where 30% would ship illegible text, so every
  // ground that produced before is byte-identical; a genuinely illegible mid-grey still fails
  // (4.02:1 at the floor), which the produce guard surfaces — and lib/loop/ground.ts turns into a
  // question the newsroom can answer rather than a wall.
  const muted0 = softenedMuted(fg, b, 0.3, tint ? houseHue : undefined);
  const axis0 = _mix(fg, b, 0.72);
  const grid0 = _mix(fg, b, 0.86);
  return {
    line,
    head: "#FFFFFF",
    headGlow: line,
    ink: fg,
    muted: muted0,
    axis: tint ? tintNeutral(axis0, houseHue!) : axis0,
    grid: tint ? tintNeutral(grid0, houseHue!) : grid0,
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
export function resolveFrameColors(
  themeBg?: string,
  houseHue?: string,
): FrameColors {
  const tint =
    houseHue !== undefined && /^#[0-9a-f]{6}$/i.test(houseHue.trim());
  const bg = resolveThemeBg(themeBg);
  if (!bg) {
    // light default — legacy tokens, byte-identical WITHOUT a house hue; tinted muted WITH one
    if (!tint) return FRAME_COLORS;
    return {
      ...FRAME_COLORS,
      muted: tintNeutral(FRAME_COLORS.muted, houseHue!),
    };
  }
  const softDark = contrastRatio("#1a1a1a", bg) >= contrastRatio("#f4f4f5", bg);
  let ink = softDark ? "#1a1a1a" : "#f4f4f5";
  if (contrastRatio(ink, bg) < 4.5) ink = softDark ? "#000000" : "#ffffff";
  const [r, g, b] = _rgb(bg);
  // Same rule as the chart furniture above, against this frame's own reference — the GROUND. The
  // map's produce guard measures the harder question (the same text on the translucent pill, once
  // it is composited over the basemap the config pins, lib/core/ground.ts) and stays the authority
  // there; softening no further than the ground allows is what keeps that check about the pill.
  const muted = softenedMuted(ink, bg, 0.22, tint ? houseHue : undefined);
  return { pill: `rgba(${r},${g},${b},0.82)`, ink, muted };
}

// The dark PRESET furniture, derived once — kept as a named export for back-references (the produce
// conformance guard, the conformance WCAG test). It is exactly resolveFrameColors(DARK_FRAME_BG):
// ink #f4f4f5 on pill rgba(24,24,27,0.82) = 16.12:1, muted ≈ #c4c4c5 = 10.1:1 (WCAG ≥ 4.5:1).
export const FRAME_COLORS_DARK: FrameColors = resolveFrameColors(DARK_FRAME_BG);
