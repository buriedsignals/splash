// core/house-ramp — derive a newsroom HOUSE colour into map-appropriate colour: a
// sequential RAMP (choropleth / hex-grid / cartogram) and the a11y helpers that let it
// pass validation and flag a low-contrast single fill. A house ramp is a monotonic-
// LUMINANCE ramp of the house hue — CVD-safe by construction (colour-blind readers
// separate sequential bins by lightness), so it needs no whitelist waiver. Pure,
// dependency-free (hand-rolled sRGB↔OKLab, Björn Ottosson's matrices).
//
// Previously map-native-local (skills/map-native/src/theme/house-ramp.ts), reached
// into cross-engine by map-dw and scrolly via an import-guard allowlist exception —
// moved here so those engines import a shared primitive from lib/core like every other
// one, and the exception could be removed. map-native/src/theme/house-ramp.ts is now a
// thin re-export shim (its own in-engine importers — choropleth-geo, hex-grid-geo,
// SymbolMap/RouteMap and their Scrolly/Reveal/Story siblings, map-produce-conformance,
// theme/scale — keep importing the local path unchanged).
//
// relativeLuminance (WCAG contrast purpose) comes from lib/core/contrast.ts — imported
// but deliberately NOT re-exported here (core/contrast's own barrel export already
// covers it; re-exporting the same name from two core modules via `export *` in
// index.ts would collide). srgbToLinear below is UNCHANGED from the pre-move file and
// stays local — it is a different concern (the OKLab colourspace round-trip used by
// houseRamp/houseRouteAccent's hue math), not a duplicate of the WCAG luminance calc.

import { relativeLuminance } from "./contrast";

function parseHex(hex: string): [number, number, number] {
  const h = hex.trim().replace(/^#/, "");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

// sRGB 0-255 → linear-light 0-1 (WCAG / OKLab share this transfer function).
function srgbToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function linearToByte(c: number): number {
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
  return Math.round(clamp01(v) * 255);
}

function toHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("")
      .toLowerCase()
  );
}

interface Oklch {
  L: number;
  C: number;
  h: number;
}

function hexToOklch(hex: string): Oklch {
  const [r8, g8, b8] = parseHex(hex);
  const r = srgbToLinear(r8);
  const g = srgbToLinear(g8);
  const b = srgbToLinear(b8);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { L, C: Math.hypot(A, B), h: Math.atan2(B, A) };
}

function oklchToHex({ L, C, h }: Oklch): string {
  const A = C * Math.cos(h);
  const B = C * Math.sin(h);
  const l_ = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m_ = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s_ = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const r = 4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_;
  const g = -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_;
  const b = -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_;
  return toHex(linearToByte(r), linearToByte(g), linearToByte(b));
}

// A sequential ramp of `n` stops (light → dark) that keeps the house HUE and ramps OKLab
// lightness monotonically from a light tint down to a full-chroma shade — so it reads as the
// newsroom colour and is CVD-safe (monotonic luminance). Matches the registry ramps' light→dark
// orientation (theme/scale.ts BLUES).
export function houseRamp(hex: string, n = 5): string[] {
  const base = hexToOklch(hex);
  const L_LIGHT = 0.95;
  const L_DARK = 0.32;
  const C_LIGHT = 0.03;
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 1 : i / (n - 1);
    const L = L_LIGHT + (L_DARK - L_LIGHT) * t;
    const C = C_LIGHT + (base.C - C_LIGHT) * t;
    out.push(oklchToHex({ L, C, h: base.h }));
  }
  return out;
}

// Strictly monotonic in relative luminance (increasing OR decreasing) — the real CVD-safety
// criterion for a SEQUENTIAL ramp, and what lets a derived house ramp pass validation without
// the registry whitelist.
export function isMonotonicLuminanceRamp(ramp: string[]): boolean {
  if (ramp.length < 2) return false;
  const lum = ramp.map(relativeLuminance);
  let inc = true;
  let dec = true;
  for (let i = 1; i < lum.length; i++) {
    if (!(lum[i]! > lum[i - 1]!)) inc = false;
    if (!(lum[i]! < lum[i - 1]!)) dec = false;
  }
  return inc || dec;
}

function contrastRatio(l1: number, l2: number): number {
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

// Approximate luminance of the DATAVIZ basemap the fill sits on.
const BASEMAP_LUMINANCE = { light: 0.85, dark: 0.1 } as const;

// Does a single house FILL clear the WCAG 1.4.11 non-text 3:1 contrast against the (light|dark)
// basemap? Used only to RAISE a review concern (policy b keep-and-review), never to reject.
export function contrastOk(fill: string, dark: boolean): boolean {
  const ref = dark ? BASEMAP_LUMINANCE.dark : BASEMAP_LUMINANCE.light;
  return contrastRatio(relativeLuminance(fill), ref) >= 3;
}

// ── Single-hue map fill (symbol maps, univariate dot-density) ──────────────────────────────
// The default single fill when no newsroom house hue is set — a CVD-safe mid blue (the mid stop
// of theme/scale BLUES). THE ONE place this literal lives; every single-hue renderer imports it
// / houseFill and never re-declares the hex at a call site.
export const DEFAULT_MAP_FILL = "#2171b5";

// Resolve the single fill a single-hue map paints: the newsroom house hue when set (policy b —
// applied AS CHOSEN; a low-contrast one is KEPT and only RAISES a produce-time review concern,
// never rewritten), else the CVD-safe default. An EXPLICIT per-element colour is resolved by the
// caller before this (house is the default, not an override of an explicit choice).
export function houseFill(brandHue?: string): string {
  return brandHue ?? DEFAULT_MAP_FILL;
}

// Derive the route line + glow (+ animated head/head-glow) from the newsroom house hue. The LINE
// is the house hue itself; the GLOW / HEAD-GLOW are lighter tints (higher OKLab lightness, lower
// chroma) that read as a soft halo, and the HEAD (the leading draw dot) is brightened on a dark
// basemap / deepened on a light one — mirroring the hand-tuned ELECTRIC pairs' light/dark logic.
// The page `bg` is NOT branded (the caller keeps its neutral value). Policy b: applied as chosen;
// a low-contrast house line raises a review concern, it is never swapped.
export function houseRouteAccent(
  hex: string,
  dark: boolean,
): { line: string; glow: string; head: string; headGlow: string } {
  const base = hexToOklch(hex);
  const lift = (dL: number, cScale: number): string =>
    oklchToHex({ L: clamp01(base.L + dL), C: base.C * cScale, h: base.h });
  return dark
    ? {
        line: hex,
        glow: lift(0.24, 0.8),
        head: lift(0.5, 0.25),
        headGlow: lift(0.4, 0.5),
      }
    : {
        line: hex,
        glow: lift(0.16, 0.9),
        head: lift(-0.14, 1),
        headGlow: lift(0.34, 0.7),
      };
}
