// THE ANALYSIS RECEIPT, CONFRONTED WITH THE ACCEPTED PROPOSAL.
//
// source-guard.ts holds the teeth for an attribution the article gave: DEFECT B refuses a named
// organisation collapsed into the generic "reported in this article" fallback, and DEFECT D
// refuses a journalist's URL silently upgraded to a deeper path. Its author then wrote down its
// own limit, at length:
//
//   "THREADING IS PROSE-ENFORCED BY NECESSITY. sourceHint is an inherently LLM-captured fact —
//    what the ARTICLE named — and nothing mechanical can derive it ... their ProposalSet is an
//    in-context artifact, never a structured file a script transforms into `accepted.json`. There
//    is no seam to mechanize; the guards fire when the hint is threaded and stay dormant (both
//    return null) when it is absent."
//
// THE FIRST HALF IS TRUE AND THE SECOND HALF WAS NOT, and the difference is the whole fix.
// Nothing mechanical can DERIVE the hint — deriving it would feed the guard its own answer, which
// is exactly the trap place-provenance.ts refused ("a guard fed its own answer is not a guard").
// But the ProposalSet is not only an in-context artifact: suggest-article/SKILL.md step 6 hands it
// to a SCRIPT — `save-opportunities.mjs <runDir> --payload '<the ProposalSet JSON>'` — at the very
// step that captured the hint. Real code, running in the seam, receiving the value, and writing
// everything EXCEPT it (the writer kept `claim`, `intent`, `anchor` and dropped `sourceHint` on
// the floor). So the closure is not a new checkpoint bolted on, and not a re-derivation: it is a
// writer keeping the field it was already handed, and this module asking the accepted proposal to
// account for it. Same shape as resolve-place.mjs → places.json → place-provenance.ts.
//
// WHAT THIS CHANGES. Before: omitting `sourceHint` disarmed DEFECT B and DEFECT D and cost
// nothing — silence was the cheapest way past both, and the only net was a non-blocking warning
// (`droppedSourceHintWarning`) that named its own impotence. After: the run directory remembers
// what the article named, so silence is the one thing that FAILS. The dodge and the fix have
// swapped places.
//
// THREE LEGS, and the third is the one that keeps the trap shut:
//
//   L1  An attribution on disk that the accepted element did not carry across.   ⇒ refuse
//   L2  A hint that does not match what the analysis recorded — an organisation
//       it never saw, a URL bolted onto a name the article gave bare, or a name
//       kept while the URL that came with it was quietly left behind.           ⇒ refuse
//   L3  A delivery that carries NOT ONE of the attributions the analysis found.  ⇒ refuse
//
// L1 joins on the ANCHOR QUOTE, which is not a new thread: `anchor` is already copied onto the
// accepted element at §5b and already compulsory on an article run (placement.ts refuses an
// element that declares neither `anchor` nor `freeStanding`). So the join key exists precisely
// where this guard applies. L2 is what stops L1 being answered with an invention — the receipt is
// the COMPLETE record of what the article named, so a name absent from it was not read out of the
// article, and a URL on a name the article gave bare is the DEFECT D upgrade with the evidence now
// on disk. L3 is the dodge L1 alone would leave open: drop the anchor, kill the join, and every
// joined leg goes quiet again — so a delivery that attributes NOTHING while the analysis
// attributed EVERYTHING is refused whatever its anchors say.
//
// WHAT WAS REJECTED, and why:
//
//  · REQUIRE `sourceHint` on every accepted element whenever the receipt names any source. The
//    strongest-reading option and the wrong one: an article that attributes one claim and not
//    another is ordinary, and demanding a citation for the unattributed one false-blocks a
//    legitimate run — the cardinal sin candidate-provenance.ts names. L3 asks the narrower
//    question (did the analysis attribute EVERY claim and the delivery none?), which is
//    attestation-corroboration.ts's own rule: "an individual absence is a WARNING, never a
//    verdict; what IS a verdict is the TOTAL absence".
//  · SYNTHESIZE the hint from the receipt at produce-all's entry when the element dropped it.
//    This closes the seam by making it unfalsifiable: DEFECT B compares the shipped source against
//    the captured one, and a captured value copied in by the gate agrees with nothing it did not
//    already know — the guard would be checking the receipt against itself and could never fire.
//  · COMPARE the shipped `spec.source` against the receipt directly, skipping the element's field.
//    Tempting and wrong for the same reason DEFECT B exists as a separate guard: what the article
//    named and what the deliverable SHOULD cite are two questions (the journalist answers the
//    second at CADRAGE Q4, as `sourceAnswer`). This module's only business is that the first
//    answer survives the journey; source-guard.ts owns the comparison.
//
// PURE apart from `readSourceProvenance`'s single file read — the confrontation itself is a
// function of two values, so every branch below is a plain unit test.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { AcceptedProposal } from "./producer-spec";
import { canonicalUrl } from "./source-guard";
import { routed, type RoutedRefusal } from "../../../lib/core/routed-refusal";

