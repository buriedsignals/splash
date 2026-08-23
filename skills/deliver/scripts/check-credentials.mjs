#!/usr/bin/env bun

// THE COMMAND. A decision nothing runs has not landed — round six's finding AC1, and the reason
// `declarationsWithoutACaller` exists — so the guard this skill declares is reachable from a
// command a person runs, not only from a unit test that feeds it a string built to be refused.
//
// It lives in its own file rather than behind `import.meta.main` inside `verify-credentials.mjs`,
// for the reason `map-beat/scripts/check-map.mjs` gives for the same split: a decision called only
// from its own file is what the wiring rule refuses, and a rule that exempted its own author's file
// would be theatre.
//
// Usage:
//   bun skills/deliver/scripts/check-credentials.mjs            # this skill
//   bun skills/deliver/scripts/check-credentials.mjs <skillDir> # any skill directory
//
// Exit code is 0 only when both readings are empty.

import { resolve } from "node:path";
import { credentialReadings } from "./verify-credentials.mjs";

const here = resolve(import.meta.dirname, "..");
const argv = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const skillDir = argv.length > 0 ? resolve(argv[0]) : here;

const { refused, outsideTheResolver } = credentialReadings(skillDir);
const failures = [];
if (refused.length > 0)
  failures.push(
    `${refused.join(", ")} read by canonical name with no <NAME>_ALIASES list declared anywhere ` +
      `this skill ships`,
  );
if (outsideTheResolver.length > 0)
  failures.push(
    `${outsideTheResolver.join(", ")} read straight off the environment — this skill ships a ` +
      `resolver, so every credential read goes through resolveEnvKey and none names a canonical ` +
      `property itself`,
  );

for (const line of failures) console.log(`  FAIL ${line}`);
if (failures.length === 0)
  console.log("  ok   every provider credential this skill reads goes through its own alias table");
console.log(`\n${skillDir}: ${failures.length} failure(s).`);
process.exit(failures.length > 0 ? 1 : 0);
