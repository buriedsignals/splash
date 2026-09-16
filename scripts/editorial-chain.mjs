// scripts/editorial-chain.mjs
//
// THE CHAIN, READ OFF ONE BEAT — retained proposal → type sheet → frame → required assertions.
//
// `docs/splash/2026-09-17-editorial-chain-spec.md`. `shared/editorial/` holds the three canonical
// pieces; each export skill holds its own `parseChoreography`/`checkChoreography` pair. Between
// them sat four unwritten joins, and every reader of the chain needed all four:
//
//   which type SHEET frames this beat            — six directories, four export families
//   which INTERACTION the catalogue files for it — `visual-catalog.json`, one row per medium/format
//   which beats carry a value block at all       — the `derived: v1` front-matter scalar
//   which beat is a type's WORKED EXAMPLE        — what a declaration may not be a copy of
//
// WHY THIS LIVES IN `scripts/` AND NOT IN A SKILL. It reads across every craft skill's own
// references, and no file inside a skill may leave its own directory
// (`skills/splash/test/no-cross-skill-imports.test.ts`). The plan filed the migration under
// `skills/splash/scripts/`; it cannot live there for that reason, and neither can this. `scripts/`
// is the repository's own tooling — `test-lanes.mjs`, `visual-catalog.mjs`, `type-survey.mjs` all
// read across skills from here already — and nothing ships it to a newsroom.
//
// IT SUPPLIES NO CHOREOGRAPHY AND NO ASSERTION (R-D). It resolves WHERE the frame is written down
// and hands back what is written there. Every function here is a read.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { parseBriefFrontMatter } from "#shared/chart-beat/sizes.mjs";
import { choreographyFrame, parseTypeSheet, requiredAssertions } from "#shared/editorial/frame.mjs";
import { retainedFromBrief } from "#shared/editorial/retained.mjs";

export const ROOT = resolve(import.meta.dirname, "..");

// ── which sheet frames a beat ──────────────────────────────────────────────────────────────────

/**
 * Where each (medium, format) pair keeps its type sheets, relative to the repository root.
 *
 * `map`/`video` is the one directory nested inside another family's — `map-beat` owns both of the
 * map's non-web exports, and keeps its video sheets a level down.
 */
export const TYPE_SHEET_DIRS = Object.freeze({
  chart: Object.freeze({
    static: "skills/chart-beat/references/types",
    web: "skills/chart-web/references/types",
    video: "skills/chart-video/references/types",
    scrolly: "skills/scrolly/references/types",
  }),
  map: Object.freeze({
    static: "skills/map-beat/references/types",
    web: "skills/map-web/references/types",
    video: "skills/map-beat/references/types/video",
    scrolly: "skills/scrolly/references/types",
  }),
  image: Object.freeze({
    static: "skills/image-beat/references/types",
    scrolly: "skills/image-beat/references/types",
  }),
});

/** The eight types the catalogue files under the `map` medium. */
export const MAP_TYPES = Object.freeze([
  "cartogram",
  "choropleth",
  "contour-isoline",
  "dot-density",
  "flow-map",
  "hex-grid",
  "locator",
  "proportional-symbol",
]);

/** The one type the catalogue files under the `image` medium. */
export const IMAGE_TYPES = Object.freeze(["photograph-sequence"]);

/**
 * THE SPELLINGS THE COMMITTED BRIEFS USE FOR A TYPE WHOSE SHEET IS NAMED OTHERWISE.
 *
 * Closed on purpose, and `typeSlug` returns the slug unchanged for anything not in it, so an
 * unknown type fails by finding no sheet — never by resolving to the wrong one. Rewriting the
 * `type:` scalar in the committed BRIEFs to canonicalise a spelling would edit 160 files for a
 * normalisation seven entries perform exactly.
 */
const TYPE_ALIASES = Object.freeze({
  bar: "bar-and-column",
  column: "bar-and-column",
  donut: "pie-and-donut",
  pie: "pie-and-donut",
  "box-plot": "boxplot",
  contour: "contour-isoline",
  "photograph": "photograph-sequence",
});

