// `review` — turn measured facts into a structured, attributed, severity-bearing record
// (issues #9 and #11).
//
// Three rules govern everything below, and each one exists because this codebase has been
// burned without it:
//
//  1. A finding is produced HERE or by an adapter, but its severity always comes from
//     lib/verify/severity.ts. Nobody grades their own work (#11).
//  2. Every finding carries WHAT produced it. "mechanical" is code on the rendered
//     artifact; "independent" is a critique pass that did not author the proposal. The
//     record never blends the two into an undifferentiated "reviewed" (#9).
//  3. The absence of an independent reviewer is RECORDED, never converted into a pass.
//     Silence is not evidence — the whole reason this layer exists.
import { renderedTitleOf } from "./capture";
import { makeFinding } from "./severity";
import { detectTasteRisks } from "./taste";
import { announcedColourFindings } from "./colour-announcement";
import type { BrandConcern } from "../core/brand-concern";
import {
  assertNoInternals,
  buildReviewerInput,
  hashReviewerInput,
  hashReviewerOutput,
  type ReviewerSource,
} from "./redact";
import type {
  CaptureCheck,
  Criterion,
  Finding,
  ReviewRecord,
  ReviewerAttribution,
  ReviewerInput,
} from "./types";

// What an independent critique pass must look like from here. Deliberately narrow: it
// receives the REDACTED input and returns descriptions. It cannot set a severity (the field
// is accepted and discarded by makeFinding), cannot see the run, and cannot write the
// record.
export type ReviewerAdapter = {
  name: string;
  version: string;
  review: (input: ReviewerInput) => Promise<
    {
      id: string;
      criterion: Criterion;
      summary: string;
      evidence: string[];
      confidence?: Finding["confidence"];
      severity?: Finding["severity"]; // accepted, then overwritten — see severity.ts
    }[]
  >;
};

export type ReviewRequest = {
  // `source.sourceName` arrives here as a plain string, never as a run or a source ledger — this
  // verb is deliberately blind to orchestration (#9's independence: a reviewer that could read the
  // run could grade the process instead of the artifact). The production caller
  // (`lib/loop/verify.ts`'s `renderedSourceName`) resolves it from the run's DECLARED source
  // policy before it ever reaches this file, so the string is honest without this file having to
  // see what it was honest ABOUT. Do not "fix" this by widening `source` to carry the run — that
  // would reopen exactly what redact.ts's whitelist exists to close.
  source: ReviewerSource;
  checks: CaptureCheck[];
  reviewedProvenanceHash: string;
  /** The destination the DELIVERY was accepted for. A still taken elsewhere is not proof. */
  acceptedDestinationId: string;
  /** Why nothing could be captured, when nothing could. It becomes the EVIDENCE of the
   *  `no-capture` finding: "there is no rendered evidence" and "there is no rendered evidence
   *  BECAUSE this format's frames cannot be extracted yet" are different things to a
   *  journalist deciding whether to override. */
  captureUnavailable?: string;
  adapter?: ReviewerAdapter;
  /** The house-colour tradeoffs recorded at produce-time (produce.mjs's
   *  brand-concerns.json, skills/chart-native/src/core/conformance.ts's BrandConcern) —
   *  D25: shipped, never blocking, always announced.
   *
   *  NO PRODUCTION WRITER YET. The V2 loop's only ReviewRequest construction site
   *  (lib/loop/verify.ts's runVerb("review", …)) sets none of `brandConcerns`,
   *  `announcedColour` or `honoured`, so on that path they are always absent. The
   *  file-based route — produce.mjs writing brand-concerns.json and
   *  skills/splash/scripts/review-gate.mjs reading it into `reviewConcerns` — is what
   *  actually carries these to a journalist today. These three fields are the seam for
   *  threading the same record through the loop; until a caller fills them, the findings
   *  below are structurally unreachable from lib/loop. */
  brandConcerns?: BrandConcern[];
  /** The baseColor the journalist was told about for this element, and (task 13) whether
   *  the produced type actually painted its marks with it. See `brandConcerns` above: no
   *  production caller threads this yet, and an absent/true `honoured` is a silent no-op
   *  (D26). */
  announcedColour?: string;
  honoured?: boolean;
};

