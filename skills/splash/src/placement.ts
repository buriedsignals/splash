// WHERE the delivered element goes in the article — resolved from the accepted proposal, said by
// CODE at hand-over.
//
// The defect this closes (register D03) was never a missing capability: suggest-article computes
// `anchor: { paragraphIndex, quote }` (skills/suggest-article/SKILL.md, step 6), the orchestrator is
// asked to copy it across at §5b, and EXPORT is asked to say it (skills/splash/SKILL.md §6). Three
// links, all prose, and the field at producer-spec.ts:61 had NO READER anywhere in the repo. Held
// spontaneously in a short manual run; missed when the hand-over arrives dozens of turns after the
// article was read. A memory defect, not a knowledge one — so the fix is a reader, not a reminder.
//
// PURE by design: no filesystem here (export-code.mjs owns the read, from the accepted.json that
// assertChainProvenance has already proved present and parseable), so every branch below is
// exercised by a plain unit test.
import type { PlacementCopy } from "../../../lib/newsroom/ui-copy";
import { routed, refusalSentence } from "../../../lib/core/routed-refusal";

/** What the delivery is able to say about this element's place in the article.
 *  `undeclared` is deliberately distinct from `free-standing`: "nobody said" is not "it belongs
 *  nowhere", and collapsing the two is how a dropped anchor would disappear silently. */
export type Placement =
  | { kind: "anchored"; paragraphIndex?: number; quote?: string }
  | { kind: "free-standing" }
  | { kind: "undeclared" };

function usableQuote(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

// A paragraph index is only printable when it is a positive integer. A 0, a float or a negative is
// a mis-copied field, and printing "around §0" would send the journalist to a paragraph that does
// not exist — worse than saying nothing about the number and leaning on the quote.
function usableIndex(v: unknown): number | undefined {
  return typeof v === "number" && Number.isInteger(v) && v > 0 ? v : undefined;
}

export function resolvePlacement(entry: unknown): Placement {
  if (entry === null || typeof entry !== "object")
    return { kind: "undeclared" };
  const e = entry as { anchor?: unknown; freeStanding?: unknown };
  const anchor =
    e.anchor !== null && typeof e.anchor === "object"
      ? (e.anchor as { paragraphIndex?: unknown; quote?: unknown })
      : undefined;
  const quote = usableQuote(anchor?.quote);
  const paragraphIndex = usableIndex(anchor?.paragraphIndex);
  // An anchor with something usable in it wins over `freeStanding`: it is the more specific claim,
  // and a proposal carrying both is a copying slip, not a case to refuse at hand-over time.
  if (quote !== undefined || paragraphIndex !== undefined)
    return {
      kind: "anchored",
      ...(paragraphIndex !== undefined ? { paragraphIndex } : {}),
      ...(quote !== undefined ? { quote } : {}),
    };
  if (e.freeStanding === true) return { kind: "free-standing" };
  return { kind: "undeclared" };
}

/** The lines a person reads, in order. Empty when nothing was declared — this function never
 *  guesses a paragraph and never turns silence into a claim (SKILL.md §6: "never invent a
 *  paragraph"). */
export function placementLines(
  placement: Placement,
  copy: PlacementCopy,
): string[] {
  if (placement.kind === "undeclared") return [];
  if (placement.kind === "free-standing")
    return [copy.intro, copy.freeStanding, copy.advisory];
  const { paragraphIndex, quote } = placement;
  const line =
    paragraphIndex !== undefined && quote !== undefined
      ? copy.anchored(paragraphIndex, quote)
      : quote !== undefined
        ? copy.anchoredQuoteOnly(quote)
        : copy.anchoredIndexOnly(paragraphIndex!);
  return [copy.intro, line, copy.advisory];
}

/** The relay block, shaped like the delivery-form proposal export-code already emits
 *  (EXPORT_FORMS_PROPOSAL … END_EXPORT_FORMS_PROPOSAL): a fixed, machine-recognisable envelope the
 *  orchestrator prints VERBATIM instead of re-composing the sentence from memory. One element per
 *  block, so a multi-element hand-over produces one block each and never an undifferentiated dump. */
export function placementBlock(
  proposalId: string,
  placement: Placement,
  copy: PlacementCopy,
): string {
  const lines = placementLines(placement, copy);
  if (lines.length === 0) return "";
  return [
    `SPLASH_PLACEMENT ${proposalId}`,
    ...lines,
    "END_SPLASH_PLACEMENT",
  ].join("\n");
}

/** Whether this run read an ARTICLE — the condition that makes stating the placement obligatory
 *  (spec § 6). Two signals, and the refusal always names the one that fired:
 *    HARD     — opportunities.json in the run directory (suggest-article persisted its set).
 *    DECLARED — skillsInvoked lists suggest-article (producer-spec.ts:53, already validated by
 *               GUARD 5 in validate-gate.ts).
 *  A bare-topic run trips neither, and owes nothing. */
export type ArticleEvidence =
  { existed: false } | { existed: true; why: string };

export const SUGGEST_ARTICLE_SKILL = "suggest-article";

export function articleEvidence(opts: {
  opportunitiesPresent: boolean;
  skillsInvoked?: string[];
}): ArticleEvidence {
  if (opts.opportunitiesPresent)
    return {
      existed: true,
      why: "opportunities.json is present in the run directory (suggest-article read an article and persisted its opportunities)",
    };
  if (
    Array.isArray(opts.skillsInvoked) &&
    opts.skillsInvoked.includes(SUGGEST_ARTICLE_SKILL)
  )
    return {
      existed: true,
      why: `skillsInvoked lists "${SUGGEST_ARTICLE_SKILL}" on this proposal`,
    };
  return { existed: false };
}

/** The refusal, or null when there is nothing to refuse. Returned rather than thrown so the
 *  caller keeps its own refusal shape (export-code.mjs's fail() → stderr + non-zero, before any
 *  write). What is refused is SILENCE, never a placement the journalist chose: an anchor and an
 *  explicit free-standing declaration both pass. Rendered via routed-refusal.ts's
 *  refusalSentence() — export-code.mjs is a script whose stderr the orchestrator reads, so this
 *  gets the rendering that carries the re-run command, not the journalist-only one. */
export function undeclaredPlacementRefusal(
  proposalId: string,
  evidence: ArticleEvidence,
  placement: Placement,
): string | null {
  if (!evidence.existed) return null;
  if (placement.kind !== "undeclared") return null;
  return refusalSentence(
    routed(
      "placement-undeclared",
      `refusing to deliver ${proposalId}: this run read an article (${evidence.why}), but the ` +
        `accepted proposal declares no placement — so the hand-over could not tell the ` +
        `journalist WHERE this element goes in their piece`,
    ),
  );
}