/** `"bar and column"` → `bar-and-column` — the sheet's own filename, minus `.md`. */
export function typeSlug(type) {
  const plain = String(type ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (plain === "")
    throw new Error("a beat's front matter pins no type, so no sheet can frame its choreography.");
  return TYPE_ALIASES[plain] ?? plain;
}

/** `chart`, `map` or `image` — read off the type, the way the visual catalogue files it. */
export function mediumOfType(type) {
  const slug = typeSlug(type);
  if (MAP_TYPES.includes(slug)) return "map";
  if (IMAGE_TYPES.includes(slug)) return "image";
  return "chart";
}

/** The sheet that frames this (medium, format, type), or `null` when none is filed. */
export function typeSheetPath(root, { medium, format, type }) {
  const dir = TYPE_SHEET_DIRS[medium]?.[format];
  if (!dir) return null;
  const path = join(root, dir, `${typeSlug(type)}.md`);
  return existsSync(path) ? path : null;
}

/** `proof/scrolly-bar-top-emitters-2024` — the beat a sheet's `## Worked example` names. */
export function workedExampleBeat(sheetText) {
  const at = String(sheetText).indexOf("## Worked example");
  if (at < 0) return null;
  const found = /`(proof\/[a-z0-9-]+)/.exec(String(sheetText).slice(at));
  return found ? found[1] : null;
}

/**
 * The parsed sheet that frames one retained proposal, with the worked example's own beat beside it.
 *
 * Throws naming where it looked rather than returning an empty frame: a frame with no vocabulary
 * and no prohibitions lets every declaration through, which is the silent degradation this chain
 * exists to make impossible.
 */
export function readTypeSheetFor(root, retained) {
  const medium = retained.medium ?? mediumOfType(retained.type);
  const path = typeSheetPath(root, { medium, format: retained.format, type: retained.type });
  if (!path)
    throw new Error(
      `no type sheet for ${medium}/${retained.format}/${typeSlug(retained.type)} — looked in ` +
        `${TYPE_SHEET_DIRS[medium]?.[retained.format] ?? "(no directory for that medium and format)"}. ` +
        "A type that files no sheet has no vocabulary and no prohibitions, so nothing frames its " +
        "choreography; write the sheet before declaring one.",
    );
  const text = readFileSync(path, "utf8");
  return {
    ...parseTypeSheet(text),
    path: relative(root, path).split(sep).join("/"),
    workedExampleBeat: workedExampleBeat(text),
  };
}

// ── which interaction the catalogue files ──────────────────────────────────────────────────────

const CATALOGUE = "skills/storyboard/references/visual-catalog.json";

let catalogueCache = null;

/**
 * The catalogue's own `{ kind, promise }` for a medium/format pair.
 *
 * Read from the JSON rather than imported, for the same reason the sheets are: a module inside a
 * skill may not reach another skill's references, and this file is not inside a skill at all.
 */
export function catalogueInteraction(medium, format, root = ROOT) {
  catalogueCache ??= JSON.parse(readFileSync(join(root, CATALOGUE), "utf8"));
  const pair = catalogueCache.formatPairs.find(
    (row) => row.medium === medium && row.format === format,
  );
  if (!pair)
    throw new Error(
      `the visual catalogue files no ${medium}/${format} pair, so there is no interaction for it. ` +
        `It files ${catalogueCache.formatPairs.map((r) => `${r.medium}/${r.format}`).join(", ")}.`,
    );
  return { kind: pair.interaction.kind, promise: pair.interaction.promise };
}

// ── which beats there are, and which carry blocks ──────────────────────────────────────────────

/** The front-matter scalar that switches the two corpus guards on for a beat. */
export const DERIVED_MARK = "v1";

/** Where beats live: the catalogue proofs, and the production stories. */
const BEAT_ROOTS = ["proof", "stories"];

/** Every directory holding a `BRIEF.md` — the tree's own definition of a beat, discovered. */
export function beatDirs(root = ROOT) {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name < b.name ? -1 : 1,
    )) {
      if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "renders")
        continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
    }
    if (existsSync(join(dir, "BRIEF.md")) && statSync(join(dir, "BRIEF.md")).isFile())
      out.push(relative(root, dir).split(sep).join("/"));
  };
  for (const base of BEAT_ROOTS) if (existsSync(join(root, base))) walk(join(root, base));
  return out.sort();
}

/** The beats whose front matter says `derived: v1` — the set both corpus guards run over. */
export function derivedBeats(root = ROOT) {
  return beatDirs(root).filter((beat) => {
    const record = parseBriefFrontMatter(readFileSync(join(root, beat, "BRIEF.md"), "utf8"));
    return record?.derived === DERIVED_MARK;
  });
}

// ── the chain, for one beat ────────────────────────────────────────────────────────────────────

/**
 * `{ retained, sheet, frame, required }` for one beat directory.
 *
 * Every step is the canonical one: `retainedFromBrief` for the proposal, `parseTypeSheet` for the
 * frame's source, `choreographyFrame` and `requiredAssertions` for what the chain supplies. This
 * function adds the two joins neither of those could make on its own — which sheet, and which
 * catalogue interaction — and nothing else.
 */
export function chainFor(beat, root = ROOT) {
  const beatDir = join(root, beat);
  const retained = retainedFromBrief(beatDir, {
    catalogueInteraction: (medium, format) => catalogueInteraction(medium, format, root),
  });
  const sheet = readTypeSheetFor(root, retained);
  return {
    retained,
    sheet,
    frame: choreographyFrame(retained, sheet),
    required: requiredAssertions(retained, sheet),
  };
}
