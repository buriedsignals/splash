import { existsSync, readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve, sep } from "node:path";
import type {
  AcceptedProposal,
  ProduceReport,
  ProposalResult,
} from "./producer-spec";
import { canonicalJson } from "./canonical-json";
import {
  candidateProvenanceIssue,
  extractCandidateProducers,
  type CandidateProvenance,
} from "./candidate-provenance";

// PROVENANCE for Gate 3b (gate-render): the file being approved must be traceable to
// the CURRENT produce generation — either a file the pipeline itself emitted (listed
// in the result's `outputs`, which for file-based producers is the full outDir listing
// including review stills), or, for a HOSTED embed with no local render (dw-chart /
// map-dw `format:"interactive"` — publicUrl, empty outputs), a FRESH review capture
// under the sanctioned `_review-artifacts/<id>/` directory next to report.json.
//
// The two real failure modes this kills mechanically (both observed in QA):
//   1. A hand-authored file planted INTO the producer's build subdir to satisfy the
//      file-based approval API (an ad-hoc hosted-embed.html) — it is not in `outputs`,
//      so it is refused; and because the sanctioned capture location lives OUTSIDE the
//      producer output dirs, a legitimate hosted-embed capture can never leak into
//      export-code's readdir-based hosted-DW detection.
//   2. A stale-generation approval — gate-render run against an OLD report after a
//      later produce rewrote the artifacts (the report's fresh copy was never saved):
//      the artifact at the listed path is NEWER than the report's generation anchor,
//      so it is refused until the fresh report is saved and Gates 3a→3b re-run.

// Sanctioned location for review artifacts of a hosted embed (no local render):
// exports/<slug>/_review-artifacts/<id>/ — SIBLING of the producer output dirs
// exports/<slug>/<id>/, never inside them.
export const REVIEW_ARTIFACTS_DIR = "_review-artifacts";

// Tolerance around the generation anchor. Rationale: produce writes artifacts first
// and stamps generatedAt at produceAll's return, so a same-generation artifact is
// nominally OLDER than the anchor — but coarse filesystem mtime granularity (whole
// seconds on some filesystems) can round an artifact's mtime past the stamp. 2s
// absorbs that; a genuinely later produce or a hand-planted file arrives minutes
// later, far outside the window.
export const PRODUCE_MTIME_SKEW_MS = 2000;

