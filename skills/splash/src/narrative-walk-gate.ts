// narrative-walk-gate.ts — a narrative visual is not produced from a plan nobody wrote.
//
// WHY THIS EXISTS, and why HERE. The loop (lib/loop) already holds this rule: `draft-beats` is
// routed before produce, and `unauthoredBeats` blocks a walk whose claims are unwritten. But the
// journalist's own path never enters the loop — `/using-splash` walks the PROSE chain
// (suggest-article → suggest-chart → produce-all) and writes no run manifest at all. Measured on
// Rémy's own runs, 2026-08-05/06: three articles, and the walk was proposed once.
//
// So the rule is re-stated on the chain a journalist actually walks, at the gate that chain
// already calls before any engine runs (produce-all.ts:203, before dispatch at :216). Not a
// bridge between the two chains — two step-machines kept in agreement is a worse bargain than
// one rule written twice and said out loud.
//
// ★ AND IT ONLY DEMANDS WHAT REACHES THE READER. A guard that required a walk for a video with no
// caption surface would make a journalist write sentences the render drops — which is the exact
// defect this whole line of work exists to close, rebuilt by the fix meant to close it. The list
// below is therefore a list of DEMONSTRATED capability, not of intent.

import type { AcceptedProposal } from "./producer-spec";

/**
 * WHERE A CONFIRMED WALK REACHES THE READER TODAY — (producer, format) pairs, each entry earned
 * by a rendered proof rather than by a plan.
 *
 * `scrolly` for every hosted track: the browser scrolly walks its steps and shows the sentence of
 * each (skills/scrolly). `map-native` + `video`: the Story family paints its beat's words
 * (`CaptionCard`). `chart-native` + `video`: since 2026-08-06, and for the types that can carry a
 * walk at all — see `WALK_CAPABLE_CHART_TYPES`.
 *
 * A pair NOT in this list is not "unsupported", it is "the words would not reach anyone" — and
 * the guard stays silent for it rather than demanding writing nobody will read.
 */
const WALK_REACHES_READER: readonly { producer: string; format: string }[] = [
  { producer: "scrolly", format: "scrolly" },
  { producer: "image-native", format: "scrolly" },
  { producer: "map-native", format: "video" },
  { producer: "chart-native", format: "video" },
];

/**
 * The chart types whose VIDEO can carry a walk — read from the same measurement that opened
 * them: a walk needs a per-subject entrance to order, and a caption surface to speak through.
 *
 * `bar` alone today. 27 of the 41 chart components share the same staggered entrance and could
 * join with a per-type anchor declaration; the remaining 14 (pie, sankey, heatmap, stacked-area,
 * sunburst, violin, bump, calendar, connected-scatter, dot-strip, fan, lorenz, parallel,
 * pictogram) plus `line` animate by ONE continuous scalar — a sweep, a wipe, a draw — so they
 * have no per-subject entrance at all and need a segmented reveal, which is a different
 * mechanism. Measured 2026-08-06, not assumed.
 */
const WALK_CAPABLE_CHART_TYPES: readonly string[] = ["bar"];

/** The two `cameraMode` values that resolve to the REVEAL family (skills/map-native's
 *  storyComps): a fixed camera and a route's own draw-on. Both animate the DATA and paint no
 *  beat text — Rémy, 2026-08-06: "le reveal n'inclut pas des mots, c'est normal". */
function isRevealKind(cameraMode?: string): boolean {
  return cameraMode === "simple" || cameraMode === "route-reveal";
}

function cameraModeOf(spec: unknown): string | undefined {
  const s = spec as { cameraMode?: unknown } | null;
  return typeof s?.cameraMode === "string" ? s.cameraMode : undefined;
}

function nativeTypeOf(spec: unknown): string {
  const s = spec as { type?: unknown; nativeType?: unknown } | null;
  return String(s?.nativeType ?? s?.type ?? "");
}

/**
 * THE WALK, whatever the track calls it. Three carriers, because three tracks arrived at the same
 * rule independently:
 *   - `beats`    — the chart track (BriefBeat: anchor + role + text)
 *   - `arcBeats` — the map track (MapArcBeat: region + role + text)
 *   - `frames[].caption` — the IMAGE track, which had this rule FIRST and carries it best: each
 *     frame holds its caption AND the `sourcePassage` it was drawn from. That pairing is the
 *     model the rest of this work transposed (skills/suggest-image), so a guard that did not
 *     recognise it would refuse the one track that already did the right thing — which is what
 *     it did, on its first run, against a perfectly valid image scrolly.
 */
