// CLI: bun scripts/gate-render.mjs <report.json> <proposalId> <artifactPath>
// Run AFTER the human sees the render and says "ship it". Writes renderApproved back.
import { readFileSync, writeFileSync } from "node:fs";
import { applyRenderGate } from "../src/gate.ts";

const [reportPath, id, artifactPath] = process.argv.slice(2);
if (!reportPath || !id || !artifactPath) {
  console.error("usage: gate-render.mjs <report.json> <proposalId> <artifactPath>");
  process.exit(1);
}
try {
  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  const next = applyRenderGate(report, id, readFileSync(artifactPath));
  writeFileSync(reportPath, JSON.stringify(next, null, 2));
} catch (e) {
  console.error(`gate-render failed: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
}
console.log(`render approved: ${id}`);
