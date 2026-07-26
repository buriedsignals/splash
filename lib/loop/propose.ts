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
): { options: FormOption[]; excluded: Excluded[] } {
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
      // Until it has been phrased, the why IS the sheet's own first fragment — never blank.
      why: o.whySource.fragments[0],
      whySource: o.whySource,
      ...(o.requires ? { requires: o.requires } : {}),
      ...(o.readiness ? { readiness: o.readiness } : {}),
    })),
    excluded: offer.excluded,
  };
}
