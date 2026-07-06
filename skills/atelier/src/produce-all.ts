import type {
  AcceptedProposal,
  ProduceReport,
  ProposalResult,
} from "./producer-spec";

// Produce ONE proposal → its outcome (bookkeeping fields are added by produceAll).
export type Dispatch = (
  p: AcceptedProposal,
  outDir: string,
) => Promise<
  Pick<ProposalResult, "status" | "outputs" | "publicUrl" | "reason" | "error">
>;

// The reliability win: this loop lives in CODE, not in the agent's diligence. Every
// accepted proposal appears in results with a status — a secondary proposal cannot drop.
export async function produceAll(
  accepted: AcceptedProposal[],
  outDir: string,
  dispatch: Dispatch,
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
    try {
      const r = await dispatch(p, `${outDir}/${p.id}`);
      results.push({ ...base, ...r });
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
