// lib/loop/beats.ts
// THE BEATS SEAM, made real — the same two-function shape lib/loop/phrase.ts gave the offer.
//
// The brain drafts a walk as DATA (ids, an order, anchors, the numbers each claim may cite) with
// every claim deliberately unwritten; the journalist writes them; verifyBeats is what keeps the
// authoring turn to authoring. This file is the ONLY production path that calls the guard and
// writes the result onto the manifest — the same rule phrase.ts states for `why`, and for the
// same reason: a guard with no caller is a guard that guards nothing.
//
// The two halves have deliberately DIFFERENT error contracts, and it is not an inconsistency:
//   - `draftBeats` is a loop VERB. The driver runs it, so it never throws (I1) — a refusal comes
//     back as a typed failure the caller records as a bounded event.
//   - `applyBeats` THROWS, like applyPhrasing and verifyOffer. It is not a verb: it is a
//     human/model turn the skill drives, and a caller that wants to be lenient must say so out
//     loud.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fail, ok, type VerbResult } from "../core/verbs";
import {
  suggestBeats,
  suggestImageBeats,
  IMAGE_SCROLLY_PHOTOGRAPHS_NEEDED,
  type SuggestedBeat,
} from "../brain/beats";
// The engine's own declared type id, read rather than repeated (skills/image-native/src/
// image-story.ts) — the same list lib/loop/assemble/index.ts's image-native entry reads.
import { IMAGE_SCROLLY_TYPE } from "../../skills/image-native/src/image-story";
import { verifyBeats, type AuthoredBeat } from "../brain/verify-beats";
import { chosenOption, type RunManifest, type RunElement } from "./manifest";

/**
 * Draft the walk for an article-branch deliverable: read the frozen input, ask the brain which
 * points carry the story, and record them with every claim UNWRITTEN. Byte-for-byte the shape
 * propose() uses for the offer — the brain hands over grounding, the desk writes the language.
 *
 * `anchors` is the RE-DRAFT door. verifyBeats refuses a plan whose order changed, which is only
 * legitimate because changing the walk has a named way in: the journalist names their own points
 * and gets a new draft, rather than editing the list inside the authoring turn.
 *
 * TWO TRACKS, and the second one reads no data at all: an IMAGE scrolly's walk is one beat per
 * photograph declared with the run, in declaration order. `anchors` is not offered there and
 * would mean nothing — the order of a photograph sequence is the journalist's own declaration,
 * so re-ordering the walk is re-declaring the photographs, not re-drafting from salience.
 */
export function draftBeats(
  run: RunManifest,
  el: RunElement,
  runDir: string,
  opts?: { anchors?: string[] },
): VerbResult<RunElement> {
  const chosen = chosenOption(el);
  if (!chosen)
    return fail(
      "invalid-request",
      "draft-beats: no form is chosen — there is nothing to draft a walk for",
    );
  // THE IMAGE TRACK reads no data at all — its walk is one beat per DECLARED PHOTOGRAPH, so it
  // is answered before the frozen CSV is even opened. Routed on the chosen type rather than on
  // the engine, for the same reason nextActionsForElement gates on `canDraftBeats`: the type is
  // what decides whether a plan can be drafted, and one answer read in both places is what keeps
  // the router and the drafter from disagreeing again.
  if (chosen.nativeType === IMAGE_SCROLLY_TYPE) {
    if (!run.input.images)
      // The wording lives with the rule (lib/brain/beats.ts), not here: the OFFER marks the same
      // form with the same sentence, and a journalist meeting it twice must read it once.
      return fail(
        "invalid-request",
        `draft-beats: ${IMAGE_SCROLLY_PHOTOGRAPHS_NEEDED}`,
      );
    const drafted = suggestImageBeats(run.input.images.frames);
    if (drafted.refusal)
      return fail("invalid-request", `draft-beats: ${drafted.refusal}`);
    return ok(withPlan(el, drafted.beats));
  }
  if (!run.input.data)
    return fail("invalid-request", "draft-beats: no frozen data input");
  // The frozen input is read from disk, and a run dir can be incomplete for reasons that have
  // nothing to do with the request (moved, dropped by a copy, unreadable). Same discipline as
  // produce.ts: an unreadable input is a BOUNDED failure, never an exception out of a verb.
  let dataCsv: string;
  try {
    dataCsv = readFileSync(join(runDir, run.input.data.path), "utf8");
  } catch (e) {
    return fail(
      "engine-failed",
      `draft-beats: cannot read the frozen input ${run.input.data.path}: ${(e as Error).message}`,
    );
  }

  const { beats, refusal } = suggestBeats({
    nativeType: chosen.nativeType,
    dataCsv,
    // The angle's `unit` is the long axis label; the draft caption takes it only when it is
    // already short enough to sit inside a sentence (suggestBeats' shortUnit mirrors the
    // engine's own caption rule). The loop carries no separate `valueUnit` today.
    unit: el.angle?.unit,
    ...(opts?.anchors ? { anchors: opts.anchors } : {}),
  });
  if (refusal) return fail("invalid-request", `draft-beats: ${refusal}`);

  return ok(withPlan(el, beats));
}

/** The drafted plan, onto the element — one shape for both tracks, so the chart walk and the
 *  image walk cannot come to differ in how they record a draft. */
function withPlan(el: RunElement, beats: SuggestedBeat[]): RunElement {
  return {
    ...el,
    narrative: {
      beats: beats.map((b) => ({
        id: b.id,
        anchor: b.anchor,
        role: b.role,
        // EMPTY until the journalist writes it, deliberately — the exact counterpart of
        // propose()'s empty `why`. A drafted caption used as a stand-in would be
        // indistinguishable from an authored claim, which is the whole defect this seam exists
        // to remove: the machine's sentence appearing under a journalist's byline.
        text: "",
        draftText: b.draftText,
        beatSource: b.beatSource,
      })),
    },
  };
}

/**
 * Verify an authored walk against the plan it claims to be, then write it onto the manifest.
 * Returns a NEW manifest — the caller decides when to persist it.
 */
export function applyBeats(
  run: RunManifest,
  elementId: string,
  authored: AuthoredBeat[],
): RunManifest {
  const el = run.elements.find((e) => e.id === elementId);
  if (!el) throw new Error(`applyBeats: no element ${elementId}`);
  if (!el.narrative || el.narrative.beats.length === 0)
    throw new Error(
      `applyBeats: element ${elementId} has no drafted plan to author — draft the beats first`,
    );

  // The guard: ids, count, exact order, a well-formed arc (which is what refuses a blank claim),
  // and every number grounded in this beat's own facts or the plan's.
  verifyBeats(authored, el.narrative.beats);

  const byId = new Map(authored.map((a) => [a.id, a]));
  return {
    ...run,
    elements: run.elements.map((e) =>
      e.id !== elementId
        ? e
        : {
            ...e,
            narrative: {
              beats: e.narrative!.beats.map((b) => ({
                ...b,
                // The ROLE is the journalist's too: the draft never guesses `turn`, so naming
                // the pivot is precisely what this turn is for. arcErrors, inside the guard,
                // keeps the result a well-formed arc.
                role: byId.get(b.id)!.role,
                text: byId.get(b.id)!.text,
              })),
            },
          },
    ),
  };
}
