import type {
  AcceptedProposal,
  ProduceReport,
  ProposalResult,
} from "./producer-spec";
import { validateAccepted, type ValidationOutcome } from "./validate-gate";
import { assertFormatAllowed, normalizeChannel, type Channel } from "./channel";
import { producerMismatchReason } from "./producer-guard";

// Produce ONE proposal → its outcome (bookkeeping fields are added by produceAll).
// `actualProducer` is the producer the dispatch actually ran (GUARD 1) — the real
// dispatch always reports it; when omitted it defaults to the declared producer.
export type Dispatch = (
  p: AcceptedProposal,
  outDir: string,
) => Promise<
  Pick<
    ProposalResult,
    "status" | "outputs" | "publicUrl" | "reason" | "error" | "actualProducer"
  >
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
    // Channel/format gate — the hard rule: not-embed ⇒ never interactive/scrolly. The
    // single VisualFormat pinned on the accepted spec (single-format-produce-export,
    // Task 1) must belong to its channel's allowed set (skills/atelier/src/channel.ts).
    // A proposal without a channel defaults to "article-web" (normalizeChannel's own
    // absent-input default) so legacy proposals are unaffected. p.channel is typed
    // Channel but arrives via untyped JSON.parse at the CLI seam, so it is resolved
    // through normalizeChannel INSIDE the try: a garbled non-empty channel string
    // throws there (fail-closed — it must never silently widen to the permissive
    // article-web) and, like an assertFormatAllowed violation, is caught here and
    // turned into a fail-hard recorded result, never a silent ship.
    //
    // Normalize ONCE, thread the CANONICAL value: the resolved channel (not the raw
    // p.channel) is what dispatch receives below. Otherwise the gate would accept an
    // alias/case-variant ("feed" → social-feed) while dispatch threads the RAW string
    // into ATELIER_CHANNEL, where the producers' exact-match env parsing cannot
    // recognize it — a silent wrong-aspect ship (chart-native used to default it to
    // landscape article-web) or an opaque crash (map-native). Producers deliberately
    // accept ONLY canonical values (fail-closed, no alias table duplicated there), so
    // the spine must hand them canonical input.
    let channel: Channel;
    try {
      channel = normalizeChannel(p.channel);
      assertFormatAllowed(channel, p.format);
    } catch (e) {
      results.push({
        ...base,
        status: "failed",
        error: e instanceof Error ? e.message : String(e),
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
      // Dispatch sees the NORMALIZED canonical channel (see the gate comment above) —
      // adapters' channelEnvFor and every other p.channel reader downstream of the
      // spine consume the canonical value, never the journalist's raw free text.
      const r = await dispatch({ ...p, channel }, `${outDir}/${p.id}`);
      const warned = validation.warnings.length
        ? { warnings: validation.warnings }
        : {};
      // Gate 3 reset (belt-and-suspenders): a fresh produce is ALWAYS an unreviewed,
      // unapproved artifact — re-assert that explicitly, after the dispatch spread, so a
      // re-produce can never ship on a PRIOR render's sign-off even if some future
      // Dispatch implementation ever smuggled a stale reviewed/renderApproved/
      // approvedHash through (e.g. by spreading a wider object instead of a literal, which
      // the Dispatch type's excess-property check would not catch). Gate 3a (review-gate)
      // and Gate 3b (gate-render) MUST both run again on this new render.
      const reset = {
        reviewed: undefined,
        renderApproved: false,
        approvedHash: undefined,
      };
      // GUARD 1 — producer-match. Only a PRODUCED result can flip producers (a
      // needs-fallback/needs-confirmation/failed dispatch produced nothing). The producer
      // that actually ran (r.actualProducer, defaulting to the declared one) must equal
      // the accepted proposal's producer. A real finding: a dw-chart proposal was
      // silently produced with chart-native. The ONE sanctioned switch is native→dw (the
      // FALLBACK_TO_DW re-emit). Any other flip is a fail-hard recorded result — never a
      // silent ship. actualProducer is recorded either way, so the report is honest.
      if (r.status === "produced") {
        const actualProducer = r.actualProducer ?? p.producer;
        const mismatch = producerMismatchReason(p.producer, actualProducer);
        if (mismatch) {
          results.push({
            ...base,
            status: "failed",
            actualProducer,
            error: mismatch,
          });
          continue;
        }
        results.push({ ...base, ...r, actualProducer, ...warned, ...reset });
        continue;
      }
      results.push({ ...base, ...r, ...warned, ...reset });
    } catch (e) {
      results.push({
        ...base,
        status: "failed",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  // Stamped AFTER every dispatch returned: every artifact this generation emitted has
  // an mtime <= generatedAt (see producer-spec.ts) — gate-render's provenance check
  // anchors on it to refuse hand-planted files and stale-report approvals.
  return { generatedAt: new Date().toISOString(), results };
}