// The criteria a review is conducted against, shared by every caller so the same defect is
// judged against the same list wherever it is found (#9: "shared review rubric and source
// policy"). Wording is journalist-facing: it travels to a reviewer and, through the record,
// into what a newsroom reads.
export const DEFAULT_REVIEW_RUBRIC: readonly string[] = [
  "source: every figure is attributed to the source the run declared, and that attribution is real",
  "accessibility: the alternative description states the insight, not the chart's structure (WCAG 1.1.1)",
  "title-fidelity: the title states something the visual actually shows",
  "data-fidelity: every claim in the furniture is supported by the data behind it",
  "furniture: title, unit, source and credit are present, visible, and inside the published component",
  "viewport: the render represents the container this deliverable publishes into",
  "interaction: an interaction the format requires works at every reviewed breakpoint",
];

const MECHANICAL_REVIEWER = { name: "lib/verify/mechanical", version: "1.0.0" };

// One check id → one finding id. A defect seen at three breakpoints is ONE finding with
// three pieces of evidence: three copies would inflate the blocker count and make the cause
// harder to read, and a journalist counting blockers would be counting breakpoints.
const CHECK_TO_FINDING: Record<
  CaptureCheck["id"],
  { id: string; criterion: Criterion; summary: string }
> = {
  "capture:furniture-present": {
    id: "furniture-missing",
    criterion: "furniture",
    summary:
      "required furniture is missing or hidden in the rendered component",
  },
  "capture:furniture-in-frame": {
    id: "furniture-below-fold",
    criterion: "furniture",
    summary:
      "required furniture falls outside the component or outside the publication container",
  },
  "capture:fits-viewport": {
    id: "component-overflows-viewport",
    criterion: "viewport",
    summary: "the component does not fit the container it publishes into",
  },
  "capture:size-matches-destination": {
    id: "size-mismatch",
    criterion: "viewport",
    summary: "the delivered image is not the size its destination publishes at",
  },
  // Its OWN sentence, and not size-mismatch's. A content-driven deliverable's height is not the
  // box's BY DESIGN, so telling a journalist "wrong size" about it would be false and would give
  // them nothing to do. What is true, and actionable, is that it has grown far past the space it
  // publishes into — usually because the data behind it did.
  "capture:height-within-bound": {
    id: "height-far-exceeds-destination",
    criterion: "viewport",
    summary:
      "the deliverable is far taller than the space it publishes into — check the row count behind it",
  },
};

function findingsFromChecks(checks: CaptureCheck[]): Finding[] {
  const grouped = new Map<
    string,
    {
      spec: (typeof CHECK_TO_FINDING)[keyof typeof CHECK_TO_FINDING];
      evidence: string[];
    }
  >();
  for (const c of checks) {
    if (c.outcome !== "fail") continue;
    const spec = CHECK_TO_FINDING[c.id];
    if (!spec) continue;
    const entry = grouped.get(spec.id) ?? { spec, evidence: [] };
    entry.evidence.push(
      `[${c.breakpoint}${c.role ? `/${c.role}` : ""}] ${c.detail}`,
    );
    grouped.set(spec.id, entry);
  }
  return [...grouped.values()].map(({ spec, evidence }) =>
    makeFinding({
      id: spec.id,
      criterion: spec.criterion,
      summary: spec.summary,
      evidence,
      provenance: "mechanical",
    }),
  );
}

function findingsFromEvidence(req: ReviewRequest): Finding[] {
  const out: Finding[] = [];
  const s = req.source;

  if (s.captures.length === 0)
    out.push(
      makeFinding({
        id: "no-capture",
        criterion: "provenance",
        summary:
          "nothing was captured — there is no rendered evidence to review",
        evidence: req.captureUnavailable ? [req.captureUnavailable] : [],
        provenance: "mechanical",
      }),
    );

  // The still must represent the destination the delivery was accepted for (#10). This is
  // the SECOND, independent catch of the same failure: even a still where every piece of
  // furniture happens to fit is not proof if it was taken at a size nobody publishes at.
  const wrong = s.captures.filter(
    (c) => c.destinationId !== req.acceptedDestinationId,
  );
  if (wrong.length)
    out.push(
      makeFinding({
        id: "destination-mismatch",
        criterion: "viewport",
        summary:
          "the review still was captured for a destination other than the accepted one",
        evidence: wrong.map(
          (c) =>
            `[${c.breakpoint}] captured for "${c.destinationId}" at ${c.cssViewport.width}x${c.cssViewport.height}, accepted destination is "${req.acceptedDestinationId}"`,
        ),
        provenance: "mechanical",
      }),
    );

  if (!s.altText.trim())
    out.push(
      makeFinding({
        id: "alt-text-missing",
        criterion: "accessibility",
        summary: "the visual carries no alternative description (WCAG 1.1.1)",
        evidence: [],
        provenance: "mechanical",
      }),
    );

  if (!s.sourceName.trim())
    out.push(
      makeFinding({
        id: "source-missing",
        criterion: "source",
        summary: "the visual carries no source attribution",
        evidence: [],
        provenance: "mechanical",
      }),
    );

  if (!s.unit.trim())
    out.push(
      makeFinding({
        id: "unit-missing",
        criterion: "craft",
        summary: "the visual states no unit for its numbers",
        evidence: [],
        provenance: "mechanical",
      }),
    );

  return out;
}

