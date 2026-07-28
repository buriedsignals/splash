// THE severity table. One file, read by everything that emits a finding.
//
// Issue #11's requirement, verbatim: "Define the severity mapping centrally so the same
// defect cannot be blocking in one producer and advisory in another." The strong reading —
// the one implemented here — is that the finder does not get a vote at all: makeFinding()
// discards any severity handed to it and reads this table instead. That also defends
// against a reviewer model inflating or deflating its own verdicts, which is the failure
// mode this codebase already knows ("the judge can lie too").
import {
  CRITERIA,
  type Criterion,
  type Finding,
  type FindingProvenance,
  type Severity,
} from "./types";

// The default for a criterion, when a finding's id is not in the catalogue below (an
// adapter-produced finding, a wording that is new). TOTAL over CRITERIA on purpose: adding
// a criterion forces a decision here rather than falling into a silent default.
export const CRITERION_DEFAULT_SEVERITY: Record<Criterion, Severity> = {
  // The five axes #11 names as unsafe-to-ship classes.
  source: "blocking",
  accessibility: "blocking",
  "title-fidelity": "blocking",
  "data-fidelity": "blocking",
  interaction: "blocking",
  furniture: "blocking",
  viewport: "blocking",
  provenance: "blocking",
  // The three semantic axes no mechanism can settle. They are WARNINGS, never blockers:
  // blocking on an axis nothing can verify would turn the gate into a coin toss, and the
  // honest route for them is the taste-risk lane (lib/verify/taste.ts) into a human's eye.
  craft: "informational",
  "colour-semantics": "warning",
  narrative: "warning",
};

// The catalogue of MECHANICAL finding ids — the ones this layer emits itself. An id here
// pins its own severity and its own criterion, so a caller cannot file "furniture-below-fold"
// under `craft` and quietly demote it.
export const FINDING_SEVERITY: Record<
  string,
  { criterion: Criterion; severity: Severity }
> = {
  // Capture (issue #10)
  "furniture-missing": { criterion: "furniture", severity: "blocking" },
  "furniture-below-fold": { criterion: "furniture", severity: "blocking" },
  "component-overflows-viewport": {
    criterion: "viewport",
    severity: "blocking",
  },
  "destination-mismatch": { criterion: "viewport", severity: "blocking" },
  "size-mismatch": { criterion: "viewport", severity: "blocking" },
  // WARNING, alone among the viewport findings, and deliberately. Its siblings state facts with
  // no judgement in them — the image is not the destination's size, the component leaves its
  // container — while this one compares a legitimately content-driven height against a CHOSEN
  // ceiling (lib/verify/capture.ts CONTENT_HEIGHT_LIMIT_MULTIPLE). A long national ranking can
  // reach for it honestly, so blocking on the constant would gate real work on a number nobody
  // can derive. A warning still reaches the journalist in its own words, and promoting it is one
  // line here if the field says otherwise.
  "height-far-exceeds-destination": {
    criterion: "viewport",
    severity: "warning",
  },
  "no-capture": { criterion: "provenance", severity: "blocking" },
  // Evidence (issues #9, #11)
  "alt-text-missing": { criterion: "accessibility", severity: "blocking" },
  "source-missing": { criterion: "source", severity: "blocking" },
  "unit-missing": { criterion: "craft", severity: "warning" },
  "stale-artifact": { criterion: "provenance", severity: "blocking" },
  // A polish remark, catalogued so the "informational stays informational" path is a real
  // case and not a hypothetical branch.
  "value-label-abbreviation": { criterion: "craft", severity: "informational" },
};

/** The severity of a finding — from its id if catalogued, else from its criterion. */
export function severityFor(id: string, criterion: Criterion): Severity {
  const catalogued = FINDING_SEVERITY[id];
  if (catalogued) return catalogued.severity;
  const byCriterion = CRITERION_DEFAULT_SEVERITY[criterion];
  // An unknown criterion means this table has drifted from the vocabulary. "warning" makes
  // that visible without deadlocking a run on a class nobody has classified yet;
  // "informational" would hide it, "blocking" would strand every run on a typo.
  if (!byCriterion || !(CRITERIA as readonly string[]).includes(criterion))
    return "warning";
  return byCriterion;
}

/** The criterion a catalogued id belongs to, or the one the caller declared. */
export function criterionFor(id: string, declared: Criterion): Criterion {
  return FINDING_SEVERITY[id]?.criterion ?? declared;
}

// The ONE constructor of a Finding. `severity` is accepted in the argument type only so a
// caller that tries to set it type-checks and is then visibly ignored — silently dropping
// an unknown property would leave a reviewer author believing their severity travelled.
export function makeFinding(f: {
  id: string;
  criterion: Criterion;
  summary: string;
  evidence: string[];
  provenance: FindingProvenance;
  status?: Finding["status"];
  confidence?: Finding["confidence"];
  severity?: Severity;
}): Finding {
  const criterion = criterionFor(f.id, f.criterion);
  return {
    id: f.id,
    criterion,
    severity: severityFor(f.id, criterion),
    status: f.status ?? "open",
    summary: f.summary,
    evidence: f.evidence,
    provenance: f.provenance,
    // Conditional rather than `confidence: f.confidence` — an absent value must be an
    // ABSENT KEY, or JSON.stringify drops it and the record stops round-tripping (I6).
    ...(f.confidence ? { confidence: f.confidence } : {}),
  };
}
