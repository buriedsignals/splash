// THE COMMAND. Round six's finding was one sentence: "not one guard in `verify-map.mjs` is
// reachable from a command."
//
// Every decision in that file was declared, unit-tested against synthetic input, and called by
// nothing — no render script, no driver, no CLI. This format bakes a plate beside a geometry file
// and draws its marks into that frame, so most of what it decides is answerable from files on disk
// with no browser and no rasteriser; there was simply never an entry point that opened them.
//
// It lives in its own file rather than behind `import.meta.main` inside `verify-map.mjs`, because a
// decision called only from its own file is what `declarationsWithoutACaller` refuses — and a rule
// that exempted its own author's file would be the theatre the whole round is about.
//
// Usage:
//   bun skills/map-beat/scripts/check-map.mjs             # every baked map beat in the tree
//   bun skills/map-beat/scripts/check-map.mjs <beatDir>   # one beat
//
// Exit code is 0 only when every check passed.

import { resolve } from "node:path";
import { bakedBeatsUnder, credentialsWithoutAliases, verifyBeat } from "./verify-map.mjs";

const HERE = import.meta.dirname;
const ROOT = resolve(HERE, "..", "..", "..");
const argv = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const beats = argv.length ? argv.map((a) => resolve(a)) : bakedBeatsUnder(ROOT);
if (beats.length === 0)
  throw new Error(
    "no baked map beat found under proof/ or stories/ — a sweep over nothing is not a green run",
  );

const failures = [];
const readings = [];
for (const beat of beats) {
  const found = verifyBeat(beat, ROOT);
  failures.push(...found.failures);
  readings.push(...found.readings);
}

const bare = credentialsWithoutAliases(HERE);
if (bare.length)
  failures.push(
    `this skill's own scripts read ${bare.join(", ")} with no <NAME>_ALIASES list declared anywhere in them`,
  );
else readings.push("credentials: every canonical name this skill reads declares its own alias list");

for (const line of readings) console.log(`  ok   ${line}`);
for (const line of failures) console.log(`  FAIL ${line}`);
console.log(`\n${beats.length} baked map beat(s), ${readings.length} readings, ${failures.length} failures.`);
process.exit(failures.length ? 1 : 0);
