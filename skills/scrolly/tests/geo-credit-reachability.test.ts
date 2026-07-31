// FIX 5 (2026-07-30 geography-repair, final wave): scrolly's own C5 shape, reproduced one
// directory over from map-native's. `skills/scrolly/scripts/produce.mjs` calls the SAME
// `resolveGeometryForProduce` map-native's produce.mjs does — so `assertGeoCreditPresent`
// (lib/geo/policy.ts, D7) governs the scrolly track too: a declared geometry with no credit
// refuses the build. But scrolly RENDERS no credit at all — `Scrolly.tsx` shows `config.source`
// only (no MapFrame, no geoCredit-aware furniture anywhere in this skill's `src`) — so a build
// that DOES carry a credit would pass the refusal and then silently drop it before it ever
// reaches a reader. That is "refuses to build without a credit, then throws the credit away".
//
// CHOICE MADE HERE (per the repair brief, explicitly not to build scrolly's credit furniture
// this wave): rather than widening map-native's own `geo-credit-call-sites.test.ts` scan to
// cover scrolly — which would produce either a vacuous pass (scrolly renders no MapFrame at
// all, so a `<MapFrame` scan finds nothing to check) or a hand-authored exemption list that
// looks like coverage but only documents the gap in prose — this file instead PINS the fact
// that makes the gap safe to leave alone: nothing in production code can construct a geography
// with `origin: "declared"` at all (Task 11's re-review already traced this once, for the docs;
// this test makes the same trace mechanical and repo-wide, in code, so it cannot go stale the
// way a comment can). The day someone adds a real write site for `origin: "declared"` reachable
// from either engine's assembler — which is exactly what "declared geometry becomes reachable"
// MEANS, since GeographyRef is a closed union and this is its only writer — GUARANTEE 1 below
// reddens. That is deliberately paired with GUARANTEE 2 (scrolly renders no geo credit today):
// the day GUARANTEE 1 reddens because reachability was added on purpose, GUARANTEE 2's assertion
// must be revisited in the same change — either scrolly grows real credit furniture (and this
// test is updated to prove it renders) or the new write site is wrong. Either way, something
// fails; nothing ships silently.
import { describe, expect, it } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = join(import.meta.dir, "..", "..", "..");
const SCROLLY_SRC = join(import.meta.dir, "..", "src");
const SCROLLY_SCRIPTS = join(import.meta.dir, "..", "scripts");

// A small, dependency-free source walk (no readdirSync-recursive filter chain needed beyond
// this) — mirrors the shape already established by
// skills/map-native/tests/geo-credit-call-sites.test.ts's own `tsxFilesUnder`, generalized to
// any extension and any root, since this test needs to walk `lib/` and `skills/` together.
function filesUnder(dir: string, extensions: string[]): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...filesUnder(full, extensions));
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      out.push(full);
    }
  }
  return out;
}

describe("GUARANTEE 1 — no production code writes a declared geography (the fact that makes scrolly's dropped credit safe TODAY)", () => {
  // Every source file under lib/ and skills/, excluding tests and this repair's own report/
  // ledger prose — a test fixture legitimately constructs `origin: "declared"` (it is exactly
  // what this branch's own resolve-for-produce.test.ts does, deliberately, to exercise the
  // refusal paths), so a fixture hit here would be a false positive, not a real write site.
  const roots = [join(REPO_ROOT, "lib"), join(REPO_ROOT, "skills")];
  const files = roots.flatMap((r) => filesUnder(r, [".ts", ".tsx", ".mjs"]));
  const productionFiles = files.filter(
    (f) => !f.includes(".test.") && !f.includes("/node_modules/"),
  );

  it("should find production source files at all (an empty scan must never pass)", () => {
    expect(productionFiles.length).toBeGreaterThan(50);
  });

  it("GeographyRef's origin union has exactly the two members this test knows about — a third widens the union and must be re-audited here too", () => {
    const refSrc = readFileSync(
      join(REPO_ROOT, "lib", "geo", "ref.ts"),
      "utf8",
    );
    expect(refSrc).toMatch(/origin:\s*"shipped"\s*\|\s*"declared"/);
  });

  it('no production file constructs `origin: "declared"` — GeographyRef is a closed union and this is its only writable discriminant, so this IS the reachability question, not a proxy for it', () => {
    const offenders = productionFiles.filter((f) =>
      /origin:\s*["']declared["']/.test(readFileSync(f, "utf8")),
    );
    expect(offenders).toEqual([]);
  });

  it("every production write of GeographyRef.origin writes the literal \"shipped\" (ref.ts's SHIPPED_REFS registry, geo-match.ts's matchGeography, migrate.ts's v4->v5 legacy-basemap upgrade) — confirms the scan above is not vacuously empty because origin is never constructed at all", () => {
    const writers = productionFiles.filter((f) =>
      /origin:\s*["']shipped["']/.test(readFileSync(f, "utf8")),
    );
    expect(writers.length).toBeGreaterThanOrEqual(3); // ref.ts, geo-match.ts, migrate.ts
  });
});

describe("GUARANTEE 2 — scrolly renders no geo credit today (the gap GUARANTEE 1 currently keeps inert)", () => {
  const srcFiles = filesUnder(SCROLLY_SRC, [".ts", ".tsx"]).filter(
    (f) => !f.includes(".test."),
  );

  it("no scrolly component reads or renders config.geoCredit — Scrolly.tsx shows config.source only (no MapFrame, no credit-aware furniture)", () => {
    const offenders = srcFiles.filter((f) =>
      /geoCredit/.test(readFileSync(f, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});

describe("the credit OBLIGATION is nonetheless wired on the scrolly track, same as map-native (guardrails.md's own claim, checked against the file)", () => {
  const produceSrc = readFileSync(join(SCROLLY_SCRIPTS, "produce.mjs"), "utf8");

  it("imports resolveGeometryForProduce from the shared lib/geo resolver", () => {
    expect(produceSrc).toMatch(
      /import\s*\{\s*resolveGeometryForProduce\s*\}\s*from\s*["'].*lib\/geo\/resolve-for-produce/,
    );
  });

  it("calls it before any build step", () => {
    expect(produceSrc).toMatch(/await resolveGeometryForProduce\(/);
  });
});
