import type { ChoroplethLayout } from "./choropleth-geo";
import { regionBounds } from "./choropleth-geo";
import { formatLocaleNumber, isFrench } from "./core/locale";
import {
  classifyNarrativePattern,
  type NarrativePattern,
} from "./narrative-pattern";
// ArcRole/arcErrors live in lib/core/claim-arc (shared by chart-native + map-native —
// see chart-native/src/chart-story.ts for the sibling import).
import { arcErrors, type ArcRole } from "../../../lib/core/claim-arc";

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
  // Claim-arc role (S2), threaded from a journalist-confirmed `arcBeats` override —
  // see MapArcBeat/mapArcErrors below. Optional: absent = no arc claimed.
  role?: ArcRole;
}

// ---------------------------------------------------------------------------
// Claim-arc — the journalist-confirmed override for map-native (choropleth +
// symbol). Mirrors chart-native's beats: `region` anchors on a value the data
// actually has (a region key for choropleth, a point label for symbol); `role`
// (optional) claims a position in the establish→build→turn→payoff arc; `text`
// is the beat's assertion. Validated by mapArcErrors below.
// ---------------------------------------------------------------------------
export interface MapArcBeat {
  region: string;
  role?: ArcRole;
  text?: string;
}

// How many valid region values a fail-loud message lists before truncating —
// mirrors chart-native's listValidAnchors (chart-story.ts): enough to spot a
// typo at a glance, bounded so a 1 000-row dataset cannot flood the log.
const ARC_BEAT_REGION_SAMPLE = 20;

function listValidRegions(values: string[]): string {
  const shown = values.slice(0, ARC_BEAT_REGION_SAMPLE);
  const more = values.length - shown.length;
  return shown.join(", ") + (more > 0 ? `, … (+${more} more)` : "");
}

// Validate an explicit arcBeats override against the map's own region values
// (choropleth: the region key column; symbol: point labels). Returns human-
// readable errors ([] = valid). Pure and throw-free — the same fail-loud
// philosophy as chart-native's narrativeBeatErrors: an unknown region must
// never silently drop or shift a confirmed beat.
export function mapArcErrors(
  arcBeats: MapArcBeat[],
  validRegions: string[],
): string[] {
  if (!arcBeats || arcBeats.length === 0) return [];
  const errors: string[] = [];
  arcBeats.forEach((b, i) => {
    if (!validRegions.includes(b.region))
      errors.push(
        `beat ${i + 1}: region "${b.region}" not found in the data — valid regions: ${listValidRegions(validRegions)}`,
      );
  });
  return [...errors, ...arcErrors(arcBeats)];
}

// The anchor facts a deriver resolves for one arcBeat's region — enough to build a
// reveal Beat's camera/highlight/callout. Each deriver supplies its own `resolve`
// (choropleth: cameraOf/nameOf/fmt(value-by-key); symbol: the point's lon/lat box +
// label + fmt(value)).
export interface MapArcAnchor {
  camera: [number, number, number, number];
  highlight: string[];
  name: string;
  value: string;
}

// Turn a journalist-confirmed claim-arc into ORDERED reveal Beats — the shared
// choreography for choropleth (deriveMapStory) and symbol (deriveSymbolStory) maps.
// Beat is the shared shape, so the callout is ONE shape either way: { region; name;
// value; text }. `copy`/`callout.text` is the arc beat's CLAIM (`text`), never a
// derived "name — value" caption — the journalist's assertion is the caption.
// A `resolve` returning null should be unreachable — callers are expected to check
// their region set against `resolve`'s key space BEFORE calling applyMapArc (see
// deriveMapStory/deriveSymbolStory) — but this throws regardless: defense in depth,
// never a silently dropped/misplaced beat.
export function applyMapArc(
  arcBeats: MapArcBeat[],
  resolve: (region: string) => MapArcAnchor | null,
): Beat[] {
  return arcBeats.map((arcBeat) => {
    const anchor = resolve(arcBeat.region);
    if (!anchor)
      throw new Error(
        `applyMapArc: region "${arcBeat.region}" did not resolve to an anchor`,
      );
    const text = arcBeat.text ?? "";
    return {
      kind: "reveal",
      camera: anchor.camera,
      highlight: anchor.highlight,
      dim: true,
      callout: {
        region: arcBeat.region,
        name: anchor.name,
        value: anchor.value,
        text,
      },
      copy: text,
      role: arcBeat.role,
    };
  });
}

