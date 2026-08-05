#!/usr/bin/env bun
// « Est-ce que ça vient vraiment de Splash ? » — the question a journalist can ask about a file
// they were handed, answered from the disk rather than from anybody's word.
//
//   bun skills/splash/scripts/verify-delivery.mjs <path>
//
// WHY THIS EXISTS (registry E11). On 2026-08-03 a host model called `suggest_article` as if it
// were a tool, failed, enabled the host's own charting extension instead, drew a bar in the chat
// and announced « Le visuel est prêt » — no exports/, no producer, no gate, no owned file. NO
// CODE OF THIS REPOSITORY RAN, so no guard of this repository could object: a control on the
// spine only fires if the spine turns. Everything Splash can check about its own work happens
// inside a run that, in that failure, never began.
//
// So this is deliberately NOT another guard. It is an OUTSIDE question, asked afterwards, whose
// answer is a list of files that either exist or do not. Its most useful answer is the negative
// one: a picture drawn in a chat has no path to point this at, and the moment the journalist
// asks « show me the file », the failure is visible.
//
// WHAT IT READS — only markers a sanctioned writer really leaves (skills/splash/src/
// attestation-corroboration.ts owns the same table for the in-run half):
//   · accepted.json      the pinned proposal, written when a form was accepted
//   · candidates.json    suggest-chart's menu
//   · opportunities.json suggest-article's ProposalSet
//   · decisions.jsonl    the flow's recorded gates
//   · report.json        what produce-all wrote (it WRITES it now — registry E12)
//
// WHAT IT DOES NOT PROVE, and says so in its own output: that nobody wrote those files by hand.
// It reads a disk; it does not witness history. A verification that oversold itself would be the
// same defect as the attestation it exists to check.
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/** A run is recognised by the two files no other step writes. `report.json` alone is not enough:
 *  it is the one a caller could have redirected there by hand. */
const RUN_MARKERS = ["accepted.json", "report.json"];
const ALL_MARKERS = [
  "accepted.json",
  "candidates.json",
  "opportunities.json",
  "decisions.jsonl",
  "report.json",
];

/** The artifact its own sanctioned writer leaves, per claimable skill token. Mirrors
 *  attestation-corroboration.ts — the in-run half of the same question. */
const EVIDENCE = {
  "suggest-article": "opportunities.json",
  "suggest-chart": "candidates.json",
};

/** Walk UP from what the journalist points at: they were handed an artifact, deep inside
 *  `output/<id>/`, and cannot be expected to know where the run directory is. Bounded by the
 *  filesystem root, so a path outside any run terminates instead of looping. */
function findRunDir(start) {
  let dir = statSync(start).isDirectory() ? start : dirname(start);
  for (;;) {
    if (RUN_MARKERS.some((m) => existsSync(join(dir, m)))) return dir;
    const up = dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

const target = process.argv[2];
if (!target) {
  console.error("usage: verify-delivery.mjs <path to a delivered file or a run directory>");
  process.exit(2);
}

const abs = resolve(target);
if (!existsSync(abs)) {
  console.error(`✗ ${abs}`);
  console.error("  This path does not exist, so there is nothing to verify.");
  process.exit(2);
}

const runDir = findRunDir(abs);
if (!runDir) {
  console.error(`✗ ${abs}`);
  console.error("");
  console.error("  NO SPLASH RUN stands behind this file.");
  console.error(
    "  Nothing above it carries the markers a Splash run leaves on disk, so this was not",
  );
  console.error(
    "  produced by the pipeline — whatever it may have been announced as. A visual drawn in a",
  );
  console.error(
    "  chat window is not a file you own: ask for the path, and ask again if none is given.",
  );
  process.exit(1);
}

const present = ALL_MARKERS.filter((m) => existsSync(join(runDir, m)));
// `accepted.json` is an ARRAY of accepted elements — one per visual the run pinned. Reading it as
// a single object silently found no attestation at all, which is how this command reported "no
// sub-skills corroborated" on a run whose accepted.json listed three. Caught by running it on a
// real host run rather than on its own fixtures: the fixtures had been written to match the
// reader, which is the way a test agrees with a bug.
const acceptedRaw = readJson(join(runDir, "accepted.json"));
const elements = Array.isArray(acceptedRaw)
  ? acceptedRaw
  : acceptedRaw
    ? [acceptedRaw]
    : [];
const accepted = elements[0] ?? {};
const claimed = [
  ...new Set(elements.flatMap((e) => (Array.isArray(e?.skillsInvoked) ? e.skillsInvoked : []))),
];
const corroborated = claimed.filter(
  (s) => EVIDENCE[s] && existsSync(join(runDir, EVIDENCE[s])),
);
const uncorroborated = claimed.filter((s) => !corroborated.includes(s));

const decisions = existsSync(join(runDir, "decisions.jsonl"))
  ? readFileSync(join(runDir, "decisions.jsonl"), "utf8")
      .split("\n")
      .filter((l) => l.trim()).length
  : 0;

console.log(`✓ ${abs}`);
console.log("");
console.log(`  Run directory : ${runDir}`);
if (accepted.id) console.log(`  Element       : ${accepted.id}`);
console.log(`  Markers read  : ${present.join(", ")}`);
console.log(`  Gates recorded: ${decisions}`);
if (corroborated.length)
  console.log(`  Corroborated  : ${corroborated.join(", ")}`);
if (uncorroborated.length) {
  // Named, never hidden: an isolated absence is legitimate (a bare topic hands suggest-article
  // nothing to persist), so this is a WARNING and not a verdict — the same scoping the in-run
  // half uses, for the same reason.
  console.log(
    `  UNCORROBORATED: ${uncorroborated.join(", ")} — claimed, with no artifact behind it`,
  );
}
console.log("");
console.log(
  "  This reads files on disk. It does NOT prove nobody wrote them by hand — it proves the",
);
console.log(
  "  steps that write them left what they write, which is what a chat-drawn picture cannot.",
);
process.exit(0);
