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
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
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
// THE READER brand-concerns.json never had. It sat next to the outputs, listed in a
// delete-safety allowlist, opened by nothing — while this gate took its concerns as
// hand-typed argv. A journalist signed "ship it" without ever learning their house colour
// breaks accessibility (D25, 4/83).
//
// It lives in the proposal's OWN outDir, one level BELOW where report.json sits: report.json
// is exports/<slug>/report.json (SKILL.md §5c), while produce.mjs writes brand-concerns.json
// into the per-proposal exports/<slug>/<id>/ (SKILL.md §5c/§6, render-provenance.ts:155-160's
// same "outDir = exports/<slug>/<id>/" convention) — so the lookup joins dirname(reportPath)
// with `id`, not just dirname(reportPath).
//
// The file carries TWO classes and both are folded in at the same severity (an advisory
// render-review concern): `concerns` = the structured brand CVD/contrast tradeoffs, and
// `advisories` = the label-integrity tripwire (the "Interm." data-shortening class) plus the
// house-mark contrast screen. The advisories are already prose, so they need no reason/hue
// formatting. Reading `advisories` defensively keeps this compatible with a file written before
// the field existed.
const concernsPath = join(dirname(reportPath), id, "brand-concerns.json");
let fileConcerns = [];
if (existsSync(concernsPath)) {
  const parsed = JSON.parse(readFileSync(concernsPath, "utf8"));
  fileConcerns = [
    ...(parsed.concerns ?? []).map((c) =>
      c.nearestAccessible
        ? `${c.reason} — closest accessible hue: ${c.nearestAccessible}`
        : c.reason,
    ),
    ...(Array.isArray(parsed.advisories) ? parsed.advisories : []).filter(
      (a) => typeof a === "string" && a.trim(),
    ),
  ];
}
const allConcerns = [...fileConcerns, ...concerns];
try {
  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  const next = applyReviewGate(report, id, allConcerns, probes);
  writeFileSync(reportPath, JSON.stringify(next, null, 2));
} catch (e) {
  console.error(`review-gate failed: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
}
console.log(
  `render reviewed: ${id} — ${probes.length} probe(s), ` +
    (allConcerns.length
      ? `${allConcerns.length} concern(s) recorded`
      : "no concerns"),
);