/**
 * Run the review and return the record.
 *
 * Never throws: an adapter that explodes, or an input that turns out to be contaminated,
 * both come back as a recorded outcome. A review that dies takes its evidence with it,
 * which is the one thing this layer cannot afford.
 */
export async function runReview(req: ReviewRequest): Promise<ReviewRecord> {
  const renderedTitle = renderedTitleOf(req.source.captures);
  const mechanical = [
    ...findingsFromChecks(req.checks),
    ...findingsFromEvidence(req),
    ...announcedColourFindings({
      concerns: req.brandConcerns ?? [],
      announced: req.announcedColour,
      honoured: req.honoured,
    }),
  ];

  let attribution: ReviewerAttribution = {
    mode: "mechanical",
    name: MECHANICAL_REVIEWER.name,
    version: MECHANICAL_REVIEWER.version,
    inputsHash: "",
    outputHash: "",
    independentSemanticReview: "unavailable",
  };

  // The redaction boundary is crossed exactly once, here, and BEFORE any adapter is
  // reached — including before the input is hashed, so the hash describes what a reviewer
  // could actually have seen.
  let input: ReviewerInput | null = null;
  let inputError: string | null = null;
  try {
    input = buildReviewerInput(req.source);
    assertNoInternals(input);
  } catch (e) {
    input = null;
    inputError = (e as Error).message;
  }

  const findings = [...mechanical];

  if (input) attribution.inputsHash = hashReviewerInput(input);

  if (req.adapter) {
    if (!input) {
      // Refusing to send is the correct outcome: unpublished reporting plus internal
      // plumbing must not leave the process just because a reviewer was configured.
      attribution.independentSemanticReview = "declined";
      findings.push(
        makeFinding({
          id: "independent-review-declined",
          criterion: "provenance",
          summary:
            "the independent review did not run — its input could not be prepared safely",
          evidence: [inputError ?? "unknown"],
          provenance: "mechanical",
          status: "acknowledged",
        }),
      );
    } else {
      try {
        const raw = await req.adapter.review(input);
        for (const f of raw)
          findings.push(
            makeFinding({
              id: f.id,
              criterion: f.criterion,
              summary: f.summary,
              evidence: f.evidence,
              provenance: "independent",
              ...(f.confidence ? { confidence: f.confidence } : {}),
            }),
          );
        attribution = {
          ...attribution,
          mode: "independent",
          name: req.adapter.name,
          version: req.adapter.version,
          independentSemanticReview: "available",
        };
      } catch (e) {
        // #9: "If the independent reviewer is unavailable, do not silently claim
        // independence; record self-review and apply the configured policy." The honest
        // label for what actually ran here is `mechanical` — no reasoning graded anything.
        attribution.independentSemanticReview = "declined";
        findings.push(
          makeFinding({
            id: "independent-review-declined",
            criterion: "provenance",
            summary:
              "the independent review did not run — the record claims no independence for this artifact",
            evidence: [(e as Error).message],
            provenance: "mechanical",
            status: "acknowledged",
          }),
        );
      }
    }
  }

  attribution.outputHash = hashReviewerOutput(findings);

  return {
    findings,
    reviewedProvenanceHash: req.reviewedProvenanceHash,
    reviewer: attribution,
    captures: req.source.captures,
    checks: req.checks,
    // The lane that is deliberately NOT graded: risks, with the measurement that raised
    // them, routed to the human sign-off. Kept in its own field so nothing can read a
    // taste risk as a cleared finding, or a cleared finding as a taste risk.
    // The title comes off the CAPTURES, not off the request: the caller commissioned a
    // title, the browser painted one, and only the second answers "what does this visual
    // actually say". Same derivation buildReviewerInput uses, from the same function.
    tasteRisk: detectTasteRisks({
      captures: req.source.captures,
      confirmedTakeaway: req.source.confirmedTakeaway,
      ...(renderedTitle ? { renderedTitle } : {}),
    }),
    overrides: [],
    acknowledged: [],
  };
}