// S2 flagged fallback — mirrors chart-native's narrativeFallbackWarning (chart-story.ts).
// A choropleth/symbol map story with NO confirmed `arcBeats` derives its narrative from
// data salience (deriveMapStory's own ranking), not a journalist-confirmed claim-arc —
// never a hard fail, but never silent either. Only choropleth/symbol support an arcBeats
// override (validate-config.ts) — route/locator/dot-density/hex-grid/cartogram derive
// their own story unconditionally and never carry the field, so they never warn here.
export function mapNarrativeFallbackWarning(config: unknown): string | null {
  const c = config as { type?: string; arcBeats?: unknown } | null;
  // Mirror the deriver's gate exactly (`meta.arcBeats?.length`): a confirmed, NON-EMPTY
  // arcBeats suppresses the warning. An empty array still renders via the salience path
  // (see deriveMapStory/deriveSymbolStory), so it must still warn like an absent one.
  if (Array.isArray(c?.arcBeats) && c.arcBeats.length > 0) return null;
  const type = c?.type;
  if (type !== undefined && type !== "choropleth" && type !== "symbol")
    return null;
  return (
    "narrative auto-picked by data salience (no confirmed claim-arc `arcBeats`) — the map " +
    "scrolly walks the most salient regions, not a confirmed argument. If this ships as a " +
    "story, confirm a region-anchored claim-arc at CADRAGE (establish → build → [turn] → payoff)."
  );
}

// The choreography a reveal beat's camera follows. "context" (default) keeps the
// establishing bounds in view around each reveal (the current areal behaviour);
// "sequential" is a journey/progression choreography read by later map-native tasks
// (Choropleth). Fail-safe: any unset/unknown value resolves to "context".
export type RevealMode = "context" | "sequential";

export function resolveRevealMode(config: { revealMode?: string }): RevealMode {
  return config.revealMode === "sequential" ? "sequential" : "context";
}

/**
 * Adjust a beat list for the reveal mode. In `sequential` the base fill is 0, so the
 * establish beat would be an overview dwell on an empty map (dead air after the title) —
 * drop it so the story cuts straight into the first region. `context` is unchanged.
 *
 * SINGLE SOURCE OF TRUTH: both the component (animation) and Root.tsx (composition
 * durationInFrames via calculateMetadata) must apply this so the video length matches the
 * animation — otherwise the sequential MP4 ends with a frozen tail.
 */
