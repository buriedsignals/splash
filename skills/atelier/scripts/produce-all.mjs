// CLI: bun scripts/produce-all.mjs <accepted.json> <outDir>
// Reads the accepted proposals, runs the in-code batch loop, prints the report as JSON.
import { readFileSync } from "node:fs";
import { produceAll } from "../src/produce-all.ts";
import { realDispatch } from "../src/adapters.ts";

const acceptedPath = process.argv[2];
const outDir = process.argv[3];
if (!acceptedPath || !outDir) {
  console.error("usage: produce-all.mjs <accepted.json> <outDir>");
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
const report = await produceAll(accepted, outDir, realDispatch);
console.log(JSON.stringify(report, null, 2));
// Exit non-zero if anything failed, so a caller can detect trouble; needs-fallback and
// needs-confirmation are NOT failures (the agent acts on them), so they exit 0.
const failed = report.results.some((r) => r.status === "failed");
process.exit(failed ? 1 : 0);