function hasConfirmedWalk(spec: unknown): boolean {
  const s = spec as
    | {
        beats?: unknown;
        arcBeats?: unknown;
        frames?: { caption?: unknown }[];
      }
    | null;
  if (s && Array.isArray(s.frames))
    return (
      s.frames.length > 0 &&
      s.frames.every((f) => String(f?.caption ?? "").trim().length > 0)
    );
  const walk = (Array.isArray(s?.beats) ? s?.beats : s?.arcBeats) as
    | { text?: unknown }[]
    | undefined;
  if (!Array.isArray(walk) || walk.length === 0) return false;
  // WRITTEN, not merely present. A walk of anchors with no claims is the shape `draft-beats`
  // hands over BEFORE the journalist writes — accepting it here would let the machine's skeleton
  // ship as if it were their argument, which is the one thing the beats seam exists to prevent.
  return walk.every((b) => String(b?.text ?? "").trim().length > 0);
}

/**
 * The refusal, or null. ROUTED: it names the form, why the walk is owed, and the act that
 * resolves it — the convention every refusal on this spine follows, because "invalid" leaves the
 * journalist to guess.
 */
/**
 * ★ THE CAPABILITY, ASKABLE — the same knowledge the guard refuses on, exposed so a caller can
 * QUERY it instead of recalling it.
 *
 * This exists because of a measured failure, not a hypothesis. On 2026-08-06 a journalist was
 * told his bar video could not carry his sentences — nine minutes after the merge that made it
 * carry them, and with the prose that says so loaded. Prose stating a capability was not enough:
 * the orchestrator asserted an incapacity it never checked, and a refusal is CREDIBLE, so the
 * capability would have died unnoticed.
 *
 * A guard cannot catch that: it refuses what is attempted, and nothing was attempted. The only
 * mechanism that can is one that answers the question, so "I don't think I can" becomes "the
 * registry says I cannot".
 */
export type WalkCapability = {
  /** Does a confirmed walk reach a reader through this form? */
  carriesWalk: boolean;
  /** Where the words appear, or why they would not — in the journalist's terms. */
  why: string;
};

export function walkCapability(
  producer: string,
  nativeType: string,
  format: string,
  /** The map video's narrative KIND, as `cameraMode` names it. A map video is not one thing:
   *  `guided-tour` (the default) and `stepped` NARRATE — their families paint the beat's words
   *  (`CaptionCard`, `ScrollyPanel`). `simple` and `route-reveal` are the REVEAL family, which
   *  by design shows no words at all: the camera holds and the DATA animates. A walk still
   *  orders a reveal's entrances (sub-project ④), but its sentences never appear — so demanding
   *  them would make a journalist write for a screen that will not show them. */
  cameraMode?: string,
): WalkCapability {
  const reaches = WALK_REACHES_READER.some(
    (e) => e.producer === producer && e.format === format,
  );
  if (!reaches)
    return {
      carriesWalk: false,
      why:
        `a ${format} produced by ${producer} tells no story in steps — there is no surface ` +
        `for a step's sentence, so a walk would be written and dropped`,
    };
  if (producer === "map-native" && format === "video" && isRevealKind(cameraMode))
    return {
      carriesWalk: false,
      why:
        `a fixed-camera map video (cameraMode "${cameraMode}") is a REVEAL: the camera holds ` +
        `and the data animates, with no caption surface at all. A confirmed walk still orders ` +
        `what appears when, but its sentences would never be shown — so none are owed. Choose ` +
        `the guided tour or the stepped kind if the words are to be read`,
    };
  if (producer === "chart-native" && !WALK_CAPABLE_CHART_TYPES.includes(nativeType))
    return {
      carriesWalk: false,
      why:
        `a "${nativeType}" video animates by one continuous scalar, so it has no per-subject ` +
        `entrance for a step to sit on (walk-capable chart videos today: ` +
        `${WALK_CAPABLE_CHART_TYPES.join(", ")})`,
    };
  return {
    carriesWalk: true,
    why:
      `a ${format} on ${producer}${nativeType ? ` ("${nativeType}")` : ""} carries a confirmed ` +
      `walk: each step's sentence appears with the subject it is about`,
  };
}

export function narrativeWalkError(p: AcceptedProposal): string | null {
  // ONE answer, asked here and by the CLI alike — a guard that refuses on different knowledge
  // from the one a caller can query is two truths about the same product.
  if (
    !walkCapability(
      p.producer,
      nativeTypeOf(p.spec),
      p.format,
      cameraModeOf(p.spec),
    ).carriesWalk
  )
    return null;
  if (hasConfirmedWalk(p.spec)) return null;
  const what = p.format === "scrolly" ? "A scrolly" : "A narrative video";
  return (
    `${what} proves its claim step by step, and this one carries no confirmed walk. ` +
    `Propose the steps to the journalist — which anchor each one sits on, and the sentence ` +
    `each one asserts, drawn from the passage of THEIR article that speaks to it — take their ` +
    `corrections, and put the confirmed walk on the spec ` +
    `(${p.producer === "map-native" ? "arcBeats" : "beats"}) before producing. ` +
    `A step whose claim is unwritten is not publishable.`
  );
}
