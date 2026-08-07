// narrative-kinds.ts — which narrative kinds a video can actually BE, for this type.
//
// A video is not one thing. A map can be a guided tour (`story`), a run of discrete steps
// (`stepped`), or a fixed-camera reveal — three component families rendering three different
// objects. A chart has two: it owns no camera that travels, so it has no `story`, and the
// presence of a confirmed walk is what makes the difference between its `stepped` and its
// `reveal` (both rendered by the same *Reveal composition — see the design spec § 3 on why that
// half-lying name is kept rather than renamed across 41 files).
//
// ★ READ, NEVER RECITED. On 2026-08-06 an orchestrator told a journalist his bar video could not
// carry his sentences — nine minutes after the merge that made it carry them, with the prose
// saying so already loaded. A capability held in memory is wrong eventually, and a refusal is
// CREDIBLE, so it dies unnoticed. Everything below is derived from the lists that already decide
// (walkCapability's own), never from a fourth copy.

import { walkCapability } from "./narrative-walk-gate";
import { PROPOSABLE_MAP_TYPES } from "../../../lib/brain/beats";
import { chartWalk } from "../../chart-native/src/core/chart-walk";

export type NarrativeKindOffer = {
  kind: "story" | "stepped" | "reveal";
  /** What carries the story in this kind — the sentence a proposal can show as-is. */
  why: string;
  /** Does choosing it oblige a confirmed walk? `reveal` never does: it shows no words. */
  owesStoryboard: boolean;
  /**
   * THE FIELD THAT MAKES IT REAL, on the map track — the `cameraMode` this choice must be written
   * as. Answered here rather than left to the caller because the engines read `cameraMode` and
   * have never heard of `narrativeKind`: a choice that stops at the proposal is a choice the
   * render discards. Absent on the chart track, where the composition is the same either way and
   * the walk itself is what tells the kinds apart.
   */
  cameraMode?: string;
};

/** The map video's cameraMode that selects each kind (skills/map-native's storyComps). Kept here
 *  so a caller can translate a journalist's choice into the field the engines already read. */
export const CAMERA_MODE_FOR_KIND: Record<string, string> = {
  story: "guided-tour",
  stepped: "stepped",
  reveal: "simple",
};

/**
 * …and the way back. A map spec that ALREADY carries an explicit `cameraMode` has said which kind
 * it is, in the older vocabulary — so reading it here is not a silent default, it is refusing to
 * ask the same question twice. `route-reveal` has no `narrativeKind` going the other way (nothing
 * chooses it; a route's one video animation is not a choice), which is why this is written out
 * rather than inverted from the map above.
 */
export const KIND_FOR_CAMERA_MODE: Record<string, NarrativeKindOffer["kind"]> =
  {
    "guided-tour": "story",
    stepped: "stepped",
    simple: "reveal",
    "route-reveal": "reveal",
  };

const REVEAL_OFFER = (why: string): NarrativeKindOffer => ({
  kind: "reveal",
  why,
  owesStoryboard: false,
});

/**
 * The kinds this (producer, type) really renders as a VIDEO, in the order a proposal should show
 * them: the narrating ones first, the reveal last — because a reveal is what remains when the
 * story is in the data rather than in the steps, and reading it first invites picking it by
 * default. Empty when the producer renders no video at all.
 */
