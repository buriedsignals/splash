// twin/skills/map-web/scripts/discover-pages.mjs
//
// THE ONE PLACE THIS FORMAT'S DELIVERED PAGE SET IS DISCOVERED, NEVER LISTED.
//
// `test/keyboard-reach.test.ts`, `test/degrades-without-javascript.test.ts` and
// `test/weight-ceiling.test.ts` each carried their own `mapWebArtifacts()`, all three walking the
// same four hardcoded directories — `mapgen-symbol-web`, `mapgen-dot-web`, `mapgen-hexgrid-web`,
// `mapgen-locator-web` — and `test/accessible-table.test.ts` copied the same four. The format has
// shipped SIX pages since `mapgen-choropleth-web` and this skill's own `output-proof/population.html`
// landed, and none of those four sweeps ever opened either one: a capability could be `carried` in
// the catalogue while wrong on a third of the format's own delivered pages, and nothing here would
// go red. `test/the-value-table-is-collapsed.test.ts` found the real population first — `git
// ls-files`, filtered by path, widened by this format's own root class — this module is that same
// discovery, factored out so every sweep measures the population that actually exists rather than a
// stale guess at it.
//
// Usage: discoverMapWebPages() -> [{ rel, abs, html }], sorted by `rel` for a deterministic order.

import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const SKILL = resolve(import.meta.dirname, "..");
export const TWIN = resolve(SKILL, "..", "..");

/** A page is a map-web beat if it is the rendered HTML of the seed or of a `mapgen-*-web` beat —
 *  decided by PATH, with the format's own root class kept as a widener so a beat living somewhere
 *  else is still caught. */
export function isMapWebPath(rel) {
  return /^proof\/mapgen-[a-z]+-web\//.test(rel) || rel.startsWith("skills/map-web/output-proof/");
}

/** Every committed map-web page on disk: `git ls-files`, filtered by path or by this format's own
 *  root class, so a beat added after this file is written is still found rather than silently
 *  skipped by a list nobody remembered to extend. */
export function discoverMapWebPages() {
  const tracked = execFileSync("git", ["ls-files", "-z", "--", "."], {
    cwd: TWIN,
    encoding: "utf8",
  })
    .split("\0")
    .filter((rel) => rel.endsWith(".html"));
  const pages = [];
  for (const rel of tracked) {
    const abs = join(TWIN, rel);
    let stat;
    try {
      stat = statSync(abs);
    } catch {
      continue;
    }
    if (!stat.isFile()) continue;
    const html = readFileSync(abs, "utf8");
    if (isMapWebPath(rel) || html.includes('class="map-web-page"')) pages.push({ rel, abs, html });
  }
  return pages.sort((a, b) => a.rel.localeCompare(b.rel));
}
