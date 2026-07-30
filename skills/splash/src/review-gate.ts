import type {
  EditorialProbe,
  ProduceReport,
  ReviewerAttribution,
  ReviewProbe,
} from "./producer-spec";
import { hashReviewerOutput } from "../../../lib/verify/redact";
import type { Finding } from "../../../lib/verify/types";

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
//   - a probe with outcome "concern" that no surfaced concern ACCOUNTS FOR — every
//     concern-probe must be individually referenced by at least one concerns[] entry
//     that quotes the probe's `check` verbatim (case/whitespace-insensitive), or be
//     re-run to outcome "resolved" with the resolution evidence in its note. The
//     observed failures this closes: probing FOUND a value absent from the published
//     chart HTML and a dataset.csv 404, yet the summary silently dropped both and
//     asserted full data fidelity; and (adversarial repro) a 404 concern-probe was
//     still droppable as long as ANY unrelated concern text existed;
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

// Concern↔probe matching is mechanical, not semantic: lowercase + collapse whitespace,
// then substring containment of the probe's `check` in the concern text.
function normalizeForMatch(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
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
    // ③ A MECHANICAL OUTCOME IS READ, NEVER REPORTED.
    //
    // The sweep recorded ten self-attested reviews, two of them a `pass` on a check that had
    // crashed or had never run. Both are unwritable from here on: a mechanical probe carries the
    // argv that answered it and the code that argv exited with, and the outcome has to agree
    // with the code. Nothing here re-runs the probe — lib/loop/probe-run.ts did, and
    // review-gate.mjs is what hands the results over.
    if (p.kind === "mechanical") {
      if (!Array.isArray(p.command) || p.command.length === 0)
        throw new Error(
          `review rejected: mechanical probe "${p.check}" carries no command — record the argv ` +
            `that answers it and let its result decide, or record it as an editorial judgement ` +
            `(kind: "editorial") attributed to the reviewer who made it`,
        );
      const answered = p.exitCode === 0 ? "pass" : "concern";
      // "pass" and "resolved" both claim the check answers clean RIGHT NOW — "resolved" only
      // adds that it used to fail (the note says how) — so both require the real exit code to
      // actually be 0. Leaving "resolved" unchecked would have left exactly one of the three
      // outcome values still self-attestable, which is the class this task exists to close.
      if (
        (p.outcome === "pass" || p.outcome === "resolved") &&
        answered !== "pass"
      )
        throw new Error(
          `review rejected: mechanical probe "${p.check}" is recorded as ` +
            `${p.outcome === "pass" ? "passing" : "resolved"}, but its command exited ` +
            `${p.exitCode === null ? "nothing at all (it never ran)" : p.exitCode} — ` +
            `a check that did not answer clean is a concern, and a check that did not run is not a check` +
            (p.outcome === "resolved"
              ? ` (a "resolved" probe still has to answer clean NOW — that is what "resolved" claims)`
              : ""),
        );
      // TypeScript's own discriminated-union narrowing would otherwise prove this branch
      // unreachable (ReviewProbe only names two kinds) — but `probes` arrives here from
      // untyped JSON at the CLI seam, so a missing/misspelled `kind` is a REAL runtime shape,
      // not a type-system impossibility. Widen before comparing so the check actually runs.
    } else if ((p.kind as string) !== "editorial") {
      throw new Error(
        `review rejected: probe "${p.check}" declares no kind — every check is either ` +
          `"mechanical" (a command whose result decides) or "editorial" (a judgement, attributed)`,
      );
    }
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
  // Per-probe accounting: EACH concern-probe must be referenced by at least one
  // surfaced concern that quotes the probe's `check` verbatim — an unrelated concern
  // ("the title is slightly long") never accounts for a probed 404. Matching is
  // mechanical: case-insensitive, whitespace-collapsed containment of the check text.
  const normalizedConcerns = concerns.map(normalizeForMatch);
  for (const p of probes) {
    if (p.outcome !== "concern") continue;
    const check = normalizeForMatch(p.check);
    if (normalizedConcerns.some((c) => c.includes(check))) continue;
    throw new Error(
      `review rejected: probe "${p.check}" recorded outcome "concern" but no surfaced ` +
        `concern references it (an unrelated concern does not account for a probed ` +
        `failure). Surface it as its own concern QUOTING the probe's check verbatim — ` +
        `e.g. "${p.check}: <what failed>" (it stays advisory; the journalist decides) — ` +
        `or re-run the probe and record outcome "resolved" with the resolution ` +
        `evidence in its note.`,
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

// hashReviewerOutput (lib/verify/redact.ts) is the ONE definition of "the fingerprint of what a
// reviewer returned" — it takes Finding[], the vocabulary lib/verify/review.ts already reviews
// against. An editorial probe is not a Finding (no criterion/severity/status/evidence/provenance
// — those belong to the review REGISTRY, not to this ledger's plan/outcome shape), so it is
// projected rather than hashed directly. The projected fields are placeholders picked only to
// satisfy the shared type — `provenance: "independent"` is the one field that is not arbitrary:
// it is exactly what an editorial probe claims to be.
function editorialAsFinding(p: EditorialProbe): Finding {
  return {
    id: p.check,
    criterion: "craft",
    severity: "warning",
    status: "open",
    summary: p.note ?? "",
    evidence: [],
    provenance: "independent",
  };
}

export function applyReviewGate(
  report: ProduceReport,
  id: string,
  concerns: string[],
  probes: ReviewProbe[],
  reviewer?: { name: string; version: string },
): ProduceReport {
  validateProbes(probes, concerns);
  // ③ NOBODY GRADES THEIR OWN WORK. An editorial judgement is an opinion, and an opinion whose
  // author is not named is indistinguishable from the authoring step's own. Requiring the name
  // does not make the judgement better (spec §6 says so plainly) — it makes it someone's.
  const hasEditorial = probes.some((p) => p.kind === "editorial");
  if (hasEditorial && !reviewer)
    throw new Error(
      "review rejected: this review carries editorial judgements and does not say who did it — " +
        "have the editorial pass done by someone who did not write this visual, and record who did it",
    );
  const attribution: ReviewerAttribution = reviewer
    ? {
        name: reviewer.name,
        version: reviewer.version,
        outputHash: hashReviewerOutput(
          probes
            .filter((p): p is EditorialProbe => p.kind === "editorial")
            .map(editorialAsFinding),
        ),
        independentSemanticReview: "available",
      }
    : {
        name: "",
        version: "",
        outputHash: "",
        // Honest, not a pass: the mechanical half ran and nothing judged the editorial one.
        independentSemanticReview: "unavailable",
      };
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
      reviewer: attribution,
    };
  });
  if (!found) throw new Error(`unknown proposal ${id}`);
  // Spread the incoming report so top-level fields (generatedAt — gate-render's
  // provenance anchor) survive the review write.
  return { ...report, results };
}
