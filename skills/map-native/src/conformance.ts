function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}
export function relativeLuminance(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`not a #rrggbb colour: ${hex}`);
  const n = parseInt(m[1], 16);
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  );
}
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a),
    lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// Shared L0 — the header rules every map type + format must satisfy (mirrors chart-native's
// checkGlobalConformance). Both per-type guards call this first, then add their own rules.
export function checkGlobalMapConformance(
  input: {
    title: string;
    description?: string;
    source: { name?: string; url?: string };
  },
  textColors: { text: string[]; bg: string },
): string[] {
  const v: string[] = [];
  const title = input.title?.trim() ?? "";
  if (title.length < 12) v.push(`title too short to be an insight: "${title}"`);
  if (/^\d{4}(\s*[–-]\s*\d{4})?$/.test(title))
    v.push(`title is a year range, not an insight: "${title}"`);
  if (/[A-Za-z]/.test(title) && title === title.toUpperCase())
    v.push(`title is ALL CAPS — write it as a sentence: "${title}"`);
  if (!input.description?.trim())
    v.push("missing description — a module must state what/when/where");
  if (!input.source?.name?.trim()) v.push("missing source name");
  if (!input.source?.url?.trim()) v.push("missing source url");
  for (const t of textColors.text) {
    const r = contrastRatio(t, textColors.bg);
    if (r < 4.5)
      v.push(
        `text colour ${t} contrast ${r.toFixed(2)}:1 on ${textColors.bg} < 4.5:1`,
      );
  }
  return v;
}

export function checkChoroplethConformance(
  input: {
    title: string;
    description?: string;
    source: { name?: string; url?: string };
    scaleColors: string[];
    scaleType: "sequential" | "diverging";
    hasLegend: boolean;
    regionsWithData: number;
    regionsTotal: number;
    boundsNonEmpty: boolean;
    storyBeats?: number;
  },
  textColors: { text: string[]; bg: string },
): string[] {
  const v = checkGlobalMapConformance(
    {
      title: input.title,
      description: input.description,
      source: input.source,
    },
    textColors,
  );
  if (!input.hasLegend)
    v.push("choropleth needs a legend (the map is undecodable without it)");
  if (!input.boundsNonEmpty)
    v.push("empty data bounds — basemap-fit impossible");
  if (input.regionsWithData < 1) v.push("no region has data");
  if (input.scaleColors.length < 3)
    v.push("scale has too few steps to read as a CVD-safe ramp");
  if (input.storyBeats !== undefined && input.storyBeats < 3)
    v.push(
      `story: only ${input.storyBeats} beats — a narrated map needs at least establish + reveal + takeaway (3)`,
    );
  return v;
}

// A symbol's largest radius must not exceed this fraction of the smaller viewport
// dimension — beyond it, one symbol swallows the map and the pattern is unreadable.
export const SYMBOL_MAX_VIEWPORT_FRACTION = 0.25;

export function checkSymbolConformance(
  input: {
    title: string;
    description?: string;
    source: { name?: string; url?: string };
    sizingMode: "area" | "radius";
    hasLegend: boolean;
    legendStops: number;
    maxRadiusPx: number;
    viewportMinPx: number;
    pointsWithData: number;
    boundsNonEmpty: boolean;
    strokeContrast: number;
    labeled: boolean;
  },
  textColors: { text: string[]; bg: string },
): string[] {
  const v = checkGlobalMapConformance(
    {
      title: input.title,
      description: input.description,
      source: input.source,
    },
    textColors,
  );
  if (input.sizingMode !== "area")
    v.push(
      "symbols must be area-proportional (r ∝ √value), not radius-proportional",
    );
  if (!input.hasLegend)
    v.push("symbol map needs a legend (size is undecodable without it)");
  if (input.legendStops < 2)
    v.push(
      `legend has ${input.legendStops} reference circle(s) — need at least 2 to read the size scale`,
    );
  if (input.maxRadiusPx > input.viewportMinPx * SYMBOL_MAX_VIEWPORT_FRACTION)
    v.push(
      `largest symbol ${input.maxRadiusPx}px is too large for the ${input.viewportMinPx}px viewport (swallows the map)`,
    );
  if (input.pointsWithData < 1) v.push("no point has data");
  if (!input.boundsNonEmpty)
    v.push("empty data bounds — basemap-fit impossible");
  if (input.strokeContrast < 2)
    v.push(
      `symbol stroke contrast ${input.strokeContrast.toFixed(2)} too faint to separate symbols from the basemap`,
    );
  if (!input.labeled)
    v.push(
      "symbols are not directly labeled — values are undecodable without hover",
    );
  return v;
}
