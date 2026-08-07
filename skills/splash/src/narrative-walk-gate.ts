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
import { chartWalk } from "../../chart-native/src/core/chart-walk";
import {
  narrativeKindsFor,
  KIND_FOR_CAMERA_MODE,
  CAMERA_MODE_FOR_KIND,
} from "./narrative-kinds";

/**
 * WHERE A CONFIRMED WALK REACHES THE READER TODAY — (producer, format) pairs, each entry earned
 * by a rendered proof rather than by a plan.
 *
 * `scrolly` for every hosted track: the browser scrolly walks its steps and shows the sentence of
 * each (skills/scrolly). `map-native` + `video`: the Story family paints its beat's words
 * (`CaptionCard`). `chart-native` + `video`: since 2026-08-06, and for the types that can carry a
 * walk at all — which, since the walk registry opened, is every type it ships.
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
 * WHETHER THIS CHART TYPE'S VIDEO CAN CARRY A WALK — read from the engine's own walk registry.
 *
 * It was a hand-typed list holding one name, `bar`, and that list WAS the hole: forty types
 * offered a single narrative kind, one offer is not a question, so the journalist was never asked
 * and no storyboard was ever proposed. The cause was a conflation — SHOWING the beat's sentence
 * and REORDERING the entrance into the journalist's order were treated as one capability, when
 * only the first is what this guard asks about.
 *
 * Every type now renders through the caption stage, at one of two grains (anchored / sequenced —
 * `core/chart-walk.ts`), so the question reduces to: is this a type the engine ships? DERIVED
 * rather than retyped, so a type that joins the registry is covered the day it joins.
 */
function chartVideoCarriesWalk(nativeType: string): boolean {
  return chartWalk(nativeType) !== undefined;
}

/** The two `cameraMode` values that resolve to the REVEAL family (skills/map-native's
 *  storyComps): a fixed camera and a route's own draw-on. Both animate the DATA and paint no
 *  beat text — Rémy, 2026-08-06: "le reveal n'inclut pas des mots, c'est normal". */
function isRevealKind(cameraMode?: string): boolean {
  return cameraMode === "simple" || cameraMode === "route-reveal";
}

function sweepCarrierOf(spec: unknown): string | undefined {
  const s = spec as { sweepCarrier?: unknown } | null;
  return typeof s?.sweepCarrier === "string" ? s.sweepCarrier : undefined;
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
  const s = spec as {
    beats?: unknown;
    arcBeats?: unknown;
    frames?: { caption?: unknown }[];
  } | null;
  if (s && Array.isArray(s.frames))
    return (
      s.frames.length > 0 &&
      s.frames.every((f) => String(f?.caption ?? "").trim().length > 0)
    );
  const walk = (Array.isArray(s?.beats) ? s?.beats : s?.arcBeats) as
    { text?: unknown }[] | undefined;
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
  if (
    producer === "map-native" &&
    format === "video" &&
    isRevealKind(cameraMode)
  )
    return {
      carriesWalk: false,
      why:
        `a fixed-camera map video (cameraMode "${cameraMode}") is a REVEAL: the camera holds ` +
        `and the data animates, with no caption surface at all. A confirmed walk still orders ` +
        `what appears when, but its sentences would never be shown — so none are owed. Choose ` +
        `the guided tour or the stepped kind if the words are to be read`,
    };
  if (producer === "chart-native" && !chartVideoCarriesWalk(nativeType))
    return {
      carriesWalk: false,
      why:
        `"${nativeType}" is not a chart type this engine renders, so it has no video to carry ` +
        `a walk`,
    };
  return {
    carriesWalk: true,
    why:
      `a ${format} on ${producer}${nativeType ? ` ("${nativeType}")` : ""} carries a confirmed ` +
      `walk: each step's sentence appears with the subject it is about`,
  };
}

/**
 * The kind this video was TOLD it is — from the journalist's own choice, or, failing that, from an
 * explicit `cameraMode` already on the spec.
 *
 * Reading `cameraMode` is not a silent default sneaking back in: it is the field the map engines
 * have always read, and a spec that carries one has answered the question in the older vocabulary.
 * Refusing it would be asking the same question twice, and would break the invariant this whole
 * lot is bounded by — a run from yesterday resumes. What is NOT read is the engine's own fallback:
 * a spec with no `cameraMode` at all has said nothing, and silence is not an answer.
 */
function declaredKind(p: AcceptedProposal): string | undefined {
  if (p.narrativeKind) return p.narrativeKind;
  const mode = cameraModeOf(p.spec);
  return mode ? KIND_FOR_CAMERA_MODE[mode] : undefined;
}

