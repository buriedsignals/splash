// Design tokens — Okabe-Ito colourblind-safe set (design-conformance.md).
// #0072B2 is the default single-series colour. ≤2 colours.

export const OKABE_ITO = {
  blue: "#0072B2",
  orange: "#E69F00",
  green: "#009E73",
  vermillion: "#D55E00",
  purple: "#CC79A7",
  skyblue: "#56B4E9",
  yellow: "#F0E442",
  black: "#000000",
} as const;

export const COLORS = {
  line: OKABE_ITO.blue,
  head: "#FFFFFF",
  headGlow: OKABE_ITO.blue,
  ink: "#1A1A1A", // WCAG ≥ 4.5:1 on white
  muted: "#6B6B6B",
  grid: "#E6E6E6",
  axis: "#CFCFCF",
  bg: "#FFFFFF",
} as const;

// ── Arbitrary-background theme derivation ────────────────────────────────────────────
// A newsroom `theme` is "light", "dark", or ANY #rrggbb background (grey, pink, navy…). The
// FURNITURE (ink/muted/axis/grid/line) is DERIVED from that ground by contrast — never a
// hand-authored per-theme set — so the chrome always reads, on whatever colour the newsroom
// picks. Light (#FFFFFF / undefined) short-circuits to the exact legacy COLORS, keeping the
// untouched light path byte-identical. This mirrors the maps' principle (subject/house-derived,
// no hardcoded hue): the theme adapts, it is not one of two presets.
export type ColorTokens = { readonly [K in keyof typeof COLORS]: string };

const PRESET_BG: Record<string, string> = { light: "#FFFFFF", dark: "#18181B" };
const HEX6 = /^#[0-9a-fA-F]{6}$/;

/** A `theme` value (preset name or #rrggbb) → a background hex, or null for the light default
 * (→ caller keeps the byte-identical legacy light path). */
