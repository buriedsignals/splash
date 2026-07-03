// Monotonic-luminance sequential ramp (CVD-safe), 5 anchor steps, light→dark blue.
export const BLUES = ["#deebf7", "#9ecae1", "#4292c6", "#2171b5", "#084594"];
// Diverging CVD-safe (orange ↔ blue) around a midpoint.
export const DIVERGING = [
  "#b35806",
  "#f1a340",
  "#f7f7f7",
  "#92c5de",
  "#2166ac",
];

// Palette vocabulary — curated, CVD-safe ramps so a map's colour can be CHOSEN by
// SUBJECT + data semantic, not defaulted to blue for everything. Every ramp is a
// vetted, colour-blind-safe hex array (ColorBrewer-derived), 5 anchor steps, with
// monotonic luminance (sequential) or luminance rising toward both ends (diverging).
// Kind gates which ramps a given scaleType may use — the guardrail enforces the match.
export type PaletteKind = "sequential" | "diverging";

export interface PaletteEntry {
  name: string;
  kind: PaletteKind;
  ramp: string[];
}

// Sequential ramps: light → dark, one hue family. Choose by subject hue.
const SEQUENTIAL: Record<string, string[]> = {
  // water, generic cool magnitude
  blues: BLUES,
  // environment, forest, vegetation
  greens: ["#e5f5e0", "#a1d99b", "#41ab5d", "#238b45", "#005a32"],
  // energy, solar, heat, warmth (YlOrRd-like)
  oranges: ["#ffffb2", "#fed976", "#feb24c", "#f03b20", "#bd0026"],
  // politics-neutral magnitude, culture, social
  purples: ["#f2f0f7", "#cbc9e2", "#9e9ac8", "#756bb1", "#54278f"],
};

// Diverging ramps: dark → light → dark, around a meaningful midpoint. Choose by the
// pair of poles the story contrasts.
const DIVERGING_SET: Record<string, string[]> = {
  // temperature / anomaly — red = warm/high, blue = cool/low
  rdbu: ["#b2182b", "#ef8a62", "#f7f7f7", "#67a9cf", "#2166ac"],
  // orange ↔ blue (legacy default diverging)
  orbu: DIVERGING,
  // environment: brown (dry/deficit) ↔ teal (wet/surplus)
  brbg: ["#a6611a", "#dfc27d", "#f5f5f5", "#80cdc1", "#018571"],
  // purple ↔ orange — neutral signed contrast (e.g. change, gain/loss)
  puor: ["#b35806", "#f1a340", "#f7f7f7", "#998ec3", "#542788"],
};

export const PALETTES: Record<string, PaletteEntry> = {
  ...Object.fromEntries(
    Object.entries(SEQUENTIAL).map(([name, ramp]) => [
      name,
      { name, kind: "sequential" as const, ramp },
    ]),
  ),
  ...Object.fromEntries(
    Object.entries(DIVERGING_SET).map(([name, ramp]) => [
      name,
      { name, kind: "diverging" as const, ramp },
    ]),
  ),
};

// The library defaults — used when a config declares only a scaleType (back-compat).
export const DEFAULT_SEQUENTIAL = "blues";
export const DEFAULT_DIVERGING = "orbu";

// Every hex that appears in a vetted registry ramp — the CVD-safe allow-list the
// guardrail validates a custom ramp against (a custom ramp is CVD-safe iff all its
// colours are drawn from the vetted set).
export const VETTED_COLORS: Set<string> = new Set(
  Object.values(PALETTES).flatMap((p) => p.ramp.map((c) => c.toLowerCase())),
);

// A palette request: either a named registry palette, or a custom CVD-safe ramp.
export type PaletteRequest = string | string[];

export interface ResolvedPalette {
  ramp: string[];
  kind: PaletteKind;
  name: string | "custom";
}

// Resolve a palette by name or accept a custom ramp, gated by the scaleType so a
// sequential scale can never be painted with a diverging ramp (or vice versa).
// Falls back to the library default for the scaleType when no palette is requested.
export function resolvePalette(
  scaleType: PaletteKind,
  request?: PaletteRequest,
): ResolvedPalette {
  if (request === undefined) {
    const name =
      scaleType === "diverging" ? DEFAULT_DIVERGING : DEFAULT_SEQUENTIAL;
    return { ramp: PALETTES[name].ramp, kind: scaleType, name };
  }
  if (Array.isArray(request)) {
    if (request.length < 3)
      throw new Error(
        `custom palette needs at least 3 steps, got ${request.length}`,
      );
    return { ramp: request, kind: scaleType, name: "custom" };
  }
  const entry = PALETTES[request];
  if (!entry) throw new Error(`unknown palette "${request}"`);
  if (entry.kind !== scaleType)
    throw new Error(
      `palette "${request}" is ${entry.kind}, but scaleType is ${scaleType}`,
    );
  return { ramp: entry.ramp, kind: entry.kind, name: entry.name };
}

// A ramp is CVD-safe iff it is a known registry ramp OR every colour is drawn from
// the vetted colour set. Deterministic — no perceptual model at runtime; the vetting
// happened when the registry was curated.
export function isCvdSafeRamp(ramp: string[]): boolean {
  if (ramp.length < 3) return false;
  return ramp.every((c) => VETTED_COLORS.has(c.toLowerCase()));
}
