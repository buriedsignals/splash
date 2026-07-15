// CLI: bun scripts/review-gate.mjs <report.json> <proposalId> --probes <probes.json|inline-JSON> [concern...]
// Run AFTER the render-review — an independent editorial pass that reads the ACTUAL render
// plus the article/data and flags what code cannot (a title that misstates the metric, a
// fabricated source, a misleading encoding, a chart that adds nothing). Each trailing arg is
// one advisory concern; no concerns = a clean review. --probes is REQUIRED: the ledger of
// every probe/check the review actually RAN, each {check, outcome: pass|concern|resolved,
// note?} — a value starting with "[" is parsed as inline JSON, anything else is read as a
// file path. The gate refuses an empty ledger, a probed concern the review silently drops,
// and a failure keyword (404/absent/missing/mismatch…) no probe outcome reflects
// (src/review-gate.ts). This records that the review RAN and WHAT it ran; assertShippable
// then refuses to export any visual with no review record.
import { readFileSync, writeFileSync } from "node:fs";
import { applyReviewGate } from "../src/review-gate.ts";

const USAGE =
  "usage: review-gate.mjs <report.json> <proposalId> --probes <probes.json|inline-JSON-array> [concern...]\n" +
  "  --probes is required: the ledger of every check the review ran " +
  "([{check, outcome: pass|concern|resolved, note?}, ...])";

const args = process.argv.slice(2);
const positional = [];
let probesArg = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--probes") probesArg = args[++i];
  else positional.push(args[i]);
}
const [reportPath, id, ...concerns] = positional;
if (!reportPath || !id || probesArg == null) {
  console.error(USAGE);
  process.exit(1);
}
let probes;
try {
  const raw = probesArg.trimStart().startsWith("[")
    ? probesArg
    : readFileSync(probesArg, "utf8");
  probes = JSON.parse(raw);
} catch (e) {
  console.error(
    `review-gate failed: cannot read probes from ${probesArg}: ${e instanceof Error ? e.message : e}`,
  );
  process.exit(1);
}
try {
  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  const next = applyReviewGate(report, id, concerns, probes);
  writeFileSync(reportPath, JSON.stringify(next, null, 2));
} catch (e) {
  console.error(`review-gate failed: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
}
console.log(
  `render reviewed: ${id} — ${probes.length} probe(s), ` +
    (concerns.length
      ? `${concerns.length} concern(s) recorded`
      : "no concerns"),
);