export function resolveThemeBg(theme?: string): string | null {
  if (!theme) return null;
  const t = theme.trim();
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
// WCAG relative luminance (inlined to avoid a tokens↔conformance import cycle).
function _lum(hex: string): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = _rgb(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
/** `theme.dark` predicate for a resolved bg — a ground darker than mid-grey wants light chrome. */
export function bgIsDark(bg?: string): boolean {
  const b = resolveThemeBg(bg);
  return b != null && _lum(b) < 0.4;
}
// WCAG contrast ratio between two hex colours (from their relative luminances).
function _contrast(a: string, b: string): number {
  const la = _lum(a);
  const lb = _lum(b);
  return la >= lb ? (la + 0.05) / (lb + 0.05) : (lb + 0.05) / (la + 0.05);
}

// The furniture set for an arbitrary background. ink = the max-contrast foreground (near-black or
// near-white, whichever reads better on THIS ground); muted is mixed 38% toward the bg (still
// body-text legible); axis/grid are faint hairlines (mixed most of the way to the bg). `line` (the
// default series when no subject-fit baseColor is set) picks the Okabe-Ito blue vs skyblue that
// clears the 3:1 non-text bar on this ground.
export function deriveFurniture(bg?: string): ColorTokens {
  const b = resolveThemeBg(bg);
  if (!b) return COLORS; // light default — legacy tokens, byte-identical
  // pick the ink WCAG-correctly at every luminance: a mid-luminance house ground (grey) picks the
  // BETTER of near-black/near-white, not a fixed <0.4 flip that could pick the worse one. Byte-
  // identical for the presets: #FFFFFF → near-black, #18181B → near-white.
  const softDark = _contrast("#1A1A1A", b) >= _contrast("#F4F4F5", b);
  // the softened extremes read best on clearly light/dark grounds (which they clear ≥ 4.5:1), but a
  // narrow mid-luminance band (grey ≈ #717171–#818181) leaves the better softened extreme at only
  // ~4.0:1 — below the WCAG text floor. Escalate to the PURE pole there (pure #000/#FFF clears
  // ≥ 4.5:1 at EVERY ground luminance), so primary text never ships illegible on any house ground.
  let fg = softDark ? "#1A1A1A" : "#F4F4F5";
  if (_contrast(fg, b) < 4.5) fg = softDark ? "#000000" : "#FFFFFF";
  const line =
    _lum(OKABE_ITO.blue) < _lum(b) ? OKABE_ITO.blue : OKABE_ITO.skyblue;
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

// On the dark furniture bg (#18181B) the Okabe-Ito BLACK entry of a DATA palette
// vanishes (near-0 contrast — a black mark on a near-black ground). Every other
// Okabe-Ito hue stays CVD-safe and reads acceptably on dark, so ONLY black is
// swapped, for a light neutral that plays the same "neutral / total" role black
// plays on white: #E4E4E7 (WCAG ~13.5:1 on #18181B — a clearly visible light-grey
// mark). See themeStackedColors / themeWaterfallColors below.
export const DARK_PALETTE_BLACK_SUB = "#E4E4E7";

// Interactive tooltip panel keeps its dark #1A1A1A background + light text in BOTH
// themes (max legibility). On the dark furniture frame (#18181B) that near-black box
// sits at ~1.03:1 against the ground — no visible edge, and its dark drop-shadow
// vanishes too. A dark render adds a 1px hairline in the dark AXIS token (#52525B, the
// same "subtle line on #18181B" the charts already use) to restore the panel boundary.
// tooltipBorder mirrors themeColors: the SINGLE path every *Chart.tsx tooltip keys its
// border on. Light theme gets `undefined` → React omits the property → BYTE-identical.
// The interactive tooltip keeps its dark #1A1A1A box + light text in every theme (max legibility).
// On any dark ground that near-black box has no visible edge, so a dark-ground render adds a 1px
// hairline in the ground's derived axis token. Light ground → undefined → React omits it → byte-
// identical. Keyed on the theme BG now (not a boolean), so an arbitrary dark ground gets the border.
export function tooltipBorder(themeBg?: string): string | undefined {
  return bgIsDark(themeBg)
    ? `1px solid ${deriveFurniture(themeBg).axis}`
    : undefined;
}

// The single resolver every component + ChartFrame routes through: `themeColors(config.themeBg)`
// derives the furniture for the newsroom's background (light default / undefined → legacy COLORS,
// byte-identical). Keep imports of the static `COLORS` only for PALETTE derivations that are
// theme-independent (Okabe-Ito marks); FURNITURE (ink/muted/axis/grid/bg/line) must go through this.
export function themeColors(themeBg?: string): ColorTokens {
  return deriveFurniture(themeBg);
}

export const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export const TYPE = {
  title: 22,
  axis: 13,
  label: 14,
  source: 12,
} as const;

// Beeswarm's per-category dot palette (BeeswarmChart.tsx), extracted here so the
// produce-time conformance resolver (core/resolve-conformance-colors.ts) can
// derive the SAME category colours without duplicating the literal array.
export const BEESWARM_CATEGORY_COLORS = [
  OKABE_ITO.blue,
  OKABE_ITO.orange,
  OKABE_ITO.green,
  OKABE_ITO.purple,
  OKABE_ITO.vermillion,
] as const;

// Pie/donut slice palette (PieChart.tsx), extracted so the produce-time conformance
// resolver derives the SAME slice colours without duplicating the literal (like
// BEESWARM_CATEGORY_COLORS). Marks only — every pie TEXT label is COLORS.ink.
export const PIE_SLICE_COLORS = [
  OKABE_ITO.blue,
  OKABE_ITO.orange,
  OKABE_ITO.green,
  OKABE_ITO.vermillion,
  OKABE_ITO.purple,
] as const;

// Grouped bar/column series palette (GroupedBarChart.tsx), extracted so the produce
// conformance resolver derives the SAME series colours. ≤3 series (grouped-bar.md).
export const GROUPED_SERIES_COLORS = [
  OKABE_ITO.blue,
  OKABE_ITO.orange,
  OKABE_ITO.green,
] as const;

// Stacked bar series palette (StackedBarChart.tsx), extracted so the produce
// conformance guard derives the SAME colours. ≤5 series (stacked-bar.md).
export const STACKED_SERIES_COLORS = [
  OKABE_ITO.black,
  OKABE_ITO.orange,
  OKABE_ITO.skyblue,
  OKABE_ITO.green,
  OKABE_ITO.purple,
] as const;

// Stacked area band palette (StackedAreaChart.tsx), extracted so the produce
// conformance guard derives the SAME colours. Skyblue-first — DIFFERENT order
// from STACKED_SERIES_COLORS (black-first) and GROUPED_SERIES_COLORS
// (blue-first); do not reuse either. ≤5 series (stacked-area.md).
export const STACKED_AREA_COLORS = [
  OKABE_ITO.skyblue,
  OKABE_ITO.orange,
  OKABE_ITO.blue,
  OKABE_ITO.green,
  OKABE_ITO.purple,
] as const;

// Waffle / square-pie category palette (WaffleChart.tsx), extracted so the produce
// conformance resolver derives the SAME category colours without duplicating the
// literal (like PIE_SLICE_COLORS). ≤6 categories (waffle.md). Every waffle TEXT
// label (legend, tooltip) is COLORS.ink — this palette is marks only.
export const WAFFLE_CATEGORY_COLORS = [
  OKABE_ITO.blue,
  OKABE_ITO.orange,
  OKABE_ITO.green,
  OKABE_ITO.purple,
  OKABE_ITO.vermillion,
  OKABE_ITO.skyblue,
] as const;

// Diverging bars: positive (blue) / negative (vermillion) sign colours — the guard
// (checkDivergingBarConformance) validates THESE, so component + guard never drift.
export const DIVERGING_SIGN_COLORS = [
  OKABE_ITO.blue,
  OKABE_ITO.vermillion,
] as const;

// Waterfall roles: increase (blue) / decrease (vermillion) / total (black).
export const WATERFALL_ROLE_COLORS = [
  OKABE_ITO.blue,
  OKABE_ITO.vermillion,
  OKABE_ITO.black,
] as const;

// Slope: neutral context line (muted) + the one editorial accent (vermillion).
// The guard (checkSlopeConformance) validates THESE, so component + guard never drift.
export const SLOPE_LINE_COLORS = [COLORS.muted, OKABE_ITO.vermillion] as const;

// Dumbbell endpoints: left series (orange) / right series (blue).
export const DUMBBELL_DOT_COLORS = [OKABE_ITO.orange, OKABE_ITO.blue] as const;

// Bullet: measure coloured by whether it HIT (blue) or MISSED (vermillion) its target.
// The guard (checkBulletConformance) validates THESE, so component + guard never drift.
export const BULLET_MEASURE_COLORS = [
  OKABE_ITO.blue,
  OKABE_ITO.vermillion,
] as const;

// Treemap group palette (TreemapChart.tsx), extracted so the produce conformance
// guard derives the SAME group colours. ≤5 groups (treemap.md); an ungrouped
// (flat) treemap uses a single OKABE_ITO.blue hue for every cell. Every hue here
// has at least one of {white, COLORS.ink} clearing 4.5:1 against it, which is
// what TreemapChart's `cellText` picks per-cell (there's no neutral background
// to fall back to inside a coloured cell).
export const TREEMAP_GROUP_COLORS = [
  OKABE_ITO.blue,
  OKABE_ITO.orange,
  OKABE_ITO.green,
  OKABE_ITO.purple,
  OKABE_ITO.vermillion,
] as const;

// Diverging-stacked (Likert) ramp: warm negative (farthest→closest: vermillion,
// orange) → neutral grey (straddles the centre) → cool positive (closest→farthest:
// skyblue, blue). The guard (checkDivergingStackedConformance) validates the
// non-neutral hues, so component + guard never drift. Every non-neutral hue has
// at least one of {white, COLORS.ink} clearing 4.5:1 against it — DivergingStackedChart
// picks whichever wins by REAL contrast for its in-segment percent labels (not a
// luminance threshold, the same class of bug fixed for treemap's cell text).
export const DIVERGING_STACKED_COLORS = {
  neg: [OKABE_ITO.vermillion, OKABE_ITO.orange] as const,
  pos: [OKABE_ITO.skyblue, OKABE_ITO.blue] as const,
  neutral: "#BFBFBF",
} as const;

// Population pyramid sides: left group (blue) / right group (orange). The guard
// (checkPopulationPyramidConformance) validates THESE, so component + guard never
// drift.
export const PYRAMID_SIDE_COLORS = [OKABE_ITO.blue, OKABE_ITO.orange] as const;

// Bump accent DEFAULT palette — the fallback when the spec provides no colour.
// The spec's subject-fit hue wins first (baseColor for one tracked line,
// seriesColors for several); resolveBumpAccents (bump-geometry.ts) is the single
// path both BumpChart (paints) and produce-conformance (validates) go through, so
// component + guard never drift. Uncoloured slots cycle this palette in highlight
// order (the rest of the lines render as neutral COLORS.muted context, exempt from
// palette membership like a gridline). Every direct/end label renders in COLORS.ink
// regardless of accent — the accent stays on the LINE/mark, per the "label carries
// the value, mark carries the hue" rule.
export const BUMP_ACCENT_COLORS = [
  OKABE_ITO.blue,
  OKABE_ITO.orange,
  OKABE_ITO.green,
] as const;

// Dark-variant resolvers for the DATA palettes that contain OKABE_ITO.black
// (STACKED_SERIES_COLORS, WATERFALL_ROLE_COLORS) — the two palettes whose black
// entry would disappear on the dark bg. On the light (default) theme each returns
// the palette VERBATIM (byte-identical, back-compat); on dark it swaps ONLY the
// black slot for DARK_PALETTE_BLACK_SUB, leaving every CVD-safe hue untouched. The
// SINGLE path a component paints through, mirroring themeColors for furniture. The
// treemap (TREEMAP_GROUP_COLORS) and diverging-stacked (DIVERGING_STACKED_COLORS)
// palettes contain NO black (their neutral is #BFBFBF, already light-visible), so
// they need no resolver — their marks are theme-independent.
function swapBlackForDark(
  palette: readonly string[],
  themeBg?: string,
): readonly string[] {
  return bgIsDark(themeBg)
    ? palette.map((c) => (c === OKABE_ITO.black ? DARK_PALETTE_BLACK_SUB : c))
    : palette;
}

export function themeStackedColors(themeBg?: string): readonly string[] {
  return swapBlackForDark(STACKED_SERIES_COLORS, themeBg);
}

export function themeWaterfallColors(themeBg?: string): readonly string[] {
  return swapBlackForDark(WATERFALL_ROLE_COLORS, themeBg);
}

// N-stop single-hue sequential ramp DERIVED from a base hue (the subject-fit / house baseColor),
// monotonic luminance = CVD-safe / greyscale-readable — no hardcoded palette. On a light ground it
// runs pale→deep (low→high value, the sequential-heatmap convention); on a dark ground it runs
// visible-mid→bright so high values read on the dark ground. Every stop is a lightness interpolation
// of the base hue, so a newsroom house colour or a subject-fit hue drives the heatmap the same way it
// drives the choropleth (houseRamp).
export function hueRamp(base: string, n: number, themeBg?: string): string[] {
  const dark = bgIsDark(themeBg);
  // endpoints: light ground → [pale … deep]; dark ground → [visible-mid … bright]. On a dark ground
  // the LOW stop must stay a VISIBLE MID (a tint of the base, not the base darkened) so low-value
  // cells clear the 3:1 non-text floor against the near-black ground instead of vanishing into it —
  // the a11y guarantee the old hand-tuned dark ramp held (checkHeatmapConformance enforces it).
  const lo = dark ? _mix(base, "#FFFFFF", 0.3) : _mix(base, "#FFFFFF", 0.88);
  const hi = dark ? _mix(base, "#FFFFFF", 0.82) : _mix(base, "#000000", 0.5);
  return Array.from({ length: n }, (_, i) => _mix(lo, hi, i / (n - 1)));
}

// The heatmap ramp: derived from the chart's baseColor (subject-fit / house) via hueRamp, oriented
// for the theme background. Falls back to Okabe-Ito blue when no baseColor is set (the historical
// default hue). SINGLE path the geometry, colourbar gradient, and produce guard all read.
export function heatmapRamp(baseColor?: string, themeBg?: string): string[] {
  return hueRamp(
    baseColor && HEX6.test(baseColor) ? baseColor : OKABE_ITO.blue,
    7,
    themeBg,
  );
}

// HEATMAP sequential ramp — the ONE type where COLOUR is the quantitative channel, so
// A single-hue ramp (monotonic luminance = CVD-safe / greyscale-readable), ColorBrewer "Blues",
// luminance strictly DECREASING (pale low value → deep-blue high value). The historical FIXED ramp
// the heatmap shipped with — kept VERBATIM ONLY as the back-compat default that heatmap-geometry
// re-exports as BLUES for the CALENDAR heatmap (calendar-geometry binds its ramp to it directly).
// New heatmaps no longer use this literal: they derive their ramp from the subject/house `baseColor`
// via heatmapRamp() (above), which orients for the theme background (pale→deep on a light ground;
// a visible-mid→bright inversion on a dark ground, so HIGH values read bright). The geometry, the
// colourbar-legend gradient, and the produce-time guard all read heatmapRamp() → they never drift.
export const HEATMAP_RAMP_LIGHT: string[] = [
  "#deebf7",
  "#c6dbef",
  "#9ecae1",
  "#6baed6",
  "#4292c6",
  "#2171b5",
  "#08306b",
];