export function narrativeWalkError(p: AcceptedProposal): string | null {
  // ★ THE KIND DECIDES, and its absence is a QUESTION, not a default. A video that never said
  // which narrative kind it is cannot be judged: demanding a walk might make a journalist write
  // for a reveal that shows no words, and demanding nothing would let a stepped ship unwritten.
  // Refused by name — "no silent default" made mechanical (design spec 2026-08-06 § 6.1).
  if (p.format === "video") {
    // A CHOICE is only owed where there IS one. A pie video offers the reveal and nothing else;
    // a Datawrapper form offers no narrative kind at all. Asking a journalist to pick from a
    // list of one is noise, and refusing for a missing answer to a question with one possible
    // reply would block legitimate work — the failure this whole line of work exists to avoid.
    const offered = narrativeKindsFor(p.producer, nativeTypeOf(p.spec));
    if (offered.length <= 1) return null;
    const kind = declaredKind(p);
    if (!kind)
      return (
        `this video has not been told which narrative kind it is, and the kinds differ in what ` +
        `they carry: a guided tour and a stepped video show each step's sentence, a reveal ` +
        `shows none at all. Ask the journalist — ` +
        `\`bun lib/host/cli.ts narrative-kinds --producer ${p.producer} --type ` +
        `${nativeTypeOf(p.spec)}\` lists what this type can be — and put their choice on the ` +
        `proposal as \`narrativeKind\``
      );
    // ★ ON THE MAP TRACK, A CHOICE THAT WAS NOT TRANSLATED IS A CHOICE THAT WAS DROPPED. The
    // engines select their component family from `cameraMode` and have never read `narrativeKind`
    // — so a proposal that states a kind the spec does not carry renders whatever the engine falls
    // back to, and the journalist's answer evaporates between the question and the pixels. That is
    // the un-threaded-field failure this repo keeps paying for, and the only reason to have asked
    // at all is that the answer arrives.
    //
    // Refused rather than repaired here: writing the spec from the guard would make a validator
    // that mutates, and a stated kind disagreeing with a stated cameraMode has no honest winner.
    if (p.producer === "map-native" && p.narrativeKind) {
      const mode = cameraModeOf(p.spec);
      // Any mode that RESOLVES to the chosen kind is the translation done — `route-reveal` is a
      // reveal too, and a route has no other video animation to offer.
      if (!mode || KIND_FOR_CAMERA_MODE[mode] !== kind)
        return (
          `this map video was chosen as a "${kind}", but its spec ` +
          (mode
            ? `carries cameraMode "${mode}", which renders a "${KIND_FOR_CAMERA_MODE[mode] ?? "different kind"}"`
            : `carries no cameraMode at all`) +
          ` — the engines read cameraMode and have never heard of narrativeKind, so the choice ` +
          `would be dropped on the way to the render. Set cameraMode to ` +
          `"${CAMERA_MODE_FOR_KIND[kind]}" on the spec` +
          (mode ? `, or change the chosen kind to match.` : `.`)
        );
    }
    // A reveal owes nothing: it paints no words, so a walk written for it would never be read.
    // ★ A STORY OWES A CARRIER. A map `story` is the Map Explainer shape: the camera visits each
    // subject in the CARRIER's order and the subject stages in as it arrives. With no carrier
    // declared it falls back to the beat-to-beat tour ordered by salience — which is the
    // `stepped` kind, so a journalist who chose a story is handed the one thing they ruled out.
    // Rémy produced both of the same subject and could not tell them apart; that fallback is why.
    //
    // Refused rather than defaulted, for the same reason the KIND is: choosing a carrier is
    // choosing what the story is ABOUT. A threshold falling says "who is worst hit"; a clock says
    // "when it happened". Neither is the machine's to pick.
    if (p.producer === "map-native" && kind === "story" && !sweepCarrierOf(p.spec))
      return (
        `this map video was chosen as a guided story, which narrates by letting a process ` +
        `advance across the map — but nothing was chosen to BE that process, so it would fall ` +
        `back to the step-by-step tour the journalist did not pick. Ask them what makes their ` +
        `story advance — \`bun lib/host/cli.ts sweep-carriers --config <spec>\` lists what this ` +
        `data can actually drive, and says why it cannot drive the rest — and put the answer on ` +
        `the spec as \`sweepCarrier\`.`
      );
    if (kind === "reveal") return null;
  }
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
