// lib/brain/beats.ts
// THE DRAFT half of the beats seam — the exact counterpart of lib/brain/offer.ts.
//
// A chart scrolly is a narrative page, and until now its narrative beats were DERIVED from the
// data and shipped as-is: skills/scrolly/src/Scrolly.tsx:139 calls deriveChartStory(), the
// sample configs carry no `beats` at all, and the auto-picked captions ("2007 — 4.3") appear
// under a journalist's byline. The locked socle says the opposite — on the article branch the
// tool COMPOSES the text the journalist brings and does not write the journalism.
//
// So this module drafts, and nothing here ships. It hands over DATA — ids, an order, anchors,
// the numbers each claim may cite — with every claim deliberately UNWRITTEN, exactly as
// buildOffer hands over `whySource` with every `why` empty. lib/brain/verify-beats.ts is what
// keeps the authoring turn to authoring, and lib/loop/beats.ts is the one path that calls it.
//
// THE NAME IS THE POINT. `deriveChartStory` reads like a fact — *the* story of the chart —
// while it is a bet on data salience; the codebase has just applied that same discipline to
// `intentsFromAngle` → `suggestIntents` ("a name that reads like a fact is how a guess ends up
// believed"). What this produces is a SuggestedBeat whose caption is a `draftText`. The engine's
// own function keeps its misleading name for now: it lives in skills/chart-native/src/, outside
// this slice's file boundary (see the design spec §1.1).
import { ARC_ROLES, type ArcRole } from "../core/claim-arc";
import { parseCsvRows } from "../loop/profile";
import { AUTHORABLE_SCROLLY_TYPES } from "../../skills/chart-native/src/chart-story";
import { IMAGE_SCROLLY_TYPE } from "../../skills/image-native/src/image-story";
import { ARC_CAPABLE_MAP_TYPES } from "../../skills/map-native/src/map-arc";

/**
 * THE MAP TYPES A WALK CAN BE PROPOSED FOR — sub-project ③
 * (docs/superpowers/specs/2026-08-04-proposal-step-design.md § 2).
 *
 * DERIVED from the engine's own list rather than retyped, the same discipline BEAT_TYPES already
 * follows for the chart track: a type that joins ARC_CAPABLE_MAP_TYPES tomorrow is proposable the
 * same day, and a list that drifts from the engine's cannot be the thing that decides.
 *
 * `route` and `hex-grid` are SUBTRACTED, and not as an oversight. Every other arc-capable type
 * anchors on a key the frozen data already carries (a region code, a marker label), so a walk can
 * be drafted from the CSV alone. Those two anchor on something that does not exist until produce
 * time — a computed territory (`resolveRouteArc`) and a binned grid cell whose place has no name
 * until the binning runs (`resolveHexGridArc`, and map-arc.ts's own comment on why `lon`/`lat` are
 * hex-grid-only). Drafting for them would mean inventing an anchor and asking the journalist to
 * write against it, which is the defect this seam exists to remove. They keep their hand-written
 * `arcBeats`; the spec's § 4.3 correction (sub-project ②) is where this was established.
 */
// Typed `readonly string[]` rather than keeping the engine list's literal union: callers ask
// "is THIS type proposable?" about a `nativeType` that arrives as a plain string from the
// manifest, and a union-typed `.includes` refuses that question at compile time — which would
// push callers into a cast, the silent kind of widening this file argues against everywhere else.
export const PROPOSABLE_MAP_TYPES: readonly string[] = ARC_CAPABLE_MAP_TYPES.filter(
  (t) => t !== "route" && t !== "hex-grid",
);

/**
 * THE ONE WORDING for "an image scrolly needs the journalist's own photographs".
 *
 * Two readers, and they must never come to say it differently: the OFFER marks an image-native
 * form with it (lib/brain/eligibility.ts — the brain cannot see `run.input.images`, so it cannot
 * tell a run that has declared photographs from one that has not, and offering the form clean to
 * the second strands it at `draft-beats`), and the DRAFTER refuses with it when the photographs
 * really are absent (lib/loop/beats.ts). Same discipline, and the same reason, as
 * MAP_TRACK_BEATS_REFUSAL in skills/scrolly/src/scrolly-types.ts: a journalist meeting the rule
 * twice has to read it once.
 */
