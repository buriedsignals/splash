import { statSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import type { ProduceReport, ProposalResult } from "./producer-spec";

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