/** The file the sanctioned writer leaves, beside accepted.json / candidates.json / places.json. */
export const OPPORTUNITIES_RECEIPT = "opportunities.json";

/** ONE ANALYSED CLAIM, as the writer recorded it at the moment it was read out of the article —
 *  never re-derived later from the spec, which is what keeps it evidence rather than an echo. */
export interface OpportunityReceipt {
  claim: string;
  /** The anchor's verbatim quote, when the opportunity was bound to a passage. The join key: it is
   *  already copied onto the accepted element at §5b, and already compulsory there on an article
   *  run (placement.ts). Preferred to `paragraphIndex` for the reason suggest-article prefers it —
   *  an index rots when the article is edited between the analysis and the delivery. */
  anchorQuote?: string;
  /** What the ARTICLE itself named for these figures. Absent ⇒ the analysis declared, explicitly,
   *  that it named nobody (`noSourceNamed`) — silence is refused at write time, so absence here is
   *  a STATEMENT rather than a gap. */
  sourceHint?: { name?: string; url?: string };
}

/** The run's analysis, as the CLI hands it to the guard. `present: false` ⇒ suggest-article never
 *  persisted anything in this directory (or left nothing readable), and this module says nothing:
 *  a bare-topic run read no article and owes no attribution. */
export interface SourceProvenance {
  present: boolean;
  opportunities: OpportunityReceipt[];
}

const ABSENT: SourceProvenance = { present: false, opportunities: [] };

