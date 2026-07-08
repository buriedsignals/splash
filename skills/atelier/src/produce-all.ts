import type {
  AcceptedProposal,
  ProduceReport,
  ProposalResult,
} from "./producer-spec";
import { validateAccepted, type ValidationOutcome } from "./validate-gate";

// Produce ONE proposal → its outcome (bookkeeping fields are added by produceAll).
export type Dispatch = (
  p: AcceptedProposal,
  outDir: string,
) => Promise<
  Pick<ProposalResult, "status" | "outputs" | "publicUrl" | "reason" | "error">
>;

// The spec validator is injected (like dispatch) so loop-mechanics tests can pass a
// pass-through; the real CLI uses validateAccepted, which cannot be skipped in production.
export type ProposalValidator = (p: AcceptedProposal) => ValidationOutcome;

// The reliability win: this loop lives in CODE, not in the agent's diligence. Every
// accepted proposal appears in results with a status — a secondary proposal cannot drop.
export async function produceAll(
  accepted: AcceptedProposal[],
  outDir: string,
  dispatch: Dispatch,
  validate: ProposalValidator = validateAccepted,
): Promise<ProduceReport> {
  const results: ProposalResult[] = [];
  for (const p of accepted) {
    const base = {
      id: p.id,
      producer: p.producer,
      format: p.format,
      renderApproved: false,
    };
    // Gate 2b: a prose figure must be human-confirmed before it is charted. The trigger
    // (provenance === "prose") is set by suggest-article from the data, so this gate is
    // mechanical (not a self-declared boolean from the shipping step).
    if (p.provenance === "prose" && p.confirmedTable !== true) {
      results.push({
        ...base,
        status: "needs-confirmation",
        reason: "prose provenance requires human table confirmation (Gate 2b)",
      });
      continue;
    }
    // Floor gate #1 — VALIDATION. Run the producer's own validator HERE, so a host that
    // hand-rolled a spec and skipped the suggest-chart self-check (observed in 4/5 manual
    // sessions) cannot ship an invalid or weak spec. An invalid spec fails loud with the
    // errors; warnings ride on the result for the render gate to surface.
    const validation = validate(p);
    if (!validation.ok) {
      results.push({
        ...base,
        status: "failed",
        error: `spec failed validation — fix the spec before producing: ${validation.errors.join("; ")}`,
      });
      continue;
    }
    try {
      const r = await dispatch(p, `${outDir}/${p.id}`);
      results.push({
        ...base,
        ...r,
        ...(validation.warnings.length
          ? { warnings: validation.warnings }
          : {}),
      });
    } catch (e) {
      results.push({
        ...base,
        status: "failed",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return { results };
}
