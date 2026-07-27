import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";

// Two places name the façade's commands: `cli.ts`'s own dispatch, and `README.md`'s prose. Two
// slices have added to the dispatch since the README was first written (`suggest-intent`, then
// `capture`/`review`/`preview` folded into the `approve` gate) — the same "two registries of one
// fact" drift this codebase has closed before (`capabilities-parity.test.ts`,
// `guardrail-parity.ts`). This asks the DISPATCHER itself, by parsing the real source text of
// `cli.ts`, rather than trusting a second hand-maintained list — so it fails the moment a command
// is added or removed on one side and not the other.
const CLI_SOURCE = readFileSync(join(import.meta.dir, "cli.ts"), "utf8");
const README_SOURCE = readFileSync(join(import.meta.dir, "README.md"), "utf8");

// Every top-level dispatch branch is `if (command === "<name>")`, including the combined
// `state`/`next` line — a global regex catches every occurrence on that line too.
function commandsDispatchedByCli(): Set<string> {
  const names = new Set<string>();
  for (const m of CLI_SOURCE.matchAll(/command === "([a-z-]+)"/g))
    names.add(m[1]);
  return names;
}

// The README documents each command under its own `### \`<name> ...\`` heading.
function commandsDocumentedByReadme(): Set<string> {
  const names = new Set<string>();
  for (const m of README_SOURCE.matchAll(/^### `([a-z-]+)/gm)) names.add(m[1]);
  return names;
}

describe("host README vs the real CLI dispatch", () => {
  it("documents exactly the commands the dispatcher answers to", () => {
    const dispatched = commandsDispatchedByCli();
    const documented = commandsDocumentedByReadme();
    expect(dispatched.size).toBeGreaterThan(0);
    expect([...dispatched].sort()).toEqual([...documented].sort());
  });
});
