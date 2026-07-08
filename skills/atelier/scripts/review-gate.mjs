// CLI: bun scripts/review-gate.mjs <report.json> <proposalId> [concern...]
// Run AFTER the render-review — an independent editorial pass that reads the ACTUAL render
// plus the article/data and flags what code cannot (a title that misstates the metric, a
// fabricated source, a misleading encoding, a chart that adds nothing). Each trailing arg is
// one advisory concern; no concerns = a clean review. This records that the review RAN;
// assertShippable then refuses to export any visual with no review record.
import { readFileSync, writeFileSync } from "node:fs";
import { applyReviewGate } from "../src/review-gate.ts";

const [reportPath, id, ...concerns] = process.argv.slice(2);
if (!reportPath || !id) {
  console.error(
    "usage: review-gate.mjs <report.json> <proposalId> [concern...]",
  );
  process.exit(1);
}
try {
  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  const next = applyReviewGate(report, id, concerns);
  writeFileSync(reportPath, JSON.stringify(next, null, 2));
} catch (e) {
  console.error(`review-gate failed: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
}
console.log(
  concerns.length
    ? `render reviewed: ${id} — ${concerns.length} concern(s) recorded`
    : `render reviewed: ${id} — no concerns`,
);
