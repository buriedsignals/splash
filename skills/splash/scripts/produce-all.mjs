// CLI: bun scripts/produce-all.mjs <accepted.json> <outDir>
// Reads the accepted proposals, runs the in-code batch loop, prints the report as JSON.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { produceAll } from "../src/produce-all.ts";
import { realDispatch } from "../src/adapters.ts";
import { validateAccepted } from "../src/validate-gate.ts";
import { loadNewsroomProfile } from "../src/brand-profile.ts";
import {
  extractCandidateProducers,
  narrativeConsiderationWarning,
} from "../src/candidate-provenance.ts";
import { readDecisions, appendDecisionLine } from "./save-decision.mjs";
import {
  evaluateDecisions,
  applicableDecisions,
  spineAutoRecordableIds,
} from "../src/flow-decisions.ts";

const acceptedPath = process.argv[2];
const outDir = process.argv[3];
// The newsroom's project root (where NEWSROOM-PROFILE.md / brand.json live) — the cwd splash
// is run from, overridable as a 3rd arg for tests/non-cwd runs.
const projectDir = process.argv[4] ?? process.cwd();
if (!acceptedPath || !outDir) {
  console.error("usage: produce-all.mjs <accepted.json> <outDir> [projectDir]");
  process.exit(1);
}
let accepted;
try {
  accepted = JSON.parse(readFileSync(acceptedPath, "utf8"));
} catch (e) {
  console.error(
    `cannot read accepted proposals from ${acceptedPath}: ${e instanceof Error ? e.message : e}`,
  );
  process.exit(1);
}
const profile = loadNewsroomProfile(projectDir);

// Candidate-provenance context: the ranked candidates the suggester persisted MUST sit beside
// accepted.json (same dir). The real production path ALWAYS builds this — so produce-all enforces
// the menu-was-consulted invariant (Tom #1/#2/#3), fail-hard, on every run. `present: false` when
// the file is absent (the menu was never made) is itself a fail-hard signal for non-direct proposals.
const candidatesPath = join(dirname(acceptedPath), "candidates.json");
let candidateProvenance = { present: false, producers: new Set() };
// Menu-level narrative-consideration warning (Tom #3): computed from the same candidates.json,
// attached to the report AFTER production (a menu property, not a per-proposal one).
let menuNarrativeWarning = null;
if (existsSync(candidatesPath)) {
  try {
    const parsed = JSON.parse(readFileSync(candidatesPath, "utf8"));
    candidateProvenance = { present: true, producers: extractCandidateProducers(parsed) };
    menuNarrativeWarning = narrativeConsiderationWarning(parsed, accepted);
  } catch {
    // A corrupt/unparseable candidates.json is treated as absent (present:false) — a non-direct
    // proposal then fails provenance loudly rather than silently skipping the gate.
    candidateProvenance = { present: false, producers: new Set() };
  }
}

// Flow-decision gate: decisions.jsonl sits beside accepted.json, like candidates.json. A required
// decision never recorded fails the run; an optional one warns. Staged: the first-cut trio ships
// required:false, so this is warnings-only until each is flipped.
const runDir = dirname(acceptedPath);
// Scope to the decisions that actually apply to THIS run (lever 1b, only-scoping): each registry
// decision declares its own applicability, so a run that never escalated / never cited a source is
// not asked for that decision. This is what makes the deferred required:true flip safe — a
// legitimate run only faces the decisions it genuinely triggered. producer-escalation has no
// applicability predicate yet (needs the chart-native↔dw type set) so it stays conservatively in.
const applicableIds = applicableDecisions(accepted);
let loggedDecisionIds = new Set(readDecisions(runDir).map((d) => d.id));
// SPINE AUTO-RECORD (lever 1b): for decisions the spine can confirm itself from the runDir
// (candidates.json ⇒ suggest-chart-invoked), record them here rather than trusting the orchestrator's
// prose-triggered save-decision call — the measurement suite showed that trigger is unreliable, so a
// legit run would otherwise fail the deferred required:true flip. The spine SEES the artifact, so
// this record is a confirmation, not a self-report.
for (const id of spineAutoRecordableIds(runDir, applicableIds, loggedDecisionIds)) {
  appendDecisionLine(runDir, id, { autoRecordedBy: "produce-all" });
}
loggedDecisionIds = new Set(readDecisions(runDir).map((d) => d.id));
const decisionOutcome = evaluateDecisions(runDir, loggedDecisionIds, {
  only: applicableIds,
});
for (const w of decisionOutcome.warnings) console.error(`[flow-decision] warning: ${w}`);
if (decisionOutcome.errors.length) {
  console.error("[flow-decision] BLOCKED:\n  " + decisionOutcome.errors.join("\n  "));
  process.exit(1);
}

const report = await produceAll(
  accepted,
  outDir,
  realDispatch,
  validateAccepted,
  profile,
  undefined,
  candidateProvenance,
);
if (menuNarrativeWarning) report.warnings = [menuNarrativeWarning];
console.log(JSON.stringify(report, null, 2));
// Exit non-zero if anything failed, so a caller can detect trouble; needs-fallback and
// needs-confirmation are NOT failures (the agent acts on them), so they exit 0.
const failed = report.results.some((r) => r.status === "failed");
process.exit(failed ? 1 : 0);