// The produce-generation anchor in epoch ms: the report's own generatedAt stamp
// (produce-all writes it), falling back to the report FILE's mtime for a legacy
// report that predates the stamp — the agent redirects produce-all's stdout into
// report.json right after the run, so its mtime is a serviceable stand-in (review-gate
// and gate-render rewrite the file later, which only moves the anchor FORWARD — safe
// for refusing even-newer planted files, slightly over-strict for hosted captures made
// before the review record; the stamped path has neither caveat).
function generationAnchorMs(report: ProduceReport, reportPath: string): number {
  if (report.generatedAt) {
    const parsed = Date.parse(report.generatedAt);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return statSync(resolve(reportPath)).mtimeMs;
}

export function assertArtifactProvenance(opts: {
  report: ProduceReport;
  result: ProposalResult;
  reportPath: string;
  artifactPath: string;
}): void {
  const { report, result, reportPath, artifactPath } = opts;
  const abs = resolve(artifactPath);
  const artifactMtimeMs = statSync(abs).mtimeMs;
  const anchorMs = generationAnchorMs(report, reportPath);
  const outputs = (result.outputs ?? []).map((p) => resolve(p));

  // Pipeline-emitted file (file-based producers list the WHOLE outDir, review stills
  // included; cloud producers list their exported PNG).
  if (outputs.includes(abs)) {
    if (artifactMtimeMs > anchorMs + PRODUCE_MTIME_SKEW_MS)
      throw new Error(
        `refusing to approve ${abs}: it was modified AFTER this report's produce generation ` +
          `(artifact mtime ${new Date(artifactMtimeMs).toISOString()} > report generation ` +
          `${new Date(anchorMs).toISOString()}) — the report is stale (a later produce ran ` +
          `without saving its fresh report, or the file was hand-modified). Save the fresh ` +
          `report.json from the last produce-all run and redo Gates 3a→3b on the NEW render.`,
      );
    return;
  }

  // Sanctioned hosted-review capture: ONLY for a hosted embed with no local render.
  // sanctionedAbs is the ABSOLUTE run-scoped capture dir — anchored on report.json's own
  // resolved directory, so it is deterministic regardless of the orchestrator's cwd. It is
  // surfaced VERBATIM in every refusal below so a mis-pathed capture (observed: a bare
  // relative `exports/...` that resolved against an earlier `cd skills/dw-chart`, landing
  // the screenshot under skills/dw-chart/exports/…) is re-captured at the right absolute
  // place, never papered over with an ad-hoc mv of the stray file into position.
  const sanctionedAbs = join(
    dirname(resolve(reportPath)),
    REVIEW_ARTIFACTS_DIR,
    result.id,
  );
  const sanctionedDir = sanctionedAbs + sep;
  const isHostedNoLocalRender =
    result.publicUrl != null && (result.outputs ?? []).length === 0;
  if (abs.startsWith(sanctionedDir)) {
    if (!isHostedNoLocalRender)
      throw new Error(
        `refusing to approve ${abs}: ${REVIEW_ARTIFACTS_DIR}/ captures are only for a ` +
          `hosted embed with no local render (publicUrl set, empty outputs) — this result ` +
          `has pipeline-emitted outputs; approve the produced file listed in the report instead.`,
      );
    if (artifactMtimeMs < anchorMs - PRODUCE_MTIME_SKEW_MS)
      throw new Error(
        `refusing to approve ${abs}: this review capture predates the current produce ` +
          `generation (${new Date(anchorMs).toISOString()}) — it is stale. Re-open the live ` +
          `embed and re-capture it FRESH into ${sanctionedAbs}${sep} (the absolute ` +
          `run-scoped capture dir), then re-review. Never move/mv an existing file into ` +
          `place — re-capture it.`,
      );
    return;
  }

  throw new Error(
    `refusing to approve ${abs}: not an output of the current produce generation for ` +
      `proposal ${result.id}. The render gate only approves files the pipeline emitted ` +
      `(this result's outputs: ${outputs.length ? outputs.join(", ") : "none"})` +
      (isHostedNoLocalRender
        ? ` or, for this hosted embed with no local render, a fresh capture INSIDE the ` +
          `absolute run-scoped dir ${sanctionedAbs}${sep} (not a cwd-relative ` +
          `exports/… path — that resolves against any earlier cd). Re-capture the live ` +
          `embed there; never move/mv a mis-pathed capture into place.`
        : `. A hand-authored or stale file cannot be approved — and never write extra ` +
          `files into the producer's build subdir.`),
  );
}

// EXPORT-STAGE chain verification (S1 strict production seam): the load-bearing gate that makes
// a hand-authored / pipeline-bypassing artifact UNSHIPPABLE by verifying the delivered result
// traces the sanctioned chain candidates.json → accepted.json → produce-all → outputs. Three
// checks, each delegated to its existing single source of truth rather than reimplemented here:
//   1. Candidate-menu provenance (candidate-provenance.ts) — the accepted proposal's producer
//      must appear in the candidates.json menu beside accepted.json, UNLESS the proposal is the
//      direct-branch exemption (journalist NAMED the visual) — reuses candidateProvenanceIssue,
//      mirroring exactly how produce-all.mjs builds the same CandidateProvenance context.
//   2. Accepted-spec hash (canonical-json.ts) — accepted.json's spec for this id, canonicalized
//      and sha256'd, must equal the produced result's acceptedConfigHash (Task 1's provenance
//      stamp) — a spec hand-edited after acceptance mismatches and is refused.
//   3. Artifact provenance (assertArtifactProvenance above) — every produced output must be
//      traceable to THIS report's generation and unmodified since. Delegated, not duplicated: a
//      hosted embed (publicUrl set, no local outputs) has nothing to check here.
// Throws a clean refusal message (never a raw/unexpected error) on any failure — callers
// (export-code.mjs) catch it into a failed, no-delivery exit, exactly like assertShippable.
//
// `exportDir` is kept in the signature to match the call site (export-code.mjs's positional
// exportDir arg — the per-id DELIVERY folder, e.g. exports/<slug>/<id>-export) but is
// deliberately NOT where this function looks for accepted.json/candidates.json: those live in
// the RUN directory (exports/<slug>) beside report.json, not inside the delivery folder — see
// SKILL.md §5c (`produce-all.mjs exports/<slug>/accepted.json exports/<slug> >
// exports/<slug>/report.json`) and §6 (`export-code.mjs exports/<slug>/<id>
// exports/<slug>/<id>-export --results exports/<slug>/report.json`), and produce-all.mjs's own
// `candidatesPath = join(dirname(acceptedPath), "candidates.json")` convention. reportPath is
// always in that run directory (produce-all's report.json redirect), so it — not exportDir — is
// the reliable anchor; deriving the lookup from exportDir would refuse every real delivery
// (exportDir never contains accepted.json), violating the behaviour-preserving happy path.
export function assertChainProvenance(
  report: ProduceReport,
  id: string,
  exportDir: string,
  reportPath: string,
): void {
  void exportDir; // intentionally unused for path lookup — see comment above

  const result = report.results.find((r) => r.id === id);
  if (!result)
    throw new Error(
      `refusing to export ${id}: unknown proposal (not in report)`,
    );

  const runDir = dirname(resolve(reportPath));
  const acceptedPath = join(runDir, "accepted.json");
  let acceptedList: unknown;
  try {
    acceptedList = JSON.parse(readFileSync(acceptedPath, "utf8"));
  } catch (e) {
    throw new Error(
      `refusing to export ${id}: accepted.json not found/unreadable at ${acceptedPath} ` +
        `(${e instanceof Error ? e.message : String(e)}) — the sanctioned accepted-proposal ` +
        `record is missing, so the shipped artifact cannot be traced to an accepted spec`,
    );
  }
  const rawList = Array.isArray(acceptedList) ? acceptedList : [];
  const apRaw = rawList.find(
    (a) => a && typeof a === "object" && (a as { id?: unknown }).id === id,
  );
  if (!apRaw)
    throw new Error(
      `refusing to export ${id}: no entry for "${id}" in accepted.json at ${acceptedPath}`,
    );
  const ap = apRaw as AcceptedProposal;

  // 1. Candidate-menu provenance — mirrors the CandidateProvenance context produce-all.mjs
  // builds from the same candidates.json (skills/splash/scripts/produce-all.mjs): present:false
  // when the file is absent or unparseable, which candidateProvenanceIssue turns into a refusal
  // for any non-direct proposal.
  const candidatesPath = join(runDir, "candidates.json");
  let provenance: CandidateProvenance = {
    present: false,
    producers: new Set(),
  };
  if (existsSync(candidatesPath)) {
    try {
      const parsed = JSON.parse(readFileSync(candidatesPath, "utf8"));
      provenance = {
        present: true,
        producers: extractCandidateProducers(parsed),
      };
    } catch {
      provenance = { present: false, producers: new Set() };
    }
  }
  const menuIssue = candidateProvenanceIssue(ap, provenance);
  if (menuIssue) throw new Error(`refusing to export ${id}: ${menuIssue}`);

  // 2. Accepted-spec hash — the shipped artifact must trace to the UNEDITED accepted spec.
  if (!result.acceptedConfigHash)
    throw new Error(
      `refusing to export ${id}: produced result carries no acceptedConfigHash — cannot verify ` +
        `it traces to the accepted spec (stale/legacy report? re-run produce-all)`,
    );
  const specHash = createHash("sha256")
    .update(canonicalJson(ap.spec))
    .digest("hex");
  if (specHash !== result.acceptedConfigHash)
    throw new Error(
      `refusing to export ${id}: accepted.json's spec hash (${specHash}) does not match the ` +
        `produced result's acceptedConfigHash (${result.acceptedConfigHash}) — the accepted ` +
        `spec was edited after acceptance/production, so the shipped artifact no longer traces ` +
        `to a sanctioned spec`,
    );

  // 3. Artifact provenance — delegate to assertArtifactProvenance (planted/stale detection),
  // never reimplemented. A hosted embed (publicUrl set, no local outputs) has nothing left to
  // check here; the menu + spec-hash checks above already cover it.
  for (const artifactPath of result.outputs ?? []) {
    assertArtifactProvenance({ report, result, reportPath, artifactPath });
  }
}
