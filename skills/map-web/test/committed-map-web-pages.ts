/**
 * The committed map-web pages both "for every page" guards sweep:
 * `the-live-layer-is-in-the-artifact.test.ts` and `the-value-table-is-collapsed.test.ts`. One
 * helper, because the two guards must sweep the same set, or one of them silently covers less than
 * the other. It used to be a deliberate copy in each file.
 *
 * COMMITTED means tracked by Git: `git ls-files` is the contract, so a beat that stops committing
 * its rendered file leaves the set, and each guard's named anti-vacuity list reddens.
 *
 * A page is a map-web beat if it is the rendered HTML of the seed or of a `mapgen-*-web` beat —
 * decided by its PATH, not by a class name inside it. The three older beats
 * (`mapgen-choropleth-web`, `mapgen-hexgrid-web`, `mapgen-locator-web`) once did not carry the
 * seed's `map-web-page` root class: they were on the two-rung `layouts` markup, so a class-based
 * sweep found 2 of 5 and reported green over the three worst pages in the format. All five carry
 * the class today (checked 2026-09-29), but a class is a rendering detail and the path is not. The
 * format's own root class is kept as a WIDENER below, so a beat living somewhere else is still
 * caught, but the floor is the path list.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const TWIN = join(import.meta.dirname, "..", "..", "..");

export function committedMapWebPages(): { rel: string; html: string }[] {
  const tracked = execFileSync("git", ["ls-files", "-z", "--", "."], {
    cwd: TWIN,
    encoding: "utf8",
  })
    .split("\0")
    .filter((rel) => rel.endsWith(".html"));
  const pages = [];
  for (const rel of tracked) {
    const path = join(TWIN, rel);
    let stat;
    try {
      stat = statSync(path);
    } catch {
      continue;
    }
    if (!stat.isFile()) continue;
    const html = readFileSync(path, "utf8");
    if (isMapWebPath(rel) || html.includes('class="map-web-page"'))
      pages.push({ rel, html });
  }
  return pages;
}

function isMapWebPath(rel: string): boolean {
  return (
    // Archived 2026-09-17: these five superseded the mapgen-*-web beats but both guards still
    // name them, now under `tests/fixtures/beats/` rather than `proof/`.
    /^tests\/fixtures\/beats\/mapgen-[a-z]+-web\//.test(rel) ||
    rel.startsWith("skills/map-web/output-proof/")
  );
}