export const IMAGE_SCROLLY_PHOTOGRAPHS_NEEDED =
  "an image scrolly walks the journalist's own photographs, and none are declared with this " +
  "run — bring a photograph (with its alt text and credit) for each beat of the walk";

// Hand-synced with NarrativeBeatSchema's anchor (lib/loop/manifest.ts) rather than built from
// its z.infer, the same discipline GeographyRefSchema's plain-type twin already uses (that
// schema's own comment) — this module has to stay importable without zod riding along.
// `region` is now EMITTED by suggestBeats itself (sub-project ③ — the map track's proposal
// step); `place` still is not, and is widened here only so this type keeps compiling against
// the manifest's anchor — a hex-grid's place has no name until the binning runs, so nothing can
// draft one (PROPOSABLE_MAP_TYPES' own comment).
// Kept as a 4-arm discriminated union (a local convention already in place before this widening)
// rather than one flat object with optional `lon`/`lat` on every kind, unlike GeographyRef's
// flat-mirror style — both compile clean; this file continues what was already here.
export type BeatAnchor =
  | { kind: "x"; value: string } // line: a value of the x column
  | { kind: "category"; value: string } // bar: a value of the category column
  | { kind: "region"; value: string; lon?: number; lat?: number } // map: a named region
  | { kind: "place"; value: string; lon?: number; lat?: number }; // hex-grid: a named place

export type BeatSource = {
  /** The numbers THIS beat's claim may cite — its anchor and its value. */
  facts: Record<string, string>;
  /** The numbers ANY beat of the plan may cite — the shape of the series. */
  shared: Record<string, string>;
};

export type SuggestedBeat = {
  /** Positional — the id encodes the order, which is what verifyBeats checks. */
  id: string;
  anchor: BeatAnchor;
  role: ArcRole;
  /** A data-tied caption offered as a STARTING POINT. Shown to the journalist, never shipped:
   *  lib/loop/produce.ts refuses to build a page whose beats carry no authored text. */
  draftText: string;
  beatSource: BeatSource;
};

export type BeatDraft = { beats: SuggestedBeat[]; refusal?: string };

export type SuggestBeatsInput = {
  nativeType: string;
  dataCsv: string;
  /** Short caption unit ("%", "CHF"). Preferred over `unit`, which is the long axis label. */
  valueUnit?: string;
  unit?: string;
  /** The journalist's OWN anchor list, in their own order — the re-draft door that makes
   *  verifyBeats' exact-order refusal legitimate rather than a dead end. */
  anchors?: string[];
  /** WHICH column the anchor is read from — the map track's own, and required there in
   *  practice: a map's region column is whatever the geography MATCHED
   *  (`run.orient.geo.column`), and nothing guarantees it is column 0. Anchoring on the first
   *  column regardless would draft a walk against the wrong column SILENTLY, since its values
   *  are still strings the data carries. Absent on the chart track, where the first column is
   *  the axis by construction (the shape chart-native itself reads). */
  keyColumn?: string;
  /** WHICH column the beat's value is read from. The map track resolves this the way its own
   *  assembler does (`valueFieldFor`, from the confirmed takeaway) rather than taking the last
   *  numeric column: a draft citing a number the map will not render would ground the
   *  journalist's claims against a column the reader never sees. Absent on the chart track,
   *  where the engine renders the last numeric column — which is what this already picked. */
  valueColumn?: string;
};

// The engine's beats override supports line and bar only (skills/chart-native/src/chart-story.ts,
// narrativeBeatErrors). Refused in THE ENGINE'S OWN WORDS rather than in a second wording a
// journalist would have to reconcile with the one the render gate shows — and READ from the
// engine's own exported list rather than retyped here, which is what this comment used to
// promise and a `new Set(["line", "bar"])` could only be trusted to keep.
const BEAT_TYPES = new Set<string>(AUTHORABLE_SCROLLY_TYPES);

/** The map types this drafter can propose a walk for (see PROPOSABLE_MAP_TYPES above). */
const MAP_BEAT_TYPES = new Set<string>(PROPOSABLE_MAP_TYPES);

