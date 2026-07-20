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
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => JSON.parse(l));
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

  // Prerequisites (lever 2): every declared prerequisite must already be logged.
  const logged = new Set(readDecisions(runDir).map((d) => d.id));
  const missingPrereqs = decision.prerequisites.filter((p) => !logged.has(p));
  if (missingPrereqs.length) {
    console.error(
      `cannot record "${decisionId}" — prerequisite decision(s) not yet logged: ${missingPrereqs.join(", ")}`,
    );
    process.exit(1);
  }

  // Write-time corroboration.
  const check =
    decision.evidenceKind === "artifact"
      ? decision.artifactCheck(runDir, payload)
      : (decision.writeGuard?.(payload) ?? { ok: true });
  if (!check.ok) {
    console.error(`cannot record "${decisionId}" — ${check.reason}`);
    process.exit(1);
  }

  const line = JSON.stringify({ id: decisionId, payload, at: "recorded" });
  const path = join(runDir, "decisions.jsonl");
  appendFileSync(path, line + "\n");
  chmodSync(path, 0o600);
  console.log(JSON.stringify({ recorded: decisionId }));
}
