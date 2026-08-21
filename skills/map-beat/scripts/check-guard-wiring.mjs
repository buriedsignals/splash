// The command behind `guard-wired-to-run`, and the reason that rule is a guard rather than prose.
//
// Round three measured the same thing by hand — 26 of 40 declarations reachable only from their own
// test file — and wrote the finding into `doctrine/SKILL.md` as a DISCIPLINE, because closing 65% of
// a catalogue in one wave risked the producers the rules protect. Round six measured it again on
// `fills-its-frame`, four hours after that rule was distributed to all eight skills: present
// everywhere, called nowhere, every format exactly as weak as before. A discipline that cannot
// observe its own violation is theatre, so the observation is a command now.
//
// Usage:
//   bun skills/<skill>/scripts/check-guard-wiring.mjs        # this skill's own declarations
//
// Exit code is 0 only when every guard this skill declares is either called by another script here
// or named in `RECORDED_UNWIRED`. A name that is unwired and NOT recorded is a red, printed with
// the file that declares it — that is the day this rule earns its keep, and it is exactly one step
// before someone would have had to remember.

import { resolve } from "node:path";
import { declaredDecisions, declarationsWithoutACaller, RECORDED_UNWIRED } from "./detect-guard-wiring.mjs";

const SKILL = resolve(import.meta.dirname, "..");
const decisions = declaredDecisions(SKILL);
const unwired = declarationsWithoutACaller(SKILL);
const recorded = new Set(RECORDED_UNWIRED);
const unrecorded = unwired.filter((name) => !recorded.has(name));
// A name recorded as debt that no longer IS debt: the list has to shrink when the work is done, or
// it stops describing anything and starts excusing everything.
const stale = [...recorded].filter((name) => !unwired.includes(name)).sort();
const broken = decisions.filter((decision) => decision.home === null).map((decision) => decision.name);

for (const decision of decisions) {
  const where = decision.home ?? "NO FILE EXPORTS IT";
  const how = decision.callers.length
    ? `called by ${decision.callers.join(", ")}`
    : recorded.has(decision.name)
      ? "unwired — recorded debt"
      : "UNWIRED AND NOT RECORDED";
  console.log(`  ${decision.name.padEnd(30)} ${where.padEnd(40)} ${how}`);
}
console.log(
  `\n${decisions.length} declared, ${decisions.length - unwired.length} wired, ` +
    `${unwired.length} unwired (${recorded.size} recorded).`,
);

const failures = [
  ...unrecorded.map(
    (name) =>
      `${name} is declared here and no other script in this skill calls it, and it is not in ` +
      `RECORDED_UNWIRED. Wire it where this format's own render or driver already refuses things, ` +
      `the way dw-beat's produce.mjs calls assertExportedSize — or record it, by name, with the ` +
      `reason it cannot be wired yet.`,
  ),
  ...stale.map(
    (name) =>
      `${name} is recorded as unwired debt and is now called. Remove it from RECORDED_UNWIRED: a ` +
      `debt list nobody shrinks is a debt list nobody reads.`,
  ),
  ...broken.map((name) => `${name} is named in a GUARDS array and no file in this skill exports it.`),
];
for (const line of failures) console.error(`  FAIL ${line}`);
process.exit(failures.length ? 1 : 0);