function text(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function parseHint(v: unknown): { name?: string; url?: string } | undefined {
  if (!v || typeof v !== "object") return undefined;
  const r = v as { name?: unknown; url?: unknown };
  const name = text(r.name);
  const url = text(r.url);
  if (!name && !url) return undefined;
  return { ...(name ? { name } : {}), ...(url ? { url } : {}) };
}

function parseOpportunities(json: unknown): OpportunityReceipt[] {
  const raw = (json as { opportunities?: unknown } | null)?.opportunities;
  if (!Array.isArray(raw)) return [];
  const out: OpportunityReceipt[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as {
      claim?: unknown;
      anchor?: unknown;
      sourceHint?: unknown;
    };
    const claim = text(r.claim);
    if (!claim) continue;
    const anchorQuote = text((r.anchor as { quote?: unknown } | null)?.quote);
    const sourceHint = parseHint(r.sourceHint);
    out.push({
      claim,
      ...(anchorQuote ? { anchorQuote } : {}),
      ...(sourceHint ? { sourceHint } : {}),
    });
  }
  return out;
}

/** Read the receipt beside accepted.json. A file that is present but unreadable is reported
 *  ABSENT, exactly as produce-all.mjs treats a corrupt candidates.json and place-provenance.ts a
 *  corrupt places.json: the permissive reading of a corrupt artifact is the one that lets a broken
 *  run through, and here it is also the SAFE one — an unreadable analysis cannot tell a dropped
 *  attribution from an article that gave none, so it must not refuse on a guess. */
export function readSourceProvenance(runDir: string): SourceProvenance {
  const path = join(runDir, OPPORTUNITIES_RECEIPT);
  if (!existsSync(path)) return ABSENT;
  try {
    const opportunities = parseOpportunities(
      JSON.parse(readFileSync(path, "utf8")),
    );
    return opportunities.length ? { present: true, opportunities } : ABSENT;
  } catch {
    return ABSENT;
  }
}

function normalizeQuote(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** The opportunity this element came from, by the anchor quote both already carry. Undefined for a
 *  free-standing element, or for one whose anchor names no passage in the analysis. */
function joined(
  p: AcceptedProposal,
  provenance: SourceProvenance,
): OpportunityReceipt | undefined {
  const quote = text(p.anchor?.quote);
  if (!quote) return undefined;
  const key = normalizeQuote(quote);
  return provenance.opportunities.find(
    (o) => o.anchorQuote && normalizeQuote(o.anchorQuote) === key,
  );
}

function hintOf(
  p: AcceptedProposal,
): { name?: string; url?: string } | undefined {
  return parseHint(p.sourceHint);
}

/**
 * The fail-hard decision for a batch. Null when it passes, or when the run persisted no analysis
 * at all (every bare-topic run — this never speaks about them).
 */
export function sourceProvenanceRefusal(
  accepted: AcceptedProposal[],
  provenance: SourceProvenance,
): RoutedRefusal | null {
  if (!provenance.present) return null;
  const attributed = provenance.opportunities.filter((o) => o.sourceHint);
  // The article named nobody, anywhere. Nothing to preserve, and DEFECT B's generic fallback is
  // the documented-legitimate ship (splash Gate 2c).
  if (!attributed.length) return null;

  // L1 — THE DROPPED THREAD. The trigger is the RECEIPT, so declining to write the record is the
  // thing that fails rather than the thing that gets away with it.
  for (const p of accepted) {
    const opp = joined(p, provenance);
    if (!opp?.sourceHint) continue;
    if (hintOf(p)) continue;
    const named = opp.sourceHint.name ?? opp.sourceHint.url;
    return routed(
      "source-hint-undeclared",
      `the article credited these figures to "${named}" — this run read that out of the passage ` +
        `"${opp.anchorQuote}" and recorded it — and the accepted element "${p.id}" carries no ` +
        `\`sourceHint\`, so nothing can check that the deliverable still credits them. A named ` +
        `organisation dropped here ships as "figures as reported in this article" and the ` +
        `attribution is gone. Carry it onto the accepted element as \`sourceHint\``,
    );
  }

  // L2 — THE INVENTED ATTRIBUTION. The way out of L1 must not be cheaper than the fix. The receipt
  // is the complete record of what the ARTICLE named, so a name that is not in it was not read out
  // of the article; and a URL on a name the article gave bare is DEFECT D's silent upgrade, with
  // the evidence on disk for the first time.
  const byName = new Map<string, OpportunityReceipt["sourceHint"][]>();
  for (const o of attributed) {
    const n = o.sourceHint?.name;
    if (!n) continue;
    const key = normalizeName(n);
    byName.set(key, [...(byName.get(key) ?? []), o.sourceHint]);
  }
  for (const p of accepted) {
    const hint = hintOf(p);
    if (!hint) continue;
    if (hint.name) {
      const recorded = byName.get(normalizeName(hint.name));
      if (!recorded)
        return routed(
          "source-hint-undeclared",
          `the accepted element "${p.id}" is recorded as attributing its figures to ` +
            `"${hint.name}", and this run's own analysis of the article named ` +
            `${attributed
              .map((o) => `"${o.sourceHint?.name ?? o.sourceHint?.url}"`)
              .join(
                ", ",
              )} and nothing else. \`sourceHint\` is what the ARTICLE said, verbatim — ` +
            `if the JOURNALIST supplied this source at CADRAGE Q4, that is \`sourceAnswer\`, ` +
            `which is a different field and a different question`,
        );
      const recordedUrls = recorded
        .map((r) => r?.url)
        .filter((u): u is string => !!u);
      if (
        hint.url &&
        !recordedUrls.some((u) => canonicalUrl(u) === canonicalUrl(hint.url!))
      )
        return routed(
          "source-hint-undeclared",
          `the accepted element "${p.id}" attributes its figures to "${hint.name}" at ` +
            `${hint.url}, but the article named "${hint.name}" and gave no such URL — this run ` +
            `recorded ${recordedUrls.length ? recordedUrls.join(", ") : "no URL"}. A deeper ` +
            `path nobody confirmed is a citation the reader cannot check; drop it, or record the ` +
            `journalist's own answer as \`sourceAnswer\``,
        );
      // PARTIAL THREADING, which is DEFECT D's own dodge. That guard compares the shipped URL
      // against `hint.url` and goes quiet the moment the hint has none — so carrying the NAME and
      // leaving the URL behind clears L1, clears DEFECT B, and disarms DEFECT D in one move. What
      // the article gave has to arrive whole.
      if (!hint.url && recordedUrls.length)
        return routed(
          "source-hint-undeclared",
          `the accepted element "${p.id}" credits "${hint.name}" but drops the URL the article ` +
            `gave with that name (${recordedUrls.join(", ")}) — a name-only hint is only honest ` +
            `when the article gave no URL, and here it did. Carry the whole citation: without the ` +
            `URL nothing can check that the deliverable cites the page the article pointed at`,
        );
    } else if (hint.url) {
      // A URL-ONLY hint — legitimate when the article quoted a link and named no organisation, and
      // an invention otherwise. Checked against the same complete record.
      const known = attributed.some(
        (o) =>
          o.sourceHint?.url &&
          canonicalUrl(o.sourceHint.url) === canonicalUrl(hint.url!),
      );
      if (!known)
        return routed(
          "source-hint-undeclared",
          `the accepted element "${p.id}" cites ${hint.url} as what the ARTICLE gave, and this ` +
            `run's own analysis of the article recorded no such URL. \`sourceHint\` is what the ` +
            `article said, verbatim — a link the journalist supplied is \`sourceAnswer\``,
        );
    }
  }

  // L3 — TOTAL ABSENCE. The dodge L1 alone leaves open: drop the anchor, kill the join, and every
  // joined leg goes quiet. Deliberately NARROW, for the reason the rejected alternative above
  // names — it fires only when the analysis attributed EVERY claim it recorded and the delivery
  // attributes NONE, which no legitimate mixture can produce.
  if (attributed.length !== provenance.opportunities.length) return null;
  if (accepted.some((p) => hintOf(p))) return null;
  const named = attributed
    .slice(0, 3)
    .map((o) => `"${o.sourceHint?.name ?? o.sourceHint?.url}"`)
    .join(", ");
  const more =
    attributed.length > 3 ? ` and ${attributed.length - 3} more` : "";
  return routed(
    "source-hint-undeclared",
    `this run read an article that credited every one of its figures — ${named}${more} — and ` +
      `NOT ONE accepted element carries an attribution. An organisation the article named and ` +
      `the deliverable does not ships as "figures as reported in this article", which credits ` +
      `nobody and cannot be checked. Carry each article citation onto its element as ` +
      `\`sourceHint\``,
  );
}

/**
 * The non-fatal half: a batch where SOME elements account for their attribution and others do not.
 * Never a refusal, for attestation-corroboration.ts's reason — there are legitimate mixtures (an
 * article that credits one claim and not the next), and an individual absence cannot tell them
 * apart from a dropped record. Silent when the refusal above already speaks.
 */
export function sourceProvenanceWarnings(
  accepted: AcceptedProposal[],
  provenance: SourceProvenance,
): string[] {
  if (!provenance.present) return [];
  if (!provenance.opportunities.some((o) => o.sourceHint)) return [];
  const carrying = accepted.filter((p) => hintOf(p));
  // Total absence is the refusal's business, not a warning — saying both would double-report the
  // same gap in two registers.
  if (!carrying.length) return [];
  const missing = accepted.filter((p) => !hintOf(p));
  if (!missing.length) return [];
  return [
    `source provenance: ${missing.map((p) => `"${p.id}"`).join(", ")} ` +
      `${missing.length === 1 ? "carries" : "carry"} no \`sourceHint\` while the other elements ` +
      `of this run do, and the article named a source. Legitimate if the article credited this ` +
      `claim to nobody; if it did credit it, the named organisation is being discarded here`,
  ];
}
