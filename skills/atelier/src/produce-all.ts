import type {
  AcceptedProposal,
  ProduceReport,
  ProposalResult,
} from "./producer-spec";
import { validateAccepted, type ValidationOutcome } from "./validate-gate";
import { isFormatAllowed, type Channel } from "./channel";

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
    // Channel/format gate — the hard rule: not-embed ⇒ never interactive/scrolly. A
    // shipped format must belong to its channel's allowed set (skills/atelier/src/
    // channel.ts). A proposal without a channel defaults to "article-web" (the
    // permissive default, matching normalizeChannel's own default) so legacy proposals
    // are unaffected. A violation is a fail-hard recorded result, never a silent ship.
    const channel: Channel = p.channel ?? "article-web";
    if (!isFormatAllowed(channel, p.format)) {
      results.push({
        ...base,
        status: "failed",
        error: `format "${p.format}" not allowed on channel "${channel}"`,
      });
      continue;
    }
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
        // Gate 3 reset (belt-and-suspenders): a fresh produce is ALWAYS an unreviewed,
        // unapproved artifact — re-assert that explicitly, after the dispatch spread, so
        // a re-produce can never ship on a PRIOR render's sign-off even if some future
        // Dispatch implementation ever smuggled a stale reviewed/renderApproved/
        // approvedHash through (e.g. by spreading a wider object instead of a literal,
        // which the Dispatch type's excess-property check would not catch). Gate 3a
        // (review-gate) and Gate 3b (gate-render) MUST both run again on this new render.
        reviewed: undefined,
        renderApproved: false,
        approvedHash: undefined,
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
