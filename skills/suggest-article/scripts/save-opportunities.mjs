// CLI: bun save-opportunities.mjs <runDir> --payload <json> — the sanctioned way this skill's
// ProposalSet becomes a FACT ON DISK.
//
// Why it exists: ANALYSE produced no artifact at all. The anchors it computes ({ paragraphIndex,
// quote }, SKILL.md step 6) lived in the model's context and nowhere else, so "did the article
// carry an anchor for this element?" had no answer any script could give — and the placement the
// journalist is owed at hand-over rested on the orchestrator remembering, dozens of turns later.
// This is the same move suggest-chart's menu already made (candidates.json, splash/SKILL.md:411),
// which candidateProvenanceIssue then turned into a hard precondition of production.
//
// VERIFIES AT WRITE TIME, like save-decision.mjs: a payload that would produce a useless file is
// refused instead of persisted, so a downstream reader never has to distinguish "written badly"
// from "not written".
//
// It writes into the RUN directory (exports/<slug>/), beside accepted.json / candidates.json /
// report.json — never into a producer outDir, so lib/host/path-safety.ts's producible-name
// allowlist (which guards the destructive rm on an outDir) is not in play.
import { existsSync, statSync, writeFileSync, chmodSync } from "node:fs";
import { join, resolve } from "node:path";

function usableQuote(v) {
  return typeof v === "string" && v.trim() !== "";
}

function usableIndex(v) {
  return typeof v === "number" && Number.isInteger(v) && v > 0;
}

/** Pure write-eligibility policy, exported so every refusal branch is testable without shelling
 *  out. Returns [] when the payload may be persisted. */
export function opportunitiesWriteErrors(payload) {
  const errors = [];
  if (payload === null || typeof payload !== "object") {
    errors.push("payload must be a JSON object carrying a `proposals` array");
    return errors;
  }
  const proposals = payload.proposals;
  if (!Array.isArray(proposals)) {
    errors.push("payload has no `proposals` array (this skill's ProposalSet shape)");
    return errors;
  }
  if (proposals.length === 0) {
    errors.push(
      "`proposals` is empty — an analysed article yields opportunities or an explicit refusal, never a blank record",
    );
    return errors;
  }
  proposals.forEach((p, i) => {
    if (p === null || typeof p !== "object") {
      errors.push(`proposal ${i} is not an object`);
      return;
    }
    if (typeof p.claim !== "string" || p.claim.trim() === "")
      errors.push(`proposal ${i} has no \`claim\``);
    if (typeof p.intent !== "string" || p.intent.trim() === "")
      errors.push(`proposal ${i} has no \`intent\``);
    if (p.anchor !== undefined) {
      // An anchor is OPTIONAL (an opportunity bound to no passage is legitimate — splash/SKILL.md
      // §6). But an anchor that is PRESENT and carries nothing usable is a copying slip, and
      // persisting it would create a record that looks anchored and can say nothing.
      if (p.anchor === null || typeof p.anchor !== "object")
        errors.push(`proposal ${i} has an \`anchor\` that is not an object`);
      else if (!usableQuote(p.anchor.quote) && !usableIndex(p.anchor.paragraphIndex))
        errors.push(
          `proposal ${i} has an \`anchor\` with neither a non-empty \`quote\` nor a positive integer \`paragraphIndex\` — omit the anchor entirely for a free-standing opportunity`,
        );
    }
  });
  return errors;
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const runDir = argv[0];
  const payloadFlag = argv.indexOf("--payload");
  if (!runDir || payloadFlag < 0) {
    console.error("usage: save-opportunities.mjs <runDir> --payload <json>");
    process.exit(1);
  }
  let payload;
  try {
    payload = JSON.parse(argv[payloadFlag + 1] ?? "");
  } catch (e) {
    console.error(`--payload is not valid JSON (${e.message})`);
    process.exit(1);
  }
  const dir = resolve(runDir);
  // Never mkdir: the run directory is created by the flow that owns the run. Creating one here
  // would silently write the record somewhere nobody reads it.
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    console.error(
      `run directory ${dir} does not exist — pass the directory that holds this run's accepted.json/candidates.json (exports/<slug>)`,
    );
    process.exit(1);
  }
  const errors = opportunitiesWriteErrors(payload);
  if (errors.length) {
    console.error("cannot record opportunities — " + errors.join("; "));
    process.exit(1);
  }
  const opportunities = payload.proposals.map((p) => ({
    ...(p.anchor !== undefined ? { anchor: p.anchor } : {}),
    claim: p.claim,
    intent: p.intent,
  }));
  const written = join(dir, "opportunities.json");
  writeFileSync(written, JSON.stringify({ opportunities }, null, 2) + "\n");
  chmodSync(written, 0o600);
  console.log(
    JSON.stringify({
      written,
      opportunities: opportunities.length,
      anchored: opportunities.filter((o) => o.anchor !== undefined).length,
    }),
  );
}
