// lib/loop/propose.ts
// The loop's door onto the brain. It threads state in and shapes the offer out — every rule
// about WHAT may be offered lives in lib/brain (spec §3).
import type { Decor } from "../newsroom/decor";
import type { RunManifest, FormOption } from "./manifest";
import { buildOffer } from "../brain/offer";
import { deriveFacts } from "../brain/facts";
import { intentsFromAngle } from "../brain/rank-intent";
import type { Excluded } from "../brain/eligibility";

export function propose(
  m: RunManifest,
  decor?: Decor,
): { options: FormOption[]; excluded: Excluded[]; refusal?: string } {
  const profile = m.orient?.profile;
  if (!profile) return { options: [], excluded: [] };
  const el = m.elements[0];
  const offer = buildOffer({
    facts: deriveFacts(profile),
    channel: m.channel,
    // `m.route` is deliberately NOT threaded: what the run declares it wants is not evidence
    // that the whole-article branch exists, and the brain's mark is about existence (I2).
    ...(decor ? { readiness: decor.readiness } : {}),
    ...(decor?.theme ? { themeBg: decor.theme } : {}),
    ...(el?.requestedFormat ? { requestedFormat: el.requestedFormat } : {}),
    intents: intentsFromAngle(el?.angle?.confirmedTakeaway ?? ""),
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