/** Every type this drafter reads a CSV for — the chart track and the map track together. */
function drafts(nativeType: string): boolean {
  return BEAT_TYPES.has(nativeType) || MAP_BEAT_TYPES.has(nativeType);
}

/**
 * CAN THE LOOP DRAFT A WALK FOR THIS TRACK AT ALL — the one question
 * `nextActionsForElement` needs before it routes an element to `draft-beats`.
 *
 * It exists because the routing and the drafter disagreed in silence. `manifest.ts` sent EVERY
 * narrative-less scrolly to `draft-beats`, `suggestBeats` refused every track but line and bar,
 * and `draftBeats`/`applyBeats` are the only writers of `el.narrative` — so a map or image
 * scrolly answered the same impossible action forever, with no route back (`deadEndReason` is
 * consulted only on "choose-form"). One predicate, read by the router and honoured by the
 * drafter, is what keeps them from drifting apart again.
 *
 * A MAP scrolly is deliberately absent — but not because it has no confirmed walk of its own.
 * Every map-native type now carries `arcBeats` (region-anchored: `{region, role, text}`,
 * `skills/map-native/src/map-arc.ts`'s `ARC_CAPABLE_MAP_TYPES`), the map's own confirm/tweak/veto
 * override, exactly like this track's `beats`. It is absent HERE because `arcBeats` is never
 * MACHINE-DRAFTED — the journalist's own wording is pinned verbatim, with no `draft-beats` step
 * to route to in the first place (unlike a chart's `beats`, which this predicate exists to gate).
 * `assembleScrolly` still refuses an authored `beats` plan on the map track outright — that part
 * is unchanged — so a map scrolly goes straight to produce, never through this drafter.
 *
 * A SCATTER scrolly is absent too, and is not routed to produce either: the scrolly renderer
 * hosts one and would DERIVE its captions, which is the defect this whole seam exists to remove,
 * so the offer MARKS it instead (lib/loop/assemble/scrolly.ts's SCROLLY_TRACK_TYPES). That is why
 * this predicate and the table's `supports` read the SAME engine list — a type the loop offers
 * as a scrolly and cannot draft a walk for would strand a run all over again.
 */
export function canDraftBeats(nativeType: string, format: string): boolean {
  // THE CHART AND IMAGE TRACKS — `scrolly` only, and the exclusion of `video` is DELIBERATE.
  // chart-native's seven `*Reveal` components do not read a beat plan at all (the measured
  // inventory, docs/splash/gesture-inventory-2026-08-03.md §4). Routing a chart video here would
  // draft a walk, block production until the journalist wrote every claim, and then render
  // something that ignores every word of it — worse than not proposing. Sub-project ④ is what
  // makes those components honour a walk; the day it does, `video` joins this line.
  // THE CHART TRACK. `scrolly` always; `video` for the types whose VIDEO component honours a
  // walk — which since sub-project ④ is `bar`: its bars enter in the journalist's order rather
  // than in reading order (BarChart's `barP` reads core/walk.ts's walkPositions).
  //
  // `line` is absent, and measured rather than deferred by default: a line video has NO
  // per-subject entrance to reorder — the line draws continuously by cumulative length
  // (revealLine), and LineChart's only `stagger` calls are for gridlines and axis labels.
  // Expressing a walk there means segmenting the draw into per-beat pauses, a different
  // mechanism from an entrance order, so it stays closed until that exists rather than being
  // opened onto something that would ignore it.
  //
  // The image track is `scrolly`-only: no other format renders one.
  if (BEAT_TYPES.has(nativeType) || nativeType === IMAGE_SCROLLY_TYPE)
    return (
      format === "scrolly" || (format === "video" && nativeType === "bar")
    );
  // THE MAP TRACK — sub-project ③. Both narrative formats, because both honour a walk TODAY:
  // the browser scrolly reads `arcBeats` (skills/scrolly/src/ScrollyMap.tsx:73,223) and the
  // video's `story` family walks the beats (gesture-inventory §1). A map's `static` and
  // `interactive` render a different component family with no notion of a beat at all
  // (`narrativeKindFor` resolves them to `undefined`), so they are absent here rather than
  // refused later.
  if (MAP_BEAT_TYPES.has(nativeType))
    return format === "scrolly" || format === "video";
  return false;
}

