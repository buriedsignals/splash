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

export type NarrativeKindOffer = {
  kind: "story" | "stepped" | "reveal";
  /** What carries the story in this kind — the sentence a proposal can show as-is. */
  why: string;
  /** Does choosing it oblige a confirmed walk? `reveal` never does: it shows no words. */
  owesStoryboard: boolean;
};

/** The map video's cameraMode that selects each kind (skills/map-native's storyComps). Kept here
 *  so a caller can translate a journalist's choice into the field the engines already read. */
export const CAMERA_MODE_FOR_KIND: Record<string, string> = {
  story: "guided-tour",
  stepped: "stepped",
  reveal: "simple",
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
    const narrates = walkCapability(producer, nativeType, "video", "guided-tour")
      .carriesWalk;
    // ★ NARRATING AND PROPOSABLE ARE TWO QUESTIONS. A route and a hex-grid DO show their beats'
    // words — their Story family paints them like any other map's. But no walk can be DRAFTED
    // for them: their anchor is computed at produce time (`resolveRouteArc`,
    // `resolveHexGridArc`), so there is nothing to propose against before production
    // (PROPOSABLE_MAP_TYPES, lib/brain/beats.ts). Their kinds are therefore offered — a guided
    // tour of a route is a real thing — but no storyboard is OWED, because demanding one would
    // block a journalist who legitimately writes their arcBeats by hand.
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
            : " (its steps are written by hand — this type's anchors only exist once the map is built, so none can be proposed to you)"),
        owesStoryboard: proposable,
      });
      offers.push({
        kind: "stepped",
        why:
          "the map holds still and advances by discrete steps, each with its own sentence — " +
          "the same reading as a scrolly, but the clock turns the pages" +
          (proposable
            ? ""
            : " (its steps are written by hand — see above)"),
        owesStoryboard: proposable,
      });
    }
    offers.push(
      REVEAL_OFFER(
        "the camera holds the frame and the DATA animates — no sentence is shown at all, so " +
          "nothing has to be written; the story has to be in what appears, not in what is said",
      ),
    );
    return offers;
  }

  if (producer === "chart-native") {
    const cap = walkCapability(producer, nativeType, "video");
    if (!cap.carriesWalk) return [REVEAL_OFFER(cap.why)];
    return [
      {
        kind: "stepped",
        why:
          "the subjects enter one after another, in the order you choose, and each one's " +
          "sentence appears while it does",
        owesStoryboard: true,
      },
      REVEAL_OFFER(
        "everything animates in together and no sentence is shown — the chart makes the point " +
          "on its own",
      ),
    ];
  }

  // Every other producer renders no narrative video: a Datawrapper form is a hosted embed or a
  // PNG, and `scrolly`/`image-native` are formats of their own rather than video kinds. Empty is
  // the honest answer, and its absence from a proposal is the point.
  return [];
}
