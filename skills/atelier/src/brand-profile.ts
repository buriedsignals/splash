// F2 — NEWSROOM BRAND PROFILE (house style, first cut: colours only).
//
// A small newsroom won't publish off-brand charts, so on-brand output is close to
// essential for adoption. Atelier's default is auto-colour (subject-fit Okabe-Ito);
// this adds an OPT-IN house palette, set once per project (mirroring the fly.io
// "install 1× puis boucle" model). Colours only in this cut — fonts/logo deferred.
//
// The hard part is brand × a11y: a house colour may not be CVD-safe. Policy (b),
// brand-first + warning (decided): the brand colour is applied AS CHOSEN and marked
// `brandExplicit`, so the produce-time a11y guards downgrade a CVD/contrast failure
// to a render-review concern instead of rewriting the colour or hard-failing. Absent
// or invalid brand.json → null → today's auto path, unchanged.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface BrandProfile {
  /** ordered brand hues (#rrggbb); palette[0] is the primary house colour */
  palette: string[];
  /** optional accent hue (#rrggbb) */
  accent?: string;
}

const HEX = /^#[0-9a-fA-F]{6}$/;

/**
 * Parse + validate a brand.json string. Returns null when it is malformed or has no
 * usable palette (so the caller falls back to the auto subject-fit path). Non-hex
 * palette entries are dropped rather than failing the whole profile. Pure.
 */
export function parseBrandProfile(text: string): BrandProfile | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const palette = Array.isArray(o.palette)
    ? o.palette.filter((c): c is string => typeof c === "string" && HEX.test(c))
    : [];
  if (palette.length === 0) return null; // no usable house colour → treat as no profile
  const accent =
    typeof o.accent === "string" && HEX.test(o.accent) ? o.accent : undefined;
  return accent ? { palette, accent } : { palette };
}

/**
 * Load the per-project brand profile (`<projectDir>/brand.json`). Missing file →
 * null (today's auto behaviour, unchanged). Any read/parse problem → null (never
 * throws — a broken brand file must not break production).
 */
export function loadBrandProfile(projectDir: string): BrandProfile | null {
  const path = join(projectDir, "brand.json");
  if (!existsSync(path)) return null;
  try {
    return parseBrandProfile(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Seed a producer spec's colour from the brand palette and mark it brandExplicit —
 * the thread `brand.json → spec → the produce guards` (policy b). The spec keeps an
 * already-chosen baseColor; otherwise it takes the primary house hue. `brandExplicit`
 * is set ONLY when the resulting colour is a genuine house colour (in the palette or
 * the accent) — so an auto subject-fit colour never gains the a11y bypass. Pure.
 */
export function seedBrandColor<
  T extends { baseColor?: string; brandExplicit?: boolean },
>(spec: T, brand: BrandProfile): T {
  const baseColor = spec.baseColor ?? brand.palette[0];
  const isHouseColour =
    brand.palette.includes(baseColor) || brand.accent === baseColor;
  return { ...spec, baseColor, brandExplicit: isHouseColour };
}
