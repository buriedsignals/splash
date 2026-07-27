// lib/loop/propose.ts
// The loop's door onto the brain. It threads state in and shapes the offer out — every rule
// about WHAT may be offered lives in lib/brain (spec §3).
import type { Decor } from "../newsroom/decor";
import {
  channelForElement,
  type RunManifest,
  type RunElement,
  type FormOption,
} from "./manifest";
import { buildOffer } from "../brain/offer";
import { deriveFacts } from "../brain/facts";
import { suggestIntents } from "../brain/rank-intent";
import type { Intent } from "../brain/intents";
import type { Excluded } from "../brain/eligibility";

/**
 * WHAT ORDERS THIS OFFER, and where it came from.
 *
 * The intent used to be read straight out of the journalist's prose by a keyword pass
 * (lib/brain/rank-intent.ts). Measured, that pass answered NOTHING on ordinary French claims and
 * mis-read others — and either way the run said nothing, so an offer ordered by fit and readiness
 * alone was indistinguishable from one ordered around the journalist's point.
 *
 * So the declaration WINS WHOLE — no union with the guess. Merging them would put the mis-fire
 * straight back in: a claim about spread declared `distribution` would be handed `spatial` too,
 * because the word "canton" is in the sentence, and the journalist's decision would be quietly
 * half-overruled.
 *
 * The suggestion is reached for in exactly one case — an angle recorded before the declaration
 * existed. Refusing those would strand runs over a field that did not exist when they were
 * written; what happens instead is that the fallback is REPORTED (lib/host/state.ts's `basis`),
 * never silent.
 */
export function orderingIntents(el: RunElement | undefined): {
  intents: Intent[];
  basis: "declared" | "guessed" | "none";
} {
  const declared = el?.angle?.intent;
  if (declared) return { intents: [declared], basis: "declared" };
  const guessed = suggestIntents(el?.angle?.confirmedTakeaway ?? "");
  return { intents: guessed, basis: guessed.length ? "guessed" : "none" };
}

export function propose(
  m: RunManifest,
  decor?: Decor,
  // WHICH element the offer is for. A run carries several deliverables since issue #1, and each
  // is offered at ITS OWN channel — a print deliverable must not be offered the interactive its
  // web sibling can have. Defaults to the first element, so every existing caller is unchanged.
  element?: RunElement,
): { options: FormOption[]; excluded: Excluded[]; refusal?: string } {
  const profile = m.orient?.profile;
  if (!profile) return { options: [], excluded: [] };
  const el = element ?? m.elements[0];
  const offer = buildOffer({
    facts: deriveFacts(profile),
    channel: el ? channelForElement(m, el) : m.channel,
    // `m.route` is deliberately NOT threaded: what the run declares it wants is not evidence
    // that the whole-article branch exists, and the brain's mark is about existence (I2).
    ...(decor ? { readiness: decor.readiness } : {}),
    ...(decor?.theme ? { themeBg: decor.theme } : {}),
    ...(el?.requestedFormat ? { requestedFormat: el.requestedFormat } : {}),
    intents: orderingIntents(el).intents,
  });
  return {
    options: offer.options.map((o) => ({
      id: o.id,
      nativeType: o.nativeType,
      engine: o.engine,
      format: o.format,
      intent: o.intent,
      // The brain hands over GROUNDING; the phrasing is the desk's turn, behind verifyOffer.
      // EMPTY until then, deliberately: `whySource.fragments` are the KB's ENGLISH sentences
      // and the product ships French, German and Italian, so using one as the journalist-facing
      // `why` shipped the wrong language AND made an un-phrased option indistinguishable from a
      // phrased one. An empty why is honest about the state, and applyPhrasing (lib/loop/
      // phrase.ts) refuses to leave one empty — so nothing can be SHOWN un-phrased either.
      why: "",
      whySource: o.whySource,
      ...(o.requires ? { requires: o.requires } : {}),
      ...(o.readiness ? { readiness: o.readiness } : {}),
    })),
    excluded: offer.excluded,
    // Carried through, not dropped: the brain names the exact reason a requested format was
    // refused (lib/brain/eligibility.ts), and a caller with no slot for it could not tell a
    // refusal apart from "nothing to offer" — the silent degradation this slice removes.
    ...(offer.refusal ? { refusal: offer.refusal } : {}),
  };
}
