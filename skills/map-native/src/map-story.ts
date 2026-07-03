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
  // For MAGNITUDE reveals: the 1-based rank among the data (1 = the leader) and the
  // role, so the caption can say "leads" / "2nd" / "the long tail" instead of a bare
  // "name — value", and so the guardrail can confirm the story adapted to the data
  // (top leaders + tail) rather than collapsing to just max & min.
  rank?: number;
  rankRole?: "leader" | "tail";
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
    ((v: number) => {
      const n = Math.round(v);
      // Singularise a plural WORD unit when the value is exactly 1 ("1 nights" → "1
      // night") — but never touch a symbol unit like " %" or " $". Only strips a
      // trailing "s" from a purely-alphabetic word, leaving everything else intact.
      const unit =
        meta.unit && n === 1
          ? meta.unit.replace(/^(\s*)([A-Za-z]+)s$/, "$1$2")
          : (meta.unit ?? "");
      return `${n}${unit}`;
    });

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
  //   magnitude → reveal the TOP leaders (the "who leads and by how much" story) plus
  //               the tail — NOT just max & min. Two beats can't carry a distribution;
  //               the message must adapt to the data (this was the scrolly-narrative
  //               defect, now fixed for the video path too).
  let revealRows: {
    key: string;
    value: number;
    rank?: number;
    rankRole?: "leader" | "tail";
  }[];
  if (pattern === "temporal") {
    revealRows = temporalRevealRows(withData);
  } else {
    revealRows = magnitudeRevealRows(withData);
  }

  const seqTotal = revealRows.length;
  const firstRevealYear = revealRows[0]?.value;
  revealRows.forEach(({ key, value, rank, rankRole }, seqIndex) => {
    // The caption ADAPTS to the pattern: temporal keeps its "name — value" (the
    // sequence descriptor is added by the scrolly/video layer via seq* fields);
    // magnitude gets a rank-aware line ("Chile leads — 22%", "the long tail: …").
    const copy =
      pattern === "temporal" || rank === undefined
        ? calloutText(key, value)
        : magnitudeCaption(nameOf(key), fmt(value), rank, seqTotal, rankRole);
    beats.push({
      kind: "reveal",
      camera: cameraOf(key),
      highlight: [key],
      dim: true,
      callout: {
        region: key,
        name: nameOf(key),
        value: fmt(value),
        text: copy,
      },
      copy,
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
        : { rank, rankRole }),
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

// Magnitude reveal selection. A distribution is a RANKING story — "who leads, by how
// much, and how long the tail is" — which two beats (max & min) cannot carry. Reveal
// the TOP leaders (up to 3) plus the tail (the minimum) as contrast, each tagged with
// its 1-based rank and role so the caption can be rank-aware. Adapts to the data: with
// ≤3 regions every one is a leader (no separate tail); with more, top-3 + tail.
// Returns rows in reveal order (leaders high→low, then the tail).
export function magnitudeRevealRows(
  withData: { key: string; value: number }[],
): { key: string; value: number; rank: number; rankRole: "leader" | "tail" }[] {
  const desc = [...withData].sort(
    (a, b) => b.value - a.value || a.key.localeCompare(b.key),
  );
  const leaders = desc.slice(0, Math.min(3, desc.length)).map((r, i) => ({
    key: r.key,
    value: r.value,
    rank: i + 1,
    rankRole: "leader" as const,
  }));
  // A distinct tail only when there are more regions than the leaders shown.
  if (desc.length > leaders.length) {
    const tail = desc[desc.length - 1];
    leaders.push({
      key: tail.key,
      value: tail.value,
      rank: desc.length,
      rankRole: "tail" as const,
    });
  }
  return leaders;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

// A rank-aware, data-tied caption for a magnitude reveal. Never invents — it states
// the region, its formatted value, and its factual rank/role in the distribution.
export function magnitudeCaption(
  name: string,
  valueStr: string,
  rank: number,
  revealCount: number,
  role?: "leader" | "tail",
): string {
  if (role === "tail") return `The long tail — ${name}, ${valueStr}`;
  if (rank === 1) return `${name} leads — ${valueStr}`;
  return `${name} — ${valueStr}, ${ordinal(rank)}`;
}

// GUARDRAIL. A magnitude story must ADAPT to the data, not collapse to "highest &
// lowest". Given the derived beats and how many regions actually had data, fail when a
// non-temporal story of a reasonably rich dataset (≥4 regions) shows fewer than 3
// reveals, or when its magnitude reveals lack the rank cue that makes the message
// informative. Deterministic; unit-tested. Mirrors the temporal narrative audit.
export function auditMapStoryReveals(
  beats: Beat[],
  dataRegionCount: number,
): string[] {
  const violations: string[] = [];
  const reveals = beats.filter((b) => b.kind === "reveal");
  const magReveals = reveals.filter((b) => b.pattern !== "temporal");
  if (magReveals.length === 0) return violations; // temporal / no reveals — not our rule
  if (dataRegionCount >= 4 && reveals.length < 3)
    violations.push(
      `magnitude story limited to ${reveals.length} reveal(s) for ${dataRegionCount} regions — ` +
        `must adapt to the data (top leaders + tail), not just highest & lowest`,
    );
  for (const b of magReveals)
    if (b.rank === undefined)
      violations.push(
        `magnitude reveal "${b.copy}" carries no rank cue — the message is not adapted to the distribution`,
      );
  return violations;
}
