// lib/loop/phrase.ts
// The PHRASING SEAM, made real.
//
// The brain hands over an offer as DATA: ids, an order, the sheet's own fragments, the computed
// facts, the marks. The desk (the model, in production) does exactly one thing with it — writes
// each option's `why` in the journalist's language. `verifyOffer` is what keeps it to that one
// thing, and spec §7 calls it "non optionnelle": it had no production caller at all, so the
// guard existed and nothing was guarded. This is that caller. Everything that writes a `why`
// onto a manifest goes through here.
//
// It THROWS, like verifyOffer and for the same reason (a caller that wants to be lenient has to
// say so out loud). It is not a loop VERB: verbs never throw because the driver runs them and
// records bounded failures, whereas phrasing is a human/model turn the skill drives.
import { verifyOffer, type PhrasedOption } from "../brain/verify-offer";
import type { Offer } from "../brain/offer";
import type { RunManifest, FormOption } from "./manifest";

/** Rebuild the brain's Offer shape from what the manifest persisted. The manifest's FormOption
 *  is the same data with the engine/format/intent/whySource fields optional (the schema still
 *  admits hand-authored options predating the brain), so an option missing its grounding cannot
 *  be verified — and an option that cannot be verified must not be phrased. */
function offerFromManifest(options: FormOption[]): Offer {
  return {
    options: options.map((o) => {
      if (!o.whySource || !o.engine || !o.format || !o.intent)
        throw new Error(
          `applyPhrasing: "${o.id}" carries no grounding — only an offer the brain built can be phrased`,
        );
      return {
        id: o.id,
        nativeType: o.nativeType,
        engine: o.engine,
        format: o.format,
        intent: o.intent,
        ...(o.requires ? { requires: o.requires } : {}),
        ...(o.readiness ? { readiness: o.readiness } : {}),
        ...(o.limits ? { limits: o.limits } : {}),
        whySource: o.whySource,
      };
    }),
    // `excluded` is what the guard checks a phrasing against for the "presented as offered"
    // refusal; the manifest keeps it as state precisely so this survives a resume.
    excluded: [],
  };
}

/**
 * Verify a phrasing against the offer it claims to be, then write it onto the manifest.
 * Returns a NEW manifest — the caller decides when to persist it.
 */
export function applyPhrasing(
  run: RunManifest,
  elementId: string,
  phrased: PhrasedOption[],
): RunManifest {
  const el = run.elements.find((e) => e.id === elementId);
  if (!el) throw new Error(`applyPhrasing: no element ${elementId}`);
  if (!el.proposal || el.proposal.options.length === 0)
    throw new Error(
      `applyPhrasing: element ${elementId} has no offer to phrase`,
    );

  const offer = offerFromManifest(el.proposal.options);
  offer.excluded = el.proposal.excluded;
  // The guard first: ids, order, count, discards, marks acknowledged, numbers grounded.
  verifyOffer(phrased, offer);
  // Then the one thing the guard deliberately does NOT check (its header records this as an
  // accepted limitation: "an empty why passes for an unmarked option"). An offer is SHOWN from
  // here, and an option with nothing written for it would be shown blank — which is how the raw
  // English fragment came to be used as a stand-in in the first place.
  for (const p of phrased)
    if (p.why.trim() === "")
      throw new Error(`applyPhrasing: "${p.id}" has no why — nothing to show`);

  const byId = new Map(phrased.map((p) => [p.id, p]));
  return {
    ...run,
    elements: run.elements.map((e) =>
      e.id !== elementId
        ? e
        : {
            ...e,
            proposal: {
              ...e.proposal!,
              options: e.proposal!.options.map((o) => ({
                ...o,
                why: byId.get(o.id)!.why,
              })),
            },
          },
    ),
  };
}
