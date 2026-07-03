import type { ChoroplethLayout } from "./choropleth-geo";
import { regionBounds } from "./choropleth-geo";
import {
  classifyNarrativePattern,
  type NarrativePattern,
} from "./narrative-pattern";

export interface Beat {
  kind: "title" | "establish" | "reveal" | "takeaway";
  camera: [number, number, number, number]; // [w,s,e,n] mainland-framed bbox
  highlight: string[];
  dim: boolean;
  callout: { region: string; name: string; value: string; text: string } | null;
  copy: string;
  // Which narrative pattern this beat belongs to. Reveal beats carry it so the
  // scrolly prose (mapStoryToChapters) and the guardrail know whether "highest/
  // lowest" ranking language is honest (magnitude) or a lie (temporal).
  pattern?: NarrativePattern;
  // For temporal reveals: 0-based index in the earliest→latest reveal ordering,
  // and the total reveal count — so prose can say "the first" / "the most recent".
  seqIndex?: number;
  seqTotal?: number;
  // For temporal reveals, extra data-tied facts so the caption can be
  // informative instead of a bare connective ("then"). All derived from the
  // data, never invented:
  //   seqYear        — the numeric year of THIS reveal.
  //   seqYearFirst   — the numeric year of the FIRST reveal (interval anchor).
  //   seqYearPrev    — the numeric year of the PREVIOUS reveal (gap anchor).
  seqYear?: number;
  seqYearFirst?: number;
  seqYearPrev?: number;
}

export interface MapStoryMeta {
  title: string;
  insight: string;
  unit: string;
  valueLabel?: (v: number) => string;
  // The value field name (e.g. "year"), used to infer the narrative pattern.
  valueField?: string;
  // Explicit pattern hint from the config (② sets valueKind → this). When set it
  // wins over inference. "temporal" | "magnitude" | "categorical".
  narrativePattern?: NarrativePattern;
}

export function deriveMapStory(
  layout: ChoroplethLayout,
  features: GeoJSON.FeatureCollection,
  joinKey: string,
  meta: MapStoryMeta,
): Beat[] {
  const fmt =
    meta.valueLabel ??
    ((v: number) => `${Math.round(v)}${meta.unit ? meta.unit : ""}`);

  // Regions that actually have a value, sorted by ascending key for tie-stability.
  const withData = layout.joined
    .filter((j): j is { key: string; value: number } => j.value !== null)
    .sort((a, b) => a.key.localeCompare(b.key));

  // Classify the narrative pattern of the value field. Temporal → sequence,
  // magnitude → ranking, categorical → ranking fallback (noted). Default when
  // unknown = magnitude, so nothing regresses.
  const pattern = classifyNarrativePattern({
    hint: meta.narrativePattern,
    fieldName: meta.valueField,
    values: withData.map((j) => j.value),
  });

  // Pick the extremes deterministically: max value (first by key among ties), min value likewise.
  const maxRow = withData.reduce((best, j) =>
    j.value > best.value ? j : best,
  );
  const minRow = withData.reduce((best, j) =>
    j.value < best.value ? j : best,
  );

  const featByKey = new Map<string, GeoJSON.Feature>();
  for (const f of features.features) {
    const k = String(f.properties?.[joinKey]);
    if (!featByKey.has(k)) featByKey.set(k, f);
  }
  const nameOf = (key: string) =>
    String(featByKey.get(key)?.properties?.name ?? key);
  const cameraOf = (key: string) => {
    const f = featByKey.get(key);
    return f ? regionBounds(f) : layout.bounds;
  };
  const calloutText = (key: string, value: number) =>
    `${nameOf(key)} — ${fmt(value)}`;

  const beats: Beat[] = [];
  // Title card — shown before the map is visible (fillReveal 0).
  beats.push({
    kind: "title",
    camera: layout.bounds,
    highlight: [],
    dim: false,
    callout: null,
    copy: meta.title,
  });
  // Establish — map fades in; no caption copy so the title card has space to exit.
  beats.push({
    kind: "establish",
    camera: layout.bounds,
    highlight: [],
    dim: false,
    callout: null,
    copy: "",
  });

  // Choose the reveal rows per pattern.
  //   temporal  → order by value earliest→latest; reveal the FIRST, one or two
  //               notable middle steps/leaps, and the MOST RECENT (sequence).
  //   magnitude → reveal the max then the min (ranking) — the pre-fix behaviour.
  let revealRows: { key: string; value: number }[];
  if (pattern === "temporal") {
    revealRows = temporalRevealRows(withData);
  } else {
    revealRows =
      maxRow.key === minRow.key
        ? [maxRow]
        : [
            { key: maxRow.key, value: maxRow.value },
            { key: minRow.key, value: minRow.value },
          ];
  }

  const seqTotal = revealRows.length;
  const firstRevealYear = revealRows[0]?.value;
  revealRows.forEach(({ key, value }, seqIndex) => {
    beats.push({
      kind: "reveal",
      camera: cameraOf(key),
      highlight: [key],
      dim: true,
      callout: {
        region: key,
        name: nameOf(key),
        value: fmt(value),
        text: calloutText(key, value),
      },
      copy: calloutText(key, value),
      pattern,
      ...(pattern === "temporal"
        ? {
            seqIndex,
            seqTotal,
            seqYear: value,
            seqYearFirst: firstRevealYear,
            seqYearPrev:
              seqIndex > 0 ? revealRows[seqIndex - 1].value : undefined,
          }
        : {}),
    });
  });

  beats.push({
    kind: "takeaway",
    camera: layout.bounds,
    highlight: [],
    dim: false,
    callout: null,
    copy: meta.insight && meta.insight !== meta.title ? meta.insight : "",
  });

  return beats;
}

// Temporal reveal selection. Order every region earliest→latest (ties broken by
// ascending key for determinism), then reveal the SEQUENCE landmarks:
//   - the FIRST (earliest),
//   - the MOST RECENT (latest),
//   - and, when there is room, one or two notable MIDDLE steps — the largest
//     jumps in value (the "leaps" / waves), which read as the story's momentum.
// Returns 1..4 rows in chronological order (earliest → … → latest).
export function temporalRevealRows(
  withData: { key: string; value: number }[],
): { key: string; value: number }[] {
  const ordered = [...withData].sort(
    (a, b) => a.value - b.value || a.key.localeCompare(b.key),
  );
  if (ordered.length <= 2) return ordered;

  const first = ordered[0];
  const last = ordered[ordered.length - 1];

  // Candidate middle steps = interior rows, ranked by the size of the jump from
  // the previous row (the biggest leaps forward), tie-broken by earliness.
  const interior = ordered.slice(1, -1).map((row, i) => ({
    row,
    // i in the interior slice → ordered index (i + 1); jump from its predecessor.
    jump: row.value - ordered[i].value,
    order: i,
  }));
  interior.sort((a, b) => b.jump - a.jump || a.order - b.order);
  const middles = interior
    .slice(0, 2)
    .map((c) => c.row)
    .sort((a, b) => a.value - b.value || a.key.localeCompare(b.key));

  return [first, ...middles, last];
}
