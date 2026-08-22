// The command behind `guard-wired-to-run`, and the reason that rule is a guard rather than prose.
//
// Round three measured the same thing by hand — 26 of 40 declarations reachable only from their own
// test file — and wrote the finding into `doctrine/SKILL.md` as a DISCIPLINE, because closing 65% of
// a catalogue in one wave risked the producers the rules protect. Round six measured it again on
// `fills-its-frame`, four hours after that rule was distributed to all eight skills: present
// everywhere, called nowhere, every format exactly as weak as before. A discipline that cannot
// observe its own violation is theatre, so the observation is a command now.
//
// 2026-08-23: a name this skill does not call now carries WHY, and two of the three reasons are
// checked here rather than believed. `RECORDED_UNWIRED_DEBT` may only shrink; a beat-substrate or
// own-suite claim may be added, and costs its author a real caller that this command goes and reads.
//
// Usage:
//   bun skills/<skill>/scripts/check-guard-wiring.mjs        # this skill's own declarations
//
// Exit code is 0 only when every guard this skill declares is either called by another script here
// or recorded under a reason this command can stand behind. A name that is unwired and NOT recorded
// is a red, printed with the file that declares it — that is the day this rule earns its keep, and
// it is exactly one step before someone would have had to remember.

import { resolve } from "node:path";
import {
  beatSubstrateWithoutACaller,
  declaredDecisions,
  declarationsWithoutACaller,
  ownSuiteWithoutACaller,
  RECORDED_BEAT_SUBSTRATE,
  RECORDED_DRIVEN_BY_ITS_OWN_SUITE,
  RECORDED_UNWIRED,
  RECORDED_UNWIRED_DEBT,
} from "./detect-guard-wiring.mjs";

const SKILL = resolve(import.meta.dirname, "..");
const decisions = declaredDecisions(SKILL);
const unwired = declarationsWithoutACaller(SKILL);
const recorded = new Set(RECORDED_UNWIRED);
const unrecorded = unwired.filter((name) => !recorded.has(name));
// A name recorded as debt that no longer IS debt: the list has to shrink when the work is done, or
// it stops describing anything and starts excusing everything.
const stale = [...recorded].filter((name) => !unwired.includes(name)).sort();
const broken = decisions.filter((decision) => decision.home === null).map((decision) => decision.name);
// THE TWO REASONS THAT ARE NOT DEBT, CHECKED. A claim that only a beat can call a decision, or that
// this format's own suite drives it, excuses the name from the ratchet — so it names a caller and
// this reads that file. An unbacked claim is worse than debt, because it has stopped being counted.
const unbacked = [
  ...beatSubstrateWithoutACaller(SKILL, RECORDED_BEAT_SUBSTRATE),
  ...ownSuiteWithoutACaller(SKILL, RECORDED_DRIVEN_BY_ITS_OWN_SUITE),
];
const why = new Map([
  ...RECORDED_UNWIRED_DEBT.map((name) => [name, "unwired — recorded debt"]),
  ...RECORDED_BEAT_SUBSTRATE.map((claim) => [nameOf(claim), `unwired — beat-substrate, called by ${claim.calledBy}`]),
  ...RECORDED_DRIVEN_BY_ITS_OWN_SUITE.map((claim) => [
    nameOf(claim),
    `unwired — driven by ${claim.calledBy}`,
  ]),
]);
function nameOf(claim) {
  return claim && claim.name ? claim.name : "an entry with no name";
}

for (const decision of decisions) {
  const where = decision.home ?? "NO FILE EXPORTS IT";
  const how = decision.callers.length
    ? `called by ${decision.callers.join(", ")}`
    : (why.get(decision.name) ?? "UNWIRED AND NOT RECORDED");
  console.log(`  ${decision.name.padEnd(30)} ${where.padEnd(40)} ${how}`);
}
console.log(
  `\n${decisions.length} declared, ${decisions.length - unwired.length} wired, ` +
    `${unwired.length} unwired (${RECORDED_UNWIRED_DEBT.length} debt, ` +
    `${RECORDED_BEAT_SUBSTRATE.length} beat-substrate, ` +
    `${RECORDED_DRIVEN_BY_ITS_OWN_SUITE.length} driven by this format's own suite).`,
);

const failures = [
  ...unrecorded.map(
    (name) =>
      `${name} is declared here and no other script in this skill calls it, and it is recorded ` +
      `under no reason at all. Wire it where this format's own render or driver already refuses ` +
      `things, the way dw-beat's produce.mjs calls assertExportedSize — or record it in ` +
      `RECORDED_UNWIRED_DEBT, or, if only a beat or this format's own suite can reach it, in the ` +
      `array for that reason WITH the caller that proves it.`,
  ),
  ...stale.map(
    (name) =>
      `${name} is recorded as unwired and is now called. Remove it from its array: a debt list ` +
      `nobody shrinks is a debt list nobody reads.`,
  ),
  ...unbacked,
  ...broken.map((name) => `${name} is named in a GUARDS array and no file in this skill exports it.`),
];
for (const line of failures) console.error(`  FAIL ${line}`);
process.exit(failures.length ? 1 : 0);
