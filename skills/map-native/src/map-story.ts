import type { ChoroplethLayout } from "./choropleth-geo";
import { regionBounds } from "./choropleth-geo";
import { formatLocaleNumber, labelWithUnit } from "./core/locale";
import { storyCopy } from "../../../lib/core/story-copy";
import {
  classifyNarrativePattern,
  type NarrativePattern,
} from "./narrative-pattern";
// ArcRole lives in lib/core/claim-arc (shared by chart-native + map-native — see
// chart-native/src/chart-story.ts for the sibling import). The pure claim-arc
// validators (mapArcErrors, mapNarrativeFallbackWarning) live in ./map-arc — a
// LIGHTWEIGHT module kept free of this file's heavy staged-reveal/remotion import
// chain, so validate-config.ts / validate-gate.ts can value-import them without
// pulling remotion into the validation import closure. Re-exported below so any
// existing importer of these from map-story still resolves.
import type { ArcRole } from "../../../lib/core/claim-arc";
import {
  mapArcErrors,
  type MapArcBeat,
  mapNarrativeFallbackWarning,
} from "./map-arc";

export { mapArcErrors, mapNarrativeFallbackWarning } from "./map-arc";
export type { MapArcBeat } from "./map-arc";

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
  // Set by applyMapArc, and by nothing else: this reveal came from a journalist-CONFIRMED
  // arc, not from the deriver's own salience walk. It is the one bit a caption composer
  // needs, because the two walks mean different things by "position": in the salience walk
  // position IS rank (first = the highest, last = the lowest), and in an arc it is the
  // ORDER OF THE ARGUMENT. A composer that reads rank off position under an arc asserts a
  // ranking nothing computed — which is how a region that was merely last in a geographic
  // walk got captioned "the lowest" while another region held the minimum. `role` cannot
  // stand in for this: roles are optional on an arc (arcErrors permits an anchor-only plan),
  // so their absence does not mean "derived".
  authored?: true;
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

// Turn a journalist-confirmed claim-arc into ORDERED reveal Beats — the shared choreography for
// five of the six arc-capable map-native types that anchor on a lookup key: choropleth (HERE,
// below), symbol (symbol-story.ts), locator (locator-story.ts), cartogram (cartogram-story.ts)
// and dot-density (dot-density-story.ts) all call this function directly. hex-grid is the one
// exception — its anchor is a (lon, lat) place, not a lookup key, a shape this function's
// `resolve(region: string)` has no seam for — so hex-grid-story.ts REIMPLEMENTS this choreography
// locally (`resolveHexGridArc`) rather than calling it; see that function's own header comment.
// Beat is the shared shape, so the callout is ONE shape either way: { region; name; value; text
// }. `copy`/`callout.text` is the arc beat's CLAIM (`text`), never a derived "name — value"
// caption — the journalist's assertion is the caption.
// A `resolve` returning null should be unreachable — callers are expected to check
// their region set against `resolve`'s key space BEFORE calling applyMapArc (see
// deriveMapStory/deriveSymbolStory) — but this throws regardless: defense in depth,
// never a silently dropped/misplaced beat.
export function applyMapArc(
  arcBeats: MapArcBeat[],
  resolve: (region: string) => MapArcAnchor | null,
): Beat[] {
  const beats: Beat[] = arcBeats.map((arcBeat) => {
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
      authored: true,
    };
  });

  // THE CAMERA HOLD — sub-project 4(c), applied HERE and nowhere else. This is the single place
  // an arc beat becomes a story beat, so every Story component AND every `stepped` component
  // inherits the behaviour without a line of its own: they all read the `camera` this function
  // returns, turn it into a solution, and jump to it.
  //
  // A held beat takes the PREVIOUS beat's frame AFTER that one has itself been resolved, so a
  // run of consecutive holds all sit on the last frame that actually moved, rather than each
  // holding a frame that was itself a hold of something else.
  const held: Beat[] = [];
  beats.forEach((beat, i) => {
    if (arcBeats[i]!.movement !== "hold") {
      held.push(beat);
      return;
    }
    if (i === 0)
      // Refused rather than silently kept: a first beat has no previous frame to hold, and
      // quietly giving it its own would make "hold" mean two different things depending on
      // position — the ambiguity this codebase pays for later.
      throw new Error(
        `applyMapArc: the FIRST beat cannot hold the camera — there is no previous frame to ` +
          `hold. Drop the "hold" movement on "${arcBeats[0]!.region}", or give the walk an ` +
          `establishing beat before it`,
      );
    // From the RESOLVED previous beat, not the raw one — that is what makes a run of holds
    // sit on the last frame that actually moved. Reading `beats[i - 1]` instead would give the
    // second hold the frame of the first hold's own anchor, which is a frame the camera never
    // visited.
    held.push({ ...beat, camera: held[i - 1]!.camera });
  });
  return held;
}

