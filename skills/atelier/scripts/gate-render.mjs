// CLI: bun scripts/gate-render.mjs <report.json> <proposalId> <artifactPath>
// Run AFTER the human sees the render and says "ship it". Writes renderApproved back.
// PROVENANCE (mechanical): the approved file must be traceable to the CURRENT produce
// generation — a pipeline-emitted output of this report, or (hosted embed with no local
// render) a fresh capture under exports/<slug>/_review-artifacts/<id>/. A hand-planted
// or stale-generation file is a hard refusal (src/render-provenance.ts).
import { readFileSync, writeFileSync } from "node:fs";
import { applyRenderGate } from "../src/gate.ts";
import { assertArtifactProvenance } from "../src/render-provenance.ts";

const [reportPath, id, artifactPath] = process.argv.slice(2);
if (!reportPath || !id || !artifactPath) {
  console.error("usage: gate-render.mjs <report.json> <proposalId> <artifactPath>");
  process.exit(1);
}
try {
  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  const result = (report.results ?? []).find((r) => r.id === id);
  // Provenance runs only for a produced result: otherwise applyRenderGate's own
  // refusal (not produced / unknown proposal) is the precise message.
  if (result && result.status === "produced")
    assertArtifactProvenance({ report, result, reportPath, artifactPath });
  const next = applyRenderGate(report, id, readFileSync(artifactPath));
  writeFileSync(reportPath, JSON.stringify(next, null, 2));
} catch (e) {
  console.error(`gate-render failed: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
}
console.log(`render approved: ${id}`);