/** A claim-arc needs establish + at least one build + payoff. Fewer anchors than this is not a
 *  short argument, it is no argument — and a narrative PAGE is exactly where that matters. */
const MIN_BEATS = 3;

/** Round to at most two decimals and drop the trailing zeros, so a computed fact reads the way
 *  a journalist would write it ("-2.7", not "-2.7000000000000006"). */
function fmtNum(v: number): string {
  return String(Math.round(v * 100) / 100);
}

function shortUnit(input: SuggestBeatsInput): string {
  const vu = input.valueUnit?.trim();
  if (vu) return vu;
  const uu = input.unit?.trim();
  // Mirrors chart-story.ts's caption rule: fall back to the axis label only when it is already
  // short enough to sit inside a sentence.
  return uu && uu.length <= 4 && !uu.includes(" ") ? uu : "";
}

function withUnit(value: string, unit: string): string {
  if (!unit) return value;
  return unit === "%" ? `${value}%` : `${value} ${unit}`;
}

/** establish opens, payoff closes, everything between builds — and `turn` is NEVER guessed.
 *  The turn is the pivot of the argument (Cohn's Peak), an editorial judgement about what the
 *  point IS; the journalist can set it, and arcErrors keeps the result well-formed. */
function roleAt(i: number, n: number): ArcRole {
  if (i === 0) return "establish";
  if (i === n - 1) return "payoff";
  return "build";
}

// The notable points of a LINE: always the first and the last, plus the interior points with the
// biggest step-to-step move. Ascending, unique, at most four. Mirrors chart-native's
// lineNotableIndices — pinned byte-for-byte by lib/brain/beats-drift.test.ts, which imports the
// engine's own function. (The right home for this is lib/core, where claim-arc.ts was moved for
// exactly this reason; that move edits chart-native and is outside this slice — spec §8.)
function lineAnchorIndices(ys: number[]): number[] {
  const n = ys.length;
  if (n <= 2) return ys.map((_, i) => i);
  const interior = ys
    .slice(1, -1)
    .map((y, i) => ({ i: i + 1, jump: Math.abs(y - ys[i]) }))
    .sort((a, b) => b.jump - a.jump || a.i - b.i)
    .slice(0, 2)
    .map((c) => c.i);
  return [...new Set([0, ...interior, n - 1])].sort((a, b) => a - b);
}

// The salient rows of a BAR: the three leaders plus the tail — a distribution two beats cannot
// carry. Returned in DATA ROW ORDER, not in rank order, and that is a mechanical constraint
// rather than a preference: a spec carrying beats resolves the bar sort to "none"
// (resolveBarSort), so the bars render in data row order, and a walk in any other order makes
// the highlight jump around the chart — which is precisely what narrativeBeatWarnings exists to
// flag. The SET is the engine's (barRankedReveals); the ORDER follows what will be rendered.
function barAnchorIndices(values: number[]): number[] {
  const ranked = values
    .map((v, i) => ({ v, i }))
    .sort((a, b) => b.v - a.v || a.i - b.i);
  const picked = new Set(
    ranked.slice(0, Math.min(3, ranked.length)).map((r) => r.i),
  );
  if (ranked.length > picked.size) picked.add(ranked[ranked.length - 1]!.i);
  return [...picked].sort((a, b) => a - b);
}