// The choreography a reveal beat's camera follows. "context" (default) keeps the
// establishing bounds in view around each reveal (the current areal behaviour);
// "sequential" is a journey/progression choreography read by later map-native tasks
// (Choropleth). Fail-safe: any unset/unknown value resolves to "context".
export type RevealMode = "context" | "sequential";

export function resolveRevealMode(config: {
  revealMode?: string;
  sweepCarrier?: string;
}): RevealMode {
  // ★ A DECLARED CARRIER IS ITSELF A REVEAL MODE, and it can only be this one. The device the
  // carrier exists to drive (Buried Signals' map-explainer) is "the map is dark, and each subject
  // lights up when the sweep reaches it, and stays lit". `context` paints the whole distribution
  // before the first subject is reached — there is nothing left to light up, so a carrier laid
  // over it would advance an already-finished reveal. Declaring one therefore SELECTS
  // `sequential`, rather than being ignored on a config that also carries `revealMode: "context"`.
  if (config.sweepCarrier) return "sequential";
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
      // Trim first: real callers pass `config.valueUnit ?? ""` bare (no leading space) —
      // `labelWithUnit` below derives the locale-correct spacing itself, so a caller (or a
      // test fixture) that still pre-bakes a leading space must not affect the outcome.
      const raw = meta.unit?.trim() ?? "";
      // Singularise a plural WORD unit when the value is exactly 1 ("nights" → "night")
      // — but never touch a symbol unit like "%" or "$". Only strips a trailing "s" from
      // a purely-alphabetic word, leaving everything else intact.
      const unit = n === 1 ? raw.replace(/^([A-Za-z]+)s$/, "$1") : raw;
      // Compose through `labelWithUnit` (core/locale) — NOT raw string concatenation — so
      // a word unit is spaced ("1,200 CHF", never "1,200CHF") and French/German get the
      // narrow no-break space before it. Same fix, same class, as legend-format.ts's
      // fmtBinRange (Fix E4) — this was the sibling instance of the identical bug.
      return labelWithUnit(formatLocaleNumber(n, meta.lang), unit, meta.lang);
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
  // A BLANK label falls through the chain, exactly as a missing one does — `??` alone stopped
  // at "" and handed the caption an empty name, which the "<name> — <value>" templates below
  // (and story-copy's `ranked`/`leads`/`longTail` rows) then rendered as " — 59%, 2nd": a
  // caption opening on a bare separator, the mirror of the locator hole this branch closes.
  // The fix belongs HERE and not in the composer, because unlike a locator's value or a symbol
  // point's label there IS a next rung to fall to: the basemap's own name, then the key.
  const nameOf = (key: string) => {
    const fromData = layout.labels?.[key];
    if (fromData && fromData.trim() !== "") return fromData;
    const fromBasemap = featByKey.get(key)?.properties?.name;
    const basemapName = fromBasemap === undefined ? "" : String(fromBasemap);
    return basemapName.trim() !== "" ? basemapName : key;
  };
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
          : magnitudeCaption(
              nameOf(key),
              fmt(value),
              rank,
              seqTotal,
              rankRole,
              meta.lang,
            );
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
  const takeawayCopy =
    closingInsight(meta.insight, meta.title) ||
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

// THE EDITORIAL RULE FOR A CLOSING LINE, in one place because the whole map family owes the
// reader the same thing: a caption that closes must SAY something, and a line identical to the
// module's own title says nothing — the title is already printed in the persistent header, so
// repeating it verbatim on the last card ends the piece on its own chute. So a journalist's
// `insight` is honoured as the close ONLY when it is genuinely a different sentence; otherwise
// the caller falls through to the data-tied closer it can honestly compute.
//
// Trim-aware on purpose: a trailing newline off a CSV cell or a pasted headline is not an
// editorial difference, and treating it as one is how a title sneaks back onto the last card.
//
// Extracted from deriveMapStory (where it had always been inline, and correct) because the ROUTE
// track — the one map type that composes its own steps rather than going through
// mapStoryToChapters — never had it, and shipped the title as its closing caption on a real
// page. One rule, one implementation, every map type.
export function closingInsight(
  insight: string | undefined,
  title: string,
): string {
  const line = insight?.trim() ?? "";
  return line && line !== title.trim() ? line : "";
}

// THE MAP FAMILY'S CLOSING CAPTION, in one call: the journalist's line when it IS one, and
// otherwise the closer the type computed from its own data. Every map deriver goes through this
// — `closingInsight(...) || derived` written out per file is the shape this defect already had
// once (see closingInsight's own note), and the second half is where it would drift next.
//
// `derived` is a STRING, not a thunk, and deliberately so: every derived closer in this file is
// pure string composition over facts the deriver already holds, so there is nothing to defer,
// and a thunk would let a call site hide work behind a branch that is meant to be free.
//
// AN EMPTY RESULT IS A REAL ANSWER. When a type has nothing honest left to say — one symbol
// point, one hex bin, one plotted place — its closer returns "" and this returns "" with it.
// The consumers then do what they already do with a caption-less takeaway: the scrolly falls
// back to the figure's description (chapters.ts), the video shows no card at all. That is the
// deliberate silence; what it must never be is the title again, which is the whole reason
// `closingInsight` sits in front.
export function closingCaption(
  insight: string | undefined,
  title: string,
  derived: string,
): string {
  return closingInsight(insight, title) || derived;
}

// ── THE DERIVED CLOSERS ─────────────────────────────────────────────────────────────────────
// One per SHAPE OF DATA, not one per map type — the five types that had none each fall into a
// shape that already had, or now has, exactly one honest sentence:
//
//   named subjects, one number each   → deriveTakeawayCopy  (choropleth · symbol · cartogram)
//   anonymous bins over a grid        → deriveBinTakeawayCopy      (hex-grid)
//   one dot stands for N of something → deriveDotTakeawayCopy      (dot-density)
//   plotted places, no numbers at all → derivePlacesTakeawayCopy   (locator)
//
// (route composes its own, `routeSpan`, in route-story.ts — its facts are a trajectory's, and
// its step list is not a beat list.)
//
// Each states facts the data holds and NOTHING MORE. Where a fact would not survive the reader
// checking it — a total over values that do not add up, a rank over a walk that ranked nothing —
// it is not stated. Measured before these existed: all five closed on their own description.

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
  const copy = storyCopy(input.lang);
  const sep = copy.captionSep;
  // The separator belongs to the PAIR, exactly as chapters.ts's `nameAndValue` says for a
  // reveal caption. A choropleth region always has a name (deriveMapStory's `nameOf` falls
  // through to the basemap's, then to the key), so this changes nothing there — but a SYMBOL
  // point's label is optional, and this closer now serves symbol too: written as a bare
  // template it would open the last card on ": 220 MW", the same dangling separator that was
  // measured on a delivered French page for the reveals.
  const named = (name: string, label: string) =>
    name.trim() !== "" ? `${name}${sep}${label}` : label;

  if (input.pattern === "temporal") {
    // Temporal: value = a year; min = earliest, max = latest. Close on the span.
    const span = Math.abs(Math.round(input.maxValue - input.minValue));
    const spanClause = span > 0 ? copy.yearSpan(span) : "";
    // minLabel is the earliest year, maxLabel the most recent.
    return `${named(minName, minLabel)}, ${named(maxName, maxLabel)}${spanClause}`;
  }

  // Magnitude: leader vs tail. Add a "1 to N" ratio when it is meaningful.
  const ratio =
    input.minValue > 0 ? Math.round(input.maxValue / input.minValue) : 0;
  const gapClause = ratio >= 2 ? copy.foldGap(ratio) : "";
  return `${named(maxName, maxLabel)}, ${named(minName, minLabel)}${gapClause}`;
}

