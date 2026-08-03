// skills/map-native/tests/wait-for-function-arity-drift.test.ts
//
// THIS IS A SOURCE-SCAN DRIFT LOCK, NOT A PROOF OF CORRECTNESS. It proves nothing about whether
// a given `waitForFunction` call actually observes the timeout it passes — that is proven by
// execution in this file's sibling proof, skills/scrolly/tests/wait-for-function-timeout.test.ts
// (a live Playwright timing assertion). What this guard buys is narrower and purely textual: it
// makes it impossible to silently REINTRODUCE Playwright's `waitForFunction(fn, options)` two-arg
// mistake at a NEW call site without a failing test naming the exact file.
//
// Why this exists: Playwright's real signature is `waitForFunction(pageFunction, arg, options)`.
// Several of this skill's snap scripts (and one each in skills/scrolly and skills/splash) called
// it as `waitForFunction(fn, { timeout: N })` — the two-arg form — which binds `{ timeout: N }` to
// `arg` (the in-page function's argument), not to `options`. The call silently ran under
// Playwright's 30_000ms default instead of the intended timeout, discovered during the geography
// followups audit. Fixed by threading an explicit `undefined` as the second positional so the
// options object lands in the third slot, mirroring the pattern skills/map-native/scripts/
// snap-contrast.mjs and snap-static.mjs already used correctly before this fix.
//
// One exemption class, and nothing else:
//   (a) any `*.test.ts` file — a fixture is allowed to construct any call shape it wants to
//       exercise the arity check itself; that is the point of a fixture, not a drift risk.
//
// Anything else under skills/**/*.mjs that calls `.waitForFunction(` with exactly two top-level
// arguments where the second looks like an options object (`{ ... timeout ... }`) is exactly the
// class of call this test exists to catch. A call with ONE argument (no options desired) or with
// THREE-OR-MORE top-level arguments (a real `arg` in the second slot, options in the third) is not
// flagged — both are legitimate shapes already in this codebase.
import { describe, it, expect } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dir, "..", "..", "..");

const SKIP_DIRS = new Set(["node_modules", "dist"]);

// Walks a directory tree collecting files whose name passes `keep`, pruning SKIP_DIRS along the
// way — same shape as lib/loop/schema-version-drift.test.ts's `walk`.
function walk(dir: string, keep: (name: string) => boolean): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) return [];
      return walk(join(dir, e.name), keep);
    }
    return keep(e.name) ? [join(dir, e.name)] : [];
  });
}

const ALL_FILES = walk(join(ROOT, "skills"), (n) => n.endsWith(".mjs"));

function isExempt(file: string): boolean {
  return file.endsWith(".test.ts"); // class (a) — n/a for .mjs files today, kept for symmetry
}

// Every top-level-comma-separated argument of a call, given the text strictly between its
// outer parentheses. Tracks paren/bracket/brace nesting and string/template literal state so a
// comma inside a nested call, object, array, or string is never mistaken for an argument
// separator. Not a full parser — this is a source-scan guard, see file header — but sufficient
// for the argument lists real call sites in this codebase actually write.
function splitTopLevelArgs(inner: string): string[] {
  const args: string[] = [];
  let depth = 0;
  let cur = "";
  let quote: '"' | "'" | "`" | null = null;
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    const next = inner[i + 1];
    if (quote) {
      cur += c;
      if (c === "\\" && next !== undefined) {
        cur += next;
        i++;
      } else if (c === quote) {
        quote = null;
      }
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      quote = c;
      cur += c;
      continue;
    }
    if (c === "(" || c === "[" || c === "{") {
      depth++;
      cur += c;
      continue;
    }
    if (c === ")" || c === "]" || c === "}") {
      depth--;
      cur += c;
      continue;
    }
    if (c === "," && depth === 0) {
      args.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  if (cur.trim().length > 0) args.push(cur);
  return args;
}

// Finds every `.waitForFunction(...)` call in `src` and returns the exact substring between its
// outer parentheses (balanced over nested parens/strings), one per call site, in source order.
function waitForFunctionCallBodies(src: string): string[] {
  const bodies: string[] = [];
  const marker = ".waitForFunction(";
  let searchFrom = 0;
  for (;;) {
    const start = src.indexOf(marker, searchFrom);
    if (start === -1) break;
    const openParen = start + marker.length - 1;
    let depth = 0;
    let quote: '"' | "'" | "`" | null = null;
    let end = -1;
    for (let i = openParen; i < src.length; i++) {
      const c = src[i];
      const next = src[i + 1];
      if (quote) {
        if (c === "\\" && next !== undefined) {
          i++;
        } else if (c === quote) {
          quote = null;
        }
        continue;
      }
      if (c === '"' || c === "'" || c === "`") {
        quote = c;
        continue;
      }
      if (c === "(") depth++;
      else if (c === ")") {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end === -1) break; // unbalanced — stop rather than loop forever
    bodies.push(src.slice(openParen + 1, end));
    searchFrom = end + 1;
  }
  return bodies;
}

// The exact defect shape: exactly two top-level arguments, and the second looks like an options
// object naming `timeout` — the tell that it was meant for the (missing) third slot.
function isTwoArgTimeoutBug(callBody: string): boolean {
  const args = splitTopLevelArgs(callBody);
  if (args.length !== 2) return false;
  const second = args[1]!.trim();
  return second.startsWith("{") && /\btimeout\b/.test(second);
}

describe("waitForFunction arity drift lock (source-scan only, not a correctness proof)", () => {
  it("scans a real, non-zero set of .mjs files under skills/", () => {
    expect(ALL_FILES.length).toBeGreaterThan(20);
  });

  it("every .waitForFunction(fn, { timeout }) two-arg call is a regression", () => {
    const offenders: string[] = [];
    for (const file of ALL_FILES) {
      if (isExempt(file)) continue;
      const src = readFileSync(file, "utf8");
      for (const body of waitForFunctionCallBodies(src)) {
        if (isTwoArgTimeoutBug(body)) {
          offenders.push(relative(ROOT, file));
        }
      }
    }
    expect(
      offenders,
      offenders.length
        ? `waitForFunction(fn, { timeout }) two-arg call(s) found — Playwright binds the second ` +
            `positional to the page function's arg, not options; pass an explicit \`undefined\` ` +
            `arg before the options object:\n${offenders.join("\n")}`
        : undefined,
    ).toEqual([]);
  });

  // Pins the detector itself against its own false-positive/false-negative edges, using inline
  // fixtures rather than real files (no throwaway fixture files need to live under skills/**).
  it("does not flag the legitimate one-arg and three-arg shapes", () => {
    const oneArg = `await page.waitForFunction(() => window.__map__?.loaded?.());`;
    const threeArgReal = `await page.waitForFunction((lid) => window.__map__.getLayer(lid), layerId, { timeout: 60_000 });`;
    const threeArgUndefined = `await page.waitForFunction(() => true, undefined, { timeout: 90_000 });`;
    for (const src of [oneArg, threeArgReal, threeArgUndefined]) {
      const bodies = waitForFunctionCallBodies(src);
      expect(bodies.length).toBe(1);
      expect(isTwoArgTimeoutBug(bodies[0]!)).toBe(false);
    }
  });

  it("flags the exact bug shape this drift lock exists to catch", () => {
    const buggy = `await page.waitForFunction(() => window.__map__?.loaded?.(), { timeout: 60_000 });`;
    const bodies = waitForFunctionCallBodies(buggy);
    expect(bodies.length).toBe(1);
    expect(isTwoArgTimeoutBug(bodies[0]!)).toBe(true);
  });
});