export function suggestBeats(input: SuggestBeatsInput): BeatDraft {
  if (!drafts(input.nativeType))
    return {
      beats: [],
      // NAMES BOTH TRACKS, because a walk can now be drafted for either — and names them from
      // the two lists themselves, so a type that joins one of them never has to be added here
      // too. `route` and `hex-grid` land HERE deliberately: they are arc-capable but not
      // proposable (PROPOSABLE_MAP_TYPES' own comment), and a journalist who asks for one must
      // read WHY rather than "unsupported".
      refusal:
        `a beat plan can be drafted for ${[...BEAT_TYPES].join(" and ")} chart scrollies and ` +
        `for ${[...MAP_BEAT_TYPES].join(", ")} maps (got "${input.nativeType}")` +
        (input.nativeType === "route" || input.nativeType === "hex-grid"
          ? ` — a ${input.nativeType} anchors on something that does not exist until produce ` +
            `time, so there is nothing to anchor a draft on; write its arcBeats directly`
          : ""),
    };

  const { columns, rows, numericColumns } = parseCsvRows(input.dataCsv);
  // NAMED WINS over positional, and a name the data does not carry refuses loud with the list
  // of what it does — the same philosophy as the anchor refusal below, and the same reason: a
  // typo must never silently shift a walk onto another column.
  if (input.keyColumn && !columns.includes(input.keyColumn))
    return {
      beats: [],
      refusal:
        `the anchor column "${input.keyColumn}" is not in the data — columns: ` +
        `${columns.join(", ")}`,
    };
  const labelCol = input.keyColumn ?? columns[0];
  if (!labelCol)
    return {
      beats: [],
      refusal: "the data has no columns to anchor a beat on",
    };
  if (input.valueColumn && !numericColumns.includes(input.valueColumn))
    return {
      beats: [],
      refusal:
        `the value column "${input.valueColumn}" is not a numeric column of the data — ` +
        `numeric columns: ${numericColumns.join(", ") || "none"}`,
    };
  const valueCol = input.valueColumn ?? numericColumns[numericColumns.length - 1];
  if (!valueCol)
    return {
      beats: [],
      refusal:
        "no numeric column in the data — a beat asserts a value, and there is none to assert",
    };
  // A native line draws ONE series; chart-native refuses a wide multi-series CSV outright
  // (UnsupportedNativeType → the dw-chart fallback). Drafting beats for a chart that will never
  // be built this way would be work thrown away, and a refusal here says so before it happens.
  const seriesCols = numericColumns.filter((c) => c !== labelCol);
  if (input.nativeType === "line" && seriesCols.length > 1)
    return {
      beats: [],
      refusal:
        `a line beat plan draws one series, and the data carries ${seriesCols.length} ` +
        `(${seriesCols.join(", ")}) — narrow it to the one the point is about`,
    };

  const labels = rows.map((r) => String(r[labelCol]));
  const values = rows.map((r) => Number(r[valueCol]));

  // WHICH rows carry the story. An explicit list is the journalist's own — honoured in their
  // order, and refused loud on an anchor the data does not contain (the same philosophy as the
  // engine's fail-loud anchor tripwire: a typo must never silently drop or shift a beat).
  let indices: number[];
  if (input.anchors) {
    const missing = input.anchors.filter((a) => !labels.includes(a));
    if (missing.length)
      return {
        beats: [],
        refusal:
          `anchor${missing.length > 1 ? "s" : ""} ${missing.map((m) => `"${m}"`).join(", ")} ` +
          `not found in the data — valid values: ${labels.join(", ")}`,
      };
    indices = input.anchors.map((a) => labels.indexOf(a));
  } else {
    indices =
      input.nativeType === "line"
        ? lineAnchorIndices(values)
        : barAnchorIndices(values);
  }

  if (indices.length < MIN_BEATS)
    return {
      beats: [],
      refusal:
        `${indices.length} anchor${indices.length === 1 ? "" : "s"} is not an argument — a ` +
        `claim-arc opens on an establish beat, needs at least one build, and closes on a ` +
        `payoff (${ARC_ROLES.join(" → ")}). Bring more of the series, or make this an ` +
        `embeddable element rather than a narrative page`,
    };

  const unit = shortUnit(input);
  const shared = sharedFacts(input.nativeType, values);
  // A MAP anchors on `region` — the same key its engine already reads (`MapArcBeat.region`), so
  // the projection in lib/loop/assemble/brief.ts is a rename of nothing rather than a guess.
  const kind: BeatAnchor["kind"] = MAP_BEAT_TYPES.has(input.nativeType)
    ? "region"
    : input.nativeType === "line"
      ? "x"
      : "category";
  const valueRank = [...values]
    .map((v, i) => ({ v, i }))
    .sort((a, b) => b.v - a.v || a.i - b.i)
    .map((r) => r.i);

  return {
    beats: indices.map((rowIndex, i) => {
      const label = labels[rowIndex]!;
      const value = fmtNum(values[rowIndex]!);
      return {
        id: `beat-${i + 1}`,
        anchor: { kind, value: label } as BeatAnchor,
        role: roleAt(i, indices.length),
        draftText: `${label} — ${withUnit(value, unit)}`,
        beatSource: {
          facts: {
            // KEYED BY THE ANCHOR'S OWN KIND, never by a binary. The binary that used to sit
            // here read `kind === "x" ? "x" : "category"` and would have labelled a region as a
            // chart category the day a third kind arrived — the exact silent-drift shape
            // beatsFor refuses loud about (lib/loop/assemble/brief.ts).
            [kind]: label,
            value,
            rank: String(valueRank.indexOf(rowIndex) + 1),
          },
          shared,
        },
      };
    }),
  };
}