/**
 * hex-grid's closer. A binned grid's cells are ANONYMOUS — there is no name to close on, and
 * no total either: `sum`/`count` would add up, but `mean` would not, and one sentence that is
 * true for two aggregates out of three is a sentence this project does not write. What every
 * hex grid does hold, whatever it aggregates, is the PEAK and HOW MANY BINS carry the
 * distribution — so the close states the densest bin's own value (already formatted by the
 * deriver, in the aggregate's own words: "18 points", "12 kWh avg") against the population it
 * leads.
 *
 * Under two bins it says nothing, on purpose: "the densest of 1" is not a peak, it is the only
 * one, and the reveal already showed it.
 */
export function deriveBinTakeawayCopy(input: {
  peakLabel: string;
  binCount: number;
  binShape: "hex" | "square";
  lang?: string;
}): string {
  if (input.binCount < 2 || !input.peakLabel.trim()) return "";
  return storyCopy(input.lang).binPeak(
    input.peakLabel,
    input.binCount,
    input.binShape,
  );
}

/**
 * dot-density's closer. The one thing a dot map asks its reader to hold — and the one thing no
 * reveal states — is the exchange rate: what a single dot stands for, and how much the whole
 * scatter therefore adds up to.
 *
 * Both halves come from the DRAWN dots (`dotValue`, `totalDots`), never from the raw rows.
 * Those differ slightly: a region's dot count is rounded, so the drawn total is not the data's
 * sum to the last unit. The drawn one is the honest number here because it is the one the
 * reader can count — and it is already what every reveal caption states per region
 * (`totalCount * dotValue`), so the close and the walk agree.
 */
