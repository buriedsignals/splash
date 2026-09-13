/**
 * A REGISTER'S LEADING IS READ IN ONE PLACE, AND ARITHMETIC ON IT GOES THROUGH THAT PLACE.
 *
 * `resolveRegister` hands back `leading: null` for a direction built in code, the way it hands back
 * `derivedFrom: null` — legal, because most of its callers never read a leading. The refusal lives
 * at the one consumer that computes with it: `registerOf` throws, naming the direction and the
 * register. A SECOND consumer that read `.leading` directly would multiply a null into a line box and
 * collapse a layout with nothing going red.
 *
 * So this walks the WHOLE repository — no roots listed, no known sites — and fails on any source
 * that reads `.leading` outside the three modules that own it (and their carried copies, recognised
 * by their `// twin/` first line). A new consumer under a directory nobody anticipated is found the
 * same way as one under `proof/`. Tests are exempt: they read the value to assert on it.
 */
import { describe, it, expect } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const SOURCE = /\.(mjs|mts|cjs|cts|ts|tsx|js|jsx)$/;
const TEST = /\.test\.(ts|tsx|mjs|js)$/;
/** Dot-directories hold tooling, agent worktrees and scratch, never shipped code. */
const skipped = (name: string) =>
  name === "node_modules" || name.startsWith(".");
const OWNERS = new Set([
  "shared/design-base/register.mjs",
  "shared/design-base/read-direction.mjs",
  "shared/chart-beat/registers.mjs",
]);
const READS_LEADING = /\.leading\b/;

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (skipped(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (
      entry.isFile() &&
      SOURCE.test(entry.name) &&
      !TEST.test(entry.name)
    )
      yield path;
  }
}

const sources = [...walk(ROOT)].map((path) => {
  const text = readFileSync(path, "utf8");
  const own = relative(ROOT, path);
  const canonical = /^\/\/ twin\/(\S+)/.exec(text)?.[1] ?? own;
  return { own, canonical, reads: READS_LEADING.test(text) };
});

describe("a register's leading", () => {
  it("should walk the repository and find the modules that own the leading (premise)", () => {
    expect(sources.length).toBeGreaterThan(500);
    expect(
      sources.filter((s) => OWNERS.has(s.canonical) && s.reads).length,
    ).toBeGreaterThanOrEqual(3);
  });

  it("should be read nowhere but in the modules that own it", () => {
    const offenders = sources
      .filter((s) => s.reads && !OWNERS.has(s.canonical))
      .map((s) => s.own);
    expect(
      offenders,
      "these sources read `.leading` directly. Route the read through `registerOf` / `leadOf` in #shared/design-base/register.mjs (it refuses a direction that files no leading), or refuse null at the point of use — see docs/splash/2026-09-13-adaptive-leading-spec.md §3.3",
    ).toEqual([]);
  });
});
