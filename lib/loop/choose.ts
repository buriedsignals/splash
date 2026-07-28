// The DECISION that names WHICH form gets built — the counterpart of request-delivery.ts, and
// the missing producer of `proposal.chosenId`, which until now only tests ever wrote.
//
// Why this is code and not prose: the offer is data the brain built, the choice is the one act
// that is the journalist's alone (P1 — the tool offers, the journalist decides), and everything
// downstream reads the choice through `chosenOption` (produce, deliver, provenanceHash). A model
// hand-editing run.json to record it produces a manifest nothing validated, in a loop whose every
// guard assumes the state was written by code. So the decision gets a writer with refusals of its
// own, in the same shape requestDelivery already has: a VerbResult, never a throw, nothing written
// until every refusal has passed.
import { fail, ok, type VerbResult } from "../core/verbs/types";
import { unbuildableFormReason } from "./buildable";
import type { RunElement } from "./manifest";

/**
 * Record the form the journalist chose. Returns a NEW element — the caller persists it.
 *
 * Takes the element alone, not the run: nothing here depends on run-level state, and an argument
 * this function does not read would misdescribe what the decision actually rests on.
 */
export function chooseForm(
  el: RunElement,
  optionId: string,
): VerbResult<RunElement> {
  const proposal = el.proposal;
  if (!proposal)
    return fail(
      "invalid-request",
      `choose-form: element ${el.id} has nothing proposed yet — propose before choosing`,
    );
  if (proposal.options.length === 0)
    return fail(
      "invalid-request",
      // The brain's own sentence when it refused the whole offer (manifest.ts keeps it as state
      // precisely so it survives a resume). Without it, "the offer is empty" reads as a bug in the
      // tool rather than as the answer the brain already gave.
      `choose-form: element ${el.id} has an empty offer, so there is nothing to choose` +
        (proposal.refusal ? ` — ${proposal.refusal}` : ""),
    );

  const chosen = proposal.options.find((o) => o.id === optionId);
  if (!chosen)
    return fail(
      "invalid-request",
      `choose-form: "${optionId}" is not in the offer — it holds ${proposal.options
        .map((o) => `"${o.id}"`)
        .join(", ")}`,
    );

  // The one refusal that is about the FORM rather than about the id. A form production cannot
  // build is OFFERED (marked, never removed — lib/brain/eligibility.ts), so it CAN be named here;
  // writing the choice anyway would produce a manifest that loops on its own dead end, because
  // nextActionsForElement already routes such a choice straight back to "choose-form". Refusing
  // one step earlier says the same thing while the journalist is still in the act of choosing.
  //
  // Resolved through resolveBuilder/isLoopBuildable — the SAME path produce.ts, manifest.ts and
  // the brain's buildabilityMark resolve through. A fourth resolution here is exactly the drift
  // lib/loop/buildable.ts exists to prevent.
  //
  // Only THIS mark forbids. An option can also carry a readiness mark for a capability the
  // newsroom left switched off, or for the whole-article branch; those are warnings the offer
  // showed and the journalist read. Refusing them would turn the mark into a veto and take the
  // decision back from the journalist, which is the opposite of what this module is for.
  // The mark's own words when it has them, so the journalist reads in the refusal exactly the
  // sentence the offer displayed — written once, in buildable.ts, because manifest.ts's routing
  // and the driver's ledger entry for a run already stuck on such a choice say the same thing.
  const unbuildable = unbuildableFormReason(chosen);
  if (unbuildable)
    return fail(
      "invalid-request",
      `choose-form: "${chosen.id}" cannot be built — ${unbuildable}`,
    );

  // Nothing else is touched, WITH ONE EXCEPTION. Moving the choice moves provenanceHash, so an
  // existing artifact goes stale and nextActions routes back to produce on its own — no artifact
  // is deleted here, and no delivery record is forgotten (a destination that already landed stays
  // on the record, the same discipline request-delivery.ts follows).
  //
  // THE NARRATIVE IS DROPPED, and it is stale for exactly the reason an artifact is: it was
  // drafted FOR a form. A walk drafted and authored on a chart scrolly is a plan of x-anchored
  // beats; re-chosen onto a map scrolly it becomes a plan that track refuses outright
  // (assembleScrolly: "a map scrolly derives its own walk from the data"), and onto an image
  // scrolly a plan of the wrong length against the declared photographs. Measured before this
  // line existed: the surviving narrative made nextActions skip `draft-beats` (a narrative is
  // present) and skip `author-beats` (nothing is unwritten), so the run answered `produce`
  // forever while produce refused it — a dead end with no route back, on state the journalist
  // could not see. Dropping it re-enters the drafting seam through the front door.
  //
  // Only on a REAL change of form. Re-affirming the same choice must not throw away work the
  // journalist did on it.
  const formChanged = proposal.chosenId !== chosen.id;
  return ok({
    ...el,
    ...(formChanged ? { narrative: undefined } : {}),
    proposal: { ...proposal, chosenId: chosen.id },
  });
}
