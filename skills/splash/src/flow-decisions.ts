// The flow-decision registry — ONE table. Each entry declares a discretionary flow decision
// and how the code independently corroborates it, replacing a self-reported field (which can
// lie) with observable evidence. Adding a recurrence class is one entry here, never a new prose
// rule. Design: docs/superpowers/specs/2026-07-19-flow-decision-manifest-and-ledger-loop-design.md
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { AcceptedProposal } from "./producer-spec";
import { isDirectBranch } from "./candidate-provenance";
import { canonicalUrl } from "./source-guard";

export type CheckResult = { ok: true } | { ok: false; reason: string };

// The chart-native nativeTypes (skills/chart-native spec-to-config MAPPERS) that dw-chart could
// ALSO render (its counterpart is in skills/dw-chart CHART_TYPES). Shipping one of these via
// chart-native was an ESCALATION — a choice over dw's hosted interactive — so an escalationReason
// is owed. The chart-native-only types (treemap, heatmap, violin, waterfall, …) are NOT here:
// dw cannot do them, so choosing chart-native was a necessity, not an escalation.
// Curated conservatively: only the unambiguous 1:1 overlaps. UNDER-including is the safe error —
// a missed escalation is a lost warning, whereas OVER-including would (at the required:true flip)
// wrongly demand a reason for a rich-type run dw never could have served. Sources:
// skills/dw-chart/src/chart-spec.ts CHART_TYPES · skills/suggest-chart/eval/native-family-types.ts.
export const DW_REACHABLE_NATIVE_TYPES = new Set([
  "bar", // → d3-bars
  "line", // → d3-lines
  "scatter", // → d3-scatter-plot
  "grouped", // → d3-bars-grouped
  "stacked", // → d3-bars-stacked
  "pie", // → d3-pies
  "dumbbell", // → d3-range-plot
]);

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
  // Whether this decision applies to a given proposal (lever 1b, only-scoping). A decision is
  // evaluated only on runs where it applies — else requiring it (at the deferred required:true
  // flip) would fail a legitimate run that never triggered it. ABSENT ⇒ applicability not yet
  // declared ⇒ conservatively always in scope (never silently dropped).
  applies?: (p: AcceptedProposal) => boolean;
  // Whether the SPINE can confirm this decision's evidence from the runDir ALONE (no orchestrator
  // attestation, no payload). PRESENT ⇒ produce-all auto-records it when the evidence is there,
  // removing the fragile prose-trigger dependency the measurement suite exposed (a legit run
  // where the orchestrator forgot to call save-decision would otherwise fail at the flip). This
  // is STRONGER than a self-report: the spine sees the artifact, so the record cannot be a claim.
  autoRecordAtSpine?: (runDir: string) => boolean;
}

export const FLOW_DECISIONS: FlowDecision[] = [
  {
    id: "suggest-chart-invoked",
    evidenceKind: "artifact",
    prerequisites: [],
    required: false,
    // Applies on the GUIDED branch only: a direct-branch proposal (the journalist named the
    // visual) legitimately has no candidates.json, so requiring it there would be wrong.
    applies: (p) => !isDirectBranch(p),
    // The spine confirms it directly — candidates.json beside accepted.json IS the evidence that
    // suggest-chart ran, so produce-all records this itself rather than trusting a prose trigger.
    autoRecordAtSpine: (runDir) => existsSync(join(runDir, "candidates.json")),
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
    // Applies only when the proposal actually cites a source to corroborate — a run with no
    // citation has nothing to check.
    applies: (p) =>
      Boolean(p.sourceHint?.name?.trim() || p.sourceHint?.url?.trim()),
    // The "artifact" is the article text itself (a spine input). A cited name/url that the
    // article never contains is a fabricated/upgraded citation (finding class
    // source-url-unconfirmed).
    artifactCheck: (_runDir, payload) => {
      const haystack = String(payload.article ?? "").toLowerCase();
      const url = payload.sourceUrl ? String(payload.sourceUrl) : "";
      const name = payload.sourceName ? String(payload.sourceName) : "";
      // Match the URL on its canonical HOST (protocol/case/trailing-slash-insensitive, shared with
      // source-guard) — M3: the anti-fabrication signal is whether the cited domain appears in the
      // article at all, so a legitimate citation is never refused for a cosmetic difference.
      if (url) {
        const host = canonicalUrl(url).split("/")[0];
        if (host && !haystack.includes(host))
          return {
            ok: false,
            reason: `cited source URL "${url}" (host ${host}) does not appear in the article text`,
          };
      }
      if (name && !haystack.includes(name.trim().toLowerCase()))
        return {
          ok: false,
          reason: `cited source name "${name}" does not appear in the article text`,
        };
      return { ok: true };
    },
  },
  {
    id: "producer-escalation",
    evidenceKind: "transcript",
    prerequisites: [],
    required: false,
    // Applies only when the run ACTUALLY escalated: chart-native shipping a type dw could also do.
    // A chart-native-only type (dw cannot render it) is a necessity, not an escalation, so no
    // reason is owed there. Reads the spec's nativeType defensively (spec is producer-opaque here).
    applies: (p) =>
      p.producer === "chart-native" &&
      DW_REACHABLE_NATIVE_TYPES.has(
        (p.spec as { nativeType?: string } | null)?.nativeType ?? "",
      ),
    // No disk artifact: escalating to chart-native on a dw-reachable type is only justified by a
    // journalist motion/interactivity ask, which lives in the conversation. The spine enforces that
    // a reason was stated; the harness cross-checks it against the real transcript.
    writeGuard: (payload) => {
      const reason = String(payload.escalationReason ?? "").trim();
      return reason
        ? { ok: true }
        : {
            ok: false,
            reason:
              "escalationReason is required to escalate to chart-native on a dw-reachable type",
          };
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

// The scoped only-set for a run: every decision that applies to at least one accepted proposal
// (lever 1b, only-scoping). A decision with an `applies` predicate is included iff some proposal
// matches; a decision with NO `applies` is always included (applicability not yet declared —
// conservative, never silently dropped). Pass this as evaluateDecisions' `only` so a decision is
// warned about (and, at the deferred flip, required) only where it genuinely applies. Defensive
// against a malformed non-array accepted.json: falls back to the always-in decisions.
export function applicableDecisions(proposals: AcceptedProposal[]): string[] {
  const list = Array.isArray(proposals) ? proposals : [];
  return FLOW_DECISIONS.filter(
    (d) => d.applies === undefined || list.some((p) => d.applies!(p)),
  ).map((d) => d.id);
}

// The decisions the SPINE should auto-record for a run: applicable, spine-confirmable (their
// autoRecordAtSpine evidence is present in the runDir), and not already logged. produce-all
// appends these to decisions.jsonl before the gate, so a legit run never fails the deferred
// required:true flip merely because the orchestrator forgot the save-decision trigger.
export function spineAutoRecordableIds(
  runDir: string,
  applicableIds: string[],
  loggedIds: Set<string>,
): string[] {
  return FLOW_DECISIONS.filter(
    (d) =>
      applicableIds.includes(d.id) &&
      !loggedIds.has(d.id) &&
      d.autoRecordAtSpine !== undefined &&
      d.autoRecordAtSpine(runDir),
  ).map((d) => d.id);
}
