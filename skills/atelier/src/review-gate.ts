import type { ProduceReport, ReviewProbe } from "./producer-spec";

// The ONLY writer of the render-review record (Layer 2 — the editorial "second pair of
// eyes"). A produced visual must be reviewed against its ACTUAL render + the article/data
// BEFORE it can ship: the review flags what deterministic code cannot — a title that
// misstates the metric (rate-as-count), a fabricated source, a misleading encoding, a
// chart that adds nothing over a sentence. The `concerns` are ADVISORY (surfaced to the
// journalist at Gate 3, never a hard block); what is MANDATORY is that a review RECORD
// exists — assertShippable refuses to export a visual with no review record.
//
// PROBES LEDGER (concern integrity): the record is no longer a bare checkpoint — the
// review MUST hand over the ledger of every probe/check it actually RAN, each with its
// outcome (pass | concern | resolved). This gate refuses:
//   - an EMPTY ledger (a review that lists nothing it ran proved nothing);
//   - a probe with outcome "concern"/"resolved" and no `note` (evidence required);
//   - a probe with outcome "concern" on a review submitted with NO concerns — the
//     observed failure this closes: probing FOUND a value absent from the published
//     chart HTML and a dataset.csv 404, yet the summary silently dropped both and
//     asserted full data fidelity;
//   - a FAILURE KEYWORD (FAILURE_KEYWORDS below) in the recorded narrative (concerns,
//     or a pass-probe's own text) that no concern/resolved probe reflects — the
//     tripwire is deliberately CONSERVATIVE: it may over-ask (e.g. a pass-probe worded
//     "no value is missing" trips it), never under-ask. A false positive costs one
//     rewording, or an explicit "resolved" probe quoting the keyword with its
//     evidence; an unresolved true failure must become a "concern" probe + a surfaced
//     concern (still advisory — the journalist stays the editor) or the review fails.
//
// Honest scope: the ledger makes WHAT WAS RUN and WHAT IT FOUND mechanical; the
// substance of each probe still comes from an INDEPENDENT reviewer, per
// references/render-review.md.

// The failure-keyword class the tripwire scans for (word-boundary, case-insensitive).
// EN + FR because reviews are written in the journalist's language.
export const FAILURE_KEYWORDS = [
  "404",
  "absent",
  "absente",
  "missing",
  "mismatch",
  "not found",
  "manquant",
  "manquante",
  "introuvable",
] as const;

// A freshly published Datawrapper chart can 404 its dataset.csv (and lag its published
// HTML) for a short CDN-propagation window right after publish. A probe that hits a 404
// there must RETRY ONCE after this delay before treating it as a data defect — a real
// review recorded a propagation 404 as a fidelity failure. 30s covers the propagation
// windows observed on fresh publishes while keeping the review loop fast.
export const DW_DATASET_PROPAGATION_RETRY_MS = 30_000;

const VALID_OUTCOMES = new Set<ReviewProbe["outcome"]>([
  "pass",
  "concern",
  "resolved",
]);

function keywordRegex(keyword: string): RegExp {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i");
}

function probeText(p: ReviewProbe): string {
  return `${p.check} ${p.note ?? ""}`;
}

// Shape + integrity of the probes ledger; throws with a reviewer-actionable message.
function validateProbes(probes: ReviewProbe[], concerns: string[]): void {
  if (!Array.isArray(probes) || probes.length === 0)
    throw new Error(
      "review rejected: the probes ledger is empty — list EVERY check the review " +
        "actually ran, each as {check, outcome: pass|concern|resolved, note?} " +
        "(note required for concern/resolved). A review that lists nothing it ran " +
        "proved nothing.",
    );
  for (const p of probes) {
    if (typeof p.check !== "string" || p.check.trim() === "")
      throw new Error(
        "review rejected: every probe needs a non-empty `check` naming what was probed",
      );
    if (!VALID_OUTCOMES.has(p.outcome))
      throw new Error(
        `review rejected: probe "${p.check}" has invalid outcome ` +
          `"${String(p.outcome)}" (expected pass | concern | resolved)`,
      );
    if (
      p.outcome !== "pass" &&
      (typeof p.note !== "string" || p.note.trim() === "")
    )
      throw new Error(
        `review rejected: probe "${p.check}" (outcome ${p.outcome}) has no note — ` +
          `a concern needs WHAT failed, a resolved probe needs HOW it was resolved (evidence)`,
      );
  }
  if (concerns.length === 0 && probes.some((p) => p.outcome === "concern")) {
    const dropped = probes.find((p) => p.outcome === "concern");
    throw new Error(
      `review rejected: probe "${dropped?.check}" recorded outcome "concern" but the ` +
        `review was submitted with no concerns — a probed failure is never silently ` +
        `dropped: surface it as a concern (it stays advisory; the journalist decides) ` +
        `or resolve it explicitly with evidence (outcome "resolved").`,
    );
  }
  // Keyword tripwire: a failure keyword in the recorded narrative (a concern, or a
  // PASS probe's own text) must be reflected by a concern/resolved probe that carries
  // the same keyword. Conservative by design — see the header comment.
  const narrative = [
    ...concerns,
    ...probes.filter((p) => p.outcome === "pass").map(probeText),
  ];
  const nonPass = probes.filter((p) => p.outcome !== "pass").map(probeText);
  for (const keyword of FAILURE_KEYWORDS) {
    const re = keywordRegex(keyword);
    if (!narrative.some((t) => re.test(t))) continue;
    if (nonPass.some((t) => re.test(t))) continue;
    throw new Error(
      `review rejected: the narrative mentions "${keyword}" but no probe outcome ` +
        `reflects it — record the failing probe with outcome "concern" (and surface ` +
        `the concern) or "resolved" with HOW it was resolved as evidence. If this is ` +
        `a false positive (the wording, not a failure), reword the probe/concern or ` +
        `record a "resolved" probe quoting it with its evidence. For a Datawrapper ` +
        `dataset.csv 404 right after publish: retry once after ` +
        `${DW_DATASET_PROPAGATION_RETRY_MS}ms before treating it as a data defect.`,
    );
  }
}

export function applyReviewGate(
  report: ProduceReport,
  id: string,
  concerns: string[],
  probes: ReviewProbe[],
): ProduceReport {
  validateProbes(probes, concerns);
  let found = false;
  const results = report.results.map((r) => {
    if (r.id !== id) return r;
    found = true;
    if (r.status !== "produced")
      throw new Error(
        `cannot review proposal ${id}: not produced (status=${r.status})`,
      );
    return {
      ...r,
      reviewed: true,
      reviewConcerns: concerns,
      reviewProbes: probes,
    };
  });
  if (!found) throw new Error(`unknown proposal ${id}`);
  // Spread the incoming report so top-level fields (generatedAt — gate-render's
  // provenance anchor) survive the review write.
  return { ...report, results };
}
