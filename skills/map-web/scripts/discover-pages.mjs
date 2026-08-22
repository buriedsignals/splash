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
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

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

// ── THE BEAT POPULATION, DERIVED FROM WHERE BEATS ACTUALLY LIVE ────────────────────────────────
//
// THE DEFECT THIS CLOSES, measured on a real story (2026-08-22): the two bake-side guards this
// format declares — `plateMatchesGeometry` and `plateFollowsGround` — were walked by a test whose
// own beat enumeration read `proof/` and nothing else, and which then looked for `PALETTE.md`
// INSIDE the beat directory. A real beat lives at `stories/<slug>/beats/<id>/` and records its
// palette at the STORY root, so it was invisible twice over: wrong root, wrong palette path. A
// 241-region world choropleth was produced, rendered and approved with both guards never once
// looking at it, while the suite stayed green on a ">= 4" floor the proof beats already met.
//
// So the population is DERIVED here, once, and every sweep in this format reads it: a beat is a
// directory holding a `BRIEF.md` that declares `map / web`, found under either root this tree
// actually puts beats in. Adding a third root is a change here, not in five tests.

/** Where a beat directory can live, relative to the Splash root. `proof/<name>` is a worked example
 *  this skill ships; `stories/<slug>/beats/<id>` is where every beat a journalist commissions
 *  lands. Both are DEPTHS as well as paths — the second is four levels under the root, which is the
 *  depth that broke every hard-coded `../../` in the beat copied into it. */
export const BEAT_ROOTS = [
  { under: "proof", depth: 1 },
  { under: "stories", depth: 3, via: ["beats"] },
];

/** The `**Medium/format:**` line of a `BRIEF.md`, lower-cased with its emphasis markers stripped —
 *  `map / **web** — one self-contained …` and `map / web` have to read the same. */
export function mediumFormatOf(brief) {
  return (/\*\*Medium\s*\/\s*format:\*\*\s*([^.\n]+)/.exec(brief)?.[1] ?? "").toLowerCase().replace(/\*/g, "");
}

/** Does this brief declare the map × web cell? */
export function declaresMapWeb(brief) {
  const medium = mediumFormatOf(brief);
  return /map/.test(medium) && /web/.test(medium);
}

/** The directory holding the `PALETTE.md` that governs `beatDir` — the beat's own, or the nearest
 *  ancestor's, up to and including the Splash root.
 *
 *  This is `readPalette`'s own walk, and it is here for the reason `readPalette` has it: the
 *  palette phase records ONE answer for a story and every beat under it renders in it. A guard that
 *  reads `join(beatDir, "PALETTE.md")` is not reading a beat with no palette — it is failing to
 *  find the palette the beat actually rendered in, and it then SKIPS the beat rather than judging
 *  it, which is the silent direction. Returns null when there is genuinely none. */
export function paletteDirFor(beatDir, root = TWIN) {
  let current = resolve(beatDir);
  const stop = resolve(root);
  for (;;) {
    if (existsSync(join(current, "PALETTE.md"))) return current;
    if (current === stop) return null;
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

/** Every `map / web` beat directory in this tree, from both roots, each paired with the directory
 *  its own `PALETTE.md` actually lives in. Sorted by `rel` for a deterministic order. */
export function discoverMapWebBeats(root = TWIN) {
  const found = [];
  const consider = (dir) => {
    const brief = join(dir, "BRIEF.md");
    if (!existsSync(brief)) return;
    if (!declaresMapWeb(readFileSync(brief, "utf8"))) return;
    found.push({
      name: relative(root, dir),
      rel: relative(root, dir),
      dir,
      paletteDir: paletteDirFor(dir, root),
    });
  };
  const directories = (at) => {
    if (!existsSync(at)) return [];
    return readdirSync(at, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(at, entry.name));
  };
  for (const { under, via = [] } of BEAT_ROOTS) {
    for (const first of directories(join(root, under))) {
      if (via.length === 0) {
        consider(first);
        continue;
      }
      // One `via` segment today (`stories/<slug>/beats/<id>`); the loop is written for the general
      // shape so a third root with a different nesting is a data change here rather than a fork.
      let level = [first];
      for (const segment of via) level = level.map((dir) => join(dir, segment));
      for (const container of level) for (const beat of directories(container)) consider(beat);
    }
  }
  return found.sort((a, b) => a.rel.localeCompare(b.rel));
}
