// The flow-decision registry — ONE table. Each entry declares a discretionary flow decision
// and how the code independently corroborates it, replacing a self-reported field (which can
// lie) with observable evidence. Adding a recurrence class is one entry here, never a new prose
// rule. Design: docs/superpowers/specs/2026-07-19-flow-decision-manifest-and-ledger-loop-design.md
import { existsSync } from "node:fs";
import { join } from "node:path";

export type CheckResult = { ok: true } | { ok: false; reason: string };

// Payload passed at write-time (save-decision.mjs) and gate-time: the decision's own recorded
// fields (e.g. escalationReason), so a transcript-kind decision can enforce presence of a
// required justification even where no disk artifact exists.
export type DecisionPayload = Record<string, unknown>;

export interface FlowDecision {
  id: string;
  evidenceKind: "artifact" | "transcript";
  // Decision ids that must already be in decisions.jsonl before this one may be recorded (lever 2).
  prerequisites: string[];
  // Staged rollout: false ⇒ gate warns on absence; true ⇒ gate fails. Starts false.
  required: boolean;
  // Artifact-provable decisions: corroborate against a file in the runDir. Present ⇒ spine-enforceable.
  artifactCheck?: (runDir: string, payload: DecisionPayload) => CheckResult;
  // Transcript-only decisions: the spine can only enforce payload presence; the harness cross-checks
  // the real transcript. Present ⇒ this is the spine-side presence guard.
  writeGuard?: (payload: DecisionPayload) => CheckResult;
}

export const FLOW_DECISIONS: FlowDecision[] = [
  {
    id: "suggest-chart-invoked",
    evidenceKind: "artifact",
    prerequisites: [],
    required: false,
    artifactCheck: (runDir) =>
      existsSync(join(runDir, "candidates.json"))
        ? { ok: true }
        : {
            ok: false,
            reason:
              "candidates.json is absent from the run directory — suggest-chart was not actually invoked (routing done from memory)",
          },
  },
  {
    id: "source-fidelity",
    evidenceKind: "artifact",
    prerequisites: [],
    required: false,
    // The "artifact" is the article text itself (a spine input). A cited name/url that the
    // article never contains is a fabricated/upgraded citation (finding class
    // source-url-unconfirmed).
    artifactCheck: (_runDir, payload) => {
      const article = String(payload.article ?? "");
      const url = payload.sourceUrl ? String(payload.sourceUrl) : "";
      const name = payload.sourceName ? String(payload.sourceName) : "";
      if (url && !article.includes(url))
        return {
          ok: false,
          reason: `cited source URL "${url}" does not appear in the article text`,
        };
      if (name && !article.includes(name))
        return {
          ok: false,
          reason: `cited source name "${name}" does not appear in the article text`,
        };
      return { ok: true };
    },
  },
];

export function getDecision(id: string): FlowDecision | undefined {
  return FLOW_DECISIONS.find((d) => d.id === id);
}

// The spine gate reader: for each registry decision (or the subset named by opts.only), if its
// id is absent from loggedIds, push an ERROR when required, a WARNING when not. A proposal that
// never escalated should not be asked for producer-escalation — opts.only scopes to what applies.
export function evaluateDecisions(
  _runDir: string,
  loggedIds: Set<string>,
  opts: { only?: string[] } = {},
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const scope = opts.only
    ? FLOW_DECISIONS.filter((d) => opts.only!.includes(d.id))
    : FLOW_DECISIONS;
  for (const d of scope) {
    if (loggedIds.has(d.id)) continue;
    const msg = `flow decision "${d.id}" was never recorded (no save-decision.mjs entry)`;
    if (d.required) errors.push(msg);
    else warnings.push(msg);
  }
  return { errors, warnings };
}
