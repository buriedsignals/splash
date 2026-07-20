// CLI: bun save-decision.mjs <decisionId> <runDir> [--payload <json>] — the ONLY sanctioned way
// a flow decision is recorded. Mechanical on purpose (mirrors save-key.mjs): the orchestrator LLM
// never hand-edits decisions.jsonl. VERIFIES AT WRITE TIME — refuses to record a decision whose
// corroborating artifact is missing or whose prerequisites are not already logged, so a false or
// out-of-order decision cannot even be written.
import { appendFileSync, chmodSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getDecision } from "../src/flow-decisions.ts";

export function readDecisions(runDir) {
  const path = join(runDir, "decisions.jsonl");
  if (!existsSync(path)) return [];
  const lines = readFileSync(path, "utf8")
    .split("\n")
    .filter((l) => l.trim() !== "");
  const decisions = [];
  for (const l of lines) {
    // An interrupted appendFileSync (not atomic) can leave a partial/corrupt trailing line.
    // Skip it rather than throwing — a garbled last line must not crash every subsequent
    // produce-all run nor discard the well-formed decisions already recorded before it.
    try {
      decisions.push(JSON.parse(l));
    } catch {
      // skip corrupt line
    }
  }
  return decisions;
}

// Append a decision line to <runDir>/decisions.jsonl in the sanctioned format. The CLI path
// guards eligibility BEFORE calling this; the spine's auto-record path (produce-all) confirms the
// artifact itself before calling it, so the append is unconditional here. Same `at:"recorded"`
// sentinel (never a timestamp — determinism), same chmod 0600.
export function appendDecisionLine(runDir, id, payload = {}) {
  const path = join(runDir, "decisions.jsonl");
  appendFileSync(path, JSON.stringify({ id, payload, at: "recorded" }) + "\n");
  chmodSync(path, 0o600);
}

// Pure write-eligibility policy, extracted so the untested branches (prerequisite refusal,
// missing-artifactCheck refusal) can be exercised directly without shelling out to the CLI.
// loggedIds: Set of decision ids already recorded in this run's decisions.jsonl.
export function checkWriteEligibility(decision, loggedIds, runDir, payload) {
  // Prerequisites (lever 2): every declared prerequisite must already be logged.
  const missingPrereqs = decision.prerequisites.filter((p) => !loggedIds.has(p));
  if (missingPrereqs.length) {
    return {
      ok: false,
      reason: `prerequisite decision(s) not yet logged: ${missingPrereqs.join(", ")}`,
    };
  }

  // Write-time corroboration.
  if (decision.evidenceKind === "artifact") {
    if (!decision.artifactCheck) {
      return {
        ok: false,
        reason: `decision ${decision.id} is artifact-kind but declares no artifactCheck`,
      };
    }
    return decision.artifactCheck(runDir, payload);
  }
  return decision.writeGuard?.(payload) ?? { ok: true };
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const [decisionId, runDir] = argv;
  const payloadFlag = argv.indexOf("--payload");
  const payload = payloadFlag >= 0 ? JSON.parse(argv[payloadFlag + 1] ?? "{}") : {};

  if (!decisionId || !runDir) {
    console.error("usage: save-decision.mjs <decisionId> <runDir> [--payload <json>]");
    process.exit(1);
  }
  const decision = getDecision(decisionId);
  if (!decision) {
    console.error(`unknown decision "${decisionId}"`);
    process.exit(1);
  }

  const loggedIds = new Set(readDecisions(runDir).map((d) => d.id));
  const eligibility = checkWriteEligibility(decision, loggedIds, runDir, payload);
  if (!eligibility.ok) {
    console.error(`cannot record "${decisionId}" — ${eligibility.reason}`);
    process.exit(1);
  }

  const line = JSON.stringify({ id: decisionId, payload, at: "recorded" });
  const path = join(runDir, "decisions.jsonl");
  appendFileSync(path, line + "\n");
  chmodSync(path, 0o600);
  console.log(JSON.stringify({ recorded: decisionId }));
}
