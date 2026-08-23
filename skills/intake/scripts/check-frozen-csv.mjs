#!/usr/bin/env bun

// THE COMMAND. A decision nothing runs has not landed — round six's finding AC1, and the reason
// `declarationsWithoutACaller` exists — so the guard this skill declares is reachable from a
// command a person runs, not only from a unit test that feeds it a torn row built to be refused.
//
// It lives in its own file rather than behind `import.meta.main` inside `verify-frozen-csv.mjs`,
// for the reason `map-beat/scripts/check-map.mjs` gives for the same split: a decision called only
// from its own file is what the wiring rule refuses, and a rule that exempted its own author's file
// would be theatre.
//
// Usage:
//   bun skills/intake/scripts/check-frozen-csv.mjs            # this skill
//   bun skills/intake/scripts/check-frozen-csv.mjs <skillDir> # any skill directory
//
// Exit code is 0 only when no file cuts its own csv rows on a bare comma.

import { resolve } from "node:path";
import { handSplitCsvReaders } from "./verify-frozen-csv.mjs";

const here = resolve(import.meta.dirname, "..");
const argv = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const skillDir = argv.length > 0 ? resolve(argv[0]) : here;

const offenders = handSplitCsvReaders(skillDir);
for (const offender of offenders)
  console.log(
    `  FAIL ${offender.file} cuts its own csv rows on a bare comma — ${offender.cuts.join(", ")}`,
  );
if (offenders.length === 0)
  console.log("  ok   no file here cuts a csv row on a bare comma; the frozen table is parsed");
console.log(`\n${skillDir}: ${offenders.length} failure(s).`);
process.exit(offenders.length > 0 ? 1 : 0);