/**
 * THE IMAGE WALK — one beat per declared photograph, in the order the journalist declared them.
 *
 * The counterpart of suggestBeats, and deliberately NOT a branch inside it: there is no CSV to
 * read, no salience to measure, and nothing to derive. The captions of an image scrolly ARE the
 * beats (lib/loop/assemble/image-native.ts zips frames to beats one-to-one), so what the brain
 * can hand over here is the SHAPE of the walk — how many claims, in which order, against which
 * photograph — and nothing else.
 *
 * `draftText` is therefore EMPTY, and that is the honest value rather than a missing one: Splash
 * runs no vision matching between a photograph and any prose (image-native.ts's own header), so
 * it has never looked at the image and has nothing to suggest. The ANCHOR names the frame, which
 * is what a journalist needs in order to know which photograph they are writing.
 *
 * ACCEPTED LIMITATION, inherited from verifyBeats' claim grounding: an image beat's facts are its
 * frame and its position, so a caption asserting a number the walk does not carry ("the canal
 * opened in 1887") is REFUSED — there is no data behind a photograph for the guard to check it
 * against. Loud and retryable, never silent; loosening the guard for one track would loosen it
 * for the chart track it was written for.
 */
export function suggestImageBeats(
  frames: readonly { frameRef: string }[],
): BeatDraft {
  if (frames.length < MIN_BEATS)
    return {
      beats: [],
      refusal:
        `${frames.length} photograph${frames.length === 1 ? "" : "s"} is not an argument — a ` +
        `claim-arc opens on an establish beat, needs at least one build, and closes on a ` +
        `payoff (${ARC_ROLES.join(" → ")}). Declare more photographs with the run`,
    };
  return {
    beats: frames.map((f, i) => ({
      id: `beat-${i + 1}`,
      anchor: { kind: "category", value: f.frameRef } as BeatAnchor,
      role: roleAt(i, frames.length),
      draftText: "",
      beatSource: {
        facts: { frame: f.frameRef, position: String(i + 1) },
        shared: { photographs: String(frames.length) },
      },
    })),
  };
}

// The plan-wide numbers, computed once and cited by any beat. This is the brain's job and
// nowhere else's — lib/brain/facts.ts's header states the rule this follows: "every number a
// limit can be checked against comes from here, so a limit is never checked against a guess".
function sharedFacts(
  nativeType: string,
  values: number[],
): Record<string, string> {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (nativeType === "line") {
    const first = values[0]!;
    const last = values[values.length - 1]!;
    return {
      points: String(values.length),
      first: fmtNum(first),
      last: fmtNum(last),
      min: fmtNum(min),
      max: fmtNum(max),
      change: fmtNum(last - first),
      changePercent: first === 0 ? "0" : fmtNum(((last - first) / first) * 100),
    };
  }
  const total = values.reduce((a, b) => a + b, 0);
  return {
    rows: String(values.length),
    top: fmtNum(max),
    bottom: fmtNum(min),
    range: fmtNum(max - min),
    total: fmtNum(total),
    topShare: total === 0 ? "0" : fmtNum((max / total) * 100),
  };
}
