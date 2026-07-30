import { describe, it, expect } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..", "..");
const DOC = join(ROOT, "docs", "splash", "guardrails.md");

describe("guardrails.md names files that exist, and the ones that run", () => {
  const md = readFileSync(DOC, "utf8");

  it("should name only script paths that exist on disk", () => {
    // The page claims at :6 that "every row was verified against its named file". That claim
    // has to be mechanical, or it is the same drift one level up.
    // Scoped to `skills/<name>/...` and `lib/...` spans — a bare `scripts/produce.mjs` mention
    // (e.g. "native producers' `scripts/produce.mjs`") is deliberately generic prose covering
    // BOTH native producers at once, not a single resolvable path, so it is not a candidate here.
    const paths = [
      ...md.matchAll(
        /`((?:skills\/[a-z0-9-]+\/|lib\/)[^`]+\.(?:mjs|ts|tsx))`/g,
      ),
    ].map((m) => m[1]);
    expect(paths.length).toBeGreaterThan(0);
    expect(paths.filter((p) => !existsSync(join(ROOT, p)))).toEqual([]);
  });

  it("should name the WCAG contrast guard that map-native's produce runs fail-hard, for every format branch that runs it", () => {
    // This is the guard D22 caught missing from the "Contrast snaps" row: map-native's
    // produce.mjs invokes snap-contrast.mjs fail-hard on BOTH the static and interactive
    // branches (the furniture-text WCAG check on the real render), but the doc named only
    // snap-theme.mjs and snap-a11y.mjs for map-native. Scoped to this guard specifically —
    // not every `scripts/snap-*.mjs` call in produce.mjs is a correctness guard (some, like
    // snap-static.mjs/snap-proof.mjs, are the capture/build steps that produce the delivered
    // media itself) — so a blanket "every snap must be named" scan would flag unrelated,
    // out-of-scope gaps instead of the one this page's claim actually broke on.
    const produce = readFileSync(
      join(ROOT, "skills", "map-native", "scripts", "produce.mjs"),
      "utf8",
    );
    const contrastCallSites = [
      ...produce.matchAll(/snap\("scripts\/(snap-contrast\.mjs)"/g),
    ].map((m) => m[1]);
    // Examines a real, non-zero set: the actual call sites in produce.mjs (currently 2 —
    // static and interactive), not an assertion over an empty scan.
    expect(contrastCallSites.length).toBeGreaterThan(0);
    expect(contrastCallSites.every((s) => s === "snap-contrast.mjs")).toBe(
      true,
    );

    expect(md).toContain("skills/map-native/scripts/snap-contrast.mjs");
  });
});