export function deriveDotTakeawayCopy(input: {
  dotValueLabel: string;
  totalLabel: string;
  lang?: string;
}): string {
  if (!input.dotValueLabel.trim() || !input.totalLabel.trim()) return "";
  return storyCopy(input.lang).dotWorth(input.dotValueLabel, input.totalLabel);
}

/**
 * locator's closer. A locator marker carries NO number (chapters.ts's own no-value branch says
 * so), so there is no leader, no gap and no total to close on — every quantitative sentence the
 * other types write would be invented here. What a locator does know is how many places it
 * plotted, and how far apart the two furthest of them are: geography, which is the only thing
 * this map type ever asserted.
 *
 * The span is DROPPED below one kilometre rather than rounded to "0 km" — a walk of sites
 * inside one city block spans a real distance the closer cannot state at this precision, and
 * "0 km end to end" would state the opposite of the truth. Under two places it says nothing at
 * all: one marker has no span, and "1 site" is a count the reader already made.
 */
export function derivePlacesTakeawayCopy(input: {
  placeCount: number;
  spanKm: number;
  lang?: string;
}): string {
  if (input.placeCount < 2) return "";
  const copy = storyCopy(input.lang);
  const sites = copy.siteCount(input.placeCount);
  const km = Math.round(input.spanKm);
  if (!Number.isFinite(km) || km < 1) return sites;
  return copy.placesSpan(sites, formatLocaleNumber(km, input.lang));
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

// ── WHAT RANK MAY THIS BEAT CLAIM? ──────────────────────────────────────────────────────────
// ONE answer for the whole map family, because the alternative was measured: the scrolly caption
// engine read rank off a beat's POSITION among the reveals (`i === minBeat` ⇒ "the lowest"), and
// four of the six types walk a plain top-N whose last beat is not the minimum. On built pages,
// 2026-08-08: "Rome — 67$bn, the lowest" with Amsterdam's 52$bn drawn on the same map; "#5
// hexagon — 15 points, the lowest" out of 62; "Denmark — 64, the lowest" out of 18.
//
// So rank is DECLARED by the deriver — which is the only layer that holds the full ordering —
// and merely SPOKEN by the caption engine. `index` is the subject's 0-based place in the
// value-descending ordering of ALL subjects (not its place in the capped walk), `total` is how
// many subjects there are. `rankRole: "tail"` therefore means "this subject IS the minimum",
// never "this beat is last in the walk"; a walk that stops at rank 5 of 6 declares no tail, and
// the caption engine says "the 5th" instead of a superlative it cannot support.
//
// A LONE SUBJECT DECLARES NOTHING (`{}`): one value is not a distribution, so "the highest of
// the 1 shown" is a sentence about a ranking that does not exist. Spread into a Beat literal,
// so an empty declaration simply leaves the tags off.
//
// A deriver whose walk ranks something OTHER than the number its caption prints must not call
// this at all — dot-density orders by dots-per-area while its caption states the region's total,
// so it declares nothing and gets no rank language (see dot-density-story.ts's own note).
export function magnitudeRankTags(
  index: number,
  total: number,
):
  | { pattern: NarrativePattern; rank: number; rankRole: "leader" | "tail" }
  | Record<string, never> {
  if (total <= 1) return {};
  return {
    pattern: "magnitude",
    rank: index + 1,
    rankRole: index === total - 1 ? "tail" : "leader",
  };
}

/**
 * THE MECHANICAL CHECK on the rule above: every rank a beat DECLARES must be true of the whole
 * data, not of the walk. Pure, so the whole family is covered without a render or a network —
 * the same discipline `auditMapStoryReveals` and the closers' tests already use.
 *
 * `subjects` is every subject the map DRAWS, with its raw value, keyed by the name the beat's
 * callout carries. A beat with no rank tags is not checked: it claims nothing.
 */
export function rankClaimViolations(
  beats: Beat[],
  subjects: { name: string; value: number }[],
): string[] {
  const ordered = [...subjects].sort(
    (a, b) => b.value - a.value || a.name.localeCompare(b.name),
  );
  const violations: string[] = [];
  for (const b of beats) {
    if (b.kind !== "reveal" || b.rank === undefined) continue;
    const name = b.callout?.name ?? "";
    const trueRank = ordered.findIndex((s) => s.name === name) + 1;
    if (trueRank === 0) {
      violations.push(
        `reveal "${name}" declares rank ${b.rank} but is not among the ${ordered.length} ` +
          `subjects the map draws — a rank over a set the reader cannot see is not a rank`,
      );
      continue;
    }
    if (trueRank !== b.rank)
      violations.push(
        `reveal "${name}" declares rank ${b.rank} but holds rank ${trueRank} of ` +
          `${ordered.length} in the data`,
      );
    const isMinimum = trueRank === ordered.length;
    if (b.rankRole === "tail" && !isMinimum)
      violations.push(
        `reveal "${name}" declares rankRole "tail" — "the lowest" — but rank ${trueRank} of ` +
          `${ordered.length} is not the minimum the map draws`,
      );
    if (b.rankRole === "leader" && isMinimum && ordered.length > 1)
      violations.push(
        `reveal "${name}" declares rankRole "leader" but holds the minimum of ` +
          `${ordered.length}`,
      );
  }
  return violations;
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

// A rank-aware, data-tied caption for a magnitude reveal. Never invents — it states
// the region, its formatted value, and its factual rank/role in the distribution.
// `lang` picks the shared story-copy row — this was English-only for EVERY language,
// French included, before this fix (its own local `ordinal()` took no lang parameter
// at all); it is verified live-consumed as visible video caption text (`beat.copy`,
// rendered by every map-native *Story.tsx component's <CaptionCard>).
export function magnitudeCaption(
  name: string,
  valueStr: string,
  rank: number,
  revealCount: number,
  role?: "leader" | "tail",
  lang?: string,
): string {
  const copy = storyCopy(lang);
  if (role === "tail") return copy.longTail(name, valueStr);
  if (rank === 1) return copy.leads(name, valueStr);
  return copy.ranked(name, valueStr, rank);
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