export function narrativeKindsFor(
  producer: string,
  nativeType: string,
): NarrativeKindOffer[] {
  if (producer === "map-native") {
    const narrates = walkCapability(
      producer,
      nativeType,
      "video",
      "guided-tour",
    ).carriesWalk;
    // ★ NARRATING AND PROPOSABLE ARE TWO QUESTIONS, AND OWING IS THE FIRST ONE. A route and a
    // hex-grid DO show their beats' words — their Story family paints them like any other map's —
    // so choosing a narrating kind for them OWES a walk exactly as it does elsewhere. What they
    // cannot do is have one DRAFTED: their anchors are computed at produce time (`resolveRouteArc`,
    // `resolveHexGridArc`), so nothing can be proposed against before production
    // (PROPOSABLE_MAP_TYPES, lib/brain/beats.ts) and the steps are written by hand.
    //
    // Read `owesStoryboard: proposable` here first, and it disagreed with the guard, which demands
    // a walk for every narrating map video whatever its type — two truths about the same product,
    // which is the failure this whole line of work exists to close. The offer answers the same
    // question the guard refuses on; the hand-written caveat lives in `why`, where it belongs.
    const proposable = PROPOSABLE_MAP_TYPES.includes(nativeType);
    const offers: NarrativeKindOffer[] = [];
    if (narrates) {
      offers.push({
        kind: "story",
        why:
          "the camera travels from one step to the next, and each step's sentence appears as " +
          "it arrives — the closest thing to being walked through the map" +
          (proposable
            ? ""
            : " — and its steps are written BY HAND: this type's anchors only exist once the map is built, so none can be proposed to you, but they are still owed"),
        owesStoryboard: true,
        cameraMode: CAMERA_MODE_FOR_KIND.story,
      });
      offers.push({
        kind: "stepped",
        why:
          "the map holds still and advances by discrete steps, each with its own sentence — " +
          "the same reading as a scrolly, but the clock turns the pages" +
          (proposable ? "" : " — and its steps are written BY HAND, see above"),
        owesStoryboard: true,
        cameraMode: CAMERA_MODE_FOR_KIND.stepped,
      });
    }
    offers.push({
      ...REVEAL_OFFER(
        "the camera holds the frame and the DATA animates — no sentence is shown at all, so " +
          "nothing has to be written; the story has to be in what appears, not in what is said",
      ),
      // A route's reveal is its OWN animation — the line draws itself, and `simple` would hold a
      // camera over a route that never appears. One type, one name, read from the type rather
      // than from the kind alone.
      cameraMode:
        nativeType === "route" ? "route-reveal" : CAMERA_MODE_FOR_KIND.reveal,
    });
    return offers;
  }

  if (producer === "chart-native") {
    const cap = walkCapability(producer, nativeType, "video");
    if (!cap.carriesWalk) return [REVEAL_OFFER(cap.why)];
    // ★ THE GRAIN IS SAID, not glossed over. "Each subject enters as its sentence appears" and
    // "your sentences follow one another over the animation" are not the same promise, and
    // letting a journalist believe the first while getting the second is the one way this offer
    // can lie. Read from the engine's registry, never described from memory.
    // The registry's own sentence IS the answer — an anchored type's says the subjects enter
    // with their sentences, a sequenced type's says the sentences follow the order written.
    // Restating it here would be a second wording of the same fact, free to drift.
    const stepped =
      chartWalk(nativeType)?.why ??
      "your sentences follow one another, in the order you write them";
    return [
      { kind: "stepped", why: stepped, owesStoryboard: true },
      REVEAL_OFFER(
        "everything animates in together and no sentence is shown — the chart makes the point " +
          "on its own",
      ),
    ];
  }

  // A FLYOVER IS A REVEAL AND ONLY A REVEAL — and it is offered as one rather than left to the
  // empty answer below, because "renders no narrative video" would be false: it renders a video,
  // it simply has one kind. The camera moves continuously through terrain and no sentence is ever
  // painted (CesiumFlyover.tsx draws an optional title and credit, never a beat's words), so
  // there is nothing to choose between and nothing to write. One offer is not a question — the
  // walk gate reads this list's length and asks the journalist nothing.
  if (producer === "cesium-flyover") {
    return [
      REVEAL_OFFER(
        "the camera flies the route through real terrain and the ground itself is the story — no " +
          "step, no sentence on screen, nothing to write: what the reader gets is scale and relief",
      ),
    ];
  }

  // Every other producer renders no narrative video: a Datawrapper form is a hosted embed or a
  // PNG, and `scrolly`/`image-native` are formats of their own rather than video kinds. Empty is
  // the honest answer, and its absence from a proposal is the point.
  return [];
}