export function beatsForMode<T extends { kind: Beat["kind"] }>(
  beats: T[],
  mode: RevealMode,
): T[] {
  return mode === "sequential"
    ? beats.filter((b) => b.kind !== "establish")
    : beats;
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
  /** deliverable language — localizes the callout numbers. Default English. */
  lang?: string;
  // Journalist-confirmed claim-arc override (S2) — see mapArcErrors above. When
  // present + non-empty, the reveal beats follow the arc (applyMapArc) instead of the
  // salience selection; absent/empty leaves today's salience path byte-identical.
  arcBeats?: MapArcBeat[];
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
      return `${formatLocaleNumber(n, meta.lang)}${unit}`;
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
  // Prefer the DATA's display name (layout.labels, in the deliverable language) over
  // the basemap feature name (ISO/English). A French map must narrate "Éthiopie", not
  // the basemap's "Ethiopia" — the name comes from the data, never the basemap.
  const nameOf = (key: string) =>
    layout.labels?.[key] ?? String(featByKey.get(key)?.properties?.name ?? key);
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

  if (meta.arcBeats?.length) {
    // Journalist-confirmed claim-arc override — the reveals follow the ARC order, not
    // the salience selection below. mapArcErrors (run at the gate) has validated every
    // arcBeat's region against the DATA rows — but the gate has no basemap, and
    // computeChoropleth permits a PARTIAL join (it only throws when NOTHING matches;
    // see choropleth-geo.ts). So a region present in the data but absent from the
    // basemap (name mismatch, or a sub-region the basemap doesn't carry) can pass the
    // gate yet have no entry here. Check against the basemap-joined key set before
    // calling applyMapArc, and fail with an honest, journalist-facing message — never
    // let it surface as applyMapArc's internal "did not resolve" defense-in-depth throw.
    const valueByKey = new Map(withData.map((j) => [j.key, j.value]));
    const missingRegions = meta.arcBeats
      .map((b) => b.region)
      .filter((region) => !valueByKey.has(region));
    if (missingRegions.length > 0) {
      throw new Error(
        `claim-arc region(s) [${missingRegions.join(", ")}] are in your data but absent from the map basemap (a name mismatch or a region the basemap lacks), so they can't anchor an arc beat — align the region name to the basemap or drop that beat.`,
      );
    }
    beats.push(
      ...applyMapArc(meta.arcBeats, (key) => {
        const v = valueByKey.get(key);
        return v === undefined
          ? null
          : {
              camera: cameraOf(key),
              highlight: [key],
              name: nameOf(key),
              value: fmt(v),
            };
      }),
    );
  } else {
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
  }

  // The concluding beat must be a DISTINCT takeaway, never a verbatim repeat of the
  // intro/description. Prefer an explicit editorial insight when the author gave a
  // genuinely distinct one; otherwise derive a data-tied closer from the extremes
  // (the gap / the span) so the outro always says something the intro did not.
  const distinctInsight =
    meta.insight && meta.insight !== meta.title ? meta.insight : "";
  const takeawayCopy =
    distinctInsight ||
    deriveTakeawayCopy({
      pattern,
      maxName: nameOf(maxRow.key),
      maxValue: maxRow.value,
      maxLabel: fmt(maxRow.value),
      minName: nameOf(minRow.key),
      minValue: minRow.value,
      minLabel: fmt(minRow.value),
      lang: meta.lang,
    });
  beats.push({
    kind: "takeaway",
    camera: layout.bounds,
    highlight: [],
    dim: false,
    callout: null,
    copy: takeawayCopy,
  });

  return beats;
}

// A distinct, data-tied concluding line for the takeaway beat — NEVER a repeat of the
// intro description. States the spread between the extremes: for a MAGNITUDE story the
// leader-vs-tail gap (with a 1-to-N ratio when meaningful), for a TEMPORAL story the
// earliest-vs-latest span. Uses a colon/neutral phrasing that avoids per-language
// article/preposition grammar (works for any country name). Returns "" for a degenerate
// single-region story (max === min), letting the caller fall back to insight/description.
export function deriveTakeawayCopy(input: {
  pattern: NarrativePattern;
  maxName: string;
  maxValue: number;
  maxLabel: string;
  minName: string;
  minValue: number;
  minLabel: string;
  lang?: string;
}): string {
  const { maxName, maxLabel, minName, minLabel } = input;
  // Single-region (or all-equal) story — nothing to contrast; no distinct takeaway.
  if (maxName === minName && maxLabel === minLabel) return "";
  const fr = isFrench(input.lang);
  const sep = fr ? " : " : ": ";

  if (input.pattern === "temporal") {
    // Temporal: value = a year; min = earliest, max = latest. Close on the span.
    const span = Math.abs(Math.round(input.maxValue - input.minValue));
    const spanClause =
      span > 0
        ? fr
          ? ` — ${span} an${span === 1 ? "" : "s"} d'écart`
          : ` — a ${span}-year span`
        : "";
    // minLabel is the earliest year, maxLabel the most recent.
    return `${minName}${sep}${minLabel}, ${maxName}${sep}${maxLabel}${spanClause}`;
  }

  // Magnitude: leader vs tail. Add a "1 to N" ratio when it is meaningful.
  const ratio =
    input.minValue > 0 ? Math.round(input.maxValue / input.minValue) : 0;
  const gapClause =
    ratio >= 2
      ? fr
        ? ` — un écart de 1 à ${ratio}`
        : ` — a ${ratio}-fold gap`
      : "";
  return `${maxName}${sep}${maxLabel}, ${minName}${sep}${minLabel}${gapClause}`;
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
  const leaders: {
    key: string;
    value: number;
    rank: number;
    rankRole: "leader" | "tail";
  }[] = desc.slice(0, Math.min(3, desc.length)).map((r, i) => ({
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
