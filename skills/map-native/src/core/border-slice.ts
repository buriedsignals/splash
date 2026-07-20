import * as turf from "@turf/turf";

// Reveal a portion of a multi-segment border between fromKm and toKm, slicing each segment by
// cumulative length — no joins across gaps, no viewport crop. Extracted verbatim from RouteReveal
// (RouteReveal.tsx:73-119); buildDraw now takes the raw segment array so any comp can feed a
// region's exterior rings, not just a RouteRevealTerritory.

export interface DrawEntry {
  segLines: ReturnType<typeof turf.lineString>[];
  segLen: number[];
  cum: number[];
  total: number;
}

export const EMPTY_FEATURE = {
  type: "Feature" as const,
  properties: {},
  geometry: {
    type: "MultiLineString" as const,
    coordinates: [] as number[][][],
  },
};

export function buildDraw(segments: number[][][]): DrawEntry {
  const segLines = segments.map((s) => turf.lineString(s));
  const segLen = segLines.map((l) => turf.length(l));
  const cum: number[] = [];
  let acc = 0;
  for (const L of segLen) {
    cum.push(acc);
    acc += L;
  }
  return { segLines, segLen, cum, total: acc };
}

export function sliceBorder(d: DrawEntry, fromKm: number, toKm: number) {
  const out: number[][][] = [];
  for (let i = 0; i < d.segLines.length; i++) {
    const start = d.cum[i];
    const end = start + d.segLen[i];
    const a = Math.max(fromKm, start);
    const b = Math.min(toKm, end);
    if (b - a <= 0.0008) continue;
    out.push(
      turf.lineSliceAlong(d.segLines[i], a - start, b - start).geometry
        .coordinates,
    );
  }
  return {
    type: "Feature" as const,
    properties: {},
    geometry: { type: "MultiLineString" as const, coordinates: out },
  };
}
