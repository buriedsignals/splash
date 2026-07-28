import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// A27 said `skills/map-native` has no headless browser in a fresh worktree because the
// bootstrap only runs `playwright install chromium` inside chart-native. MEASURED, and it is
// not so: Playwright downloads into a per-user cache keyed by browser revision, and both skills
// resolved the identical executable
// (~/Library/Caches/ms-playwright/chromium-1234/…, `chromium.executablePath()` from each skill
// dir, both `exists: true`) after a single download. The one download is the DECISION of the
// 2026-07-07 installer spec — "puis `bunx playwright install chromium` (une fois, cache
// partagé)" — not an oversight, so the register entry is reclassified rather than "fixed".
//
// What the measurement DOES expose is the dependency that decision rests on and that nothing
// stated: one download covers every skill only while they pin the same Playwright. A drift
// would key a different revision, and the skill left behind would fail its first render with
// the diagnostic A27 was written from. That dependency is what this test holds.
const skillVersion = (skill: string): string => {
  const pkg = JSON.parse(
    readFileSync(
      join(import.meta.dir, "..", "skills", skill, "package.json"),
      "utf8",
    ),
  );
  return pkg.devDependencies?.playwright ?? pkg.dependencies?.playwright;
};

test("every skill that renders shares one pinned Playwright, so one download serves all", () => {
  // The four that carry a Playwright of their own. bootstrap.sh downloads the browser once,
  // from chart-native; a skill pinning a different version would silently not be covered.
  const skills = ["chart-native", "map-native", "scrolly", "dw-chart"];
  const versions = skills.map(skillVersion);
  for (const [i, v] of versions.entries())
    expect(`${skills[i]}: ${v}`).toBe(`${skills[i]}: ${versions[0]}`);
  // An exact pin, not a range: a caret would let two installs resolve two revisions from the
  // same lockfile-less clone, which is the same failure by another route.
  expect(versions[0]).toMatch(/^\d+\.\d+\.\d+$/);
});
